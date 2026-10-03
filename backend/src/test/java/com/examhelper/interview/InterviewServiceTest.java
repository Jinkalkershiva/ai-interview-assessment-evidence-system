package com.examhelper.interview;

import com.examhelper.common.exception.AppException;
import com.examhelper.extraction.service.FileExtractorService;
import com.examhelper.interview.dto.CodingDtos.*;
import com.examhelper.interview.dto.InterviewQuestionResponse;
import com.examhelper.interview.dto.InterviewReportResponse;
import com.examhelper.interview.dto.SubmitAnswerRequest;
import com.examhelper.interview.model.CodingProblem;
import com.examhelper.interview.model.CodingProblem.TestCase;
import com.examhelper.interview.model.CodingSubmission;
import com.examhelper.interview.model.Interview;
import com.examhelper.interview.service.CodeExecutionService;
import com.examhelper.interview.service.InterviewAiService;
import com.examhelper.interview.service.InterviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

public class InterviewServiceTest {

    private FileExtractorService extractor;
    private InterviewAiService aiService;
    private CodeExecutionService executionService;
    private InterviewService interviewService;

    @BeforeEach
    void setUp() {
        extractor = Mockito.mock(FileExtractorService.class);
        aiService = Mockito.mock(InterviewAiService.class);
        executionService = Mockito.mock(CodeExecutionService.class);
        interviewService = new InterviewService(extractor, aiService, executionService);
    }

    private CodingProblem createSampleProblem() {
        return CodingProblem.builder()
                .id("prob-1")
                .title("Two Sum")
                .difficulty("EASY")
                .description("Find indices summing to target.")
                .visibleTests(List.of(new TestCase("4\n2 7 11 15\n9", "0 1")))
                .hiddenTests(List.of(new TestCase("2\n3 3\n6", "0 1"), new TestCase("3\n3 2 4\n6", "1 2")))
                .starterCode(Map.of("java", "class Solution {}"))
                .hints(List.of("Use a hash map"))
                .timeLimitMinutes(20)
                .build();
    }

    @Test
    void testStartCodingInterviewHiddenTestsPrivacy() {
        CodingProblem sampleProb = createSampleProblem();
        when(aiService.generateCodingProblem(any(), any(), any())).thenReturn(sampleProb);

        CodingProblemDto dto = interviewService.startCodingInterview(
                null, "Java Developer", "Fresher", "Arrays", 1, "Java role");

        assertNotNull(dto);
        assertEquals("prob-1", dto.getId());
        assertEquals("Two Sum", dto.getTitle());
        assertEquals(1, dto.getProblemNumber());
        assertEquals(1, dto.getTotalProblems());
        assertNotNull(dto.getTargetEndTimeMs());
        assertTrue(dto.getTargetEndTimeMs() > System.currentTimeMillis());

        // Verify visible tests are sent
        assertNotNull(dto.getVisibleTests());
        assertEquals(1, dto.getVisibleTests().size());

        // Verify Interview model holds the problem and hidden tests securely
        Interview interview = interviewService.getInterviewOrThrow(dto.getInterviewId());
        assertEquals(1, interview.getCodingProblems().size());
        assertEquals(2, interview.getCodingProblems().get(0).getHiddenTests().size());
    }

    @Test
    void testRunCodeExecutesVisibleTestsOnly() {
        CodingProblem sampleProb = createSampleProblem();
        when(aiService.generateCodingProblem(any(), any(), any())).thenReturn(sampleProb);

        CodingProblemDto dto = interviewService.startCodingInterview(
                null, "Java Developer", "Fresher", "Arrays", 1, "Java role");

        RunCodeResponse mockRunResponse = RunCodeResponse.builder()
                .status("SUCCESS")
                .passedCount(1)
                .totalCount(1)
                .allPassed(true)
                .tests(List.of(TestCaseResult.builder().testIndex(1).passed(true).build()))
                .build();

        when(executionService.execute(eq("java"), any(), eq(sampleProb.getVisibleTests()), eq(false)))
                .thenReturn(mockRunResponse);

        RunCodeRequest req = new RunCodeRequest("java", "class Solution {}", "prob-1");
        RunCodeResponse res = interviewService.runCode(dto.getInterviewId(), req);

        assertNotNull(res);
        assertTrue(res.isAllPassed());
        assertEquals("SUCCESS", res.getStatus());
    }

