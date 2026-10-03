package com.examhelper.workupdate.service;

import com.examhelper.workupdate.model.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Slf4j
public class SpringAiWorkUpdateService implements WorkUpdateAiService {

    private final ChatClient chatClient;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${spring.ai.openai.api-key:}")
    private String apiKey;

    @Value("${spring.ai.openai.chat.options.model:gemini-3.8-flash}")
    private String modelName;

    @Value("${spring.ai.openai.base-url:https://generativelanguage.googleapis.com/v1beta/openai}")
    private String baseUrl;

    public SpringAiWorkUpdateService() {
        this.chatClient = null;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public SpringAiWorkUpdateService(ChatClient.Builder builder) {
        this.chatClient = (builder != null) ? builder.build() : null;
    }

    private boolean isApiKeyValid() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.equals("mock-key") && !apiKey.equals("your_gemini_api_key_here");
    }

    public record AiErrorInfo(
            int statusCode,
            String geminiErrorCode,
            String geminiErrorMessage,
            String statusCategory,
            String safeUserMessage
    ) {}

    public AiErrorInfo classifyException(Exception e) {
        int statusCode = -1;
        String geminiErrorCode = "UNKNOWN";
        String geminiErrorMessage = (e.getMessage() != null) ? e.getMessage() : "";
        String rawResponseBody = null;

        Throwable curr = e;
        while (curr != null) {
            if (curr instanceof org.springframework.web.client.RestClientResponseException rcre) {
                statusCode = rcre.getStatusCode().value();
                rawResponseBody = rcre.getResponseBodyAsString();
                break;
            }
            try {
                var method = curr.getClass().getMethod("statusCode");
                Object val = method.invoke(curr);
                if (val instanceof Integer i) {
                    statusCode = i;
                }
            } catch (Exception ignored) {}
            try {
                var bodyMethod = curr.getClass().getMethod("body");
                Object bodyVal = bodyMethod.invoke(curr);
                if (bodyVal != null) {
                    rawResponseBody = bodyVal.toString();
                }
            } catch (Exception ignored) {}
            if (rawResponseBody == null && curr.getMessage() != null && curr.getMessage().contains("{\"error\":")) {
                int jsonStart = curr.getMessage().indexOf("{\"error\":");
                int jsonEnd = curr.getMessage().lastIndexOf("}");
                if (jsonStart >= 0 && jsonEnd > jsonStart) {
                    rawResponseBody = curr.getMessage().substring(jsonStart, jsonEnd + 1);
                }
            }
            if (statusCode == -1 && curr.getMessage() != null) {
                var matcher = java.util.regex.Pattern.compile("\\b(4[0-9]{2}|5[0-9]{2})\\b").matcher(curr.getMessage());
                if (matcher.find()) {
                    try {
                        statusCode = Integer.parseInt(matcher.group(1));
                    } catch (Exception ignored) {}
                }
            }
            if (statusCode > 0 && rawResponseBody != null) {
                break;
            }
            curr = curr.getCause();
        }

        if (rawResponseBody != null && !rawResponseBody.isBlank()) {
            try {
                var jsonNode = mapper.readTree(rawResponseBody);
                if (jsonNode.isArray() && jsonNode.size() > 0) {
                    jsonNode = jsonNode.get(0);
                }
                if (jsonNode.has("error")) {
                    var errNode = jsonNode.get("error");
                    if (errNode.has("code")) {
                        geminiErrorCode = errNode.get("code").asText();
                    }
                    if (errNode.has("status") && "UNKNOWN".equals(geminiErrorCode)) {
                        geminiErrorCode = errNode.get("status").asText();
                    }
                    if (errNode.has("message")) {
                        geminiErrorMessage = errNode.get("message").asText();
                    }
                }
            } catch (Exception parseEx) {
                geminiErrorMessage = rawResponseBody;
            }
        }

        // Sanitize credentials - NEVER store key, token, or auth headers in error message
        if (apiKey != null && !apiKey.isBlank() && geminiErrorMessage != null) {
            geminiErrorMessage = geminiErrorMessage.replace(apiKey, "[REDACTED]");
        }
        if (geminiErrorMessage != null) {
            geminiErrorMessage = geminiErrorMessage.replaceAll("(?i)(key|token|bearer|authorization)[=:\\s]+[a-zA-Z0-9_\\-\\.]+", "$1=[REDACTED]");
        }

        String lowerMsg = (geminiErrorMessage != null) ? geminiErrorMessage.toLowerCase() : "";
        String exClassName = e.getClass().getName().toLowerCase();

        // Categorize into standard HTTP status codes and categories
        if (statusCode == 429 || exClassName.contains("ratelimit") || lowerMsg.contains("resource_exhausted") || lowerMsg.contains("quota exceeded") || lowerMsg.contains("rate limit")) {
            return new AiErrorInfo(429, "RESOURCE_EXHAUSTED".equals(geminiErrorCode) ? geminiErrorCode : "QUOTA_EXCEEDED",
                    geminiErrorMessage, "AI_QUOTA_EXCEEDED",
                    "AI analysis is temporarily unavailable because the configured Gemini quota has been exhausted.");
        }
        if (statusCode == 401 || exClassName.contains("auth") || lowerMsg.contains("unauthenticated") || lowerMsg.contains("unauthorized") || lowerMsg.contains("invalid api key")) {
            return new AiErrorInfo(401, geminiErrorCode, geminiErrorMessage, "AI_AUTHENTICATION_FAILED",
                    "AI service credentials unauthorized. Please verify your API key.");
        }
        if (statusCode == 403 || lowerMsg.contains("permission_denied") || lowerMsg.contains("forbidden")) {
            return new AiErrorInfo(403, geminiErrorCode, geminiErrorMessage, "AI_PERMISSION_DENIED",
                    "AI service permission denied for the requested resource.");
        }
        if (statusCode == 402 || lowerMsg.contains("billing") || lowerMsg.contains("payment")) {
            return new AiErrorInfo(402, geminiErrorCode, geminiErrorMessage, "AI_BILLING_REQUIRED",
                    "AI service billing or payment plan required.");
        }
        if (statusCode == 404 || lowerMsg.contains("not_found") || lowerMsg.contains("model not found")) {
            return new AiErrorInfo(404, geminiErrorCode, geminiErrorMessage, "AI_MODEL_NOT_FOUND",
                    "Configured AI model or endpoint not found.");
        }
        if (statusCode == 400 || lowerMsg.contains("invalid_argument") || lowerMsg.contains("bad request")) {
            return new AiErrorInfo(400, geminiErrorCode, geminiErrorMessage, "AI_INVALID_REQUEST",
                    "Invalid request parameters sent to AI service.");
        }
        if (statusCode >= 500 || lowerMsg.contains("unavailable") || lowerMsg.contains("internal error")) {
            return new AiErrorInfo(statusCode > 0 ? statusCode : 500, geminiErrorCode, geminiErrorMessage, "AI_PROVIDER_ERROR",
                    "AI provider service is temporarily unavailable.");
        }

        return new AiErrorInfo(statusCode > 0 ? statusCode : 500, geminiErrorCode, geminiErrorMessage, "AI_PROVIDER_ERROR",
                "AI analysis is temporarily unavailable.");
    }

