package com.examhelper.rag.embedding;

import java.util.List;

/**
 * Contract for semantic text embedding models.
 * Responsible strictly for semantic representation (dense vectors), not question generation.
 */
public interface EmbeddingModelService {
    /**
     * Compute a normalized dense vector embedding for a single text.
     */
    float[] embed(String text);

    /**
     * Batch embed a list of texts.
     */
    List<float[]> embedBatch(List<String> texts);

    /**
     * Dimensionality of the vector space (e.g. 384 for bge-small-en-v1.5).
     */
    int getDimensions();

    /**
     * Identifier of the model.
     */
    String getModelName();

    /**
     * Compute cosine similarity between two vectors.
     */
    default double cosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) return 0.0;
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0.0 || normB == 0.0) return 0.0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
