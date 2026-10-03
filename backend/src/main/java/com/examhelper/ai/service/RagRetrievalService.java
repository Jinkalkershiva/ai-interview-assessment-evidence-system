package com.examhelper.ai.service;

import com.examhelper.analysis.dto.SourceEvidence;
import com.examhelper.extraction.model.DocumentChunk;
import com.examhelper.extraction.model.ExtractedDocument;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * In-memory RAG Indexing & Retrieval Service.
 * Provides TF-IDF / BM25 term relevance scoring and snippet extraction across document chunks.
 */
@Service
@Slf4j
public class RagRetrievalService {

    private static final Pattern WORD_SPLIT = Pattern.compile("[^a-zA-Z0-9]+");
    private static final Set<String> STOP_WORDS = Set.of(
            "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
            "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't",
            "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
            "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't",
            "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself",
            "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
            "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not",
            "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over",
            "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
            "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's",
            "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
            "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
            "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
            "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're",
            "you've", "your", "yours", "yourself", "yourselves"
    );

    /**
     * Retrieve the top-K relevant chunks for a specific query or topic using BM25-like scoring.
     */
    public List<DocumentChunk> retrieveRelevantChunks(ExtractedDocument doc, String query, int topK) {
        if (doc == null || doc.getChunks() == null || doc.getChunks().isEmpty()) {
            return Collections.emptyList();
        }

        List<DocumentChunk> chunks = doc.getChunks();
        if (chunks.size() <= topK) {
            return chunks;
        }

        List<String> queryTokens = tokenize(query);
        if (queryTokens.isEmpty()) {
            return chunks.subList(0, Math.min(topK, chunks.size()));
        }

        // Calculate IDF across chunks
        int nDocs = chunks.size();
        Map<String, Integer> docFreq = new HashMap<>();
        for (DocumentChunk chunk : chunks) {
            Set<String> uniqueChunkTokens = new HashSet<>(tokenize(chunk.getText()));
            for (String t : uniqueChunkTokens) {
                docFreq.merge(t, 1, Integer::sum);
            }
        }

        Map<DocumentChunk, Double> scores = new HashMap<>();
        for (DocumentChunk chunk : chunks) {
            List<String> chunkTokens = tokenize(chunk.getText());
            Map<String, Integer> termFreq = new HashMap<>();
            for (String ct : chunkTokens) {
                termFreq.merge(ct, 1, Integer::sum);
            }

            double score = 0.0;
            for (String qt : queryTokens) {
                int tf = termFreq.getOrDefault(qt, 0);
                if (tf > 0) {
                    int df = docFreq.getOrDefault(qt, 1);
                    double idf = Math.log(1.0 + (double) (nDocs - df + 0.5) / (df + 0.5));
                    // BM25-ish term weighting
                    double tfWeight = ((tf * 2.2) / (tf + 1.2));
                    score += idf * tfWeight;
                }
            }
            scores.put(chunk, score);
        }

        return chunks.stream()
                .sorted(Comparator.comparingDouble((DocumentChunk c) -> scores.getOrDefault(c, 0.0)).reversed())
                .limit(topK)
                .collect(Collectors.toList());
    }

    /**
     * Find structured source evidence (document, page/section, snippet) for a given query/concept.
     */
    public List<SourceEvidence> findEvidenceFor(ExtractedDocument doc, String query, int maxEvidence) {
        List<DocumentChunk> relevantChunks = retrieveRelevantChunks(doc, query, maxEvidence);
        List<SourceEvidence> evidenceList = new ArrayList<>();

        for (DocumentChunk chunk : relevantChunks) {
            String snippet = extractBestSnippet(chunk.getText(), query, 240);
            evidenceList.add(new SourceEvidence(
                    chunk.getDocumentName(),
                    chunk.getPageOrSection() != null ? chunk.getPageOrSection() : "Page 1",
                    snippet
            ));
        }

        return evidenceList;
    }

    /**
     * Extract a concise snippet around matching keywords.
     */
    public String extractBestSnippet(String text, String query, int maxLen) {
        if (text == null || text.isBlank()) return "";
        if (text.length() <= maxLen) return text.trim();

        List<String> queryTokens = tokenize(query);
        String lowerText = text.toLowerCase(Locale.ROOT);

        int bestIndex = -1;
        for (String token : queryTokens) {
            int idx = lowerText.indexOf(token);
            if (idx != -1) {
                bestIndex = idx;
                break;
            }
        }

        if (bestIndex == -1) {
            return text.substring(0, Math.min(maxLen, text.length())).trim() + "...";
        }

        int start = Math.max(0, bestIndex - (maxLen / 3));
        int end = Math.min(text.length(), start + maxLen);

        // Adjust to word boundaries if possible
        if (start > 0) {
            int spaceIdx = text.indexOf(' ', start);
            if (spaceIdx != -1 && spaceIdx < start + 20) {
                start = spaceIdx + 1;
            }
        }
        if (end < text.length()) {
            int spaceIdx = text.lastIndexOf(' ', end);
            if (spaceIdx != -1 && spaceIdx > end - 20) {
                end = spaceIdx;
            }
        }

        String snippet = text.substring(start, end).trim();
        if (start > 0) snippet = "..." + snippet;
        if (end < text.length()) snippet = snippet + "...";
        return snippet;
    }

    /**
     * Get representative chunks evenly spread across the document for comprehensive overview generation.
     */
    public List<DocumentChunk> getRepresentativeChunks(ExtractedDocument doc, int maxChunks) {
        if (doc == null || doc.getChunks() == null || doc.getChunks().isEmpty()) {
            return Collections.emptyList();
        }
        List<DocumentChunk> chunks = doc.getChunks();
        if (chunks.size() <= maxChunks) {
            return chunks;
        }

        List<DocumentChunk> sampled = new ArrayList<>();
        double step = (double) (chunks.size() - 1) / (maxChunks - 1);
        for (int i = 0; i < maxChunks; i++) {
            int index = (int) Math.round(i * step);
            sampled.add(chunks.get(Math.min(index, chunks.size() - 1)));
        }
        return sampled;
    }

    private List<String> tokenize(String input) {
        if (input == null || input.isBlank()) return Collections.emptyList();
        String[] parts = WORD_SPLIT.split(input.toLowerCase(Locale.ROOT));
        List<String> tokens = new ArrayList<>();
        for (String p : parts) {
            if (p.length() > 2 && !STOP_WORDS.contains(p)) {
                tokens.add(p);
            }
        }
        return tokens;
    }
}