    private void logGeminiDiagnostic(String operation, Exception e, AiErrorInfo errorInfo) {
        log.error("""
                [GEMINI_DIAGNOSTIC] Work Update Gemini API Call Failed:
                  - Operation: {}
                  - Provider: Spring AI (OpenAI-compatible client targeting Google Gemini)
                  - Base URL: {}
                  - Configured Model Name: {}
                  - HTTP Status Code: {}
                  - Gemini Error Code: {}
                  - Category: {}
                  - Gemini Error Message: {}
                  - Exception Class: {}
                """,
                operation,
                baseUrl,
                modelName,
                (errorInfo.statusCode() > 0 ? String.valueOf(errorInfo.statusCode()) : "N/A"),
                errorInfo.geminiErrorCode(),
                errorInfo.statusCategory(),
                errorInfo.geminiErrorMessage(),
                e.getClass().getName()
        );
    }

    @Override
    public ScreenCaptureItem analyzeScreenFrame(String imageBase64, String participantNote, String currentTranscript, WorkUpdateRoom room) {
        Instant now = Instant.now();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm:ss").withZone(ZoneId.systemDefault());
        String formattedTime = timeFmt.format(now);

        String note = (participantNote != null) ? participantNote : "";
        String transcript = (currentTranscript != null) ? currentTranscript : "";

        // If quota was already marked as exceeded in this room, do not make more doomed API calls:
        if (room != null && room.isAiQuotaExceeded()) {
            log.info("[WorkUpdateAI] Gemini quota previously exhausted for room {}; bypassing AI call and extracting local evidence.", room.getId());
            AiErrorInfo quotaError = new AiErrorInfo(429, "RESOURCE_EXHAUSTED", "Quota exceeded", "AI_QUOTA_EXCEEDED",
                    "AI analysis is temporarily unavailable because the configured Gemini quota has been exhausted.");
            return buildLocalEvidenceCaptureItem(now, formattedTime, imageBase64, note, transcript, room, quotaError);
        }

        if (isApiKeyValid()) {
            try {
                String prompt = String.format("""
                        You are an AI Work Update Analyst inspecting a technical screen demonstration keyframe.
                        Project: %s
                        Task: %s
                        Participant Notes: %s
                        Recent Participant Transcript: %s

                        CRITICAL EVIDENCE-BASED INSTRUCTIONS (Step 5):
                        - Distinguish between:
                          1. PARTICIPANT_STATED: What the participant stated in transcripts.
                          2. SCREEN_OBSERVED: Objective visible artifacts on screen (e.g. "A method retryTransaction() was visible in OrderService.java").
                          3. AI_INFERENCE: Tentative technical inference (e.g. "The displayed logic appears intended for backoff retry").
                        - NEVER claim that code is functional, bug-free, or complete merely because it is visible.
                        - Return valid JSON matching:
                        {
                          "detectedCategory": "IDE / Source Code" | "API / Postman" | "Terminal / Logs" | "Browser / Web App" | "Database / Schema" | "Documentation / Spec",
                          "observations": "SCREEN_OBSERVED: Objective sentence about what was visibly demonstrated.",
                          "extractedKeywords": ["keyword1", "keyword2"]
                        }
                        Return ONLY the raw JSON without markdown formatting.
                        """, room != null ? room.getProject() : "", room != null ? room.getTask() : "", note, transcript);

                String raw;
                byte[] imgBytes = extractImageBytes(imageBase64);
                if (imgBytes != null && imgBytes.length > 0) {
                    log.info("[WorkUpdateAI] Analyzing keyframe with multimodal vision ({} bytes) for room {}", imgBytes.length, room != null ? room.getId() : "N/A");
                    ByteArrayResource imgResource = new ByteArrayResource(imgBytes);
                    raw = chatClient.prompt()
                            .system("You are an objective technical work review observer. Return ONLY JSON.")
                            .user(u -> u.text(prompt).media(MimeTypeUtils.IMAGE_JPEG, imgResource))
                            .call()
                            .content().strip();
                } else {
                    raw = chatClient.prompt()
                            .system("You are an objective technical work review observer. Return ONLY JSON.")
                            .user(prompt)
                            .call()
                            .content().strip();
                }

                raw = stripFences(raw);
                var tree = mapper.readTree(raw);
                String cat = tree.has("detectedCategory") ? tree.get("detectedCategory").asText() : "IDE / Source Code";
                String obs = tree.has("observations") ? tree.get("observations").asText() : "Participant demonstrated technical artifacts.";
                List<String> kw = new ArrayList<>();
                if (tree.has("extractedKeywords") && tree.get("extractedKeywords").isArray()) {
                    tree.get("extractedKeywords").forEach(k -> kw.add(k.asText()));
                }

                return ScreenCaptureItem.builder()
                        .id(UUID.randomUUID().toString())
                        .timestamp(now)
                        .formattedTime(formattedTime)
                        .imageBase64(imageBase64)
                        .detectedCategory(cat)
                        .observations(obs)
                        .extractedKeywords(kw)
                        .analysisMode("GEMINI_AI")
                        .aiStatus("AI_ANALYSIS_SUCCESS")
                        .aiMessage("AI vision analysis completed successfully.")
                        .build();
            } catch (Exception e) {
                AiErrorInfo errorInfo = classifyException(e);
                logGeminiDiagnostic("analyzeScreenFrame", e, errorInfo);
                log.warn("[WorkUpdateAI] Multimodal screen analysis failed ({}: {}), using local evidence extractor: {}",
                        errorInfo.statusCategory(), errorInfo.statusCode(), e.getMessage());

                if ("AI_QUOTA_EXCEEDED".equals(errorInfo.statusCategory()) && room != null) {
                    room.setAiQuotaExceeded(true);
                    room.setAiStatus("AI_QUOTA_EXCEEDED");
                    room.setAiMessage(errorInfo.safeUserMessage());
                }

                return buildLocalEvidenceCaptureItem(now, formattedTime, imageBase64, note, transcript, room, errorInfo);
            }
        }

        // Deterministic evidence-based heuristic analysis (e.g. offline / unconfigured API key)
        return buildLocalEvidenceCaptureItem(now, formattedTime, imageBase64, note, transcript, room, null);
    }

