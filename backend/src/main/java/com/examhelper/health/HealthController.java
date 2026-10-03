package com.examhelper.health;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Health check endpoint used by the Frontend to verify backend connectivity.
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    @Value("${spring.ai.openai.api-key:}")
    private String apiKey;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean aiConfigured = apiKey != null && !apiKey.isBlank() && !apiKey.equals("mock-key") && !apiKey.equals("your_gemini_api_key_here");
        return ResponseEntity.ok(Map.of(
                "status",  "ok",
                "service", "AI Exam Helper",
                "version", "1.0.0",
                "aiConfigured", aiConfigured
        ));
    }
}
