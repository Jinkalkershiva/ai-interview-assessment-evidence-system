package com.examhelper.extraction.model;

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
public class ExtractedDocument {
    private String documentName;
    private String fullCleanedText;
    @Builder.Default
    private List<DocumentChunk> chunks = new ArrayList<>();
    private int totalPagesOrSlides;
}
