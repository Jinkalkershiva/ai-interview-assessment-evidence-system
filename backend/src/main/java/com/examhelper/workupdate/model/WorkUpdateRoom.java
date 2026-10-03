package com.examhelper.workupdate.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkUpdateRoom {
    private String id; // generated unique room ID, e.g. WR-2026-1042
    private String project;
    private String task;
    private String description;
    private Integer expectedDurationMinutes;
    private String participantName;
    private String participantEmail;

    // Authorization tokens
    private String participantToken;
    private String reviewerToken;

    // Status: IN_PROGRESS, COMPLETED, UNDER_REVIEW, REVIEWED
    @Builder.Default
    private String status = "IN_PROGRESS";

    private Instant createdAt;
    private Instant startedAt;
    private Instant completedAt;

    private boolean paused;
    private long totalActiveSeconds;
    private Instant lastStateChangeAt;

    @Builder.Default
    private List<TimelineEvent> timelineEvents = new ArrayList<>();

    @Builder.Default
    private List<ScreenCaptureItem> screenCaptures = new ArrayList<>();

    @Builder.Default
    private List<ParticipantStatement> statements = new ArrayList<>();

    @Builder.Default
    private List<FollowUpQuestion> followUpQuestions = new ArrayList<>();

    private WorkUpdateReport report;
    private String reviewerComments;

    @Builder.Default
    private List<ActionItem> actionItems = new ArrayList<>();

    @Builder.Default
    private boolean aiQuotaExceeded = false;
    @Builder.Default
    private String aiStatus = "AI_AVAILABLE";
    private String aiMessage;
}