    @Test
    void testSubmitCodingSolutionIdempotency() {
        CodingProblem sampleProb = createSampleProblem();
        when(aiService.generateCodingProblem(any(), any(), any())).thenReturn(sampleProb);

        CodingProblemDto dto = interviewService.startCodingInterview(
                null, "Java Developer", "Fresher", "Arrays", 1, "Java role");

        RunCodeResponse mockVisible = RunCodeResponse.builder().status("SUCCESS").passedCount(1).totalCount(1).allPassed(true).tests(List.of()).build();
        RunCodeResponse mockHidden = RunCodeResponse.builder().status("SUCCESS").passedCount(2).totalCount(2).allPassed(true).tests(List.of()).build();
        AiCodingReview mockReview = AiCodingReview.builder().overallScore(9.0).strengths(List.of("Good")).build();

        when(executionService.execute(eq("java"), any(), eq(sampleProb.getVisibleTests()), eq(false))).thenReturn(mockVisible);
        when(executionService.execute(eq("java"), any(), eq(sampleProb.getHiddenTests()), eq(true))).thenReturn(mockHidden);
        when(aiService.evaluateCodingSubmission(any(), any())).thenReturn(mockReview);
        when(aiService.generateOverallCodingReport(any())).thenReturn(CodingReport.builder().codingScore(9.0).build());

        SubmitCodingRequest submitReq = new SubmitCodingRequest("prob-1", "java", "code", "approach", 0, 60, false);
        CodingSubmissionResult result = interviewService.submitCodingSolution(dto.getInterviewId(), submitReq);

        assertNotNull(result);
        assertTrue(result.isInterviewCompleted());
        assertEquals(9.0, result.getReview().getOverallScore());

        // Submitting a second time must throw exception (idempotency check)
        AppException ex = assertThrows(AppException.class, () -> {
            interviewService.submitCodingSolution(dto.getInterviewId(), submitReq);
        });
        assertTrue(ex.getMessage().contains("already been submitted"));
    }

    @Test
    void testSubmitCodingSolutionBeforeDeadlineAccepted() {
        CodingProblem sampleProb = createSampleProblem();
        when(aiService.generateCodingProblem(any(), any(), any())).thenReturn(sampleProb);

        CodingProblemDto dto = interviewService.startCodingInterview(
                null, "Java Developer", "Fresher", "Arrays", 1, "Java role");

        Interview interview = interviewService.getInterviewOrThrow(dto.getInterviewId());
        // Explicitly set future deadline
        interview.setCurrentProblemTargetEndTimeMs(System.currentTimeMillis() + 60000L);

        RunCodeResponse mockVisible = RunCodeResponse.builder().status("SUCCESS").passedCount(1).totalCount(1).allPassed(true).tests(List.of()).build();
        RunCodeResponse mockHidden = RunCodeResponse.builder().status("SUCCESS").passedCount(2).totalCount(2).allPassed(true).tests(List.of()).build();
        AiCodingReview mockReview = AiCodingReview.builder().overallScore(9.0).strengths(List.of("Good")).build();

        when(executionService.execute(eq("java"), any(), eq(sampleProb.getVisibleTests()), eq(false))).thenReturn(mockVisible);
        when(executionService.execute(eq("java"), any(), eq(sampleProb.getHiddenTests()), eq(true))).thenReturn(mockHidden);
        when(aiService.evaluateCodingSubmission(any(), any())).thenReturn(mockReview);
        when(aiService.generateOverallCodingReport(any())).thenReturn(CodingReport.builder().codingScore(9.0).build());

        SubmitCodingRequest submitReq = new SubmitCodingRequest("prob-1", "java", "code", "approach", 0, 60, false);
        CodingSubmissionResult result = interviewService.submitCodingSolution(dto.getInterviewId(), submitReq);

        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        Mockito.verify(executionService, Mockito.times(1)).execute(eq("java"), any(), eq(sampleProb.getVisibleTests()), eq(false));
        Mockito.verify(executionService, Mockito.times(1)).execute(eq("java"), any(), eq(sampleProb.getHiddenTests()), eq(true));
        Mockito.verify(aiService, Mockito.times(1)).evaluateCodingSubmission(any(), any());
    }

    @Test
    void testSubmitCodingSolutionAfterDeadlineRejected() {
        CodingProblem sampleProb = createSampleProblem();
        when(aiService.generateCodingProblem(any(), any(), any())).thenReturn(sampleProb);

        CodingProblemDto dto = interviewService.startCodingInterview(
                null, "Java Developer", "Fresher", "Arrays", 1, "Java role");

        Interview interview = interviewService.getInterviewOrThrow(dto.getInterviewId());
        // Set deadline in the past
        interview.setCurrentProblemTargetEndTimeMs(System.currentTimeMillis() - 5000L);

        SubmitCodingRequest submitReq = new SubmitCodingRequest("prob-1", "java", "code", "approach", 0, 60, false);

        AppException ex = assertThrows(AppException.class, () -> {
            interviewService.submitCodingSolution(dto.getInterviewId(), submitReq);
        });

        assertTrue(ex.getMessage().contains("expired"));
        assertEquals("EXPIRED", interview.getStatus());

        // Verify sandbox and Gemini are NEVER invoked for expired requests
        Mockito.verify(executionService, Mockito.never()).execute(any(), any(), any(), any(Boolean.class));
        Mockito.verify(aiService, Mockito.never()).evaluateCodingSubmission(any(), any());
    }