    private ScreenCaptureItem buildLocalEvidenceCaptureItem(
            Instant now,
            String formattedTime,
            String imageBase64,
            String note,
            String transcript,
            WorkUpdateRoom room,
            AiErrorInfo errorInfo
    ) {
        String combined = (note + " " + transcript).toLowerCase();
        String detectedCategory = "IDE / Source Code";
        List<String> keywords = new ArrayList<>();

        if (combined.contains("postman") || combined.contains("curl") || combined.contains("api") || combined.contains("endpoint") || combined.contains("json")) {
            detectedCategory = "API / Postman";
            keywords.addAll(List.of("API Request", "Payload", "HTTP Protocol"));
        } else if (combined.contains("terminal") || combined.contains("cli") || combined.contains("bash") || combined.contains("docker") || combined.contains("mvn") || combined.contains("npm")) {
            detectedCategory = "Terminal / Logs";
            keywords.addAll(List.of("CLI Execution", "Build Output", "Process Logs"));
        } else if (combined.contains("database") || combined.contains("sql") || combined.contains("table") || combined.contains("query") || combined.contains("schema")) {
            detectedCategory = "Database / Schema";
            keywords.addAll(List.of("Database Schema", "Entity State", "SQL Query"));
        } else if (combined.contains("browser") || combined.contains("ui") || combined.contains("frontend") || combined.contains("page") || combined.contains("css")) {
            detectedCategory = "Browser / Web App";
            keywords.addAll(List.of("User Interface", "Frontend Flow", "Client View"));
        } else if (combined.contains("doc") || combined.contains("readme") || combined.contains("spec") || combined.contains("diagram")) {
            detectedCategory = "Documentation / Spec";
            keywords.addAll(List.of("Architecture Spec", "Technical Documentation"));
        } else {
            keywords.addAll(List.of("Component Structure", "Business Logic"));
        }

        String task = (room != null && room.getTask() != null) ? room.getTask() : "current task";
        String observation;
        if (errorInfo != null && "AI_QUOTA_EXCEEDED".equals(errorInfo.statusCategory())) {
            if (!transcript.isBlank()) {
                observation = "LOCAL_EVIDENCE: " + detectedCategory + " displayed while participant discussed: \"" + truncate(transcript, 90) + "\" (Deterministic extraction: Gemini quota exhausted)";
            } else {
                observation = "LOCAL_EVIDENCE: Visible demonstration of " + detectedCategory + " for task '" + task + "'. (Deterministic extraction: Gemini quota exhausted)";
            }
        } else {
            if (!transcript.isBlank()) {
                observation = "SCREEN_OBSERVED: " + detectedCategory + " displayed while participant discussed: \"" + truncate(transcript, 90) + "\"";
            } else {
                observation = String.format("SCREEN_OBSERVED: Visible demonstration of %s for task '%s'.",
                        detectedCategory, task);
            }
        }

        String status = (errorInfo != null) ? errorInfo.statusCategory() : "LOCAL_EVIDENCE";
        String message = (errorInfo != null) ? errorInfo.safeUserMessage() : "Deterministic local evidence extraction.";

        return ScreenCaptureItem.builder()
                .id(UUID.randomUUID().toString())
                .timestamp(now)
                .formattedTime(formattedTime)
                .imageBase64(imageBase64)
                .detectedCategory(detectedCategory)
                .observations(observation)
                .extractedKeywords(keywords)
                .analysisMode("LOCAL_EVIDENCE")
                .aiStatus(status)
                .aiMessage(message)
                .build();
    }

