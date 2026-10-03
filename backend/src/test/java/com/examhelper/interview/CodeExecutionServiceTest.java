package com.examhelper.interview;

import com.examhelper.common.exception.AppException;
import com.examhelper.interview.dto.CodingDtos.RunCodeResponse;
import com.examhelper.interview.dto.CodingDtos.TestCaseResult;
import com.examhelper.interview.model.CodingProblem.TestCase;
import com.examhelper.interview.service.CodeExecutionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class CodeExecutionServiceTest {

    private CodeExecutionService executionService;

    @BeforeEach
    void setUp() {
        executionService = new CodeExecutionService();
    }

    @Test
    void testEmptyCodeThrowsBadRequest() {
        AppException ex = assertThrows(AppException.class, () -> {
            executionService.execute("java", "", List.of(), false);
        });
        assertTrue(ex.getMessage().contains("Source code cannot be empty"));
    }

    @Test
    void testExcessiveCodeLengthThrowsBadRequest() {
        String hugeCode = "a".repeat(70000);
        AppException ex = assertThrows(AppException.class, () -> {
            executionService.execute("java", hugeCode, List.of(), false);
        });
        assertTrue(ex.getMessage().contains("exceeds maximum allowed size"));
    }

    @Test
    void testUnsupportedLanguageThrowsBadRequest() {
        TestCase tc = new TestCase("1", "1");
        AppException ex = assertThrows(AppException.class, () -> {
            executionService.execute("brainfuck", "code", List.of(tc), false);
        });
        assertTrue(ex.getMessage().contains("Unsupported programming language"));
    }

    @Test
    void testCompileErrorHandling() {
        String invalidJava = "class Solution { public static void main(String[] args) { int a = ; } }";
        TestCase tc = new TestCase("test", "test");
        RunCodeResponse response = executionService.execute("java", invalidJava, List.of(tc), false);

        assertNotNull(response);
        assertEquals("COMPILE_ERROR", response.getStatus());
        assertNotNull(response.getCompileError());
        assertFalse(response.isAllPassed());
    }

    @Test
    void testRuntimeErrorHandling() {
        String runtimeErrJava = "class Solution { public static void main(String[] args) { int a = 10 / 0; } }";
        TestCase tc = new TestCase("test", "test");
        RunCodeResponse response = executionService.execute("java", runtimeErrJava, List.of(tc), false);

        assertNotNull(response);
        assertEquals("RUNTIME_ERROR", response.getStatus());
        assertNotNull(response.getRuntimeError());
        assertFalse(response.isAllPassed());
    }

    @Test
    void testHiddenTestCaseMasking() {
        String invalidJava = "class Solution { public static void main(String[] args) { int a = ; } }";
        TestCase tc = new TestCase("secret_input", "secret_output");
        RunCodeResponse response = executionService.execute("java", invalidJava, List.of(tc), true);

        assertNotNull(response);
        assertFalse(response.getTests().isEmpty());
        TestCaseResult result = response.getTests().get(0);
        assertEquals("[Hidden Test Input]", result.getInput());
        assertEquals("[Hidden Output]", result.getExpectedOutput());
    }
}
