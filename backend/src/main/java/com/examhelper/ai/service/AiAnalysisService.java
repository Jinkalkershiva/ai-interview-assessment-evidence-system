package com.examhelper.ai.service;

import com.examhelper.analysis.dto.AnalysisResponse;
import com.examhelper.analysis.dto.ExamPattern;
import com.examhelper.extraction.model.ExtractedDocument;

/**
 * AI abstraction layer. Controllers never call Gemini/Spring AI directly.
 * Only implementations know the AI provider.
 */
public interface AiAnalysisService {
    AnalysisResponse analyze(String text, String documentName);
    AnalysisResponse generateExamPaper(ExtractedDocument doc, ExamPattern pattern);
}
