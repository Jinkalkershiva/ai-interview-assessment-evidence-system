package com.examhelper.analysis.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RetrievalReport {
    private String embeddingModel;      // "BAAI/bge-small-en-v1.5"
    private String retrievalStrategy;   // "HYBRID (BM25 + BGE-Small Semantic RRF)"
    private int totalIndexedChunks;
    private int bm25CandidatesRetrieved;
    private int semanticCandidatesRetrieved;
    private int mergedUniqueCandidates;
    private int topKEvidencePassedToLlm;
    @Builder.Default
    private List<ChunkScoreDetail> topRankedEvidence = new ArrayList<>();
}