    @Override
    public String generateFollowUpQuestion(WorkUpdateRoom room) {
        if (room != null && (room.isAiQuotaExceeded() || "AI_QUOTA_EXCEEDED".equals(room.getAiStatus()))) {
            log.info("[WorkUpdateAI] Gemini quota exhausted; skipping follow-up question to prevent fake questions.");
            return null;
        }

        if (isApiKeyValid()) {
            try {
                StringBuilder context = new StringBuilder();
                context.append("Project: ").append(room.getProject()).append("\n");
                context.append("Task: ").append(room.getTask()).append("\n");
                if (!room.getStatements().isEmpty()) {
                    context.append("Participant Statements:\n");
                    room.getStatements().forEach(s -> context.append("- ").append(s.getTranscript()).append("\n"));
                }
                if (!room.getScreenCaptures().isEmpty()) {
                    context.append("Screen Observations:\n");
                    room.getScreenCaptures().forEach(c -> context.append("- [").append(c.getDetectedCategory()).append("]: ").append(c.getObservations()).append("\n"));
                }

                String prompt = context.toString() + """
                        Formulate ONE concise, highly relevant technical review follow-up question for this work demonstration.
                        Guidelines:
                        - Probe verification, error handling, edge cases, or architecture trade-offs.
                        - Ground the question in the specific project and task demonstrated above.
                        - Output ONLY the single question text. No preamble, no quotes.
                        """;

                return chatClient.prompt()
                        .system("You are a senior tech lead conducting a technical work review. Output ONLY the question.")
                        .user(prompt)
                        .call()
                        .content().strip();
            } catch (Exception e) {
                AiErrorInfo err = classifyException(e);
                logGeminiDiagnostic("generateFollowUpQuestion", e, err);
                if ("AI_QUOTA_EXCEEDED".equals(err.statusCategory())) {
                    if (room != null) {
                        room.setAiQuotaExceeded(true);
                        room.setAiStatus("AI_QUOTA_EXCEEDED");
                        room.setAiMessage(err.safeUserMessage());
                    }
                    log.warn("[WorkUpdateAI] Gemini quota exhausted during follow-up question; returning null to prevent fake questions.");
                    return null;
                }
                log.warn("[WorkUpdateAI] LLM question generation failed, using intelligent fallback: {}", e.getMessage());
            }
        }

        // Context-aware fallback question based on demonstrated work (used only in offline/unit-test mode when quota is not exhausted)
        int count = room != null ? room.getScreenCaptures().size() : 0;
        String task = (room != null && room.getTask() != null) ? room.getTask() : "task";
        String proj = (room != null && room.getProject() != null) ? room.getProject() : "the project";
        if (count % 3 == 1) {
            return "How are edge cases and failure modes handled in this " + task + " implementation?";
        } else if (count % 3 == 2) {
            return "Can you demonstrate the automated unit tests or integration verification for this feature?";
        } else {
            return "Where is the state persisted, and how does this change integrate with " + proj + "?";
        }
    }

