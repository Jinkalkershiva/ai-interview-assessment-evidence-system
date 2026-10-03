package com.examhelper.extraction.service;

import com.examhelper.common.exception.AppException;
import com.examhelper.extraction.model.ExtractedDocument;
import org.springframework.web.multipart.MultipartFile;

/**
 * Extracts structured document chunks and plain text from an uploaded document.
 * Supported: PDF, DOCX, PPTX, TXT.
 */
public interface FileExtractorService {
    String extract(MultipartFile file) throws AppException;
    ExtractedDocument extractDocument(MultipartFile file) throws AppException;
}
