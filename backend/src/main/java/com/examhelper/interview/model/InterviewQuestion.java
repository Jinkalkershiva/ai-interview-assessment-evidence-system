package com.examhelper.interview.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InterviewQuestion {
    private int questionNumber;
    private String question;
    private String answer;
}
