package com.examhelper.interview.controller;

import com.examhelper.common.response.ApiResponse;
import com.examhelper.interview.dto.CodingDtos.*;
import com.examhelper.interview.dto.InterviewQuestionResponse;
import com.examhelper.interview.dto.InterviewReportResponse;
import com.examhelper.interview.dto.SubmitAnswerRequest;
import com.examhelper.interview.service.InterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/interview")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<InterviewQuestionResponse>> startInterview(
            @RequestParam(value = "resume", required = false) MultipartFile resume,
            @RequestParam(value = "jobRole", defaultValue = "Software Engineer") String jobRole,
            @RequestParam(value = "interviewType", defaultValue = "Mixed") String interviewType,
            @RequestParam(value = "difficulty", defaultValue = "Intermediate") String difficulty,
            @RequestParam(value = "questionCount", defaultValue = "5") Integer questionCount,
            @RequestParam(value = "jobDescription", required = false) String jobDescription) {

        InterviewQuestionResponse res = interviewService.startInterview(
                resume, jobRole, interviewType, difficulty, questionCount, jobDescription);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PostMapping("/{interviewId}/answer")
    public ResponseEntity<ApiResponse<InterviewQuestionResponse>> submitAnswer(
            @PathVariable String interviewId,
            @RequestBody SubmitAnswerRequest request) {
        
        InterviewQuestionResponse res = interviewService.submitAnswer(interviewId, request);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PostMapping("/{interviewId}/evaluate")
    public ResponseEntity<ApiResponse<InterviewReportResponse>> evaluateInterview(
            @PathVariable String interviewId) {
        
        InterviewReportResponse res = interviewService.evaluateInterview(interviewId);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    // ─── Coding Round Endpoints ──────────────────────────────────────────────

    @PostMapping("/coding/start")
    public ResponseEntity<ApiResponse<CodingProblemDto>> startCodingInterview(
            @RequestParam(value = "resume", required = false) MultipartFile resume,
            @RequestParam(value = "jobRole", defaultValue = "Software Engineer") String jobRole,
            @RequestParam(value = "difficulty", defaultValue = "Intermediate") String difficulty,
            @RequestParam(value = "focusTopics", defaultValue = "Data Structures & Algorithms") String focusTopics,
            @RequestParam(value = "problemCount", defaultValue = "1") Integer problemCount,
            @RequestParam(value = "jobDescription", required = false) String jobDescription) {

        CodingProblemDto res = interviewService.startCodingInterview(
                resume, jobRole, difficulty, focusTopics, problemCount, jobDescription);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PostMapping("/{interviewId}/coding/run")
    public ResponseEntity<ApiResponse<RunCodeResponse>> runCode(
            @PathVariable String interviewId,
            @RequestBody RunCodeRequest request) {

        RunCodeResponse res = interviewService.runCode(interviewId, request);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PostMapping("/{interviewId}/coding/submit")
    public ResponseEntity<ApiResponse<CodingSubmissionResult>> submitCodingSolution(
            @PathVariable String interviewId,
            @RequestBody SubmitCodingRequest request) {

        CodingSubmissionResult res = interviewService.submitCodingSolution(interviewId, request);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @GetMapping("/{interviewId}/coding/state")
    public ResponseEntity<ApiResponse<CodingStateResponse>> getCodingState(
            @PathVariable String interviewId) {

        CodingStateResponse res = interviewService.getCodingInterviewState(interviewId);
        return ResponseEntity.ok(ApiResponse.success(res));
    }
}
