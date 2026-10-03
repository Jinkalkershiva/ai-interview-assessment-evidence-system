package com.examhelper.rag.index;

import com.examhelper.extraction.model.DocumentChunk;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SemanticSearchResult {
    private DocumentChunk chunk;
    private double similarityScore;
    private int rank;
}
