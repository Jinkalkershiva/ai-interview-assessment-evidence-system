package com.examhelper.export.service;

import com.examhelper.analysis.dto.AnalysisResponse;
import com.examhelper.analysis.dto.ExamPattern;
import com.examhelper.analysis.dto.ExamQuestion;
import com.examhelper.analysis.dto.KeyPoint;
import com.examhelper.analysis.dto.SourceEvidence;
import com.examhelper.analysis.dto.Topic;
import com.lowagie.text.Chunk;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * MODULE: export
 * Generates official PDF, DOCX, and TXT exam papers from an AnalysisResponse.
 * Uses OpenPDF (com.lowagie.text.*) for PDF generation.
 */
@Service
@Slf4j
public class ExportService {

    // ── Colours ───────────────────────────────────────────────────────────────
    private static final Color PRIMARY = new Color(0x1E, 0x29, 0x3B);
    private static final Color ACCENT  = new Color(0x25, 0x63, 0xEB);
    private static final Color DARK    = new Color(0x0F, 0x17, 0x2A);
    private static final Color MUTED   = new Color(0x64, 0x74, 0x8B);
    private static final Color BADGE   = new Color(0x0D, 0x94, 0x88);

    // ══════════════════════════════════════════════════════════════════════════
    //  PDF
    // ══════════════════════════════════════════════════════════════════════════
    public void exportPdf(AnalysisResponse data, String docName, OutputStream out) {
        com.lowagie.text.Document doc = new com.lowagie.text.Document(PageSize.A4, 45, 45, 50, 40);
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();

            Font headerF  = new Font(Font.HELVETICA, 18, Font.BOLD, PRIMARY);
            Font subF     = new Font(Font.HELVETICA, 10, Font.ITALIC, MUTED);
            Font badgeF   = new Font(Font.HELVETICA, 9,  Font.BOLD, BADGE);
            Font secF     = new Font(Font.HELVETICA, 13, Font.BOLD, ACCENT);
            Font qNumF    = new Font(Font.HELVETICA, 10, Font.BOLD, DARK);
            Font bodyF    = new Font(Font.HELVETICA, 9,  Font.NORMAL, DARK);
            Font answerF  = new Font(Font.HELVETICA, 9,  Font.NORMAL, new Color(0x1E, 0x29, 0x3B));
            Font citeF    = new Font(Font.HELVETICA, 8,  Font.ITALIC, MUTED);

            // Document Header
            doc.add(new Paragraph(data.getDocumentName(), headerF));
            doc.add(new Paragraph("AI-Generated Examination Question Paper & Grounded Study Guide", subF));

            ExamPattern pat = data.getExamPattern() != null ? data.getExamPattern() : new ExamPattern(10, 5, 3);
            String patternInfo = "Total Marks: " + pat.getTotalMarks() + "  |  Total Questions: " + pat.getTotalQuestions()
                    + "  |  Section A (2M): " + pat.getTwoMarkCount()
                    + "  |  Section B (5M): " + pat.getFiveMarkCount()
                    + "  |  Section C (8M): " + pat.getEightMarkCount();
            doc.add(new Paragraph(patternInfo, badgeF));
            doc.add(Chunk.NEWLINE);
            doc.add(new LineSeparator());
            doc.add(Chunk.NEWLINE);

            // Summary
            if (data.getSummary() != null && !data.getSummary().isBlank()) {
                doc.add(new Paragraph("Curriculum Summary", secF));
                doc.add(new Paragraph(data.getSummary(), bodyF));
                doc.add(Chunk.NEWLINE);
            }

            // Questions Sectioned by Marks
            if (data.getQuestions() != null && !data.getQuestions().isEmpty()) {
                List<ExamQuestion> q2 = data.getQuestions().stream().filter(q -> q.getMarks() == 2).toList();
                List<ExamQuestion> q5 = data.getQuestions().stream().filter(q -> q.getMarks() == 5).toList();
                List<ExamQuestion> q8 = data.getQuestions().stream().filter(q -> q.getMarks() == 8).toList();

                if (!q2.isEmpty()) {
                    doc.add(new Paragraph("SECTION A: Short Answer & Definitions (2 Marks Each)", secF));
                    doc.add(new Paragraph("Answer all questions concisely. (" + q2.size() + " × 2 = " + (q2.size() * 2) + " Marks)", subF));
                    doc.add(Chunk.NEWLINE);
                    addQuestionsToPdf(doc, q2, qNumF, answerF, citeF);
                }

                if (!q5.isEmpty()) {
                    doc.add(new Paragraph("SECTION B: Detailed Mechanisms & Comparisons (5 Marks Each)", secF));
                    doc.add(new Paragraph("Answer with structured technical explanations and examples. (" + q5.size() + " × 5 = " + (q5.size() * 5) + " Marks)", subF));
                    doc.add(Chunk.NEWLINE);
                    addQuestionsToPdf(doc, q5, qNumF, answerF, citeF);
                }

                if (!q8.isEmpty()) {
                    doc.add(new Paragraph("SECTION C: Architectural & Long Form Analysis (8 Marks Each)", secF));
                    doc.add(new Paragraph("Provide comprehensive system architectural analysis and workflow considerations. (" + q8.size() + " × 8 = " + (q8.size() * 8) + " Marks)", subF));
                    doc.add(Chunk.NEWLINE);
                    addQuestionsToPdf(doc, q8, qNumF, answerF, citeF);
                }
            }

            // Topics & Grounded Study Guide
            if (data.getTopics() != null && !data.getTopics().isEmpty()) {
                doc.add(new Paragraph("STUDY GUIDE & KEY POINTS", secF));
                doc.add(Chunk.NEWLINE);
                for (Topic t : data.getTopics()) {
                    doc.add(new Paragraph(t.getName() + " [Importance: " + t.getImportance() + " — Rating: " + t.getImportanceRating() + "/5]", qNumF));
                    if (t.getSummary() != null && !t.getSummary().isBlank()) {
                        doc.add(new Paragraph(t.getSummary(), bodyF));
                    }
                    if (t.getKeyPoints() != null && !t.getKeyPoints().isEmpty()) {
                        for (KeyPoint kp : t.getKeyPoints()) {
                            doc.add(new Paragraph("• " + kp.getPoint() + " (" + kp.getImportanceRating() + "/5)", bodyF));
                        }
                    }
                    doc.add(Chunk.NEWLINE);
                }
            }

            doc.close();
        } catch (Exception e) {
            log.error("[Export] PDF generation failed: {}", e.getMessage(), e);
        }
    }

    private void addQuestionsToPdf(com.lowagie.text.Document doc, List<ExamQuestion> questions,
                                   Font qNumF, Font answerF, Font citeF) throws Exception {
        for (ExamQuestion q : questions) {
            Paragraph qPara = new Paragraph();
            qPara.add(new Chunk("Q" + q.getId() + ". " + q.getQuestion() + " [" + q.getMarks() + " Marks]", qNumF));
            doc.add(qPara);

            Paragraph ansPara = new Paragraph();
            ansPara.add(new Chunk("Model Answer: ", new Font(Font.HELVETICA, 9, Font.BOLD, DARK)));
            ansPara.add(new Chunk(q.getAnswer(), answerF));
            doc.add(ansPara);

            if (q.getSourceEvidence() != null && !q.getSourceEvidence().isEmpty()) {
                SourceEvidence ev = q.getSourceEvidence().get(0);
                Paragraph evPara = new Paragraph();
                evPara.add(new Chunk("Source Citation: [" + ev.getPageOrSection() + "] \"" + ev.getSnippet() + "\"", citeF));
                doc.add(evPara);
            }

            doc.add(Chunk.NEWLINE);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  DOCX
    // ══════════════════════════════════════════════════════════════════════════
    public void exportDocx(AnalysisResponse data, String docName, OutputStream out) throws IOException {
        try (XWPFDocument doc = new XWPFDocument()) {
            XWPFParagraph tp = doc.createParagraph();
            tp.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun tr = tp.createRun();
            tr.setText(data.getDocumentName());
            tr.setBold(true); tr.setFontSize(18); tr.setColor("2563EB");

            doc.createParagraph().createRun().setText("AI Exam Helper – Official Question Paper");

            if (data.getSummary() != null) {
                addDocxHeading(doc, "Curriculum Summary");
                doc.createParagraph().createRun().setText(data.getSummary());
            }

            if (data.getQuestions() != null) {
                addDocxHeading(doc, "Exam Questions");
                for (ExamQuestion q : data.getQuestions()) {
                    XWPFRun meta = doc.createParagraph().createRun();
                    meta.setText("Q" + q.getId() + ". [" + q.getSection() + " | " + q.getDifficulty() + "]");
                    meta.setColor("64748B"); meta.setFontSize(9);

                    XWPFRun qr = doc.createParagraph().createRun();
                    qr.setText(q.getQuestion()); qr.setBold(true);

                    doc.createParagraph().createRun().setText("Model Answer: " + q.getAnswer());

                    if (q.getSourceEvidence() != null && !q.getSourceEvidence().isEmpty()) {
                        SourceEvidence ev = q.getSourceEvidence().get(0);
                        XWPFRun cr = doc.createParagraph().createRun();
                        cr.setText("Source Citation: [" + ev.getPageOrSection() + "] " + ev.getSnippet());
                        cr.setItalic(true); cr.setColor("64748B"); cr.setFontSize(9);
                    }
                    doc.createParagraph();
                }
            }

            doc.write(out);
        }
    }

    private void addDocxHeading(XWPFDocument doc, String text) {
        XWPFRun r = doc.createParagraph().createRun();
        r.setText(text); r.setBold(true); r.setFontSize(13); r.setColor("0F172A");
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  TXT
    // ══════════════════════════════════════════════════════════════════════════
    public void exportTxt(AnalysisResponse data, String docName, OutputStream out) throws IOException {
        try (PrintWriter pw = new PrintWriter(out, true, StandardCharsets.UTF_8)) {
            pw.println(data.getDocumentName());
            pw.println("=".repeat(70));
            pw.println("AI Exam Helper – Official Question Paper");
            pw.println();

            if (data.getSummary() != null) {
                pw.println("CURRICULUM SUMMARY");
                pw.println("-".repeat(50));
                pw.println(data.getSummary());
                pw.println();
            }

            if (data.getQuestions() != null) {
                pw.println("EXAMINATION QUESTIONS");
                pw.println("-".repeat(50));
                for (ExamQuestion q : data.getQuestions()) {
                    pw.println("Q" + q.getId() + ". [" + q.getSection() + " | " + q.getMarks() + " Marks]");
                    pw.println(q.getQuestion());
                    pw.println("Model Answer: " + q.getAnswer());
                    if (q.getSourceEvidence() != null && !q.getSourceEvidence().isEmpty()) {
                        SourceEvidence ev = q.getSourceEvidence().get(0);
                        pw.println("Source: [" + ev.getPageOrSection() + "] " + ev.getSnippet());
                    }
                    pw.println();
                }
            }
        }
    }
}