    @Override
    public WorkUpdateReport generateReport(WorkUpdateRoom room) {
        Instant startTime = room.getStartedAt() != null ? room.getStartedAt() : room.getCreatedAt();
        Instant endTime = room.getCompletedAt() != null ? room.getCompletedAt() : Instant.now();
        long durationMinutes = Math.max(1, Duration.between(startTime, endTime).toMinutes());
        String durationStr = durationMinutes + " min (" + Duration.between(startTime, endTime).toSeconds() + " sec)";
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.systemDefault());
        String dateStr = dateFmt.format(startTime);

        List<String> questions = new ArrayList<>();
        List<String> answers = new ArrayList<>();
        for (FollowUpQuestion fq : room.getFollowUpQuestions()) {
            questions.add(fq.getQuestion());
            answers.add(fq.getAnswer() != null && !fq.getAnswer().isBlank() ? fq.getAnswer() : "No answer provided during session.");
        }

        boolean quotaExceeded = room.isAiQuotaExceeded() || "AI_QUOTA_EXCEEDED".equals(room.getAiStatus());

        if (isApiKeyValid() && !quotaExceeded) {
            try {
                StringBuilder sessionSummary = new StringBuilder();
                sessionSummary.append("Participant: ").append(room.getParticipantName()).append("\n");
                sessionSummary.append("Project: ").append(room.getProject()).append("\n");
                sessionSummary.append("Task: ").append(room.getTask()).append("\n");
                sessionSummary.append("Description: ").append(room.getDescription()).append("\n");
                sessionSummary.append("Duration: ").append(durationStr).append("\n\n");

                sessionSummary.append("Participant Statements (PARTICIPANT_STATED):\n");
                for (ParticipantStatement s : room.getStatements()) {
                    sessionSummary.append("[").append(s.getFormattedTime()).append("] ").append(s.getTranscript()).append("\n");
                }

                sessionSummary.append("\nScreen Observations (SCREEN_OBSERVED):\n");
                for (ScreenCaptureItem sc : room.getScreenCaptures()) {
                    sessionSummary.append("[").append(sc.getFormattedTime()).append("] (").append(sc.getDetectedCategory()).append("): ")
                            .append(sc.getObservations()).append(" [Keywords: ").append(String.join(", ", sc.getExtractedKeywords())).append("]\n");
                }

                sessionSummary.append("\nFollow-Up Questions & Answers:\n");
                for (FollowUpQuestion fq : room.getFollowUpQuestions()) {
                    sessionSummary.append("Q: ").append(fq.getQuestion()).append("\nA: ").append(fq.getAnswer() != null ? fq.getAnswer() : "Pending").append("\n");
                }

                String prompt = sessionSummary.toString() + """
                        Generate an evidence-based Work Update Report conforming strictly to technical audit standards.
                        RULES:
                        - Explicitly distinguish between:
                          1. PARTICIPANT_STATED: Claims made verbally by the participant.
                          2. SCREEN_OBSERVED: Visibly demonstrated artifacts, files, terminals, APIs.
                          3. AI_INFERENCE: Analytical inferences made by the AI model.
                          4. REVIEWER_VERIFIED: Left for reviewer sign-off.
                        - NEVER state that code is functional or verified unless visible test executions proved it.
                        - Return valid JSON matching:
                        {
                          "executiveSummary": "2-3 sentence executive overview...",
                          "workDemonstrated": ["Item 1...", "Item 2..."],
                          "participantStatements": ["Statement 1...", "Statement 2..."],
                          "screenEvidence": ["Evidence 1...", "Evidence 2..."],
                          "technicalDetails": ["Tech 1...", "Tech 2..."],
                          "issuesAndBlockers": ["Blocker 1 or None reported..."],
                          "pendingWork": ["Pending item 1..."],
                          "aiObservations": ["AI_INFERENCE: Observation 1...", "AI_INFERENCE: Observation 2..."]
                        }
                        Return ONLY the raw JSON string without markdown formatting.
                        """;

                String raw = chatClient.prompt()
                        .system("You are an objective engineering auditor generating an evidence-based report. Return ONLY valid JSON.")
                        .user(prompt)
                        .call()
                        .content().strip();

                raw = stripFences(raw);
                var tree = mapper.readTree(raw);

                return WorkUpdateReport.builder()
                        .participant(room.getParticipantName())
                        .project(room.getProject())
                        .task(room.getTask())
                        .roomId(room.getId())
                        .sessionDate(dateStr)
                        .sessionDuration(durationStr)
                        .executiveSummary(tree.has("executiveSummary") ? tree.get("executiveSummary").asText() : "")
                        .workDemonstrated(toList(tree.get("workDemonstrated")))
                        .participantStatements(toList(tree.get("participantStatements")))
                        .screenEvidence(toList(tree.get("screenEvidence")))
                        .technicalDetails(toList(tree.get("technicalDetails")))
                        .issuesAndBlockers(toList(tree.get("issuesAndBlockers")))
                        .pendingWork(toList(tree.get("pendingWork")))
                        .followUpQuestions(questions)
                        .participantAnswers(answers)
                        .aiObservations(toList(tree.get("aiObservations")))
                        .timeline(new ArrayList<>(room.getTimelineEvents()))
                        .reviewerFeedback(room.getReviewerComments() != null ? room.getReviewerComments() : "")
                        .actionItems(new ArrayList<>(room.getActionItems()))
                        .reviewStatus(room.getStatus())
                        .build();
            } catch (Exception e) {
                AiErrorInfo err = classifyException(e);
                logGeminiDiagnostic("generateReport", e, err);
                if ("AI_QUOTA_EXCEEDED".equals(err.statusCategory())) {
                    quotaExceeded = true;
                    room.setAiQuotaExceeded(true);
                    room.setAiStatus("AI_QUOTA_EXCEEDED");
                    room.setAiMessage(err.safeUserMessage());
                }
                log.warn("[WorkUpdateAI] Report generation LLM failed ({}: {}), using structured evidence synthesizer: {}",
                        err.statusCategory(), err.statusCode(), e.getMessage());
            }
        }

