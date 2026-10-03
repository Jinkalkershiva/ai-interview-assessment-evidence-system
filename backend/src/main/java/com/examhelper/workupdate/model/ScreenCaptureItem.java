package com.examhelper.workupdate.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScreenCaptureItem {
    @Builder.Default
    private String id = UUID.randomUUID().toString();
    private Instant timestamp;
    private String formattedTime;
    private String imageBase64;
    private String detectedCategory; // IDE / Source Code, API / Postman, Terminal / Logs, Browser / Web App, Database / Schema, Documentation / Spec
    private String observations;
    @Builder.Default
    private List<String> extractedKeywords = new ArrayList<>();
    @Builder.Default
    private String analysisMode = "GEMINI_AI";
    @Builder.Default
    private String aiStatus = "AI_ANALYSIS_SUCCESS";
    private String aiMessage;
}
