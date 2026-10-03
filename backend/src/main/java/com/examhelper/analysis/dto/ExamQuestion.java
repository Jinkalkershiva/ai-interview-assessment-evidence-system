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
public class ExamQuestion {
    private int id;
    private String question;
    private String answer;
    private String type;               // SHORT_ANSWER | LONG_ANSWER | CONCEPTUAL | DEFINITION | COMPARISON | PROGRAMMING
    private String difficulty;         // EASY | MEDIUM | HARD
    private String importance = "HIGH";// HIGH | MEDIUM | LOW
    private int importanceRating = 5;  // 1 to 5
    private int marks = 2;             // 2 | 5 | 8
    private String section;            // Section A — 2 Marks | Section B — 5 Marks | Section C — 8 Marks
    private String topic;
    private List<String> keywords = new ArrayList<>();
    private List<SourceEvidence> sourceEvidence = new ArrayList<>();
    private boolean starred;           // frontend-managed
}
