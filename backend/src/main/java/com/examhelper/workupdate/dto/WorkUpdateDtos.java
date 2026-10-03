package com.examhelper.workupdate.dto;

import com.examhelper.workupdate.model.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

public class WorkUpdateDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRoomRequest {
        @NotBlank(message = "Project name is required")
        private String project;
        @NotBlank(message = "Task description is required")
        private String task;
        private String description;
        private Integer expectedDurationMinutes;
        @NotBlank(message = "Participant name is required")
        private String participantName;
        private String participantEmail;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRoomResponse {
        private String roomId;
        private String participantToken;
        private String reviewerToken;
        private String status;
        private String project;
        private String task;
        private String participantName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomSummaryDto {
        private String roomId;
        private String project;
        private String task;
        private String participantName;
        private String status;
        private Instant createdAt;
        private String sessionDuration;
        private int screenCaptureCount;
        private int statementCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomDetailDto {
        private String roomId;
        private String project;
        private String task;
        private String description;
        private Integer expectedDurationMinutes;
        private String participantName;
        private String participantEmail;
        private String status;
        private String role; // PARTICIPANT or REVIEWER
        private Instant createdAt;
        private Instant startedAt;
        private Instant completedAt;
        private boolean paused;
        private long totalActiveSeconds;
        private List<TimelineEvent> timelineEvents;
        private List<ScreenCaptureItem> screenCaptures;
        private List<ParticipantStatement> statements;
        private List<FollowUpQuestion> followUpQuestions;
        private WorkUpdateReport report;
        private String reviewerComments;
        private List<ActionItem> actionItems;
        private boolean aiQuotaExceeded;
        private String aiStatus;
        private String aiMessage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScreenFrameAnalysisRequest {
        private String imageBase64;
        private String participantNote;
        private String currentTranscript;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScreenFrameAnalysisResponse {
        private String captureId;
        private String formattedTime;
        private String detectedCategory;
        private String observations;
        private String suggestedFollowUpQuestion;
        @Builder.Default
        private String aiStatus = "AI_ANALYSIS_SUCCESS";
        private String aiMessage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TranscriptLogRequest {
        private String text;
        private String category;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FollowUpAnswerRequest {
        private String questionId;
        private String answer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewerUpdateRequest {
        private String reviewerComments;
        private String status; // UNDER_REVIEW, REVIEWED
        private List<ActionItem> actionItems;
    }
}
