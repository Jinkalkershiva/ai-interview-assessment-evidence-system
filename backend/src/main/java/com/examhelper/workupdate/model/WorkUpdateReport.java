package com.examhelper.workupdate.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkUpdateReport {
    // 1-6 Metadata
    private String participant;
    private String project;
    private String task;
    private String roomId;
    private String sessionDate;
    private String sessionDuration;

    // 7. Executive Summary
    private String executiveSummary;

    // 8. Work Demonstrated
    @Builder.Default
    private List<String> workDemonstrated = new ArrayList<>();

    // 9. Participant Statements (PARTICIPANT_STATED)
    @Builder.Default
    private List<String> participantStatements = new ArrayList<>();

    // 10. Screen Evidence (SCREEN_OBSERVED)
    @Builder.Default
    private List<String> screenEvidence = new ArrayList<>();

    // 11. Technical Details
    @Builder.Default
    private List<String> technicalDetails = new ArrayList<>();

    // 12. Issues / Blockers
    @Builder.Default
    private List<String> issuesAndBlockers = new ArrayList<>();

    // 13. Pending Work
    @Builder.Default
    private List<String> pendingWork = new ArrayList<>();

    // 14. Follow-up Questions
    @Builder.Default
    private List<String> followUpQuestions = new ArrayList<>();

    // 15. Participant Answers
    @Builder.Default
    private List<String> participantAnswers = new ArrayList<>();

    // 16. AI Observations (AI_INFERENCE - clearly labeled as AI-generated analysis)
    @Builder.Default
    private List<String> aiObservations = new ArrayList<>();

    // 17. Timeline (Summary of key session milestones)
    @Builder.Default
    private List<TimelineEvent> timeline = new ArrayList<>();

    // 18. Reviewer Feedback (REVIEWER_VERIFIED)
    private String reviewerFeedback;

    // 19. Action Items
    @Builder.Default
    private List<ActionItem> actionItems = new ArrayList<>();

    // 20. Review Status
    @Builder.Default
    private String reviewStatus = "COMPLETED"; // IN_PROGRESS, COMPLETED, UNDER_REVIEW, REVIEWED
}
