package com.examhelper.interview.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodingProblem {
    @Builder.Default
    private String id = UUID.randomUUID().toString();
    private String title;
    private String difficulty; // EASY, MEDIUM, HARD
    private String description;
    @Builder.Default
    private List<String> constraints = new ArrayList<>();
    @Builder.Default
    private List<Example> examples = new ArrayList<>();
    @Builder.Default
    private Map<String, String> starterCode = new HashMap<>(); // java, python, javascript
    @Builder.Default
    private List<TestCase> visibleTests = new ArrayList<>();
    @Builder.Default
    private List<TestCase> hiddenTests = new ArrayList<>();
    @Builder.Default
    private List<String> hints = new ArrayList<>();
    @Builder.Default
    private List<String> topics = new ArrayList<>();
    @Builder.Default
    private Map<String, String> expectedComplexity = new HashMap<>(); // "time", "space"
    @Builder.Default
    private int timeLimitMinutes = 20;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Example {
        private String input;
        private String output;
        private String explanation;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TestCase {
        private String input;
        private String expectedOutput;
    }
}