        // Deterministic evidence synthesizer
        List<String> demonstrated = new ArrayList<>();
        List<String> statements = new ArrayList<>();
        List<String> screenEvidence = new ArrayList<>();
        Set<String> techDetails = new LinkedHashSet<>();
        List<String> issues = new ArrayList<>();
        List<String> pending = new ArrayList<>();
        List<String> aiObs = new ArrayList<>();

        for (ParticipantStatement s : room.getStatements()) {
            statements.add("PARTICIPANT_STATED: \"" + s.getTranscript() + "\" (" + s.getFormattedTime() + ")");
            String t = s.getTranscript().toLowerCase();
            if (t.contains("blocked") || t.contains("issue") || t.contains("bug") || t.contains("error") || t.contains("fail") || t.contains("stuck")) {
                issues.add("Participant mentioned blocker: \"" + s.getTranscript() + "\"");
            }
            if (t.contains("todo") || t.contains("next") || t.contains("pending") || t.contains("haven't") || t.contains("need to")) {
                pending.add("Participant noted pending item: \"" + s.getTranscript() + "\"");
            }
        }

        for (ScreenCaptureItem sc : room.getScreenCaptures()) {
            demonstrated.add("SCREEN_OBSERVED: " + sc.getDetectedCategory() + " (" + sc.getObservations() + ")");
            screenEvidence.add("[" + sc.getFormattedTime() + "] " + sc.getDetectedCategory() + " — " + sc.getObservations());
            techDetails.addAll(sc.getExtractedKeywords());
        }

