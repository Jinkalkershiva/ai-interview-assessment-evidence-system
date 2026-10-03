package com.examhelper.analysis.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AnalysisResponse {
    private String documentName;
    private String summary;
    private int topicCount;
    private int questionCount;
    private ExamPattern examPattern;
    private String evidenceStatus;
    private RetrievalReport retrievalReport;
    private List<Topic> topics = new ArrayList<>();
    private List<ExamQuestion> questions = new ArrayList<>();

    public AnalysisResponse(String documentName, String summary, int topicCount, int questionCount,
                            ExamPattern examPattern, List<Topic> topics, List<ExamQuestion> questions) {
        this.documentName = documentName;
        this.summary = summary;
        this.topicCount = topicCount;
        this.questionCount = questionCount;
        this.examPattern = examPattern;
        this.topics = topics != null ? topics : new ArrayList<>();
        this.questions = questions != null ? questions : new ArrayList<>();
        this.evidenceStatus = "HYBRID_RAG_OPTIMAL";
    }
}
