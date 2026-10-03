package com.examhelper.interview.controller;

import com.examhelper.common.response.ApiResponse;
import com.examhelper.interview.dto.CodingDtos.RunCodeRequest;
import com.examhelper.interview.dto.CodingDtos.RunCodeResponse;
import com.examhelper.interview.dto.CodingDtos.SubmitCodingRequest;
import com.examhelper.interview.dto.CodingDtos.CodingSubmissionResult;
import com.examhelper.interview.service.InterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/coding")
@RequiredArgsConstructor
public class CodingController {

    private final InterviewService interviewService;

    @PostMapping("/run")
    public ResponseEntity<ApiResponse<RunCodeResponse>> runCode(
            @RequestParam(value = "interviewId", required = false) String interviewIdParam,
            @RequestBody RunCodeRequest request) {

        String interviewId = (interviewIdParam != null && !interviewIdParam.isBlank())
                ? interviewIdParam
                : request.getProblemId();
        RunCodeResponse res = interviewService.runCode(interviewId, request);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<CodingSubmissionResult>> submitSolution(
            @RequestParam(value = "interviewId", required = false) String interviewIdParam,
            @RequestBody SubmitCodingRequest request) {

        String interviewId = (interviewIdParam != null && !interviewIdParam.isBlank())
                ? interviewIdParam
                : request.getProblemId();
        CodingSubmissionResult res = interviewService.submitCodingSolution(interviewId, request);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @GetMapping("/state")
    public ResponseEntity<ApiResponse<com.examhelper.interview.dto.CodingDtos.CodingStateResponse>> getCodingState(
            @RequestParam("interviewId") String interviewId) {

        com.examhelper.interview.dto.CodingDtos.CodingStateResponse res = interviewService.getCodingInterviewState(interviewId);
        return ResponseEntity.ok(ApiResponse.success(res));
    }
}
