package com.examhelper.interview.service;

import com.examhelper.common.exception.AppException;
import com.examhelper.interview.dto.CodingDtos.RunCodeResponse;
import com.examhelper.interview.dto.CodingDtos.TestCaseResult;
import com.examhelper.interview.model.CodingProblem.TestCase;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class CodeExecutionService {

    @Value("${code.execution.sandbox-url:https://wandbox.org/api/compile.json}")
    private String sandboxUrl = "https://wandbox.org/api/compile.json";

    private static final int MAX_SOURCE_LENGTH = 65536; // 64 KB
    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    public RunCodeResponse execute(String language, String sourceCode, List<TestCase> testCases, boolean isHidden) {
        if (sourceCode == null || sourceCode.isBlank()) {
            throw AppException.badRequest("Source code cannot be empty.");
        }
        if (sourceCode.length() > MAX_SOURCE_LENGTH) {
            throw AppException.badRequest("Source code exceeds maximum allowed size of 64KB.");
        }

        String normalizedLang = language != null ? language.trim().toLowerCase() : "java";
        String compiler = resolveCompiler(normalizedLang);
        String preparedCode = sanitizeCode(normalizedLang, sourceCode);

        List<TestCaseResult> results = new ArrayList<>();
        int passedCount = 0;
        String overallStatus = "SUCCESS";
        String compileError = null;
        String runtimeError = null;

        for (int i = 0; i < testCases.size(); i++) {
            TestCase tc = testCases.get(i);
            long startTime = System.currentTimeMillis();

            try {
                Map<String, Object> payload = new HashMap<>();
                payload.put("code", preparedCode);
                payload.put("compiler", compiler);
                if (tc.getInput() != null) {
                    payload.put("stdin", tc.getInput());
                }

                String requestJson = mapper.writeValueAsString(payload);
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(sandboxUrl))
                        .timeout(TIMEOUT)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                long elapsedMs = System.currentTimeMillis() - startTime;

                if (response.statusCode() != 200) {
                    log.error("[CodeExecution] Sandbox returned status code {}", response.statusCode());
                    return RunCodeResponse.builder()
                            .status("ERROR")
                            .runtimeError("Sandbox execution failed with HTTP " + response.statusCode())
                            .tests(results)
                            .passedCount(passedCount)
                            .totalCount(testCases.size())
                            .allPassed(false)
                            .build();
                }

                JsonNode root = mapper.readTree(response.body());
                int exitStatus = root.path("status").asInt(0);
                String compErr = root.path("compiler_error").asText("");
                String progErr = root.path("program_error").asText("");
                String progOut = root.path("program_output").asText("");

                // Compile error check
                if (!compErr.isBlank() || (exitStatus != 0 && progOut.isEmpty() && progErr.isEmpty())) {
                    compileError = !compErr.isBlank() ? compErr : root.path("compiler_message").asText("Compilation failed.");
                    overallStatus = "COMPILE_ERROR";
                    results.add(TestCaseResult.builder()
                            .testIndex(i + 1)
                            .passed(false)
                            .input(isHidden ? "[Hidden Test Input]" : tc.getInput())
                            .expectedOutput(isHidden ? "[Hidden Output]" : tc.getExpectedOutput())
                            .actualOutput("")
                            .errorMessage(compileError)
                            .executionTime(elapsedMs + "ms")
                            .build());
                    // Abort further tests if compilation failed
                    break;
                }

                // Runtime error check
                if (!progErr.isBlank() && exitStatus != 0) {
                    runtimeError = progErr;
                    overallStatus = "RUNTIME_ERROR";
                    results.add(TestCaseResult.builder()
                            .testIndex(i + 1)
                            .passed(false)
                            .input(isHidden ? "[Hidden Test Input]" : tc.getInput())
                            .expectedOutput(isHidden ? "[Hidden Output]" : tc.getExpectedOutput())
                            .actualOutput(progOut)
                            .errorMessage(progErr)
                            .executionTime(elapsedMs + "ms")
                            .build());
                    continue;
                }

                // Normal comparison
                String actualTrimmed = progOut.strip().replace("\r\n", "\n");
                String expectedTrimmed = tc.getExpectedOutput() != null ? tc.getExpectedOutput().strip().replace("\r\n", "\n") : "";
                boolean passed = actualTrimmed.equals(expectedTrimmed);

                if (passed) {
                    passedCount++;
                } else if ("SUCCESS".equals(overallStatus)) {
                    overallStatus = "WRONG_ANSWER";
                }

                results.add(TestCaseResult.builder()
                        .testIndex(i + 1)
                        .passed(passed)
                        .input(isHidden ? "[Hidden Test Input]" : tc.getInput())
                        .expectedOutput(isHidden ? "[Hidden Output]" : tc.getExpectedOutput())
                        .actualOutput(actualTrimmed)
                        .executionTime(elapsedMs + "ms")
                        .build());

            } catch (java.net.http.HttpTimeoutException te) {
                overallStatus = "TIME_LIMIT_EXCEEDED";
                runtimeError = "Time limit exceeded (15s timeout).";
                results.add(TestCaseResult.builder()
                        .testIndex(i + 1)
                        .passed(false)
                        .input(isHidden ? "[Hidden Test Input]" : tc.getInput())
                        .expectedOutput(isHidden ? "[Hidden Output]" : tc.getExpectedOutput())
                        .errorMessage("Time Limit Exceeded")
                        .executionTime(">15000ms")
                        .build());
                break;
            } catch (Exception e) {
                log.error("[CodeExecution] Execution exception: ", e);
                overallStatus = "ERROR";
                runtimeError = "Execution exception: " + e.getMessage();
                results.add(TestCaseResult.builder()
                        .testIndex(i + 1)
                        .passed(false)
                        .input(isHidden ? "[Hidden Test Input]" : tc.getInput())
                        .expectedOutput(isHidden ? "[Hidden Output]" : tc.getExpectedOutput())
                        .errorMessage(e.getMessage())
                        .build());
                break;
            }
        }

        boolean allPassed = passedCount == testCases.size();
        return RunCodeResponse.builder()
                .status(overallStatus)
                .compileError(compileError)
                .runtimeError(runtimeError)
                .tests(results)
                .passedCount(passedCount)
                .totalCount(testCases.size())
                .allPassed(allPassed)
                .build();
    }

    private String resolveCompiler(String language) {
        return switch (language) {
            case "java" -> "openjdk-jdk-21+35";
            case "python", "py", "python3" -> "cpython-3.12.7";
            case "javascript", "js", "node" -> "nodejs-20.17.0";
            default -> throw AppException.badRequest("Unsupported programming language: " + language + ". Supported: java, python, javascript.");
        };
    }

    private String sanitizeCode(String language, String sourceCode) {
        if ("java".equalsIgnoreCase(language)) {
            // Replace 'public class Solution' or 'public class Main' with 'class Solution' so javac doesn't complain about filename in Wandbox's prog.java
            return sourceCode.replaceAll("(?m)^\\s*public\\s+class\\s+", "class ");
        }
        return sourceCode;
    }
}
