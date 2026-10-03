package com.examhelper.analysis.controller;

import com.examhelper.ai.service.AiAnalysisService;
import com.examhelper.analysis.dto.AnalysisResponse;
import com.examhelper.analysis.dto.ExamPattern;
import com.examhelper.common.response.ApiResponse;
import com.examhelper.extraction.model.ExtractedDocument;
import com.examhelper.extraction.service.FileExtractorService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * MODULE: analysis
 * Endpoint: POST /api/exams/analyze
 * Orchestrates: extraction (Page/Slide/Section) → RAG Retrieval + LLM → strict pattern validation → response
 */
@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
@Slf4j
public class AnalysisController {

    private final FileExtractorService extractor;
    private final AiAnalysisService ai;

    private static final long MAX_BYTES = 15L * 1024 * 1024; // 15 MB

    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<AnalysisResponse>> analyze(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "twoMarkCount", defaultValue = "10") int twoMarkCount,
            @RequestParam(value = "fiveMarkCount", defaultValue = "5") int fiveMarkCount,
            @RequestParam(value = "eightMarkCount", defaultValue = "3") int eightMarkCount,
            HttpSession session) {

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("No file provided."));
        }
        if (file.getSize() > MAX_BYTES) {
            return ResponseEntity.status(413)
                    .body(ApiResponse.error("File too large. Maximum size is 15 MB."));
        }

        // Clamp reasonable bounds
        int clamped2M = Math.max(1, Math.min(30, twoMarkCount));
        int clamped5M = Math.max(0, Math.min(20, fiveMarkCount));
        int clamped8M = Math.max(0, Math.min(10, eightMarkCount));

        ExamPattern pattern = new ExamPattern(clamped2M, clamped5M, clamped8M);
        String docName = stripExt(file.getOriginalFilename());

        ExtractedDocument doc = extractor.extractDocument(file);
        log.info("[Analysis] Extracted {} chunks, {} pages/slides from '{}'. Generating paper with pattern: 2M={}, 5M={}, 8M={}",
                doc.getChunks().size(), doc.getTotalPagesOrSlides(), docName, clamped2M, clamped5M, clamped8M);

        AnalysisResponse result = ai.generateExamPaper(doc, pattern);

        // Store in session for export endpoint
        session.setAttribute("analysis", result);
        session.setAttribute("docName", docName);

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private String stripExt(String name) {
        if (name == null || name.isBlank()) return "Document";
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }
}
