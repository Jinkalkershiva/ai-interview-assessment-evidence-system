package com.examhelper.interview.model;

import com.examhelper.interview.dto.CodingDtos.AiCodingReview;
import com.examhelper.interview.dto.CodingDtos.TestCaseResult;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodingSubmission {
    private String problemId;
    private int problemNumber;
    private String language;
    private String sourceCode;
    private String approach;
    private int hintsUsedCount;
    private long timeSpentSeconds;
    private boolean autoSubmitted;
    private String status; // SUCCESS, COMPILE_ERROR, RUNTIME_ERROR, etc.
    @Builder.Default
    private List<TestCaseResult> visibleTestResults = new ArrayList<>();
    private int visibleTestsPassed;
    private int visibleTestsTotal;
    private int hiddenTestsPassed;
    private int hiddenTestsTotal;
    private boolean allPassed;
    private AiCodingReview aiReview;
}
