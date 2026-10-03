package com.examhelper.interview.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class InterviewReportResponse {
    private double overallRating;
    private Map<String, Double> categoryScores;
    private List<String> strengths;
    private List<String> weaknesses;
    private List<ImprovementArea> improvementAreas;
    private List<QuestionFeedback> questionFeedback;
    private List<ImprovementAction> improvementPlan;
    private CodingDtos.CodingReport codingReport;

    @Data
    public static class ImprovementArea {
        private String area;
        private String currentIssue;
        private String howToImprove;
        private String priority;
    }

    @Data
    public static class QuestionFeedback {
        private int questionNumber;
        private String question;
        private String answer;
        private String evaluation;
        private List<String> whatWasGood;
        private List<String> missingPoints;
        private String improvementAdvice;
        private String betterAnswerDirection;
    }

    @Data
    public static class ImprovementAction {
        private String area;
        private String action;
        private String priority;
    }
}
