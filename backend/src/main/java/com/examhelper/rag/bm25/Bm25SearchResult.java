package com.examhelper.rag.bm25;

import com.examhelper.extraction.model.DocumentChunk;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Bm25SearchResult {
    private DocumentChunk chunk;
    private double bm25Score;
    private int rank;
}
