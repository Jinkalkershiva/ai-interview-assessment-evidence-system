package com.examhelper.interview.service;

import com.examhelper.common.exception.AppException;
import com.examhelper.interview.dto.CodingDtos;
import com.examhelper.interview.dto.CodingDtos.AiCodingReview;
import com.examhelper.interview.dto.CodingDtos.CodingReport;
import com.examhelper.interview.dto.CodingDtos.ProblemReportItem;
import com.examhelper.interview.dto.InterviewReportResponse;
import com.examhelper.interview.model.CodingProblem;
import com.examhelper.interview.model.CodingSubmission;
import com.examhelper.interview.model.Interview;
import com.examhelper.interview.model.InterviewQuestion;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class SpringAiInterviewService implements InterviewAiService {

    private final ChatClient chatClient;
    private final ObjectMapper mapper = new ObjectMapper();

    public SpringAiInterviewService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    private static final String INTERVIEWER_SYSTEM_PROMPT = """
            You are a professional technical and behavioral interviewer.
            Conduct a realistic interview for the role of '%s' at the '%s' difficulty level.
            Interview Type: %s
            
            Guidelines:
            - Use the supplied resume as the absolute source of truth for candidate-specific experience.
            - Do not invent projects, technologies, certifications, employment, or achievements.
            - If a technology (e.g., Kubernetes) is not on the resume, you may ask about it only if it's generally expected for the role, but treat it as a general question, not as something they claim to have done.
            - Ask ONE question at a time.
            - Use previous answers to generate relevant, adaptive follow-up questions.
            - Technical questions should test actual understanding, trade-offs, and architecture.
            - Behavioral questions should use realistic workplace situations.
            - Do NOT reveal the expected answer before the candidate answers.
            - Output ONLY the question text. Nothing else.
            """;

    @Value("${spring.ai.openai.api-key:}")
    private String apiKey;

    private void validateApiKey() {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("mock-key") || apiKey.equals("your_gemini_api_key_here")) {
            throw AppException.serverError("Backend configuration error: GEMINI_API_KEY is missing or invalid.");
        }
    }

    @Override
    public String generateNextQuestion(Interview interview) {
        validateApiKey();

        String sys = String.format(INTERVIEWER_SYSTEM_PROMPT,
                interview.getJobRole(), interview.getDifficulty(), interview.getInterviewType());

        StringBuilder prompt = new StringBuilder();
        prompt.append("Candidate Resume:\n").append(interview.getResumeText()).append("\n\n");
        if (interview.getJobDescription() != null && !interview.getJobDescription().isBlank()) {
            prompt.append("Job Description:\n").append(interview.getJobDescription()).append("\n\n");
        }

        if (!interview.getQaHistory().isEmpty()) {
            prompt.append("Interview History So Far:\n");
            for (InterviewQuestion q : interview.getQaHistory()) {
                prompt.append("Q").append(q.getQuestionNumber()).append(": ").append(q.getQuestion()).append("\n");
                prompt.append("A").append(q.getQuestionNumber()).append(": ").append(q.getAnswer()).append("\n\n");
            }
        }

        int nextNum = interview.getQaHistory().size() + 1;
        prompt.append("Generate question ").append(nextNum).append(" of ").append(interview.getTotalQuestions()).append(". Output ONLY the question.");

        try {
            return chatClient.prompt()
                    .system(sys)
                    .user(prompt.toString())
                    .call()
                    .content().strip();
        } catch (Exception e) {
            throw handleAiException("generating question", e);
        }
    }

    private static final String EVALUATOR_SYSTEM_PROMPT = """
            You are a strict but fair interview evaluator.
            Return ONLY valid JSON exactly matching the requested schema. Do not include markdown fences (```json ... ```).
            """;

    @Override
    public InterviewReportResponse evaluateInterview(Interview interview) {
        validateApiKey();

        StringBuilder prompt = new StringBuilder();
        prompt.append("Role: ").append(interview.getJobRole()).append(" (").append(interview.getDifficulty()).append(")\n");
        prompt.append("Interview Type: ").append(interview.getInterviewType()).append("\n\n");
        prompt.append("Resume:\n").append(interview.getResumeText()).append("\n\n");
        prompt.append("Transcript:\n");
        for (InterviewQuestion q : interview.getQaHistory()) {
            prompt.append("Q").append(q.getQuestionNumber()).append(": ").append(q.getQuestion()).append("\n");
            prompt.append("A").append(q.getQuestionNumber()).append(": ").append(q.getAnswer()).append("\n\n");
        }

        prompt.append("""
            Evaluate the candidate using the resume content and answers.
            Return JSON exactly matching this schema:
            {
              "overallRating": 7.4,
              "categoryScores": {
                "technicalKnowledge": 7.8,
                "communication": 7.2,
                "clarity": 7.5,
                "relevance": 7.4,
                "problemSolving": 6.8,
                "projectUnderstanding": 8.0
              },
              "strengths": ["..."],
              "weaknesses": ["..."],
              "improvementAreas": [
                {
                  "area": "...",
                  "currentIssue": "...",
                  "howToImprove": "...",
                  "priority": "HIGH"
                }
              ],
              "questionFeedback": [
                {
                  "questionNumber": 1,
                  "question": "...",
                  "answer": "...",
                  "evaluation": "...",
                  "whatWasGood": ["..."],
                  "missingPoints": ["..."],
                  "improvementAdvice": "...",
                  "betterAnswerDirection": "..."
                }
              ],
              "improvementPlan": [
                {
                  "area": "...",
                  "action": "...",
                  "priority": "HIGH"
                }
              ]
            }
            All scores are out of 10 (can use decimals). priority must be HIGH, MEDIUM, or LOW.
            Be specific in improvementAreas: tell the user WHAT is weak, WHY, WHERE to improve, and HOW to improve.
            """);

        try {
            String rawJson = chatClient.prompt()
                    .system(EVALUATOR_SYSTEM_PROMPT)
                    .user(prompt.toString())
                    .call()
                    .content().strip();
            
            rawJson = stripFences(rawJson);
            return mapper.readValue(rawJson, InterviewReportResponse.class);
        } catch (Exception e) {
            throw handleAiException("evaluating interview", e);
        }
    }

    @Override
    public CodingProblem generateCodingProblem(String jobRole, String difficulty, String focusTopics) {
        validateApiKey();

        String topics = (focusTopics != null && !focusTopics.isBlank()) ? focusTopics : "Data Structures and Algorithms";
        String prompt = String.format("""
                Generate a real, production-ready coding challenge for an interview.
                Role: %s
                Difficulty: %s
                Focus Topics: %s

                Format requirements:
                - The problem must use standard I/O (reads from standard input, writes to standard output).
                - Provide 2 clear examples with input, output, and explanation.
                - Provide 2 to 3 visible test cases for candidate testing.
                - Provide 3 to 5 hidden test cases including edge cases (e.g. empty/single elements, negative values, boundary values).
                - Provide working starter code for Java, Python, and JavaScript that includes reading standard input and writing to standard output.
                - Provide 2 to 3 hints that guide without revealing the full solution.
                - Return ONLY valid JSON matching this schema:
                {
                  "title": "Problem Title",
                  "difficulty": "%s",
                  "description": "Problem statement with input and output specification...",
                  "constraints": ["1 <= n <= 10^5"],
                  "examples": [
                    { "input": "...", "output": "...", "explanation": "..." }
                  ],
                  "starterCode": {
                    "java": "import java.util.*;\\n\\nclass Solution {\\n    public static void main(String[] args) {\\n        Scanner scanner = new Scanner(System.in);\\n        // Solve here\\n    }\\n}",
                    "python": "import sys\\n\\ndef main():\\n    input_data = sys.stdin.read().strip()\\n    # Solve here\\n\\nif __name__ == '__main__':\\n    main()",
                    "javascript": "const fs = require('fs');\\n\\nfunction main() {\\n    const input = fs.readFileSync(0, 'utf-8').trim();\\n    // Solve here\\n}\\n\\nmain();"
                  },
                  "visibleTests": [
                    { "input": "...", "expectedOutput": "..." }
                  ],
                  "hiddenTests": [
                    { "input": "...", "expectedOutput": "..." }
                  ],
                  "hints": [
                    "Hint 1...",
                    "Hint 2...",
                    "Hint 3..."
                  ],
                  "topics": ["arrays", "strings"],
                  "expectedComplexity": {
                    "time": "O(N)",
                    "space": "O(N)"
                  },
                  "timeLimitMinutes": 20
                }
                """, jobRole, difficulty, topics, difficulty);

        try {
            String rawJson = chatClient.prompt()
                    .system("You are a technical coding interviewer. Return ONLY valid JSON with no markdown code fences.")
                    .user(prompt)
                    .call()
                    .content().strip();

            rawJson = stripFences(rawJson);
            CodingProblem problem = mapper.readValue(rawJson, CodingProblem.class);
            if (problem.getId() == null || problem.getId().isBlank()) {
                problem.setId(java.util.UUID.randomUUID().toString());
            }
            if (problem.getTimeLimitMinutes() <= 0) {
                problem.setTimeLimitMinutes(20);
            }
            ensureStarterCode(problem);
            return problem;
        } catch (Exception e) {
            throw handleAiException("generating coding problem", e);
        }
    }

    private void ensureStarterCode(CodingProblem problem) {
        if (problem.getStarterCode() == null) {
            problem.setStarterCode(new HashMap<>());
        }
        if (!problem.getStarterCode().containsKey("java") || problem.getStarterCode().get("java").isBlank()) {
            problem.getStarterCode().put("java", "import java.util.*;\n\nclass Solution {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Write your solution here\n    }\n}");
        }
        if (!problem.getStarterCode().containsKey("python") || problem.getStarterCode().get("python").isBlank()) {
            problem.getStarterCode().put("python", "import sys\n\ndef main():\n    input_data = sys.stdin.read().strip()\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()");
        }
        if (!problem.getStarterCode().containsKey("javascript") || problem.getStarterCode().get("javascript").isBlank()) {
            problem.getStarterCode().put("javascript", "const fs = require('fs');\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim();\n    // Write your solution here\n}\n\nmain();");
        }
    }

    @Override
    public AiCodingReview evaluateCodingSubmission(CodingProblem problem, CodingSubmission submission) {
        validateApiKey();

        StringBuilder sb = new StringBuilder();
        sb.append("Problem Title: ").append(problem.getTitle()).append(" (").append(problem.getDifficulty()).append(")\n");
        sb.append("Description: ").append(problem.getDescription()).append("\n");
        sb.append("Expected Complexity: ").append(problem.getExpectedComplexity()).append("\n\n");
        sb.append("Candidate Language: ").append(submission.getLanguage()).append("\n");
        sb.append("Candidate Approach Explanation: ").append(submission.getApproach() != null ? submission.getApproach() : "None provided").append("\n");
        sb.append("Candidate Source Code:\n").append(submission.getSourceCode()).append("\n\n");
        sb.append("Execution Status: ").append(submission.getStatus()).append("\n");
        sb.append("Visible Tests: ").append(submission.getVisibleTestsPassed()).append(" / ").append(submission.getVisibleTestsTotal()).append(" passed\n");
        sb.append("Hidden Tests: ").append(submission.getHiddenTestsPassed()).append(" / ").append(submission.getHiddenTestsTotal()).append(" passed\n");
        sb.append("Hints Used: ").append(submission.getHintsUsedCount()).append("\n");
        sb.append("Time Spent: ").append(submission.getTimeSpentSeconds()).append(" seconds\n");

        sb.append("""
            CRITICAL INSTRUCTIONS:
            - The test results above are AUTHORITATIVE. Do NOT claim the candidate passed all tests if they failed test cases.
            - Evaluate code quality, idiomatic constructs, algorithm reasoning, edge case handling, and time/space complexity.
            - Return JSON matching this schema exactly:
            {
              "correctness": 80,
              "codeQuality": 8,
              "timeComplexity": "O(N)",
              "spaceComplexity": "O(1)",
              "approachQuality": 8,
              "overallScore": 8.0,
              "strengths": ["...", "..."],
              "issues": ["...", "..."],
              "improvements": ["...", "..."],
              "optimalApproach": "Detailed optimal approach...",
              "explanation": "Summary review..."
            }
            """);

        try {
            String rawJson = chatClient.prompt()
                    .system("You are an expert technical interviewer reviewing code. Return ONLY valid JSON without markdown fences.")
                    .user(sb.toString())
                    .call()
                    .content().strip();

            rawJson = stripFences(rawJson);
            return mapper.readValue(rawJson, AiCodingReview.class);
        } catch (Exception e) {
            log.error("[Interview AI] Error evaluating coding submission: ", e);
            // Fallback review calculation if LLM review encounters an issue
            double ratio = (submission.getVisibleTestsTotal() + submission.getHiddenTestsTotal() > 0)
                    ? (double) (submission.getVisibleTestsPassed() + submission.getHiddenTestsPassed()) / (submission.getVisibleTestsTotal() + submission.getHiddenTestsTotal())
                    : 0.0;
            double score = Math.round(ratio * 100.0) / 10.0;
            return AiCodingReview.builder()
                    .correctness((int) (ratio * 100))
                    .codeQuality(7)
                    .timeComplexity(problem.getExpectedComplexity().getOrDefault("time", "O(N)"))
                    .spaceComplexity(problem.getExpectedComplexity().getOrDefault("space", "O(1)"))
                    .approachQuality(submission.getApproach() != null && !submission.getApproach().isBlank() ? 7 : 5)
                    .overallScore(score)
                    .strengths(List.of("Submitted executable code", "Followed problem specifications"))
                    .issues(List.of("Review generated via automated metrics"))
                    .improvements(List.of("Consider additional edge-case verification"))
                    .optimalApproach("Refer to expected complexity: " + problem.getExpectedComplexity())
                    .explanation("Candidate passed " + (submission.getVisibleTestsPassed() + submission.getHiddenTestsPassed()) + " tests.")
                    .build();
        }
    }

    @Override
    public CodingReport generateOverallCodingReport(Interview interview) {
        List<CodingSubmission> submissions = interview.getCodingSubmissions();
        if (submissions.isEmpty()) {
            return CodingReport.builder()
                    .codingScore(0.0)
                    .problemsAttempted(0)
                    .problemsCompleted(0)
                    .totalTestCases(0)
                    .passedTestCases(0)
                    .totalHintsUsed(0)
                    .totalTimeSpentSeconds(0)
                    .problemReports(new ArrayList<>())
                    .strengths(List.of())
                    .improvementSuggestions(List.of())
                    .complexitySummary("No problems attempted")
                    .build();
        }

        int totalAttempted = submissions.size();
        int totalCompleted = 0;
        int totalTests = 0;
        int passedTests = 0;
        int totalHints = 0;
        long totalTimeSpent = 0;
        double sumScores = 0.0;
        List<ProblemReportItem> reportItems = new ArrayList<>();
        List<String> allStrengths = new ArrayList<>();
        List<String> allImprovements = new ArrayList<>();

        for (CodingSubmission sub : submissions) {
            int subTotalTests = sub.getVisibleTestsTotal() + sub.getHiddenTestsTotal();
            int subPassedTests = sub.getVisibleTestsPassed() + sub.getHiddenTestsPassed();
            totalTests += subTotalTests;
            passedTests += subPassedTests;
            totalHints += sub.getHintsUsedCount();
            totalTimeSpent += sub.getTimeSpentSeconds();
            if ("SUCCESS".equals(sub.getStatus()) || sub.isAllPassed()) {
                totalCompleted++;
            }

            AiCodingReview review = sub.getAiReview();
            if (review != null) {
                sumScores += review.getOverallScore();
                if (review.getStrengths() != null) allStrengths.addAll(review.getStrengths());
                if (review.getImprovements() != null) allImprovements.addAll(review.getImprovements());
            } else {
                double pct = subTotalTests > 0 ? ((double) subPassedTests / subTotalTests) * 10.0 : 0.0;
                sumScores += pct;
            }

            // Find matching problem
            CodingProblem problem = interview.getCodingProblems().stream()
                    .filter(p -> p.getId().equals(sub.getProblemId()))
                    .findFirst()
                    .orElse(null);

            reportItems.add(ProblemReportItem.builder()
                    .problemNumber(sub.getProblemNumber())
                    .title(problem != null ? problem.getTitle() : "Problem " + sub.getProblemNumber())
                    .difficulty(problem != null ? problem.getDifficulty() : "MEDIUM")
                    .language(sub.getLanguage())
                    .solved(sub.isAllPassed())
                    .testsPassed(subPassedTests)
                    .totalTests(subTotalTests)
                    .hintsUsed(sub.getHintsUsedCount())
                    .timeSpentSeconds(sub.getTimeSpentSeconds())
                    .timeComplexity(review != null ? review.getTimeComplexity() : "O(N)")
                    .spaceComplexity(review != null ? review.getSpaceComplexity() : "O(1)")
                    .approach(sub.getApproach())
                    .review(review)
                    .build());
        }

        double avgScore = Math.round((sumScores / totalAttempted) * 10.0) / 10.0;

        return CodingReport.builder()
                .codingScore(avgScore)
                .problemsAttempted(totalAttempted)
                .problemsCompleted(totalCompleted)
                .totalTestCases(totalTests)
                .passedTestCases(passedTests)
                .totalHintsUsed(totalHints)
                .totalTimeSpentSeconds(totalTimeSpent)
                .problemReports(reportItems)
                .strengths(allStrengths.stream().distinct().limit(4).toList())
                .improvementSuggestions(allImprovements.stream().distinct().limit(4).toList())
                .complexitySummary("Completed with average score: " + avgScore + "/10")
                .build();
    }

    private AppException handleAiException(String action, Exception e) {
        log.error("[Interview AI] Error {}: {}", action, e.getMessage(), e);

        int statusCode = extractStatusCode(e);
        String msg = (e.getMessage() != null) ? e.getMessage().toLowerCase() : "";
        String exClass = e.getClass().getName().toLowerCase();

        if (statusCode == 429 || exClass.contains("ratelimit") || msg.contains("resource_exhausted") || msg.contains("quota exceeded") || msg.contains("rate limit")) {
            return AppException.serverError("AI analysis is temporarily unavailable because the Gemini quota has been exhausted. Please try again later.");
        }
        if (statusCode == 401 || exClass.contains("auth") || msg.contains("unauthenticated") || msg.contains("unauthorized") || msg.contains("invalid api key")) {
            return AppException.serverError("AI service credentials unauthorized. Please verify your API key.");
        }
        if (statusCode == 403 || msg.contains("permission_denied") || msg.contains("forbidden")) {
            return AppException.serverError("AI service permission denied for the requested resource.");
        }
        if (statusCode == 400 || msg.contains("invalid_argument") || msg.contains("bad request")) {
            return AppException.serverError("Invalid request sent to AI service.");
        }
        if (statusCode == 404 || msg.contains("not_found") || msg.contains("model not found")) {
            return AppException.serverError("Configured AI model or endpoint not found.");
        }
        if (statusCode >= 500 || msg.contains("unavailable") || msg.contains("internal error")) {
            return AppException.serverError("AI provider service is temporarily unavailable.");
        }

        return AppException.serverError("AI processing error. Please try again later.");
    }

    private int extractStatusCode(Throwable e) {
        Throwable curr = e;
        while (curr != null) {
            if (curr instanceof org.springframework.web.client.RestClientResponseException rcre) {
                return rcre.getStatusCode().value();
            }
            try {
                var method = curr.getClass().getMethod("statusCode");
                Object val = method.invoke(curr);
                if (val instanceof Integer i) {
                    return i;
                }
            } catch (Exception ignored) {}
            if (curr.getMessage() != null) {
                var matcher = java.util.regex.Pattern.compile("\\b(4[0-9]{2}|5[0-9]{2})\\b").matcher(curr.getMessage());
                if (matcher.find()) {
                    try {
                        return Integer.parseInt(matcher.group(1));
                    } catch (Exception ignored) {}
                }
            }
            curr = curr.getCause();
        }
        return -1;
    }

    private String stripFences(String raw) {
        if (raw == null) return "{}";
        String s = raw.strip();
        if (s.startsWith("```")) {
            s = s.replaceAll("(?s)^```[a-z]*\\s*", "").replaceAll("```\\s*$", "").strip();
        }
        return s;
    }
}
