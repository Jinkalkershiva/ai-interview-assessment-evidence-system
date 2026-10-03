package com.examhelper.extraction.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentChunk {
    private int id;
    private String documentName;
    private String pageOrSection;
    private int pageNumber;
    private String text;
}
