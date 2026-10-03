package com.examhelper.analysis.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ExamPattern {
    private int twoMarkCount = 10;
    private int fiveMarkCount = 5;
    private int eightMarkCount = 3;

    public int getTotalQuestions() {
        return twoMarkCount + fiveMarkCount + eightMarkCount;
    }

    public int getTotalMarks() {
        return (twoMarkCount * 2) + (fiveMarkCount * 5) + (eightMarkCount * 8);
    }
}
