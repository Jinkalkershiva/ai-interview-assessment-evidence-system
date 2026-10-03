package com.examhelper.workupdate.service;

import com.examhelper.common.exception.AppException;
import com.examhelper.workupdate.dto.WorkUpdateDtos.*;
import com.examhelper.workupdate.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.Year;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkUpdateService {

    private final WorkUpdateAiService aiService;
    private final WorkUpdatePdfService pdfService;

    private final Map<String, WorkUpdateRoom> rooms = new ConcurrentHashMap<>();
    private final AtomicInteger sequence = new AtomicInteger(new SecureRandom().nextInt(8000) + 1000);
    private final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.systemDefault());

    /**
     * Create a new Work Update room with dynamic room ID and secure authorization tokens.
     */
    public CreateRoomResponse createRoom(CreateRoomRequest req) {
        int currentYear = Year.now().getValue();
        int seq = sequence.incrementAndGet() % 9000 + 1000;
        String roomId = "WR-" + currentYear + "-" + seq;

        String participantToken = "p-" + UUID.randomUUID().toString().replace("-", "");
        String reviewerToken = "r-" + UUID.randomUUID().toString().replace("-", "");

        Instant now = Instant.now();

        WorkUpdateRoom room = WorkUpdateRoom.builder()
                .id(roomId)
                .project(req.getProject().trim())
                .task(req.getTask().trim())
                .description(req.getDescription() != null ? req.getDescription().trim() : "")
                .expectedDurationMinutes(req.getExpectedDurationMinutes() != null ? req.getExpectedDurationMinutes() : 15)
                .participantName(req.getParticipantName().trim())
                .participantEmail(req.getParticipantEmail() != null ? req.getParticipantEmail().trim() : "")
                .participantToken(participantToken)
                .reviewerToken(reviewerToken)
                .status("IN_PROGRESS")
                .createdAt(now)
                .startedAt(now)
                .paused(false)
                .totalActiveSeconds(0)
                .lastStateChangeAt(now)
                .build();

        // Initial timeline event with backend timestamp and source metadata
        addTimelineEvent(room, "SESSION_STARTED", "Session created and initialized for task: " + room.getTask(), "SYSTEM", null, null);

        rooms.put(roomId, room);
        log.info("[WorkUpdate] Created room {} for project '{}', participant '{}'", roomId, room.getProject(), room.getParticipantName());

        return CreateRoomResponse.builder()
                .roomId(roomId)
                .participantToken(participantToken)
                .reviewerToken(reviewerToken)
                .status(room.getStatus())
                .project(room.getProject())
                .task(room.getTask())
                .participantName(room.getParticipantName())
                .build();
    }

    /**
     * Validates access token and returns user role ("PARTICIPANT" or "REVIEWER").
     */
    public String authenticate(WorkUpdateRoom room, String token) {
        if (token == null || token.isBlank()) {
            throw AppException.unauthorized("Authentication token is required to access this work update room.");
        }
        String cleanToken = token.trim();
        if (cleanToken.equals(room.getReviewerToken())) {
            return "REVIEWER";
        }
        if (cleanToken.equals(room.getParticipantToken())) {
            return "PARTICIPANT";
        }
        throw AppException.forbidden("Invalid authorization token for room " + room.getId() + ".");
    }

    /**
     * Get room details with authorization check.
     */
    public RoomDetailDto getRoomDetail(String roomId, String token) {
        WorkUpdateRoom room = getRoomOrThrow(roomId);
        String role = authenticate(room, token);

        return toDetailDto(room, role);
    }

    /**
     * List all rooms for reviewer dashboard.
     */
    public List<RoomSummaryDto> listRooms() {
        return rooms.values().stream()
                .sorted(Comparator.comparing(WorkUpdateRoom::getCreatedAt).reversed())
                .map(this::toSummaryDto)
                .toList();
    }

    /**
     * Start / Unpause session.
     */
    public RoomDetailDto startSession(String roomId, String token) {
        WorkUpdateRoom room = getRoomOrThrow(roomId);
        String role = authenticate(room, token);
        if (!"PARTICIPANT".equals(role)) {
            throw AppException.forbidden("Only the participant can control session execution.");
        }

        Instant now = Instant.now();
        if (room.isPaused()) {
            room.setPaused(false);
            room.setLastStateChangeAt(now);
            addTimelineEvent(room, "SESSION_STARTED", "Participant resumed the work update session", "PARTICIPANT", null, null);
        } else if (room.getStartedAt() == null) {
            room.setStartedAt(now);
            room.setLastStateChangeAt(now);
            addTimelineEvent(room, "SESSION_STARTED", "Participant started work update recording", "PARTICIPANT", null, null);
        }

        return toDetailDto(room, role);
    }

    /**
     * Pause session.
     */
    public RoomDetailDto pauseSession(String roomId, String token) {
        WorkUpdateRoom room = getRoomOrThrow(roomId);
        String role = authenticate(room, token);
        if (!"PARTICIPANT".equals(role)) {
            throw AppException.forbidden("Only the participant can pause session.");
        }

        Instant now = Instant.now();
        if (!room.isPaused()) {
            room.setPaused(true);
            if (room.getLastStateChangeAt() != null) {
                long elapsed = Duration.between(room.getLastStateChangeAt(), now).toSeconds();
                room.setTotalActiveSeconds(room.getTotalActiveSeconds() + elapsed);
            }
            room.setLastStateChangeAt(now);
            addTimelineEvent(room, "SESSION_PAUSED", "Participant paused the session", "PARTICIPANT", null, null);
        }

        return toDetailDto(room, role);
    }

    /**
     * Log speech-to-text transcript or verbal explanation.
     */
    public void logTranscript(String roomId, String token, TranscriptLogRequest req) {
        WorkUpdateRoom room = getRoomOrThrow(roomId);
        String role = authenticate(room, token);
        if (!"PARTICIPANT".equals(role)) {
            throw AppException.forbidden("Only the participant can submit session explanations.");
        }

        if (req.getText() == null || req.getText().trim().isBlank()) return;

        Instant now = Instant.now();
        String formatted = timeFormatter.format(now);
        String text = req.getText().trim();

        // Do NOT create duplicate events for the same transcript
        boolean isDuplicate = room.getStatements().stream()
                .anyMatch(s -> s.getTranscript().equalsIgnoreCase(text));
        if (isDuplicate) {
            log.debug("[WorkUpdate] Skipping duplicate statement for room {}: {}", roomId, text);
            return;
        }

        ParticipantStatement stmt = ParticipantStatement.builder()
                .timestamp(now)
                .formattedTime(formatted)
                .transcript(text)
                .category(req.getCategory() != null ? req.getCategory() : "Explanation")
                .build();

        room.getStatements().add(stmt);
        addTimelineEvent(room, "PARTICIPANT_STATEMENT", "Participant statement: \"" + truncate(text, 70) + "\"", "PARTICIPANT", stmt.getId(), text);

        // Blocker detection
        String lower = text.toLowerCase();
        if (lower.contains("blocked") || lower.contains("blocker") || lower.contains("cannot proceed") || lower.contains("broken endpoint")) {
            addTimelineEvent(room, "BLOCKER_REPORTED", "Potential blocker reported: \"" + truncate(text, 70) + "\"", "PARTICIPANT", null, null);
        }
    }

    /**
     * Analyze a screen capture keyframe.
     */
    public ScreenFrameAnalysisResponse analyzeFrame(String roomId, String token, ScreenFrameAnalysisRequest req) {
        WorkUpdateRoom room = getRoomOrThrow(roomId);
        String role = authenticate(room, token);
        if (!"PARTICIPANT".equals(role)) {
            throw AppException.forbidden("Only the participant can submit screen frames.");
        }

        if (room.isPaused() || "COMPLETED".equals(room.getStatus()) || "REVIEWED".equals(room.getStatus())) {
            throw AppException.badRequest("Cannot analyze frame while session is paused or completed.");
        }

        ScreenCaptureItem capture = aiService.analyzeScreenFrame(
                req.getImageBase64(),
                req.getParticipantNote(),
                req.getCurrentTranscript(),
                room
        );

        room.getScreenCaptures().add(capture);

        // 1. Add SCREEN_KEYFRAME event
        addTimelineEvent(room, "SCREEN_KEYFRAME", "Screen keyframe captured: " + capture.getDetectedCategory() + " demonstrated", "PARTICIPANT", capture.getId(), null);

        // 2. Add Observation event (distinguish AI vs LOCAL_EVIDENCE)
        boolean isQuotaExceeded = "AI_QUOTA_EXCEEDED".equals(capture.getAiStatus()) || room.isAiQuotaExceeded();
        if (isQuotaExceeded) {
            room.setAiQuotaExceeded(true);
            room.setAiStatus("AI_QUOTA_EXCEEDED");
            if (capture.getAiMessage() != null) {
                room.setAiMessage(capture.getAiMessage());
            }
            addTimelineEvent(room, "LOCAL_EVIDENCE", capture.getObservations(), "LOCAL_EXTRACTOR", capture.getId(), capture.getObservations());
        } else {
            addTimelineEvent(room, "AI_OBSERVATION", capture.getObservations(), "AI", capture.getId(), capture.getObservations());
        }

        // Context-driven follow-up question generation at checkpoints (ONLY if quota is not exhausted)
        String suggestedQuestion = null;
        if (!isQuotaExceeded && room.getScreenCaptures().size() % 2 == 0) {
            boolean hasUnanswered = room.getFollowUpQuestions().stream().anyMatch(q -> q.getAnswer() == null || q.getAnswer().isBlank());
            if (!hasUnanswered) {
                suggestedQuestion = aiService.generateFollowUpQuestion(room);
                if (suggestedQuestion != null && !suggestedQuestion.isBlank()) {
                    FollowUpQuestion fq = FollowUpQuestion.builder()
                            .timestamp(Instant.now())
                            .formattedTime(timeFormatter.format(Instant.now()))
                            .question(suggestedQuestion)
                            .askedBy("AI")
                            .build();
                    room.getFollowUpQuestions().add(fq);
                    addTimelineEvent(room, "AI_QUESTION", "AI follow-up question: \"" + suggestedQuestion + "\"", "AI", fq.getId(), suggestedQuestion);
                }
            }
        }

        return ScreenFrameAnalysisResponse.builder()
                .captureId(capture.getId())
                .formattedTime(capture.getFormattedTime())
                .detectedCategory(capture.getDetectedCategory())
                .observations(capture.getObservations())
                .suggestedFollowUpQuestion(suggestedQuestion)
                .aiStatus(capture.getAiStatus() != null ? capture.getAiStatus() : "AI_ANALYSIS_SUCCESS")
                .aiMessage(capture.getAiMessage())
                .build();
    }

    /**
     * Answer follow-up question.
     */
    public void answerQuestion(String roomId, String token, FollowUpAnswerRequest req) {
        WorkUpdateRoom room = getRoomOrThrow(roomId);
        String role = authenticate(room, token);
        if (!"PARTICIPANT".equals(role)) {
            throw AppException.forbidden("Only the participant can answer follow-up questions.");
        }
        if (req.getAnswer() == null || req.getAnswer().trim().isBlank()) {
            throw AppException.badRequest("Answer cannot be blank.");
        }

        FollowUpQuestion fq = room.getFollowUpQuestions().stream()
                .filter(q -> q.getId().equals(req.getQuestionId()))
                .findFirst()
                .orElseThrow(() -> AppException.notFound("Question not found"));

        String answerText = req.getAnswer().trim();
        fq.setAnswer(answerText);
        addTimelineEvent(room, "PARTICIPANT_RESPONSE", "Participant response: \"" + truncate(answerText, 70) + "\"", "PARTICIPANT", fq.getId(), answerText);
    }

    /**
     * Complete work update session and generate AI work report.
     */
    public RoomDetailDto completeSession(String roomId, String token) {
        WorkUpdateRoom room = getRoomOrThrow(roomId);
        String role = authenticate(room, token);

        Instant now = Instant.now();
        room.setCompletedAt(now);
        room.setStatus("COMPLETED");
        room.setPaused(false);

        addTimelineEvent(room, "SESSION_COMPLETED", "Work update session completed by participant", "PARTICIPANT", null, null);

        log.info("[WorkUpdate] Generating structured report for room {}", roomId);
        WorkUpdateReport report = aiService.generateReport(room);
        room.setReport(report);

        return toDetailDto(room, role);
    }

    /**
     * Reviewer updates feedback, status, or action items.
     */
    public RoomDetailDto updateReview(String roomId, String token, ReviewerUpdateRequest req) {
        WorkUpdateRoom room = getRoomOrThrow(roomId);
        String role = authenticate(room, token);
        if (!"REVIEWER".equals(role)) {
            throw AppException.forbidden("Reviewer authorization is required to submit feedback and action items.");
        }

        if (req.getReviewerComments() != null) {
            room.setReviewerComments(req.getReviewerComments());
            if (room.getReport() != null) {
                room.getReport().setReviewerFeedback(req.getReviewerComments());
            }
        }

        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            room.setStatus(req.getStatus());
            if (room.getReport() != null) {
                room.getReport().setReviewStatus(req.getStatus());
            }
            addTimelineEvent(room, "REVIEW_STATUS", "Reviewer updated status to: " + req.getStatus(), "REVIEWER", null, null);
        }

        if (req.getActionItems() != null) {
            room.setActionItems(req.getActionItems());
            if (room.getReport() != null) {
                room.getReport().setActionItems(req.getActionItems());
            }
            for (ActionItem ai : req.getActionItems()) {
                addTimelineEvent(room, "ACTION_ITEM", "Action Item: " + ai.getTask() + " (Assignee: " + (ai.getAssignee() != null ? ai.getAssignee() : "Unassigned") + ")", "REVIEWER", null, null);
            }
        }

        return toDetailDto(room, role);
    }

    /**
     * Export session report as PDF.
     */
    public void exportPdf(String roomId, String token, OutputStream out) {
        WorkUpdateRoom room = getRoomOrThrow(roomId);
        authenticate(room, token);

        if (room.getReport() == null) {
            WorkUpdateReport report = aiService.generateReport(room);
            room.setReport(report);
        }

        pdfService.generatePdf(room, out);
    }

    private void addTimelineEvent(WorkUpdateRoom room, String type, String description, String source, String keyframeRef, String aiAnalysisRef) {
        Instant now = Instant.now();
        TimelineEvent ev = TimelineEvent.builder()
                .id("evt-" + UUID.randomUUID().toString().substring(0, 8))
                .sessionId(room.getId())
                .timestamp(now)
                .formattedTime(timeFormatter.format(now))
                .type(type)
                .description(description)
                .source(source)
                .keyframeRef(keyframeRef)
                .aiAnalysisRef(aiAnalysisRef)
                .build();
        room.getTimelineEvents().add(ev);
    }

    public WorkUpdateRoom getRoomOrThrow(String roomId) {
        WorkUpdateRoom room = rooms.get(roomId);
        if (room == null) {
            throw AppException.notFound("Work update room " + roomId + " was not found or has expired.");
        }
        return room;
    }

    private RoomSummaryDto toSummaryDto(WorkUpdateRoom r) {
        Instant start = r.getStartedAt() != null ? r.getStartedAt() : r.getCreatedAt();
        Instant end = r.getCompletedAt() != null ? r.getCompletedAt() : Instant.now();
        long mins = Math.max(1, Duration.between(start, end).toMinutes());

        return RoomSummaryDto.builder()
                .roomId(r.getId())
                .project(r.getProject())
                .task(r.getTask())
                .participantName(r.getParticipantName())
                .status(r.getStatus())
                .createdAt(r.getCreatedAt())
                .sessionDuration(mins + " min")
                .screenCaptureCount(r.getScreenCaptures().size())
                .statementCount(r.getStatements().size())
                .build();
    }

    private RoomDetailDto toDetailDto(WorkUpdateRoom r, String role) {
        return RoomDetailDto.builder()
                .roomId(r.getId())
                .project(r.getProject())
                .task(r.getTask())
                .description(r.getDescription())
                .expectedDurationMinutes(r.getExpectedDurationMinutes())
                .participantName(r.getParticipantName())
                .participantEmail(r.getParticipantEmail())
                .status(r.getStatus())
                .role(role)
                .createdAt(r.getCreatedAt())
                .startedAt(r.getStartedAt())
                .completedAt(r.getCompletedAt())
                .paused(r.isPaused())
                .totalActiveSeconds(r.getTotalActiveSeconds())
                .timelineEvents(new ArrayList<>(r.getTimelineEvents()))
                .screenCaptures(new ArrayList<>(r.getScreenCaptures()))
                .statements(new ArrayList<>(r.getStatements()))
                .followUpQuestions(new ArrayList<>(r.getFollowUpQuestions()))
                .report(r.getReport())
                .reviewerComments(r.getReviewerComments())
                .actionItems(new ArrayList<>(r.getActionItems()))
                .aiQuotaExceeded(r.isAiQuotaExceeded())
                .aiStatus(r.getAiStatus())
                .aiMessage(r.getAiMessage())
                .build();
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }
}