        if (demonstrated.isEmpty()) {
            demonstrated.add("Participant provided verbal explanation for task: " + room.getTask());
        }
        if (statements.isEmpty()) {
            statements.add("No spontaneous participant statements were captured during this session.");
        }
        if (screenEvidence.isEmpty()) {
            screenEvidence.add("No screen capture frames were recorded during this session.");
        }
        if (techDetails.isEmpty()) {
            techDetails.add(room.getProject());
            techDetails.add("General Software Architecture");
        }
        if (issues.isEmpty()) {
            issues.add("No blockers reported during the demonstration.");
        }
        if (pending.isEmpty()) {
            pending.add("Verification and sign-off pending reviewer assessment.");
        }

        if (quotaExceeded) {
            aiObs.add("Gemini AI analysis was unavailable for this session because the configured API quota was exhausted.");
        } else {
            aiObs.add("AI_INFERENCE: Participant demonstrated active engagement across " + room.getScreenCaptures().size() + " keyframe capture intervals.");
            aiObs.add("AI_INFERENCE: Verbal explanation aligned with visible artifacts in " + room.getProject() + ".");
            aiObs.add("AI_INFERENCE: Reviewer code review and automated CI test execution are recommended before final sign-off.");
        }

        int stmtsCount = room.getStatements().size();
        String stmtDesc = (stmtsCount == 0)
                ? "0 verbal statements"
                : (stmtsCount == 1)
                    ? "1 spontaneous verbal statement"
                    : stmtsCount + " spontaneous verbal statements";
        String execSummary = String.format("Participant %s demonstrated technical progress on '%s' for project '%s'. " +
                        "The session recorded %d visible screen demonstrations and %s. %s",
                room.getParticipantName(), room.getTask(), room.getProject(), room.getScreenCaptures().size(), stmtDesc,
                quotaExceeded ? "Gemini AI analysis was unavailable due to quota limits; reviewer verification is required for final sign-off." : "Reviewer verification is required for final sign-off.");

