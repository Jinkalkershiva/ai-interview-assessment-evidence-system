package com.examhelper.interview.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InterviewQuestionResponse {
    private String interviewId;
    private int questionNumber;
    private int totalQuestions;
    private String question;
}
