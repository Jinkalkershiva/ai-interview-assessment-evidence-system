package com.examhelper.interview.dto;

import com.examhelper.interview.model.CodingProblem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

public class CodingDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CodingProblemDto {
        private String interviewId;
        private String id;
        private int problemNumber;
        private int totalProblems;
        private String title;
        private String difficulty;
        private String description;
        private List<String> constraints;
        private List<CodingProblem.Example> examples;
        private Map<String, String> starterCode;
        private List<CodingProblem.TestCase> visibleTests;
        private List<String> hints;
        private List<String> topics;
        private Map<String, String> expectedComplexity;
        private int timeLimitMinutes;
        private Long targetEndTimeMs;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RunCodeRequest {
        private String language;
        private String sourceCode;
        private String problemId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TestCaseResult {
        private int testIndex;
        private boolean passed;
        private String input;
        private String actualOutput;
        private String expectedOutput;
        private String executionTime;
        private String memory;
        private String errorMessage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RunCodeResponse {
        private String status; // SUCCESS, COMPILE_ERROR, RUNTIME_ERROR, TIME_LIMIT_EXCEEDED, ERROR
        private String compileError;
        private String runtimeError;
        private List<TestCaseResult> tests;
        private boolean allPassed;
        private int passedCount;
        private int totalCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitCodingRequest {
        private String problemId;
        private String language;
        private String sourceCode;
        private String approach;
        private int hintsUsedCount;
        private long timeSpentSeconds;
        private boolean autoSubmitted;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CodingSubmissionResult {
        private String interviewId;
        private String problemId;
        private int problemNumber;
        private int totalProblems;
        private boolean isLastProblem;
        private String status;
        private String compileError;
        private String runtimeError;
        private List<TestCaseResult> visibleTests;
        private int visibleTestsPassed;
        private int visibleTestsTotal;
        private int hiddenTestsPassed;
        private int hiddenTestsTotal;
        private boolean allPassed;
        private CodingProblemDto nextProblem;
        private AiCodingReview review;
        private boolean interviewCompleted;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiCodingReview {
        private int correctness; // 0 - 100
        private int codeQuality; // 0 - 10
        private String timeComplexity;
        private String spaceComplexity;
        private int approachQuality; // 0 - 10
        private double overallScore; // 0 - 10
        private List<String> strengths;
        private List<String> issues;
        private List<String> improvements;
        private String optimalApproach;
        private String explanation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CodingReport {
        private double codingScore; // 0 - 10
        private int problemsAttempted;
        private int problemsCompleted;
        private int totalTestCases;
        private int passedTestCases;
        private int totalHintsUsed;
        private long totalTimeSpentSeconds;
        private List<ProblemReportItem> problemReports;
        private List<String> strengths;
        private List<String> improvementSuggestions;
        private String complexitySummary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProblemReportItem {
        private int problemNumber;
        private String title;
        private String difficulty;
        private String language;
        private boolean solved;
        private int testsPassed;
        private int totalTests;
        private int hintsUsed;
        private long timeSpentSeconds;
        private String timeComplexity;
        private String spaceComplexity;
        private String approach;
        private AiCodingReview review;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CodingStateResponse {
        private String interviewId;
        private String status; // "IN_PROGRESS", "EXPIRED", "SUBMITTED", "COMPLETED"
        private int currentProblemIndex;
        private int totalProblems;
        private CodingProblemDto problem;
        private Long targetEndTimeMs;
        private boolean isExpired;
        private boolean isSubmitted;
        private CodingSubmissionResult lastSubmissionResult;
        private CodingReport codingReport;
    }
}
