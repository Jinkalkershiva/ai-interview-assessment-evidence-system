package com.examhelper.workupdate.service;

import com.examhelper.workupdate.model.ScreenCaptureItem;
import com.examhelper.workupdate.model.WorkUpdateReport;
import com.examhelper.workupdate.model.WorkUpdateRoom;

public interface WorkUpdateAiService {
    ScreenCaptureItem analyzeScreenFrame(String imageBase64, String participantNote, String currentTranscript, WorkUpdateRoom room);
    String generateFollowUpQuestion(WorkUpdateRoom room);
    WorkUpdateReport generateReport(WorkUpdateRoom room);
}
