package com.examhelper.analysis.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChunkScoreDetail {
    private int chunkId;
    private String pageOrSection;
    private double bm25Score;
    private int bm25Rank;
    private double semanticScore;
    private int semanticRank;
    private double hybridRrfScore;
    private int finalRank;
    private String snippet;
}
