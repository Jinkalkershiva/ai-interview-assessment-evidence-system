package com.examhelper.rag;

import com.examhelper.analysis.dto.ChunkScoreDetail;
import com.examhelper.analysis.dto.RetrievalReport;
import com.examhelper.extraction.model.DocumentChunk;
import com.examhelper.extraction.model.ExtractedDocument;
import com.examhelper.rag.bm25.Bm25Retriever;
import com.examhelper.rag.bm25.Bm25SearchResult;
import com.examhelper.rag.embedding.BgeSmallEmbeddingService;
import com.examhelper.rag.index.SemanticVectorIndex;
import com.examhelper.rag.service.HybridRagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class HybridRagServiceTest {

    private BgeSmallEmbeddingService embeddingService;
    private Bm25Retriever bm25Retriever;
    private SemanticVectorIndex vectorIndex;
    private HybridRagService hybridRagService;

    @BeforeEach
    void setUp() {
        embeddingService = new BgeSmallEmbeddingService();
        bm25Retriever = new Bm25Retriever();
        vectorIndex = new SemanticVectorIndex();
        hybridRagService = new HybridRagService(embeddingService, bm25Retriever, vectorIndex);
    }

    @Test
    @DisplayName("BGE-small generates 384-dimensional normalized dense vectors")
    void testEmbeddingModelDimensionsAndNormalization() {
        assertEquals("BAAI/bge-small-en-v1.5", embeddingService.getModelName());
        assertEquals(384, embeddingService.getDimensions());

        float[] v1 = embeddingService.embed("Generational garbage collection Eden and Tenured spaces");
        assertEquals(384, v1.length);

        // Verify L2 unit norm: ||v|| ~ 1.0
        double normSq = 0.0;
        for (float f : v1) normSq += f * f;
        assertEquals(1.0, normSq, 0.01, "Vector should have L2 unit norm");

        // Verify cosine similarity of semantically related text is higher than unrelated text
        float[] vRelated = embeddingService.embed("Garbage collector memory reclamation young generation");
        float[] vUnrelated = embeddingService.embed("Ancient Roman architectural aqueducts and pottery");

        double simRelated = embeddingService.cosineSimilarity(v1, vRelated);
        double simUnrelated = embeddingService.cosineSimilarity(v1, vUnrelated);

        assertTrue(simRelated > simUnrelated, "Related semantic text should have higher cosine similarity");
    }

    @Test
    @DisplayName("BM25 retrieves exact keyword matches with proper scoring and ranks")
    void testBm25Retriever() {
        List<DocumentChunk> chunks = List.of(
                new DocumentChunk(1, "doc.pdf", "Page 1", 1, "Polymorphism and dynamic virtual method dispatch in OOP"),
                new DocumentChunk(2, "doc.pdf", "Page 2", 2, "Kafka distributed commit log and consumer partition balancing"),
                new DocumentChunk(3, "doc.pdf", "Page 3", 3, "Encapsulation, inheritance, and object-oriented polymorphism")
        );

        List<Bm25SearchResult> results = bm25Retriever.search(chunks, "polymorphism dispatch", 5);
        assertFalse(results.isEmpty());
        assertEquals(1, results.get(0).getChunk().getId(), "Chunk 1 should rank first for exact keywords");
        assertTrue(results.get(0).getBm25Score() > 0.0);
        assertEquals(1, results.get(0).getRank());
    }

    @Test
    @DisplayName("Hybrid RAG performs RRF fusion, deduplication, and returns evaluation report")
    void testHybridRetrievalAndRrfFusion() {
        List<DocumentChunk> chunks = new ArrayList<>();
        chunks.add(new DocumentChunk(1, "os.pdf", "Page 1", 1, "Virtual memory paging, translation lookaside buffers, and page faults"));
        chunks.add(new DocumentChunk(2, "os.pdf", "Page 2", 2, "Process scheduling algorithms: Round Robin, Multi-level feedback queues"));
        chunks.add(new DocumentChunk(3, "os.pdf", "Page 3", 3, "Deadlock detection, prevention Banker's algorithm, and mutex semaphores"));
        chunks.add(new DocumentChunk(4, "os.pdf", "Page 4", 4, "File system inodes, journaling, and disk block allocation"));

        ExtractedDocument doc = ExtractedDocument.builder()
                .documentName("Operating Systems")
                .fullCleanedText("Operating systems content")
                .chunks(chunks)
                .totalPagesOrSlides(4)
                .build();

        HybridRagService.HybridRetrievalResult result = hybridRagService.retrieveHybridEvidence(
                doc, "virtual memory paging page faults", 3);

        assertNotNull(result);
        assertFalse(result.topChunks().isEmpty());
        assertTrue(result.topChunks().size() <= 3);

        // Verify Chunk 1 is top ranked
        assertEquals(1, result.topChunks().get(0).getId());
        assertEquals("Page 1", result.topChunks().get(0).getPageOrSection());

        // Verify Retrieval Report
        RetrievalReport report = result.report();
        assertNotNull(report);
        assertEquals("BAAI/bge-small-en-v1.5", report.getEmbeddingModel());
        assertTrue(report.getRetrievalStrategy().contains("HYBRID"));
        assertEquals(4, report.getTotalIndexedChunks());
        assertTrue(report.getBm25CandidatesRetrieved() > 0);
        assertTrue(report.getSemanticCandidatesRetrieved() > 0);

        // Verify score details
        List<ChunkScoreDetail> details = report.getTopRankedEvidence();
        assertFalse(details.isEmpty());
        ChunkScoreDetail top = details.get(0);
        assertEquals(1, top.getChunkId());
        assertEquals(1, top.getFinalRank());
        assertTrue(top.getHybridRrfScore() > 0.0);
        assertTrue(top.getBm25Score() > 0.0);
        assertTrue(top.getSemanticScore() > 0.0);
    }
}
