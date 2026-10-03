package com.examhelper.extraction.service;

import com.examhelper.common.exception.AppException;
import com.examhelper.extraction.model.DocumentChunk;
import com.examhelper.extraction.model.ExtractedDocument;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
@Slf4j
public class FileExtractorServiceImpl implements FileExtractorService {

    private static final int MAX_TEXT_LENGTH = 32_000;
    private static final int TARGET_CHUNK_SIZE = 600;
    private static final Pattern BLANK_LINES = Pattern.compile("(\r?\n){3,}");

    @Override
    public String extract(MultipartFile file) throws AppException {
        return extractDocument(file).getFullCleanedText();
    }

    @Override
    public ExtractedDocument extractDocument(MultipartFile file) throws AppException {
        if (file == null || file.isEmpty()) {
            throw AppException.badRequest("File is empty or missing.");
        }

        String name = file.getOriginalFilename();
        if (name == null || !name.contains(".")) {
            throw AppException.badRequest("Cannot determine file type. Please upload a file with an extension.");
        }

        String ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase();
        long sizeBytes = file.getSize();

        log.info("[Extraction] filename={}, ext={}, size={}B", name, ext, sizeBytes);

        try {
            ExtractedDocument doc = switch (ext) {
                case "pdf"         -> fromPdf(file.getBytes(), name);
                case "doc", "docx" -> fromDocx(file, name);
                case "ppt", "pptx" -> fromPptx(file, name);
                case "txt"         -> fromTxt(file.getBytes(), name);
                default -> throw AppException.badRequest(
                        "Unsupported file type '." + ext + "'. Please upload PDF, DOCX, PPTX, or TXT.");
            };

            if (doc.getChunks().isEmpty() || doc.getFullCleanedText().isBlank()) {
                throw AppException.badRequest("The file appears to be empty or contains no extractable text.");
            }

            log.info("[Extraction] Successfully extracted {} chunks, {} total chars from '{}'",
                    doc.getChunks().size(), doc.getFullCleanedText().length(), name);

            return doc;

        } catch (AppException e) {
            throw e;
        } catch (IOException e) {
            log.error("[Extraction] IO error for {}: {}", name, e.getMessage());
            throw AppException.badRequest("Could not read the file. It may be corrupted or password-protected.");
        } catch (Exception e) {
            log.error("[Extraction] Unexpected error for {}: {}", name, e.getMessage(), e);
            throw AppException.serverError("Failed to extract text from the document.");
        }
    }

    // ── PDFBox 3: Page-by-Page Extraction ──────────────────────────────────────
    private ExtractedDocument fromPdf(byte[] bytes, String docName) throws IOException {
        List<DocumentChunk> chunks = new ArrayList<>();
        StringBuilder fullText = new StringBuilder();

        try (PDDocument pdf = Loader.loadPDF(bytes)) {
            int numPages = pdf.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            int chunkId = 1;

            for (int p = 1; p <= numPages; p++) {
                stripper.setStartPage(p);
                stripper.setEndPage(p);
                String pageRaw = stripper.getText(pdf);
                String pageClean = clean(pageRaw);

                if (!pageClean.isBlank()) {
                    fullText.append("--- Page ").append(p).append(" ---\n").append(pageClean).append("\n\n");

                    // Sub-chunk long pages for fine-grained RAG retrieval
                    List<String> subChunks = splitIntoSubChunks(pageClean, TARGET_CHUNK_SIZE);
                    for (String sc : subChunks) {
                        chunks.add(DocumentChunk.builder()
                                .id(chunkId++)
                                .documentName(docName)
                                .pageOrSection("Page " + p)
                                .pageNumber(p)
                                .text(sc)
                                .build());
                    }
                }
            }

            return ExtractedDocument.builder()
                    .documentName(docName)
                    .fullCleanedText(fullText.toString().trim())
                    .chunks(chunks)
                    .totalPagesOrSlides(numPages)
                    .build();
        }
    }

