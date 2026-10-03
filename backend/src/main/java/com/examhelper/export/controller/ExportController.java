package com.examhelper.export.controller;

import com.examhelper.analysis.dto.AnalysisResponse;
import com.examhelper.common.exception.AppException;
import com.examhelper.export.service.ExportService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * MODULE: export
 * GET /api/exams/export/{format}  →  streams file attachment
 * Reads the last AnalysisResponse stored in the HTTP session by AnalysisController.
 */
@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
@Slf4j
public class ExportController {

    private final ExportService exportService;

    @GetMapping("/export/{format}")
    public void export(
            @PathVariable String format,
            HttpSession session,
            HttpServletResponse response) throws IOException {

        AnalysisResponse data = (AnalysisResponse) session.getAttribute("analysis");
        String docName        = (String)            session.getAttribute("docName");

        if (data == null) {
            throw AppException.notFound("No analysis found. Please upload and analyze a document first.");
        }
        if (docName == null) docName = "Study_Guide";

        String safeDoc  = URLEncoder.encode(docName, StandardCharsets.UTF_8).replace("+", "_");
        String fileName = safeDoc + "_01." + format.toLowerCase();

        log.info("[Export] format={}, filename={}", format, fileName);

        switch (format.toLowerCase()) {
            case "pdf" -> {
                response.setContentType("application/pdf");
                response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
                exportService.exportPdf(data, docName, response.getOutputStream());
            }
            case "docx" -> {
                response.setContentType(
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
                response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
                exportService.exportDocx(data, docName, response.getOutputStream());
            }
            case "txt" -> {
                response.setContentType("text/plain; charset=UTF-8");
                response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
                exportService.exportTxt(data, docName, response.getOutputStream());
            }
            default -> response.sendError(400, "Unknown export format: " + format +
                    ". Supported: pdf, docx, txt");
        }
    }
}
