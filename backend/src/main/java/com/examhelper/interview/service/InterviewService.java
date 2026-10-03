package com.examhelper.interview.service;

import com.examhelper.common.exception.AppException;
import com.examhelper.extraction.service.FileExtractorService;
import com.examhelper.interview.dto.CodingDtos.*;
import com.examhelper.interview.dto.InterviewQuestionResponse;
import com.examhelper.interview.dto.InterviewReportResponse;
import com.examhelper.interview.dto.SubmitAnswerRequest;
import com.examhelper.interview.model.CodingProblem;
import com.examhelper.interview.model.CodingSubmission;
import com.examhelper.interview.model.Interview;
import com.examhelper.interview.model.InterviewQuestion;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class InterviewService {

    private final FileExtractorService extractor;
    private final InterviewAiService aiService;
    private final CodeExecutionService codeExecutionService;

    // In-memory store for active interviews
    private final Map<String, Interview> activeInterviews = new ConcurrentHashMap<>();

    public InterviewQuestionResponse startInterview(
            MultipartFile resume,
            String jobRole,
            String interviewType,
            String difficulty,
            Integer questionCount,
            String jobDescription) {

        String resumeText = "";
        if (resume != null && !resume.isEmpty()) {
            resumeText = extractor.extract(resume);
        }

        if (resumeText.isBlank() && (jobDescription == null || jobDescription.isBlank())) {
            throw AppException.badRequest("Please provide either a resume or a job description.");
        }

        Interview interview = new Interview();
        interview.setJobRole(jobRole != null ? jobRole : "Software Engineer");
        interview.setInterviewType(interviewType != null ? interviewType : "Mixed");
        interview.setDifficulty(difficulty != null ? difficulty : "Intermediate");
        interview.setTotalQuestions(questionCount != null && questionCount > 0 ? questionCount : 5);
        interview.setJobDescription(jobDescription);
        interview.setResumeText(resumeText);

        log.info("[Interview] Starting interview {} for role {}", interview.getId(), interview.getJobRole());

        // Generate first question
        String firstQuestion = aiService.generateNextQuestion(interview);

        InterviewQuestion q = new InterviewQuestion();
        q.setQuestionNumber(1);
        q.setQuestion(firstQuestion);
        interview.getQaHistory().add(q);

        activeInterviews.put(interview.getId(), interview);

        return new InterviewQuestionResponse(
                interview.getId(),
                1,
                interview.getTotalQuestions(),
                firstQuestion
        );
    }

    public InterviewQuestionResponse submitAnswer(String interviewId, SubmitAnswerRequest request) {
        Interview interview = getInterviewOrThrow(interviewId);
        
        if (interview.getQaHistory().isEmpty()) {
            throw AppException.badRequest("No active question found.");
        }

        // Save the answer to the latest question
        InterviewQuestion currentQ = interview.getQaHistory().get(interview.getQaHistory().size() - 1);
        currentQ.setAnswer(request.getAnswer());

        int nextNum = currentQ.getQuestionNumber() + 1;
        
        if (nextNum > interview.getTotalQuestions()) {
            interview.setStatus("COMPLETED");
            return new InterviewQuestionResponse(interview.getId(), currentQ.getQuestionNumber(), interview.getTotalQuestions(), "INTERVIEW_COMPLETE");
        }

        // Generate next question
        String nextQuestion = aiService.generateNextQuestion(interview);

        InterviewQuestion q = new InterviewQuestion();
        q.setQuestionNumber(nextNum);
        q.setQuestion(nextQuestion);
        interview.getQaHistory().add(q);

        return new InterviewQuestionResponse(
                interview.getId(),
                nextNum,
                interview.getTotalQuestions(),
                nextQuestion
        );
    }

    // ─── Coding Interview Methods ─────────────────────────────────────────────

    public CodingProblemDto startCodingInterview(
            MultipartFile resume,
            String jobRole,
            String difficulty,
            String focusTopics,
            Integer problemCount,
            String jobDescription) {

        String resumeText = "";
        if (resume != null && !resume.isEmpty()) {
            resumeText = extractor.extract(resume);
        }

        Interview interview = new Interview();
        interview.setJobRole(jobRole != null ? jobRole : "Software Engineer");
        interview.setInterviewType("Coding");
        interview.setDifficulty(difficulty != null ? difficulty : "Intermediate");
        int count = (problemCount != null && problemCount > 0 && problemCount <= 2) ? problemCount : 1;
        interview.setTotalQuestions(count);
        interview.setFocusTopics(focusTopics);
        interview.setJobDescription(jobDescription);
        interview.setResumeText(resumeText);

        log.info("[CodingInterview] Generating problem 1 of {} for role: {}, difficulty: {}, focus: {}",
                count, interview.getJobRole(), interview.getDifficulty(), focusTopics);

        CodingProblem problem = aiService.generateCodingProblem(
                interview.getJobRole(), interview.getDifficulty(), focusTopics);

        interview.getCodingProblems().add(problem);
        interview.setCurrentCodingProblemIndex(0);

        long targetEndTimeMs = System.currentTimeMillis() + (problem.getTimeLimitMinutes() * 60 * 1000L);
        interview.setCurrentProblemTargetEndTimeMs(targetEndTimeMs);

        activeInterviews.put(interview.getId(), interview);

        return toProblemDto(interview, problem, 1);
    }

    public RunCodeResponse runCode(String interviewId, RunCodeRequest request) {
        Interview interview = getInterviewOrThrow(interviewId);
        CodingProblem problem = getCurrentCodingProblem(interview, request.getProblemId());

        return codeExecutionService.execute(
                request.getLanguage(),
                request.getSourceCode(),
                problem.getVisibleTests(),
                false
        );
    }

    public CodingSubmissionResult submitCodingSolution(String interviewId, SubmitCodingRequest request) {
        Interview interview = getInterviewOrThrow(interviewId);
        CodingProblem problem = getCurrentCodingProblem(interview, request.getProblemId());

        // Idempotency: verify this problem has not been submitted yet
        boolean alreadySubmitted = interview.getCodingSubmissions().stream()
                .anyMatch(s -> s.getProblemId().equals(problem.getId()));
        if (alreadySubmitted) {
            throw AppException.badRequest("Solution for this problem has already been submitted.");
        }

        // Server-side deadline validation
        Long deadline = interview.getCurrentProblemTargetEndTimeMs();
        if (deadline != null && System.currentTimeMillis() > deadline) {
            log.warn("[CodingInterview] Submission rejected: deadline expired for interview {} problem {}",
                    interview.getId(), problem.getId());
            interview.setStatus("EXPIRED");
            throw AppException.badRequest("Coding interview time has expired.");
        }

        log.info("[CodingInterview] Running execution tests for interview {} problem {}",
                interview.getId(), problem.getId());

        // Execute visible tests
        RunCodeResponse visibleRes = codeExecutionService.execute(
                request.getLanguage(),
                request.getSourceCode(),
                problem.getVisibleTests(),
                false
        );

        // Execute hidden tests (authoritative for sandbox result, outputs sanitized)
        RunCodeResponse hiddenRes = codeExecutionService.execute(
                request.getLanguage(),
                request.getSourceCode(),
                problem.getHiddenTests(),
                true
        );

        boolean allPassed = visibleRes.isAllPassed() && hiddenRes.isAllPassed();
        String finalStatus = "SUCCESS";
        if (visibleRes.getCompileError() != null || hiddenRes.getCompileError() != null) {
            finalStatus = "COMPILE_ERROR";
        } else if (visibleRes.getRuntimeError() != null || hiddenRes.getRuntimeError() != null) {
            finalStatus = "RUNTIME_ERROR";
        } else if (!allPassed) {
            finalStatus = "WRONG_ANSWER";
        }

        int problemNumber = interview.getCurrentCodingProblemIndex() + 1;
        boolean isLast = problemNumber >= interview.getTotalQuestions();

        // Build submission record
        CodingSubmission submission = CodingSubmission.builder()
                .problemId(problem.getId())
                .problemNumber(problemNumber)
                .language(request.getLanguage())
                .sourceCode(request.getSourceCode())
                .approach(request.getApproach())
                .hintsUsedCount(request.getHintsUsedCount())
                .timeSpentSeconds(request.getTimeSpentSeconds())
                .autoSubmitted(request.isAutoSubmitted())
                .status(finalStatus)
                .visibleTestResults(visibleRes.getTests())
                .visibleTestsPassed(visibleRes.getPassedCount())
                .visibleTestsTotal(visibleRes.getTotalCount())
                .hiddenTestsPassed(hiddenRes.getPassedCount())
                .hiddenTestsTotal(hiddenRes.getTotalCount())
                .allPassed(allPassed)
                .build();

        // AI qualitative evaluation (authoritative test counts fed to AI)
        AiCodingReview review = aiService.evaluateCodingSubmission(problem, submission);
        submission.setAiReview(review);
        interview.getCodingSubmissions().add(submission);

        CodingProblemDto nextProblemDto = null;
        if (!isLast) {
            // Generate next problem
            log.info("[CodingInterview] Generating problem {} of {}", problemNumber + 1, interview.getTotalQuestions());
            CodingProblem nextProblem = aiService.generateCodingProblem(
                    interview.getJobRole(), interview.getDifficulty(), interview.getFocusTopics());
            interview.getCodingProblems().add(nextProblem);
            interview.setCurrentCodingProblemIndex(problemNumber);

            long nextTargetEnd = System.currentTimeMillis() + (nextProblem.getTimeLimitMinutes() * 60 * 1000L);
            interview.setCurrentProblemTargetEndTimeMs(nextTargetEnd);

            nextProblemDto = toProblemDto(interview, nextProblem, problemNumber + 1);
        } else {
            // Generate final report
            CodingReport codingReport = aiService.generateOverallCodingReport(interview);
            interview.setCodingReport(codingReport);
            interview.setStatus("COMPLETED");
        }

        return CodingSubmissionResult.builder()
                .interviewId(interview.getId())
                .problemId(problem.getId())
                .problemNumber(problemNumber)
                .totalProblems(interview.getTotalQuestions())
                .isLastProblem(isLast)
                .status(finalStatus)
                .compileError(visibleRes.getCompileError() != null ? visibleRes.getCompileError() : hiddenRes.getCompileError())
                .runtimeError(visibleRes.getRuntimeError() != null ? visibleRes.getRuntimeError() : hiddenRes.getRuntimeError())
                .visibleTests(visibleRes.getTests())
                .visibleTestsPassed(visibleRes.getPassedCount())
                .visibleTestsTotal(visibleRes.getTotalCount())
                .hiddenTestsPassed(hiddenRes.getPassedCount())
                .hiddenTestsTotal(hiddenRes.getTotalCount())
                .allPassed(allPassed)
                .nextProblem(nextProblemDto)
                .review(review)
                .interviewCompleted(isLast)
                .build();
    }

    public CodingStateResponse getCodingInterviewState(String interviewId) {
        Interview interview = getInterviewOrThrow(interviewId);
        if (!"Coding".equalsIgnoreCase(interview.getInterviewType())) {
            throw AppException.badRequest("Interview session is not a coding interview.");
        }

        CodingProblem problem = getCurrentCodingProblem(interview, null);
        int problemNumber = interview.getCurrentCodingProblemIndex() + 1;
        CodingProblemDto problemDto = toProblemDto(interview, problem, problemNumber);

        Long deadline = interview.getCurrentProblemTargetEndTimeMs();
        boolean isExpired = (deadline != null && System.currentTimeMillis() > deadline);
        if (isExpired && !"COMPLETED".equals(interview.getStatus())) {
            interview.setStatus("EXPIRED");
        }

        // Check if current problem has been submitted
        Optional<CodingSubmission> subOpt = interview.getCodingSubmissions().stream()
                .filter(s -> s.getProblemId().equals(problem.getId()))
                .findFirst();

        boolean isSubmitted = subOpt.isPresent();
        CodingSubmissionResult lastSubResult = null;
        if (isSubmitted) {
            CodingSubmission sub = subOpt.get();
            boolean isLast = problemNumber >= interview.getTotalQuestions();
            lastSubResult = CodingSubmissionResult.builder()
                    .interviewId(interview.getId())
                    .problemId(problem.getId())
                    .problemNumber(problemNumber)
                    .totalProblems(interview.getTotalQuestions())
                    .isLastProblem(isLast)
                    .status(sub.getStatus())
                    .visibleTests(sub.getVisibleTestResults())
                    .visibleTestsPassed(sub.getVisibleTestsPassed())
                    .visibleTestsTotal(sub.getVisibleTestsTotal())
                    .hiddenTestsPassed(sub.getHiddenTestsPassed())
                    .hiddenTestsTotal(sub.getHiddenTestsTotal())
                    .allPassed(sub.isAllPassed())
                    .review(sub.getAiReview())
                    .interviewCompleted("COMPLETED".equals(interview.getStatus()))
                    .build();
        }

        return CodingStateResponse.builder()
                .interviewId(interview.getId())
                .status(interview.getStatus())
                .currentProblemIndex(interview.getCurrentCodingProblemIndex())
                .totalProblems(interview.getTotalQuestions())
                .problem(problemDto)
                .targetEndTimeMs(interview.getCurrentProblemTargetEndTimeMs())
                .isExpired(isExpired || "EXPIRED".equals(interview.getStatus()))
                .isSubmitted(isSubmitted)
                .lastSubmissionResult(lastSubResult)
                .codingReport(interview.getCodingReport())
                .build();
    }

    public InterviewReportResponse evaluateInterview(String interviewId) {
        Interview interview = getInterviewOrThrow(interviewId);
        
        log.info("[Interview] Evaluating interview {}", interview.getId());

        if ("Coding".equalsIgnoreCase(interview.getInterviewType())) {
            CodingReport codingReport = interview.getCodingReport();
            if (codingReport == null) {
                codingReport = aiService.generateOverallCodingReport(interview);
                interview.setCodingReport(codingReport);
            }

            InterviewReportResponse report = new InterviewReportResponse();
            report.setOverallRating(codingReport.getCodingScore());

            Map<String, Double> categoryScores = new LinkedHashMap<>();
            categoryScores.put("coding", codingReport.getCodingScore());
            categoryScores.put("problemSolving", Math.min(10.0, codingReport.getCodingScore()));
            categoryScores.put("technicalKnowledge", Math.min(10.0, Math.round((codingReport.getCodingScore() + 0.5) * 10.0) / 10.0));
            categoryScores.put("clarity", 8.0);
            report.setCategoryScores(categoryScores);

            report.setStrengths(codingReport.getStrengths());
            report.setWeaknesses(codingReport.getImprovementSuggestions());
            report.setCodingReport(codingReport);
            report.setQuestionFeedback(new ArrayList<>());
            report.setImprovementAreas(new ArrayList<>());
            report.setImprovementPlan(new ArrayList<>());

            interview.setStatus("COMPLETED");
            return report;
        }
        
        InterviewReportResponse report = aiService.evaluateInterview(interview);
        interview.setStatus("COMPLETED");
        
        return report;
    }

    private CodingProblem getCurrentCodingProblem(Interview interview, String problemId) {
        if (interview.getCodingProblems().isEmpty()) {
            throw AppException.badRequest("No coding problem found in this interview.");
        }
        if (problemId != null && !problemId.isBlank()) {
            return interview.getCodingProblems().stream()
                    .filter(p -> p.getId().equals(problemId))
                    .findFirst()
                    .orElseThrow(() -> AppException.notFound("Problem " + problemId + " not found."));
        }
        int idx = interview.getCurrentCodingProblemIndex();
        if (idx < 0 || idx >= interview.getCodingProblems().size()) {
            idx = 0;
        }
        return interview.getCodingProblems().get(idx);
    }

    private CodingProblemDto toProblemDto(Interview interview, CodingProblem problem, int problemNumber) {
        return CodingProblemDto.builder()
                .interviewId(interview.getId())
                .id(problem.getId())
                .problemNumber(problemNumber)
                .totalProblems(interview.getTotalQuestions())
                .title(problem.getTitle())
                .difficulty(problem.getDifficulty())
                .description(problem.getDescription())
                .constraints(problem.getConstraints())
                .examples(problem.getExamples())
                .starterCode(problem.getStarterCode())
                .visibleTests(problem.getVisibleTests()) // visible only
                .hints(problem.getHints())
                .topics(problem.getTopics())
                .expectedComplexity(problem.getExpectedComplexity())
                .timeLimitMinutes(problem.getTimeLimitMinutes())
                .targetEndTimeMs(interview.getCurrentProblemTargetEndTimeMs())
                .build();
    }

    public Interview getInterviewOrThrow(String interviewId) {
        Interview interview = activeInterviews.get(interviewId);
        if (interview == null) {
            throw AppException.notFound("Interview session not found or expired.");
        }
        return interview;
    }
}
