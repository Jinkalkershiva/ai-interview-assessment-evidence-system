package com.examhelper.workupdate.service;

import com.examhelper.workupdate.model.*;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.OutputStream;
import java.util.Base64;
import java.util.List;

@Service
@Slf4j
public class WorkUpdatePdfService {

    private static final Color PRIMARY   = new Color(0x1E, 0x29, 0x3B); // Slate 800
    private static final Color ACCENT    = new Color(0x3B, 0x5B, 0xDB); // Enterprise Indigo
    private static final Color DARK      = new Color(0x0F, 0x17, 0x2A);
    private static final Color MUTED     = new Color(0x64, 0x74, 0x8B);
    private static final Color BG_LIGHT  = new Color(0xF8, 0xFA, 0xFC);
    private static final Color BORDER    = new Color(0xE2, 0xE8, 0xF0);

    public void generatePdf(WorkUpdateRoom room, OutputStream out) {
        Document doc = new Document(PageSize.A4, 40, 40, 50, 40);
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();

            Font titleF   = new Font(Font.HELVETICA, 18, Font.BOLD,   PRIMARY);
            Font subTitleF= new Font(Font.HELVETICA, 10, Font.NORMAL, MUTED);
            Font h1F      = new Font(Font.HELVETICA, 11, Font.BOLD,   ACCENT);
            Font h2F      = new Font(Font.HELVETICA, 10, Font.BOLD,   DARK);
            Font bodyF    = new Font(Font.HELVETICA, 9,  Font.NORMAL, DARK);
            Font mutedF   = new Font(Font.HELVETICA, 8,  Font.ITALIC, MUTED);
            Font boldF    = new Font(Font.HELVETICA, 9,  Font.BOLD,   DARK);

            // Document Header
            Paragraph header = new Paragraph("WORK UPDATE REPORT", titleF);
            doc.add(header);
            doc.add(new Paragraph("System-Generated Engineering Work Review | Room: " + room.getId() + " | Status: " + room.getStatus(), subTitleF));
            doc.add(Chunk.NEWLINE);
            doc.add(new LineSeparator(1f, 100f, BORDER, Element.ALIGN_CENTER, -2));
            doc.add(Chunk.NEWLINE);

            // 1-6 Metadata Table + 20 Review Status
            PdfPTable metaTable = new PdfPTable(2);
            metaTable.setWidthPercentage(100);
            metaTable.setWidths(new float[]{1f, 1f});

            addMetaCell(metaTable, "1. Participant", room.getParticipantName() + (room.getParticipantEmail() != null ? " (" + room.getParticipantEmail() + ")" : ""), boldF, bodyF);
            addMetaCell(metaTable, "2. Project", room.getProject(), boldF, bodyF);
            addMetaCell(metaTable, "3. Task", room.getTask(), boldF, bodyF);
            addMetaCell(metaTable, "4. Room ID", room.getId(), boldF, bodyF);
            addMetaCell(metaTable, "5. Session Date", room.getReport() != null ? room.getReport().getSessionDate() : "N/A", boldF, bodyF);
            addMetaCell(metaTable, "6. Session Duration", room.getReport() != null ? room.getReport().getSessionDuration() : "N/A", boldF, bodyF);

            doc.add(metaTable);
            doc.add(Chunk.NEWLINE);

            WorkUpdateReport report = room.getReport();
            if (report == null) {
                doc.add(new Paragraph("Session is currently in progress or awaiting completion.", bodyF));
                doc.close();
                return;
            }

            // 7. Executive Summary
            addSectionHeading(doc, "7. EXECUTIVE SUMMARY", h1F);
            Paragraph execPara = new Paragraph(report.getExecutiveSummary() != null ? report.getExecutiveSummary() : "No summary available.", bodyF);
            execPara.setSpacingAfter(8f);
            doc.add(execPara);

            // 8. Work Demonstrated
            addSectionHeading(doc, "8. WORK DEMONSTRATED", h1F);
            addBulletList(doc, report.getWorkDemonstrated(), bodyF);

            // 9. Participant Statements (PARTICIPANT_STATED)
            addSectionHeading(doc, "9. PARTICIPANT STATEMENTS", h1F);
            addBulletList(doc, report.getParticipantStatements(), bodyF);

            // 10. Screen Evidence (SCREEN_OBSERVED)
            addSectionHeading(doc, "10. SCREEN EVIDENCE", h1F);
            addBulletList(doc, report.getScreenEvidence(), bodyF);

            // Embed relevant captured screenshots if present (up to 4 keyframes)
            if (!room.getScreenCaptures().isEmpty()) {
                doc.add(new Paragraph("Captured Visual Keyframes:", h2F));
                doc.add(Chunk.NEWLINE);

                PdfPTable imgTable = new PdfPTable(Math.min(2, room.getScreenCaptures().size()));
                imgTable.setWidthPercentage(100);

                int count = 0;
                for (ScreenCaptureItem item : room.getScreenCaptures()) {
                    if (count >= 4) break;
                    if (item.getImageBase64() != null && !item.getImageBase64().isBlank()) {
                        try {
                            String rawBase64 = item.getImageBase64();
                            if (rawBase64.contains(",")) {
                                rawBase64 = rawBase64.substring(rawBase64.indexOf(",") + 1);
                            }
                            byte[] imgBytes = Base64.getDecoder().decode(rawBase64);
                            Image img = Image.getInstance(imgBytes);
                            img.scaleToFit(220, 140);
                            PdfPCell c = new PdfPCell(img);
                            c.setBorderColor(BORDER);
                            c.setPadding(6);
                            c.setBackgroundColor(BG_LIGHT);
                            Paragraph caption = new Paragraph("[" + item.getFormattedTime() + "] " + item.getDetectedCategory(), mutedF);
                            c.addElement(caption);
                            imgTable.addCell(c);
                            count++;
                        } catch (Exception ex) {
                            log.debug("Could not embed image: {}", ex.getMessage());
                        }
                    }
                }
                if (count > 0) {
                    imgTable.completeRow();
                    doc.add(imgTable);
                    doc.add(Chunk.NEWLINE);
                }
            }

            // 11. Technical Details
            addSectionHeading(doc, "11. TECHNICAL DETAILS OBSERVED", h1F);
            if (!report.getTechnicalDetails().isEmpty()) {
                doc.add(new Paragraph(String.join(" • ", report.getTechnicalDetails()), bodyF));
            } else {
                doc.add(new Paragraph("No specific technologies were classified.", mutedF));
            }
            doc.add(Chunk.NEWLINE);

            // 12. Issues / Blockers
            addSectionHeading(doc, "12. ISSUES / BLOCKERS", h1F);
            addBulletList(doc, report.getIssuesAndBlockers(), bodyF);

            // 13. Pending Work
            addSectionHeading(doc, "13. PENDING WORK", h1F);
            addBulletList(doc, report.getPendingWork(), bodyF);

            // 14. Follow-up Questions & 15. Participant Answers
            addSectionHeading(doc, "14. FOLLOW-UP QUESTIONS & 15. PARTICIPANT ANSWERS", h1F);
            if (!report.getFollowUpQuestions().isEmpty()) {
                for (int i = 0; i < report.getFollowUpQuestions().size(); i++) {
                    String q = report.getFollowUpQuestions().get(i);
                    String a = (report.getParticipantAnswers().size() > i) ? report.getParticipantAnswers().get(i) : "No answer recorded.";
                    Paragraph qp = new Paragraph("Q" + (i + 1) + ": " + q, boldF);
                    Paragraph ap = new Paragraph("A: " + a, bodyF);
                    ap.setSpacingAfter(6f);
                    doc.add(qp);
                    doc.add(ap);
                }
            } else {
                doc.add(new Paragraph("No follow-up questions were raised during the session.", mutedF));
            }
            doc.add(Chunk.NEWLINE);

            // 16. AI Observations
            addSectionHeading(doc, "16. AI OBSERVATIONS (AI-GENERATED ANALYSIS)", h1F);
            addBulletList(doc, report.getAiObservations(), mutedF);

            // 17. Timeline
            addSectionHeading(doc, "17. TIMELINE (ACTUAL SESSION EVENTS)", h1F);
            if (!room.getTimelineEvents().isEmpty()) {
                PdfPTable timelineTable = new PdfPTable(3);
                timelineTable.setWidthPercentage(100);
                timelineTable.setWidths(new float[]{1.2f, 2.2f, 6.6f});

                for (TimelineEvent ev : room.getTimelineEvents()) {
                    PdfPCell timeCell = new PdfPCell(new Phrase(ev.getFormattedTime(), boldF));
                    timeCell.setBorder(Rectangle.NO_BORDER);
                    timeCell.setPaddingBottom(4);
                    PdfPCell typeCell = new PdfPCell(new Phrase("[" + ev.getType() + "]", mutedF));
                    typeCell.setBorder(Rectangle.NO_BORDER);
                    typeCell.setPaddingBottom(4);
                    PdfPCell descCell = new PdfPCell(new Phrase(ev.getDescription(), bodyF));
                    descCell.setBorder(Rectangle.NO_BORDER);
                    descCell.setPaddingBottom(4);

                    timelineTable.addCell(timeCell);
                    timelineTable.addCell(typeCell);
                    timelineTable.addCell(descCell);
                }
                doc.add(timelineTable);
            } else {
                doc.add(new Paragraph("No timeline events recorded.", mutedF));
            }
            doc.add(Chunk.NEWLINE);

            // 18. Reviewer Feedback
            addSectionHeading(doc, "18. REVIEWER FEEDBACK (REVIEWER-VERIFIED)", h1F);
            String feedback = room.getReviewerComments();
            if (feedback != null && !feedback.isBlank()) {
                doc.add(new Paragraph(feedback, bodyF));
            } else {
                doc.add(new Paragraph("Pending mentor / manager review.", mutedF));
            }
            doc.add(Chunk.NEWLINE);

            // 19. Action Items
            addSectionHeading(doc, "19. ACTION ITEMS", h1F);
            if (!room.getActionItems().isEmpty()) {
                PdfPTable actTable = new PdfPTable(3);
                actTable.setWidthPercentage(100);
                actTable.setWidths(new float[]{6f, 2.5f, 1.5f});
                actTable.addCell(new PdfPCell(new Phrase("Task", boldF)));
                actTable.addCell(new PdfPCell(new Phrase("Assignee", boldF)));
                actTable.addCell(new PdfPCell(new Phrase("Status", boldF)));

                for (ActionItem ai : room.getActionItems()) {
                    actTable.addCell(new PdfPCell(new Phrase(ai.getTask(), bodyF)));
                    actTable.addCell(new PdfPCell(new Phrase(ai.getAssignee() != null ? ai.getAssignee() : "Unassigned", bodyF)));
                    actTable.addCell(new PdfPCell(new Phrase(ai.isCompleted() ? "COMPLETED" : "PENDING", ai.isCompleted() ? bodyF : boldF)));
                }
                doc.add(actTable);
            } else {
                doc.add(new Paragraph("No action items assigned.", mutedF));
            }
            doc.add(Chunk.NEWLINE);

            // 20. Review Status Sign-off
            addSectionHeading(doc, "20. REVIEW STATUS & SIGN-OFF", h1F);
            Paragraph statusPara = new Paragraph("Current Review Status: " + room.getStatus(), boldF);
            statusPara.setSpacingAfter(4f);
            doc.add(statusPara);
            doc.add(new Paragraph("This document is an evidence-based record compiled by the AI Work Update Platform. Final sign-off is subject to reviewer verification.", mutedF));

            doc.close();
        } catch (Exception e) {
            log.error("[WorkUpdatePdf] Error generating PDF report: ", e);
        }
    }

    private void addSectionHeading(Document doc, String title, Font font) throws DocumentException {
        Paragraph p = new Paragraph(title, font);
        p.setSpacingBefore(8f);
        p.setSpacingAfter(4f);
        doc.add(p);
        doc.add(new LineSeparator(0.5f, 100f, BORDER, Element.ALIGN_CENTER, -1));
        doc.add(Chunk.NEWLINE);
    }

    private void addBulletList(Document doc, List<String> items, Font font) throws DocumentException {
        if (items == null || items.isEmpty()) {
            doc.add(new Paragraph("None reported or observed.", font));
            doc.add(Chunk.NEWLINE);
            return;
        }
        for (String item : items) {
            Paragraph p = new Paragraph("• " + item, font);
            p.setSpacingAfter(2.5f);
            doc.add(p);
        }
        doc.add(Chunk.NEWLINE);
    }

    private void addMetaCell(PdfPTable table, String label, String value, Font labelFont, Font valFont) {
        PdfPCell c = new PdfPCell();
        c.setBorderColor(BORDER);
        c.setBackgroundColor(BG_LIGHT);
        c.setPadding(6f);
        c.addElement(new Paragraph(label, labelFont));
        c.addElement(new Paragraph(value, valFont));
        table.addCell(c);
    }
}
