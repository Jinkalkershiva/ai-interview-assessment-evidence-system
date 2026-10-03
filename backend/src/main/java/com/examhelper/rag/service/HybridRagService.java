package com.examhelper.rag.service;

import com.examhelper.analysis.dto.ChunkScoreDetail;
import com.examhelper.analysis.dto.RetrievalReport;
import com.examhelper.analysis.dto.SourceEvidence;
import com.examhelper.extraction.model.DocumentChunk;
import com.examhelper.extraction.model.ExtractedDocument;
import com.examhelper.rag.bm25.Bm25Retriever;
import com.examhelper.rag.bm25.Bm25SearchResult;
import com.examhelper.rag.embedding.BgeSmallEmbeddingService;
import com.examhelper.rag.index.SemanticSearchResult;
import com.examhelper.rag.index.SemanticVectorIndex;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Hybrid RAG Service combining BM25 keyword retrieval and BAAI/bge-small-en-v1.5
 * semantic dense vector retrieval via Reciprocal Rank Fusion (RRF).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HybridRagService {

    private final BgeSmallEmbeddingService embeddingService;
    private final Bm25Retriever bm25Retriever;
    private final SemanticVectorIndex vectorIndex;

    private static final int RRF_K = 60; // Standard Reciprocal Rank Fusion smoothing constant
    private static final int DEFAULT_TOP_K = 12; // Top evidence chunks to pass to LLM

    public record HybridRankedChunk(
            DocumentChunk chunk,
            double hybridScore,
            double bm25Score,
            int bm25Rank,
            double semanticScore,
            int semanticRank,
            int finalRank
    ) {}

    public record HybridRetrievalResult(
            List<DocumentChunk> topChunks,
            RetrievalReport report,
            List<HybridRankedChunk> rankedDetails
    ) {}

    /**
     * Index the extracted document chunks into both the Semantic Vector Index and BM25 store,
     * then execute hybrid retrieval for the curriculum query.
     */
    public HybridRetrievalResult retrieveHybridEvidence(ExtractedDocument doc, String query, int topK) {
        if (doc == null || doc.getChunks() == null || doc.getChunks().isEmpty()) {
            return new HybridRetrievalResult(Collections.emptyList(), null, Collections.emptyList());
        }

        List<DocumentChunk> chunks = doc.getChunks();
        int requestedTopK = topK > 0 ? topK : DEFAULT_TOP_K;

        // 1. Index chunks into Semantic Vector Index
        vectorIndex.clear();
        List<String> chunkTexts = chunks.stream().map(DocumentChunk::getText).toList();
        List<float[]> embeddings = embeddingService.embedBatch(chunkTexts);
        vectorIndex.addAll(chunks, embeddings);

        log.info("[HYBRID-RAG] Indexed {} chunks into semantic vector index (model: {})",
                chunks.size(), embeddingService.getModelName());

        // 2. Query formulation
        String searchQuery = (query != null && !query.isBlank()) ? query :
                (doc.getDocumentName() + " core concepts examination definitions architecture mechanisms");

        // 3. Independent BM25 Candidate Retrieval
        int candidatePoolSize = Math.min(chunks.size(), Math.max(requestedTopK * 2, 20));
        List<Bm25SearchResult> bm25Results = bm25Retriever.search(chunks, searchQuery, candidatePoolSize);

        // 4. Independent Semantic Candidate Retrieval
        float[] queryEmbedding = embeddingService.embedQuery(searchQuery);
        List<SemanticSearchResult> semanticResults = vectorIndex.search(queryEmbedding, candidatePoolSize);

        log.info("[HYBRID-RAG] Candidate search: BM25 retrieved {}, Semantic retrieved {}",
                bm25Results.size(), semanticResults.size());

        // 5. Hybrid Ranking via Reciprocal Rank Fusion (RRF) with Deduplication
        Map<Integer, DocumentChunk> chunkLookup = chunks.stream()
                .collect(Collectors.toMap(DocumentChunk::getId, c -> c, (a, b) -> a));

        Map<Integer, Bm25SearchResult> bm25Map = bm25Results.stream()
                .collect(Collectors.toMap(r -> r.getChunk().getId(), r -> r, (a, b) -> a));

        Map<Integer, SemanticSearchResult> semanticMap = semanticResults.stream()
                .collect(Collectors.toMap(r -> r.getChunk().getId(), r -> r, (a, b) -> a));

        // Union of candidate IDs (deduplicated)
        Set<Integer> candidateIds = new LinkedHashSet<>();
        bm25Results.forEach(r -> candidateIds.add(r.getChunk().getId()));
        semanticResults.forEach(r -> candidateIds.add(r.getChunk().getId()));

        // If candidate lists are empty, fallback to representative chunks
        if (candidateIds.isEmpty()) {
            for (DocumentChunk c : chunks) {
                candidateIds.add(c.getId());
                if (candidateIds.size() >= requestedTopK) break;
            }
        }

        int penaltyRank = candidatePoolSize + 5;
        List<HybridRankedChunk> rankedList = new ArrayList<>();

        for (Integer chunkId : candidateIds) {
            DocumentChunk chunk = chunkLookup.get(chunkId);
            if (chunk == null) continue;

            Bm25SearchResult bm25 = bm25Map.get(chunkId);
            SemanticSearchResult sem = semanticMap.get(chunkId);

            int bm25Rank = bm25 != null ? bm25.getRank() : penaltyRank;
            double bm25Score = bm25 != null ? bm25.getBm25Score() : 0.0;

            int semRank = sem != null ? sem.getRank() : penaltyRank;
            double semScore = sem != null ? sem.getSimilarityScore() : 0.0;

            // Reciprocal Rank Fusion: 1 / (60 + rank_bm25) + 1 / (60 + rank_sem)
            double rrfScore = (1.0 / (RRF_K + bm25Rank)) + (1.0 / (RRF_K + semRank));

            rankedList.add(new HybridRankedChunk(
                    chunk,
                    rrfScore,
                    bm25Score,
                    bm25Rank,
                    semScore,
                    semRank,
                    0 // set after sorting
            ));
        }

        // Sort descending by RRF score
        rankedList.sort(Comparator.comparingDouble(HybridRankedChunk::hybridScore).reversed());

        // Assign final ranks and slice top-K
        int finalK = Math.min(requestedTopK, rankedList.size());
        List<HybridRankedChunk> topRankedDetails = new ArrayList<>(finalK);
        List<DocumentChunk> topEvidenceChunks = new ArrayList<>(finalK);
        List<ChunkScoreDetail> scoreDetails = new ArrayList<>(finalK);

        for (int i = 0; i < finalK; i++) {
            HybridRankedChunk item = rankedList.get(i);
            HybridRankedChunk withRank = new HybridRankedChunk(
                    item.chunk(),
                    item.hybridScore(),
                    item.bm25Score(),
                    item.bm25Rank(),
                    item.semanticScore(),
                    item.semanticRank(),
                    i + 1
            );
            topRankedDetails.add(withRank);
            topEvidenceChunks.add(item.chunk());

            String snippet = extractSnippet(item.chunk().getText(), 200);
            scoreDetails.add(new ChunkScoreDetail(
                    item.chunk().getId(),
                    item.chunk().getPageOrSection(),
                    round(item.bm25Score(), 4),
                    item.bm25Rank(),
                    round(item.semanticScore(), 4),
                    item.semanticRank(),
                    round(item.hybridScore(), 6),
                    i + 1,
                    snippet
            ));
        }

        // 6. Retrieval Evaluation Logging
        log.info("═══════════════════════════════════════════════════════════════════════════════════════════");
        log.info("[HYBRID-RAG EVALUATION] Query: '{}'", searchQuery);
        log.info("[HYBRID-RAG EVALUATION] Total Indexed Chunks: {} | Top-K Selected: {}", chunks.size(), topEvidenceChunks.size());
        log.info("[HYBRID-RAG EVALUATION] Strategy: Reciprocal Rank Fusion (k={}) | Embedding: {}", RRF_K, embeddingService.getModelName());
        log.info("-------------------------------------------------------------------------------------------");
        for (ChunkScoreDetail detail : scoreDetails) {
            log.info("Final Rank #{}: Chunk {} [{}] | RRF: {} | BM25: {} (Rank {}) | Semantic: {} (Rank {})",
                    detail.getFinalRank(), detail.getChunkId(), detail.getPageOrSection(),
                    detail.getHybridRrfScore(), detail.getBm25Score(), detail.getBm25Rank(),
                    detail.getSemanticScore(), detail.getSemanticRank());
        }
        log.info("═══════════════════════════════════════════════════════════════════════════════════════════");

        RetrievalReport report = RetrievalReport.builder()
                .embeddingModel(embeddingService.getModelName())
                .retrievalStrategy("HYBRID (BM25 + BGE-Small Semantic RRF)")
                .totalIndexedChunks(chunks.size())
                .bm25CandidatesRetrieved(bm25Results.size())
                .semanticCandidatesRetrieved(semanticResults.size())
                .mergedUniqueCandidates(candidateIds.size())
                .topKEvidencePassedToLlm(topEvidenceChunks.size())
                .topRankedEvidence(scoreDetails)
                .build();

        return new HybridRetrievalResult(topEvidenceChunks, report, topRankedDetails);
    }

    /**
     * Find grounded source evidence for a specific query/concept using hybrid ranking.
     */
    public List<SourceEvidence> findEvidenceFor(ExtractedDocument doc, String query, int maxEvidence) {
        if (doc == null || doc.getChunks() == null || doc.getChunks().isEmpty() || query == null || query.isBlank()) {
            return Collections.emptyList();
        }

        int topK = Math.max(1, maxEvidence);
        HybridRetrievalResult result = retrieveHybridEvidence(doc, query, topK);

        List<SourceEvidence> list = new ArrayList<>();
        for (DocumentChunk chunk : result.topChunks()) {
            String snippet = extractSnippet(chunk.getText(), 220);
            list.add(new SourceEvidence(
                    doc.getDocumentName(),
                    chunk.getPageOrSection() != null ? chunk.getPageOrSection() : "Page 1",
                    snippet
            ));
        }

        return list;
    }

    public String extractSnippet(String text, int maxLen) {
        if (text == null || text.isBlank()) return "";
        String clean = text.replaceAll("\\s+", " ").trim();
        if (clean.length() <= maxLen) return clean;
        return clean.substring(0, maxLen).trim() + "...";
    }

    private double round(double val, int decimals) {
        double factor = Math.pow(10, decimals);
        return Math.round(val * factor) / factor;
    }
}
