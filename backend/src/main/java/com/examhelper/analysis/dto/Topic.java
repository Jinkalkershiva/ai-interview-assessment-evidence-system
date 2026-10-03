package com.examhelper.analysis.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Topic {
    private String name;
    private String importance;         // HIGH | MEDIUM | LOW
    private int importanceRating = 4;  // 1 to 5
    private String summary;
    private List<KeyPoint> keyPoints = new ArrayList<>();
    private String diagram;            // Structured diagram specification (Mermaid or null)
}