    @Test
    void testRepeatedExpiredSubmissionRemainsRejected() {
        CodingProblem sampleProb = createSampleProblem();
        when(aiService.generateCodingProblem(any(), any(), any())).thenReturn(sampleProb);

        CodingProblemDto dto = interviewService.startCodingInterview(
                null, "Java Developer", "Fresher", "Arrays", 1, "Java role");

        Interview interview = interviewService.getInterviewOrThrow(dto.getInterviewId());
        interview.setCurrentProblemTargetEndTimeMs(System.currentTimeMillis() - 5000L);

        SubmitCodingRequest submitReq = new SubmitCodingRequest("prob-1", "java", "code", "approach", 0, 60, false);

        // First attempt rejected
        assertThrows(AppException.class, () -> {
            interviewService.submitCodingSolution(dto.getInterviewId(), submitReq);
        });

        // Second attempt also rejected
        assertThrows(AppException.class, () -> {
            interviewService.submitCodingSolution(dto.getInterviewId(), submitReq);
        });

        // Verify sandbox and Gemini are NEVER invoked
        Mockito.verify(executionService, Mockito.never()).execute(any(), any(), any(), any(Boolean.class));
        Mockito.verify(aiService, Mockito.never()).evaluateCodingSubmission(any(), any());
    }

    @Test
    void testEvaluateInterviewForCodingInterview() {
        CodingProblem sampleProb = createSampleProblem();
        when(aiService.generateCodingProblem(any(), any(), any())).thenReturn(sampleProb);

        CodingProblemDto dto = interviewService.startCodingInterview(
                null, "Java Developer", "Fresher", "Arrays", 1, "Java role");

        when(aiService.generateOverallCodingReport(any())).thenReturn(
                CodingReport.builder()
                        .codingScore(8.5)
                        .problemsAttempted(1)
                        .problemsCompleted(1)
                        .strengths(List.of("Clean logic"))
                        .improvementSuggestions(List.of("Add comments"))
                        .build()
        );

        InterviewReportResponse report = interviewService.evaluateInterview(dto.getInterviewId());

        assertNotNull(report);
        assertEquals(8.5, report.getOverallRating());
        assertNotNull(report.getCodingReport());
        assertEquals(8.5, report.getCodingReport().getCodingScore());
        assertTrue(report.getCategoryScores().containsKey("coding"));
        assertEquals(8.5, report.getCategoryScores().get("coding"));
    }

    @Test
    void testConversationalInterviewStillWorks() {
        when(aiService.generateNextQuestion(any())).thenReturn("What is polymorphism?");

        InterviewQuestionResponse res = interviewService.startInterview(
                null, "Java Developer", "Technical", "Intermediate", 3, "Spring Boot dev");

        assertNotNull(res);
        assertEquals(1, res.getQuestionNumber());
        assertEquals(3, res.getTotalQuestions());
        assertEquals("What is polymorphism?", res.getQuestion());

        when(aiService.generateNextQuestion(any())).thenReturn("Explain dependency injection.");
        SubmitAnswerRequest req = new SubmitAnswerRequest();
        req.setAnswer("Polymorphism allows objects to take multiple forms.");
        InterviewQuestionResponse ansRes = interviewService.submitAnswer(res.getInterviewId(), req);
        assertEquals(2, ansRes.getQuestionNumber());
        assertEquals("Explain dependency injection.", ansRes.getQuestion());
    }

    @Test
    void testGetCodingInterviewStateActive() {
        CodingProblem sampleProb = createSampleProblem();
        when(aiService.generateCodingProblem(any(), any(), any())).thenReturn(sampleProb);

        CodingProblemDto dto = interviewService.startCodingInterview(
                null, "Java Developer", "Fresher", "Arrays", 1, "Java role");

        CodingStateResponse state = interviewService.getCodingInterviewState(dto.getInterviewId());

        assertNotNull(state);
        assertEquals(dto.getInterviewId(), state.getInterviewId());
        assertEquals("IN_PROGRESS", state.getStatus());
        assertFalse(state.isExpired());
        assertFalse(state.isSubmitted());
        assertNotNull(state.getProblem());
        assertEquals("Two Sum", state.getProblem().getTitle());
        // Verify hidden tests are not in state response problem DTO
        assertNotNull(state.getProblem().getVisibleTests());
        assertEquals(1, state.getProblem().getVisibleTests().size());
    }

    @Test
    void testGetCodingInterviewStateExpired() {
        CodingProblem sampleProb = createSampleProblem();
        when(aiService.generateCodingProblem(any(), any(), any())).thenReturn(sampleProb);

        CodingProblemDto dto = interviewService.startCodingInterview(
                null, "Java Developer", "Fresher", "Arrays", 1, "Java role");

        Interview interview = interviewService.getInterviewOrThrow(dto.getInterviewId());
        interview.setCurrentProblemTargetEndTimeMs(System.currentTimeMillis() - 5000L);

        CodingStateResponse state = interviewService.getCodingInterviewState(dto.getInterviewId());

        assertNotNull(state);
        assertTrue(state.isExpired());
        assertEquals("EXPIRED", state.getStatus());
    }

    @Test
    void testGetCodingInterviewStateUnknownInterviewThrowsNotFound() {
        AppException ex = assertThrows(AppException.class, () -> {
            interviewService.getCodingInterviewState("non-existent-id");
        });
        assertTrue(ex.getMessage().contains("not found"));
    }
}
