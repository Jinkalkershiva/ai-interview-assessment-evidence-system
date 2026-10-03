package com.examhelper.workupdate.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimelineEvent {
    @Builder.Default
    private String id = "evt-" + UUID.randomUUID().toString().substring(0, 8);
    private String sessionId; // Room ID e.g. WR-2026-1042
    private Instant timestamp;
    private String formattedTime;
    
    // Standard event types: SESSION_STARTED, SCREEN_KEYFRAME, PARTICIPANT_STATEMENT, 
    // AI_QUESTION, PARTICIPANT_RESPONSE, AI_OBSERVATION, BLOCKER_REPORTED, ACTION_ITEM, SESSION_COMPLETED
    private String type;
    
    private String description;
    private String source; // SYSTEM, PARTICIPANT, AI, REVIEWER
    
    private String keyframeRef; // Reference to ScreenCaptureItem ID if applicable
    private String aiAnalysisRef; // Reference or summary of AI analysis if applicable
}
