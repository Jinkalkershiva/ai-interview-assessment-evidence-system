package com.examhelper.interview.service;

import com.examhelper.interview.dto.InterviewReportResponse;
import com.examhelper.interview.model.Interview;

public interface InterviewAiService {
    String generateNextQuestion(Interview interview);
    InterviewReportResponse evaluateInterview(Interview interview);

    com.examhelper.interview.model.CodingProblem generateCodingProblem(String jobRole, String difficulty, String focusTopics);
    com.examhelper.interview.dto.CodingDtos.AiCodingReview evaluateCodingSubmission(com.examhelper.interview.model.CodingProblem problem, com.examhelper.interview.model.CodingSubmission submission);
    com.examhelper.interview.dto.CodingDtos.CodingReport generateOverallCodingReport(Interview interview);
}