    // ── Apache POI DOCX: Section & Paragraph Extraction ───────────────────────
    private ExtractedDocument fromDocx(MultipartFile file, String docName) throws IOException {
        List<DocumentChunk> chunks = new ArrayList<>();
        StringBuilder fullText = new StringBuilder();

        try (XWPFDocument doc = new XWPFDocument(file.getInputStream())) {
            StringBuilder currentSection = new StringBuilder();
            int sectionNum = 1;
            int chunkId = 1;

            for (var p : doc.getParagraphs()) {
                String line = p.getText().strip();
                if (!line.isBlank()) {
                    currentSection.append(line).append("\n");
                    fullText.append(line).append("\n");

                    if (currentSection.length() >= TARGET_CHUNK_SIZE) {
                        chunks.add(DocumentChunk.builder()
                                .id(chunkId++)
                                .documentName(docName)
                                .pageOrSection("Section " + sectionNum)
                                .pageNumber(sectionNum)
                                .text(currentSection.toString().trim())
                                .build());
                        currentSection.setLength(0);
                        sectionNum++;
                    }
                }
            }

            if (currentSection.length() > 0) {
                chunks.add(DocumentChunk.builder()
                        .id(chunkId++)
                        .documentName(docName)
                        .pageOrSection("Section " + sectionNum)
                        .pageNumber(sectionNum)
                        .text(currentSection.toString().trim())
                        .build());
            }

            return ExtractedDocument.builder()
                    .documentName(docName)
                    .fullCleanedText(fullText.toString().trim())
                    .chunks(chunks)
                    .totalPagesOrSlides(sectionNum)
                    .build();
        }
    }

    // ── Apache POI PPTX: Slide-by-Slide Extraction ────────────────────────────
    private ExtractedDocument fromPptx(MultipartFile file, String docName) throws IOException {
        List<DocumentChunk> chunks = new ArrayList<>();
        StringBuilder fullText = new StringBuilder();

        try (XMLSlideShow pptx = new XMLSlideShow(file.getInputStream())) {
            int slideNum = 1;
            int chunkId = 1;

            for (var slide : pptx.getSlides()) {
                StringBuilder slideText = new StringBuilder();
                for (XSLFShape s : slide.getShapes()) {
                    if (s instanceof XSLFTextShape ts) {
                        String t = ts.getText();
                        if (t != null && !t.isBlank()) {
                            slideText.append(t.strip()).append("\n");
                        }
                    }
                }

                String cleanSlide = clean(slideText.toString());
                if (!cleanSlide.isBlank()) {
                    fullText.append("--- Slide ").append(slideNum).append(" ---\n").append(cleanSlide).append("\n\n");
                    chunks.add(DocumentChunk.builder()
                            .id(chunkId++)
                            .documentName(docName)
                            .pageOrSection("Slide " + slideNum)
                            .pageNumber(slideNum)
                            .text(cleanSlide)
                            .build());
                }
                slideNum++;
            }

            return ExtractedDocument.builder()
                    .documentName(docName)
                    .fullCleanedText(fullText.toString().trim())
                    .chunks(chunks)
                    .totalPagesOrSlides(slideNum - 1)
                    .build();
        }
    }

    // ── Plain TXT: Section Extraction ─────────────────────────────────────────
    private ExtractedDocument fromTxt(byte[] bytes, String docName) {
        String raw = new String(bytes, StandardCharsets.UTF_8);
        String cleaned = clean(raw);
        List<DocumentChunk> chunks = new ArrayList<>();

        List<String> subChunks = splitIntoSubChunks(cleaned, TARGET_CHUNK_SIZE);
        int id = 1;
        for (String sc : subChunks) {
            chunks.add(DocumentChunk.builder()
                    .id(id)
                    .documentName(docName)
                    .pageOrSection("Section " + id)
                    .pageNumber(id)
                    .text(sc)
                    .build());
            id++;
        }

        return ExtractedDocument.builder()
                .documentName(docName)
                .fullCleanedText(cleaned)
                .chunks(chunks)
                .totalPagesOrSlides(chunks.size())
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String clean(String raw) {
        if (raw == null) return "";
        String s = raw.replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", " ");
        s = BLANK_LINES.matcher(s).replaceAll("\n\n");
        return s.strip();
    }

    private List<String> splitIntoSubChunks(String text, int targetSize) {
        List<String> result = new ArrayList<>();
        if (text == null || text.isBlank()) return result;

        String[] paragraphs = text.split("\n\n+");
        StringBuilder current = new StringBuilder();

        for (String p : paragraphs) {
            String trimmed = p.strip();
            if (trimmed.isEmpty()) continue;

            if (current.length() + trimmed.length() > targetSize && current.length() > 0) {
                result.add(current.toString().trim());
                current.setLength(0);
            }
            current.append(trimmed).append("\n\n");
        }

        if (current.length() > 0) {
            result.add(current.toString().trim());
        }

        return result.isEmpty() ? List.of(text) : result;
    }
}
