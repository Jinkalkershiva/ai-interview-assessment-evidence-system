package com.examhelper.rag.bm25;

import com.examhelper.extraction.model.DocumentChunk;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Standard BM25 keyword retriever with document length normalization (k1=1.2, b=0.75).
 * Retrieves candidates independently from the semantic embedding branch.
 */
@Component
@Slf4j
public class Bm25Retriever {

    private static final double K1 = 1.2;
    private static final double B = 0.75;
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

    public List<Bm25SearchResult> search(List<DocumentChunk> chunks, String query, int topK) {
        if (chunks == null || chunks.isEmpty() || query == null || query.isBlank()) {
            return Collections.emptyList();
        }

        List<String> queryTokens = tokenize(query);
        if (queryTokens.isEmpty()) {
            int limit = Math.min(topK, chunks.size());
            List<Bm25SearchResult> fallback = new ArrayList<>(limit);
            for (int i = 0; i < limit; i++) {
                fallback.add(new Bm25SearchResult(chunks.get(i), 0.0, i + 1));
            }
            return fallback;
        }

        int N = chunks.size();

        // 1. Calculate token frequencies & document lengths
        Map<Integer, Map<String, Integer>> chunkTermFreqs = new HashMap<>();
        Map<Integer, Integer> docLengths = new HashMap<>();
        Map<String, Integer> docFreq = new HashMap<>();
        double totalLength = 0.0;

        for (DocumentChunk chunk : chunks) {
            List<String> tokens = tokenize(chunk.getText());
            int dl = tokens.size();
            docLengths.put(chunk.getId(), dl);
            totalLength += dl;

            Map<String, Integer> tf = new HashMap<>();
            Set<String> uniqueTokens = new HashSet<>(tokens);
            for (String t : tokens) {
                tf.merge(t, 1, Integer::sum);
            }
            chunkTermFreqs.put(chunk.getId(), tf);

            for (String ut : uniqueTokens) {
                docFreq.merge(ut, 1, Integer::sum);
            }
        }

        double avgdl = totalLength / Math.max(1, N);

        // 2. Score each chunk using standard BM25 formula
        List<Bm25SearchResult> scored = new ArrayList<>();
        for (DocumentChunk chunk : chunks) {
            int dl = docLengths.getOrDefault(chunk.getId(), 0);
            Map<String, Integer> tfMap = chunkTermFreqs.getOrDefault(chunk.getId(), Collections.emptyMap());

            double score = 0.0;
            for (String qTerm : queryTokens) {
                int tf = tfMap.getOrDefault(qTerm, 0);
                if (tf > 0) {
                    int df = docFreq.getOrDefault(qTerm, 1);
                    // Robertson-Spärck Jones IDF
                    double idf = Math.log(1.0 + (double) (N - df + 0.5) / (df + 0.5));
                    // BM25 term saturation with document length normalization
                    double numerator = tf * (K1 + 1.0);
                    double denominator = tf + K1 * (1.0 - B + B * ((double) dl / Math.max(1.0, avgdl)));
                    score += idf * (numerator / denominator);
                }
            }

            if (score > 0.0) {
                scored.add(new Bm25SearchResult(chunk, score, 0));
            }
        }

        // Sort descending by score
        scored.sort(Comparator.comparingDouble(Bm25SearchResult::getBm25Score).reversed());

        int limit = Math.min(topK, scored.size());
        List<Bm25SearchResult> results = new ArrayList<>(limit);
        for (int i = 0; i < limit; i++) {
            Bm25SearchResult r = scored.get(i);
            r.setRank(i + 1);
            results.add(r);
        }

        return results;
    }

    public List<String> tokenize(String input) {
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
