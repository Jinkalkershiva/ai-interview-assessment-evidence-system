package com.examhelper.workupdate;

import com.examhelper.common.exception.AppException;
import com.examhelper.workupdate.dto.WorkUpdateDtos.*;
import com.examhelper.workupdate.model.*;
import com.examhelper.workupdate.service.SpringAiWorkUpdateService;
import com.examhelper.workupdate.service.WorkUpdateAiService;
import com.examhelper.workupdate.service.WorkUpdatePdfService;
import com.examhelper.workupdate.service.WorkUpdateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.Year;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class WorkUpdateServiceTest {

    private WorkUpdateAiService aiService;
    private WorkUpdatePdfService pdfService;
    private WorkUpdateService workUpdateService;

    @BeforeEach
    void setUp() {
        aiService = Mockito.mock(WorkUpdateAiService.class);
        pdfService = new WorkUpdatePdfService(); // Use real PDF service to verify valid PDF generation
        workUpdateService = new WorkUpdateService(aiService, pdfService);
    }

    @Test
    void testCreateRoomGeneratesDynamicRoomIdAndTokens() {
        CreateRoomRequest req = CreateRoomRequest.builder()
                .project("Payment Engine")
                .task("Implement retry handling for failed charges")
                .description("Exponential backoff strategy")
                .expectedDurationMinutes(20)
                .participantName("Alex Kim")
                .participantEmail("alex@example.org")
                .build();

        CreateRoomResponse res = workUpdateService.createRoom(req);

        assertNotNull(res);
        assertNotNull(res.getRoomId());
        assertTrue(res.getRoomId().startsWith("WR-" + Year.now().getValue() + "-"));
        assertNotNull(res.getParticipantToken());
        assertNotNull(res.getReviewerToken());
        assertNotEquals(res.getParticipantToken(), res.getReviewerToken());
        assertEquals("IN_PROGRESS", res.getStatus());
        assertEquals("Payment Engine", res.getProject());
        assertEquals("Alex Kim", res.getParticipantName());

        // Verify room can be retrieved with the participant token
        RoomDetailDto detail = workUpdateService.getRoomDetail(res.getRoomId(), res.getParticipantToken());
        assertEquals("PARTICIPANT", detail.getRole());
        assertEquals(1, detail.getTimelineEvents().size());
        assertEquals("SESSION_STARTED", detail.getTimelineEvents().get(0).getType());
        assertEquals("SYSTEM", detail.getTimelineEvents().get(0).getSource());
        assertNotNull(detail.getTimelineEvents().get(0).getId());
        assertEquals(res.getRoomId(), detail.getTimelineEvents().get(0).getSessionId());
    }

    @Test
    void testAuthorizationProtectionAgainstUnauthorizedAccess() {
        CreateRoomRequest req = CreateRoomRequest.builder()
                .project("Auth Service")
                .task("Token rotation")
                .participantName("Taylor")
                .build();

        CreateRoomResponse res = workUpdateService.createRoom(req);

        // Attempting access with no token should fail
        AppException ex1 = assertThrows(AppException.class, () -> {
            workUpdateService.getRoomDetail(res.getRoomId(), null);
        });
        assertEquals(401, ex1.getStatusCode());

        // Attempting access with invalid/guessed token should fail
        AppException ex2 = assertThrows(AppException.class, () -> {
            workUpdateService.getRoomDetail(res.getRoomId(), "guessed-random-token-123");
        });
        assertEquals(403, ex2.getStatusCode());

        // Reviewer token grants REVIEWER role
        RoomDetailDto revDetail = workUpdateService.getRoomDetail(res.getRoomId(), res.getReviewerToken());
        assertEquals("REVIEWER", revDetail.getRole());

        // Participant token grants PARTICIPANT role
        RoomDetailDto partDetail = workUpdateService.getRoomDetail(res.getRoomId(), res.getParticipantToken());
        assertEquals("PARTICIPANT", partDetail.getRole());
    }

    @Test
    void testSessionExecutionTimelineAndObservations() {
        CreateRoomRequest req = CreateRoomRequest.builder()
                .project("Order Service")
                .task("Order cancellation flow")
                .participantName("Sam Lee")
                .build();

        CreateRoomResponse res = workUpdateService.createRoom(req);
        String pToken = res.getParticipantToken();
        String rToken = res.getReviewerToken();

        // 1. Participant logs explanation
        TranscriptLogRequest transcriptReq = TranscriptLogRequest.builder()
                .text("I implemented the state machine transition from PENDING to CANCELLED.")
                .category("Explanation")
                .build();
        workUpdateService.logTranscript(res.getRoomId(), pToken, transcriptReq);

        // Non-participant cannot submit transcripts
        assertThrows(AppException.class, () -> {
            workUpdateService.logTranscript(res.getRoomId(), rToken, transcriptReq);
        });

        // 2. Participant submits screen frame
        ScreenCaptureItem mockCapture = ScreenCaptureItem.builder()
                .id("cap-1")
                .timestamp(Instant.now())
                .formattedTime("10:05")
                .detectedCategory("IDE / Source Code")
                .observations("SCREEN_OBSERVED: Participant demonstrated OrderStateMachine.java")
                .extractedKeywords(List.of("State Machine", "Cancellation"))
                .build();

        when(aiService.analyzeScreenFrame(any(), any(), any(), any())).thenReturn(mockCapture);

        ScreenFrameAnalysisRequest frameReq = ScreenFrameAnalysisRequest.builder()
                .imageBase64("data:image/jpeg;base64,/9j/4AAQSkZJRg==")
                .participantNote("State transitions")
                .currentTranscript("State machine demonstration")
                .build();

        ScreenFrameAnalysisResponse frameRes = workUpdateService.analyzeFrame(res.getRoomId(), pToken, frameReq);
        assertNotNull(frameRes);
        assertEquals("IDE / Source Code", frameRes.getDetectedCategory());

        // Verify timeline contains START, STATEMENT, SCREEN_KEYFRAME, AI_OBSERVATION
        RoomDetailDto detail = workUpdateService.getRoomDetail(res.getRoomId(), pToken);
        assertEquals(4, detail.getTimelineEvents().size());
        assertEquals("SESSION_STARTED", detail.getTimelineEvents().get(0).getType());
        assertEquals("PARTICIPANT_STATEMENT", detail.getTimelineEvents().get(1).getType());
        assertEquals("SCREEN_KEYFRAME", detail.getTimelineEvents().get(2).getType());
        assertEquals("cap-1", detail.getTimelineEvents().get(2).getKeyframeRef());
        assertEquals("AI_OBSERVATION", detail.getTimelineEvents().get(3).getType());
        assertEquals("AI", detail.getTimelineEvents().get(3).getSource());
        assertEquals(1, detail.getStatements().size());
        assertEquals(1, detail.getScreenCaptures().size());
    }

    @Test
    void testCompleteSessionGeneratesEvidenceBasedReport() {
        CreateRoomRequest req = CreateRoomRequest.builder()
                .project("Billing Engine")
                .task("Stripe webhook listener")
                .participantName("Dana")
                .build();

        CreateRoomResponse res = workUpdateService.createRoom(req);
        String pToken = res.getParticipantToken();

        WorkUpdateReport mockReport = WorkUpdateReport.builder()
                .participant("Dana")
                .project("Billing Engine")
                .task("Stripe webhook listener")
                .roomId(res.getRoomId())
                .sessionDate("2026-10-03")
                .sessionDuration("12 min")
                .executiveSummary("Participant Dana demonstrated stripe webhook signature verification.")
                .workDemonstrated(List.of("Participant demonstrated signature verification filter."))
                .participantStatements(List.of("Participant stated that webhook secrets are loaded from vault."))
                .screenEvidence(List.of("Screen showed WebhookFilter.java line 45."))
                .technicalDetails(List.of("Spring Security", "Stripe SDK"))
                .issuesAndBlockers(List.of("No blockers reported."))
                .pendingWork(List.of("Integration tests with mock webhook payloads."))
                .followUpQuestions(List.of("Q: How are replayed webhooks handled?"))
                .aiObservations(List.of("AI Observation: Signature validation is present."))
                .build();

        when(aiService.generateReport(any())).thenReturn(mockReport);

        RoomDetailDto completed = workUpdateService.completeSession(res.getRoomId(), pToken);

        assertNotNull(completed);
        assertEquals("COMPLETED", completed.getStatus());
        assertNotNull(completed.getReport());
        assertEquals("Stripe webhook listener", completed.getReport().getTask());
        assertEquals(1, completed.getReport().getWorkDemonstrated().size());
        assertEquals(1, completed.getReport().getParticipantStatements().size());
        assertEquals(1, completed.getReport().getScreenEvidence().size());
        assertEquals(2, completed.getReport().getTechnicalDetails().size());
    }

    @Test
    void testReviewerFeedbackAndStatusUpdate() {
        CreateRoomRequest req = CreateRoomRequest.builder()
                .project("Search API")
                .task("Elasticsearch indexing")
                .participantName("Robin")
                .build();

        CreateRoomResponse res = workUpdateService.createRoom(req);
        String pToken = res.getParticipantToken();
        String rToken = res.getReviewerToken();

        // Complete session
        when(aiService.generateReport(any())).thenReturn(WorkUpdateReport.builder().task("Elasticsearch indexing").build());
        workUpdateService.completeSession(res.getRoomId(), pToken);

        // Reviewer updates comments and action items
        ActionItem item1 = ActionItem.builder()
                .id("act-1")
                .task("Add unit test for index creation failure")
                .assignee("Robin")
                .completed(false)
                .build();

        ReviewerUpdateRequest revReq = ReviewerUpdateRequest.builder()
                .reviewerComments("Demonstration verified. Please address the action items before PR merge.")
                .status("UNDER_REVIEW")
                .actionItems(List.of(item1))
                .build();

        // Participant cannot submit reviewer feedback
        assertThrows(AppException.class, () -> {
            workUpdateService.updateReview(res.getRoomId(), pToken, revReq);
        });

        // Reviewer updates successfully
        RoomDetailDto updated = workUpdateService.updateReview(res.getRoomId(), rToken, revReq);
        assertEquals("UNDER_REVIEW", updated.getStatus());
        assertEquals("Demonstration verified. Please address the action items before PR merge.", updated.getReviewerComments());
        assertEquals(1, updated.getActionItems().size());
    }

    @Test
    void testPdfReportExportGeneratesValidPdfBytes() {
        CreateRoomRequest req = CreateRoomRequest.builder()
                .project("Data Pipeline")
                .task("Kafka consumer batching")
                .participantName("Morgan")
                .build();

        CreateRoomResponse res = workUpdateService.createRoom(req);
        String pToken = res.getParticipantToken();

        when(aiService.generateReport(any())).thenReturn(WorkUpdateReport.builder()
                .participant("Morgan")
                .project("Data Pipeline")
                .task("Kafka consumer batching")
                .roomId(res.getRoomId())
                .sessionDate("2026-10-03")
                .sessionDuration("10 min")
                .executiveSummary("Demonstrated Kafka consumer configuration and offset commits.")
                .workDemonstrated(List.of("Consumer batch size set to 500."))
                .participantStatements(List.of("Participant stated partition rebalance handled cleanly."))
                .screenEvidence(List.of("Observed application.yml configuration."))
                .technicalDetails(List.of("Kafka", "Spring Boot"))
                .issuesAndBlockers(List.of("None."))
                .pendingWork(List.of("Load testing."))
                .followUpQuestions(List.of())
                .aiObservations(List.of("AI Observation: Offsets committed synchronously."))
                .build());

        workUpdateService.completeSession(res.getRoomId(), pToken);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workUpdateService.exportPdf(res.getRoomId(), pToken, out);

        byte[] pdfBytes = out.toByteArray();
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500, "PDF should contain valid byte content");
        // PDF magic bytes: %PDF-
        assertEquals('%', (char) pdfBytes[0]);
        assertEquals('P', (char) pdfBytes[1]);
        assertEquals('D', (char) pdfBytes[2]);
        assertEquals('F', (char) pdfBytes[3]);
    }

    @Test
    void testPdfReportContentVerificationWithPdfBox() throws Exception {
        String testProject = "Distributed Consensus Engine";
        String testTask = "Raft Leader Election and Heartbeat Mechanism";
        String testParticipant = "Kavita Raman";

        CreateRoomRequest req = CreateRoomRequest.builder()
                .project(testProject)
                .task(testTask)
                .participantName(testParticipant)
                .expectedDurationMinutes(25)
                .build();

        CreateRoomResponse res = workUpdateService.createRoom(req);
        String pToken = res.getParticipantToken();
        String rToken = res.getReviewerToken();

        // 1. Add statement
        workUpdateService.logTranscript(res.getRoomId(), pToken,
                TranscriptLogRequest.builder().text("Implemented heartbeat timer and candidate term increment.").build());

        // 2. Add screen frame with real image base64 (small 1x1 JPEG to test embedding)
        String smallJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
        ScreenCaptureItem mockCapture = ScreenCaptureItem.builder()
                .id("cap-raft-1")
                .timestamp(Instant.now())
                .formattedTime("11:15")
                .detectedCategory("IDE / Source Code")
                .observations("SCREEN_OBSERVED: RaftNode.java election timeout logic visible")
                .extractedKeywords(List.of("Raft", "Consensus"))
                .imageBase64(smallJpeg)
                .build();
        when(aiService.analyzeScreenFrame(any(), any(), any(), any())).thenReturn(mockCapture);

        WorkUpdateReport mockReport = WorkUpdateReport.builder()
                .participant(testParticipant)
                .project(testProject)
                .task(testTask)
                .roomId(res.getRoomId())
                .sessionDate("2026-10-03")
                .sessionDuration("15 min")
                .executiveSummary("Participant demonstrated Raft consensus leader election and heartbeat mechanism.")
                .workDemonstrated(List.of("Raft leader election timer reset", "Candidate state transition"))
                .participantStatements(List.of("Election timeouts are randomized between 150ms and 300ms."))
                .screenEvidence(List.of("RaftNode.java election loop visible on screen."))
                .technicalDetails(List.of("Java 21", "gRPC", "Consensus Algorithm"))
                .issuesAndBlockers(List.of("Network partition recovery needs additional testing."))
                .pendingWork(List.of("Log replication RPC implementation."))
                .followUpQuestions(List.of("How do you prevent split-brain scenarios?"))
                .participantAnswers(List.of("Using majority quorum voting."))
                .aiObservations(List.of("AI Observation: Election timeout logic observed in IDE."))
                .build();
        when(aiService.generateReport(any())).thenReturn(mockReport);

        workUpdateService.analyzeFrame(res.getRoomId(), pToken,
                ScreenFrameAnalysisRequest.builder().imageBase64(smallJpeg).participantNote("Election code").build());

        // 3. Complete session
        workUpdateService.completeSession(res.getRoomId(), pToken);

        // 4. Reviewer feedback and action items
        String reviewRemark = "Leader election verified with clean randomized backoff. Proceed to PR.";
        workUpdateService.updateReview(res.getRoomId(), rToken, ReviewerUpdateRequest.builder()
                .reviewerComments(reviewRemark)
                .status("REVIEWED")
                .actionItems(List.of(
                        ActionItem.builder().task("Run Jepsen partition test suite").assignee("Kavita Raman").completed(false).build()
                ))
                .build());

        // 5. Generate PDF
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workUpdateService.exportPdf(res.getRoomId(), rToken, out);

        byte[] pdfBytes = out.toByteArray();
        assertTrue(pdfBytes.length > 1000, "PDF with embedded screenshot should exceed 1KB");

        // 6. Use PDFBox to open and verify internal text content
        try (org.apache.pdfbox.pdmodel.PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            assertNotNull(document);
            assertTrue(document.getNumberOfPages() >= 1, "PDF should have at least 1 page");

            org.apache.pdfbox.text.PDFTextStripper stripper = new org.apache.pdfbox.text.PDFTextStripper();
            String extractedText = stripper.getText(document);

            // Assert critical sections and dynamic values are actually present in the generated PDF
            assertTrue(extractedText.contains("WORK UPDATE REPORT"), "Must have header");
            assertTrue(extractedText.contains(res.getRoomId()), "Must have dynamic room ID");
            assertTrue(extractedText.contains(testParticipant), "Must contain participant name");
            assertTrue(extractedText.contains(testProject), "Must contain project name");
            assertTrue(extractedText.contains(testTask), "Must contain task description");
            assertTrue(extractedText.contains("EXECUTIVE SUMMARY"), "Must have executive summary");
            assertTrue(extractedText.contains("WORK DEMONSTRATED"), "Must have work demonstrated");
            assertTrue(extractedText.contains("PARTICIPANT STATEMENTS"), "Must have participant statements");
            assertTrue(extractedText.contains("SCREEN EVIDENCE"), "Must have screen evidence");
            assertTrue(extractedText.contains("IDE / Source Code"), "Must have detected category");
            assertTrue(extractedText.contains("TECHNICAL DETAILS OBSERVED"), "Must have technical details");
            assertTrue(extractedText.contains("ISSUES / BLOCKERS"), "Must have issues and blockers");
            assertTrue(extractedText.contains("PENDING WORK"), "Must have pending work");
            assertTrue(extractedText.contains("AI OBSERVATIONS"), "Must have AI observations");
            assertTrue(extractedText.contains("TIMELINE"), "Must have timeline");
            assertTrue(extractedText.contains("REVIEWER FEEDBACK"), "Must have reviewer feedback");
            assertTrue(extractedText.contains(reviewRemark), "Must contain actual reviewer comments");
            assertTrue(extractedText.contains("ACTION ITEMS"), "Must have action items");
            assertTrue(extractedText.contains("Run Jepsen partition test suite"), "Must contain action item task");
            assertTrue(extractedText.contains("REVIEWED"), "Must contain final review status");
        }
    }

    @Test
    void testParticipantStatementAndResponseDistinctionWithRealSynthesizer() {
        // Use real SpringAiWorkUpdateService (offline deterministic mode)
        SpringAiWorkUpdateService realAiService = new com.examhelper.workupdate.service.SpringAiWorkUpdateService();
        WorkUpdateService svc = new WorkUpdateService(realAiService, new WorkUpdatePdfService());

        CreateRoomResponse roomRes = svc.createRoom(CreateRoomRequest.builder()
                .project("Payment Engine")
                .task("Kafka Retry Handling")
                .participantName("Alice Chen")
                .build());

        String roomId = roomRes.getRoomId();
        String pToken = roomRes.getParticipantToken();

        // 1. Spontaneous participant statement
        String spontaneousSpeech = "I implemented payment retry handling using Kafka with 3 backoff attempts.";
        svc.logTranscript(roomId, pToken, TranscriptLogRequest.builder()
                .text(spontaneousSpeech)
                .category("Explanation")
                .build());

        // Verify duplicate statement is ignored
        svc.logTranscript(roomId, pToken, TranscriptLogRequest.builder()
                .text(spontaneousSpeech)
                .category("Explanation")
                .build());

        // Verify blank statement is ignored
        svc.logTranscript(roomId, pToken, TranscriptLogRequest.builder()
                .text("   ")
                .category("Explanation")
                .build());

        // 2. Submit a screen frame
        String smallJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
        svc.analyzeFrame(roomId, pToken, ScreenFrameAnalysisRequest.builder()
                .imageBase64(smallJpeg)
                .participantNote("Retry listener implementation")
                .currentTranscript(spontaneousSpeech)
                .build());

        // Submit second frame to trigger follow-up question checkpoint
        svc.analyzeFrame(roomId, pToken, ScreenFrameAnalysisRequest.builder()
                .imageBase64(smallJpeg)
                .participantNote("Database retry audit table")
                .currentTranscript("Table schema for retry attempts")
                .build());

        RoomDetailDto stateBeforeAnswer = svc.getRoomDetail(roomId, pToken);
        assertEquals(1, stateBeforeAnswer.getFollowUpQuestions().size(), "Should have 1 generated follow-up question");
        FollowUpQuestion fq = stateBeforeAnswer.getFollowUpQuestions().get(0);
        assertNotNull(fq.getQuestion());

        // 3. Participant answers the follow-up question (PARTICIPANT_RESPONSE)
        String answerSpeech = "We commit the Kafka offset after the database transaction succeeds in MySQL.";
        svc.answerQuestion(roomId, pToken, FollowUpAnswerRequest.builder()
                .questionId(fq.getId())
                .answer(answerSpeech)
                .build());

        // 4. Complete session
        RoomDetailDto completed = svc.completeSession(roomId, pToken);

        // 5. Verify Timeline has both distinct event types with correct metadata and ordering
        List<TimelineEvent> events = completed.getTimelineEvents();
        assertTrue(events.size() >= 7, "Timeline should contain at least 7 events");

        // Verify event types exist in order
        assertEquals("SESSION_STARTED", events.get(0).getType());
        assertEquals("PARTICIPANT_STATEMENT", events.get(1).getType());
        assertEquals("PARTICIPANT", events.get(1).getSource());
        assertTrue(events.get(1).getDescription().contains("payment retry handling"));
        assertEquals(spontaneousSpeech, events.get(1).getAiAnalysisRef());

        // Locate AI_QUESTION and PARTICIPANT_RESPONSE
        TimelineEvent questionEvent = events.stream().filter(e -> "AI_QUESTION".equals(e.getType())).findFirst().orElse(null);
        assertNotNull(questionEvent);
        assertEquals(fq.getId(), questionEvent.getKeyframeRef());

        TimelineEvent responseEvent = events.stream().filter(e -> "PARTICIPANT_RESPONSE".equals(e.getType())).findFirst().orElse(null);
        assertNotNull(responseEvent);
        assertEquals("PARTICIPANT", responseEvent.getSource());
        assertEquals(fq.getId(), responseEvent.getKeyframeRef(), "Response must reference question ID");
        assertEquals(answerSpeech, responseEvent.getAiAnalysisRef(), "Response must store answer text in metadata");

        assertEquals("SESSION_COMPLETED", events.get(events.size() - 1).getType());

        // 6. Verify Report Distinction: statements vs answers
        WorkUpdateReport report = completed.getReport();
        assertNotNull(report);

        // Participant Statements must contain the spontaneous statement
        assertEquals(1, report.getParticipantStatements().size());
        assertTrue(report.getParticipantStatements().get(0).contains(spontaneousSpeech));

        // Participant Answers must contain the follow-up answer, NOT merged into statements
        assertEquals(1, report.getParticipantAnswers().size());
        assertEquals(answerSpeech, report.getParticipantAnswers().get(0));

        // Executive summary must reflect 1 spontaneous verbal statement, NOT "0 verbal statements"
        assertTrue(report.getExecutiveSummary().contains("1 spontaneous verbal statement"));
        assertFalse(report.getExecutiveSummary().contains("0 verbal statements"));
    }

    @Test
    void testReportGenerationWithoutStatements() {
        SpringAiWorkUpdateService realAiService = new com.examhelper.workupdate.service.SpringAiWorkUpdateService();
        WorkUpdateService svc = new WorkUpdateService(realAiService, new WorkUpdatePdfService());

        CreateRoomResponse roomRes = svc.createRoom(CreateRoomRequest.builder()
                .project("Quiet Pipeline")
                .task("Automated Migration")
                .participantName("Bob")
                .build());

        String roomId = roomRes.getRoomId();
        String pToken = roomRes.getParticipantToken();

        // Screen frame only, no spontaneous verbal statements logged
        String smallJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
        svc.analyzeFrame(roomId, pToken, ScreenFrameAnalysisRequest.builder()
                .imageBase64(smallJpeg)
                .participantNote("Migration screen")
                .build());

        RoomDetailDto completed = svc.completeSession(roomId, pToken);
        WorkUpdateReport report = completed.getReport();

        assertNotNull(report);
        // Must accurately state no statements were captured
        assertEquals(1, report.getParticipantStatements().size());
        assertEquals("No spontaneous participant statements were captured during this session.", report.getParticipantStatements().get(0));

        // Executive summary must state 0 verbal statements
        assertTrue(report.getExecutiveSummary().contains("0 verbal statements"));
    }

    @Test
    void testAiExceptionClassificationAllStatusCodes() {
        SpringAiWorkUpdateService svc = new SpringAiWorkUpdateService();

        // 429 RateLimitException / RESOURCE_EXHAUSTED
        var ex429 = new RuntimeException("429 RESOURCE_EXHAUSTED: Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests");
        var info429 = svc.classifyException(ex429);
        assertEquals(429, info429.statusCode());
        assertEquals("AI_QUOTA_EXCEEDED", info429.statusCategory());
        assertTrue(info429.safeUserMessage().contains("quota has been exhausted"));

        // 401 Unauthorized / Authentication failure
        var ex401 = new RuntimeException("HTTP 401 UNAUTHENTICATED: Invalid API key");
        var info401 = svc.classifyException(ex401);
        assertEquals(401, info401.statusCode());
        assertEquals("AI_AUTHENTICATION_FAILED", info401.statusCategory());
        assertTrue(info401.safeUserMessage().contains("credentials unauthorized"));

        // 403 Forbidden / Permission Denied
        var ex403 = new RuntimeException("HTTP 403 PERMISSION_DENIED: Access not allowed");
        var info403 = svc.classifyException(ex403);
        assertEquals(403, info403.statusCode());
        assertEquals("AI_PERMISSION_DENIED", info403.statusCategory());

        // 400 Bad Request / Invalid argument
        var ex400 = new RuntimeException("HTTP 400 INVALID_ARGUMENT: Schema mismatch");
        var info400 = svc.classifyException(ex400);
        assertEquals(400, info400.statusCode());
        assertEquals("AI_INVALID_REQUEST", info400.statusCategory());

        // 404 Not Found / Model not found
        var ex404 = new RuntimeException("HTTP 404 NOT_FOUND: models/gemini-invalid not found");
        var info404 = svc.classifyException(ex404);
        assertEquals(404, info404.statusCode());
        assertEquals("AI_MODEL_NOT_FOUND", info404.statusCategory());

        // 402 Payment Required / Billing
        var ex402 = new RuntimeException("HTTP 402 PAYMENT_REQUIRED: Billing required");
        var info402 = svc.classifyException(ex402);
        assertEquals(402, info402.statusCode());
        assertEquals("AI_BILLING_REQUIRED", info402.statusCategory());

        // 503 Provider Unavailable
        var ex503 = new RuntimeException("HTTP 503 UNAVAILABLE: Model overloaded");
        var info503 = svc.classifyException(ex503);
        assertEquals(503, info503.statusCode());
        assertEquals("AI_PROVIDER_ERROR", info503.statusCategory());
    }

    @Test
    void testSessionExecutionUnderQuotaExhaustion() {
        SpringAiWorkUpdateService realAiService = new SpringAiWorkUpdateService();
        WorkUpdatePdfService realPdfService = new WorkUpdatePdfService();

        WorkUpdateAiService quotaExhaustedAiMock = Mockito.mock(WorkUpdateAiService.class);
        WorkUpdateService quotaSvc = new WorkUpdateService(quotaExhaustedAiMock, realPdfService);

        CreateRoomResponse room = quotaSvc.createRoom(CreateRoomRequest.builder()
                .project("Core Auth")
                .task("JWT Key Rotation")
                .participantName("Dana White")
                .build());
        String roomId = room.getRoomId();
        String pToken = room.getParticipantToken();

        String smallJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

        ScreenCaptureItem quotaCapture = ScreenCaptureItem.builder()
                .id("cap-quota-1")
                .timestamp(Instant.now())
                .formattedTime("14:30")
                .imageBase64(smallJpeg)
                .detectedCategory("IDE / Source Code")
                .observations("LOCAL_EVIDENCE: IDE / Source Code displayed while participant discussed: \"JWT Key Rotation\" (Deterministic extraction: Gemini quota exhausted)")
                .extractedKeywords(List.of("JWT", "Key Rotation"))
                .analysisMode("LOCAL_EVIDENCE")
                .aiStatus("AI_QUOTA_EXCEEDED")
                .aiMessage("AI analysis is temporarily unavailable because the configured Gemini quota has been exhausted.")
                .build();

        when(quotaExhaustedAiMock.analyzeScreenFrame(any(), any(), any(), any())).thenReturn(quotaCapture);

        // When quota is exhausted, generateReport produces report stating quota was exhausted
        WorkUpdateReport quotaReport = realAiService.generateReport(WorkUpdateRoom.builder()
                .id(roomId)
                .project("Core Auth")
                .task("JWT Key Rotation")
                .participantName("Dana White")
                .createdAt(Instant.now())
                .aiQuotaExceeded(true)
                .aiStatus("AI_QUOTA_EXCEEDED")
                .screenCaptures(List.of(quotaCapture))
                .statements(List.of(ParticipantStatement.builder().formattedTime("14:30").transcript("I implemented token rotation.").build()))
                .build());
        when(quotaExhaustedAiMock.generateReport(any())).thenReturn(quotaReport);

        ScreenFrameAnalysisResponse frameRes = quotaSvc.analyzeFrame(roomId, pToken, ScreenFrameAnalysisRequest.builder()
                .imageBase64(smallJpeg)
                .participantNote("Key rotation logic")
                .build());

        // Verify response
        assertNotNull(frameRes);
        assertEquals("AI_QUOTA_EXCEEDED", frameRes.getAiStatus());
        assertNull(frameRes.getSuggestedFollowUpQuestion(), "No fake follow-up question should be created on quota exhaustion");
        assertTrue(frameRes.getObservations().startsWith("LOCAL_EVIDENCE:"));
        assertTrue(frameRes.getAiMessage().contains("quota has been exhausted"));

        // Verify timeline contains LOCAL_EVIDENCE and not AI_OBSERVATION
        RoomDetailDto roomDetail = quotaSvc.getRoomDetail(roomId, pToken);
        assertTrue(roomDetail.isAiQuotaExceeded());
        assertEquals("AI_QUOTA_EXCEEDED", roomDetail.getAiStatus());

        List<TimelineEvent> events = roomDetail.getTimelineEvents();
        boolean hasLocalEvidence = events.stream().anyMatch(e -> "LOCAL_EVIDENCE".equals(e.getType()));
        boolean hasAiObservation = events.stream().anyMatch(e -> "AI_OBSERVATION".equals(e.getType()));
        boolean hasAiQuestion = events.stream().anyMatch(e -> "AI_QUESTION".equals(e.getType()));

        assertTrue(hasLocalEvidence, "Timeline must record LOCAL_EVIDENCE for local extraction");
        assertFalse(hasAiObservation, "Timeline must NOT record AI_OBSERVATION when quota is exhausted");
        assertFalse(hasAiQuestion, "Timeline must NOT record AI_QUESTION when quota is exhausted");

        // Complete session
        RoomDetailDto completed = quotaSvc.completeSession(roomId, pToken);
        assertNotNull(completed.getReport());

        // Verify report AI observations section
        List<String> aiObs = completed.getReport().getAiObservations();
        assertEquals(1, aiObs.size());
        assertEquals("Gemini AI analysis was unavailable for this session because the configured API quota was exhausted.", aiObs.get(0));

        // Verify report executive summary notes quota limit
        assertTrue(completed.getReport().getExecutiveSummary().contains("Gemini AI analysis was unavailable due to quota limits"));

        // Verify screen evidence is preserved
        assertEquals(1, completed.getReport().getScreenEvidence().size());
        assertTrue(completed.getReport().getScreenEvidence().get(0).contains("IDE / Source Code"));

        // Verify PDF export succeeds even with quota exhausted
        ByteArrayOutputStream pdfOut = new ByteArrayOutputStream();
        quotaSvc.exportPdf(roomId, pToken, pdfOut);
        byte[] pdfBytes = pdfOut.toByteArray();
        assertTrue(pdfBytes.length > 500);
        assertEquals('%', (char) pdfBytes[0]);
        assertEquals('P', (char) pdfBytes[1]);
        assertEquals('D', (char) pdfBytes[2]);
        assertEquals('F', (char) pdfBytes[3]);
    }
}
