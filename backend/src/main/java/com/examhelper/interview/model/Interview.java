package com.examhelper.interview.model;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class Interview {
    private String id = UUID.randomUUID().toString();
    private String jobRole;
    private String interviewType;
    private String difficulty;
    private int totalQuestions;
    private String jobDescription;
    private String resumeText;
    
    private List<InterviewQuestion> qaHistory = new ArrayList<>();
    private String status = "IN_PROGRESS"; // IN_PROGRESS, COMPLETED, FAILED

    // Coding Round specific state
    private String focusTopics;
    private List<CodingProblem> codingProblems = new ArrayList<>();
    private int currentCodingProblemIndex = 0;
    private List<CodingSubmission> codingSubmissions = new ArrayList<>();
    private Long currentProblemTargetEndTimeMs;
    private com.examhelper.interview.dto.CodingDtos.CodingReport codingReport;
}