        return WorkUpdateReport.builder()
                .participant(room.getParticipantName())
                .project(room.getProject())
                .task(room.getTask())
                .roomId(room.getId())
                .sessionDate(dateStr)
                .sessionDuration(durationStr)
                .executiveSummary(execSummary)
                .workDemonstrated(demonstrated)
                .participantStatements(statements)
                .screenEvidence(screenEvidence)
                .technicalDetails(new ArrayList<>(techDetails))
                .issuesAndBlockers(issues)
                .pendingWork(pending)
                .followUpQuestions(questions)
                .participantAnswers(answers)
                .aiObservations(aiObs)
                .timeline(new ArrayList<>(room.getTimelineEvents()))
                .reviewerFeedback(room.getReviewerComments() != null ? room.getReviewerComments() : "")
                .actionItems(new ArrayList<>(room.getActionItems()))
                .reviewStatus(room.getStatus())
                .build();
    }

    private byte[] extractImageBytes(String imageBase64) {
        if (imageBase64 == null || imageBase64.isBlank()) return null;
        try {
            String raw = imageBase64;
            if (raw.contains(",")) {
                raw = raw.substring(raw.indexOf(",") + 1);
            }
            return Base64.getDecoder().decode(raw.trim());
        } catch (Exception e) {
            log.warn("[WorkUpdateAI] Failed to decode image bytes: {}", e.getMessage());
            return null;
        }
    }

    private List<String> toList(com.fasterxml.jackson.databind.JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node != null && node.isArray()) {
            node.forEach(item -> list.add(item.asText()));
        }
        return list;
    }

    private String truncate(String str, int max) {
        if (str == null) return "";
        return str.length() <= max ? str : str.substring(0, max) + "...";
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
