package com.examhelper.rag.index;

import com.examhelper.extraction.model.DocumentChunk;
import com.examhelper.rag.embedding.EmbeddingModelService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * In-memory Semantic Vector Index for document chunks.
 * Fast cosine similarity search across normalized dense vectors.
 */
@Component
@Slf4j
public class SemanticVectorIndex {

    public record VectorEntry(DocumentChunk chunk, float[] vector) {}

    private final List<VectorEntry> entries = new CopyOnWriteArrayList<>();

    public void clear() {
        entries.clear();
    }

    public void add(DocumentChunk chunk, float[] vector) {
        if (chunk != null && vector != null) {
            entries.add(new VectorEntry(chunk, vector));
        }
    }

    public void addAll(List<DocumentChunk> chunks, List<float[]> vectors) {
        if (chunks == null || vectors == null) return;
        int count = Math.min(chunks.size(), vectors.size());
        for (int i = 0; i < count; i++) {
            add(chunks.get(i), vectors.get(i));
        }
    }

    public int size() {
        return entries.size();
    }

    /**
     * Search the semantic vector index with a query vector using cosine similarity (dot product).
     */
    public List<SemanticSearchResult> search(float[] queryVector, int topK) {
        if (queryVector == null || entries.isEmpty()) {
            return Collections.emptyList();
        }

        List<ScoredEntry> scored = new ArrayList<>(entries.size());
        for (VectorEntry entry : entries) {
            double dot = 0.0;
            float[] v = entry.vector();
            int len = Math.min(queryVector.length, v.length);
            for (int i = 0; i < len; i++) {
                dot += queryVector[i] * v[i];
            }
            // Normalization safeguard (bounded between -1.0 and 1.0)
            double score = Math.max(-1.0, Math.min(1.0, dot));
            scored.add(new ScoredEntry(entry.chunk(), score));
        }

        scored.sort(Comparator.comparingDouble(ScoredEntry::score).reversed());

        int limit = Math.min(topK, scored.size());
        List<SemanticSearchResult> results = new ArrayList<>(limit);
        for (int i = 0; i < limit; i++) {
            ScoredEntry se = scored.get(i);
            results.add(new SemanticSearchResult(se.chunk(), se.score(), i + 1));
        }

        return results;
    }

    private record ScoredEntry(DocumentChunk chunk, double score) {}
}
