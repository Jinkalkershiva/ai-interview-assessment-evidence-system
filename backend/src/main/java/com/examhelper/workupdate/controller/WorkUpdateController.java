package com.examhelper.workupdate.controller;

import com.examhelper.common.response.ApiResponse;
import com.examhelper.workupdate.dto.WorkUpdateDtos.*;
import com.examhelper.workupdate.service.WorkUpdateService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/work-update")
@RequiredArgsConstructor
public class WorkUpdateController {

    private final WorkUpdateService workUpdateService;

    @PostMapping("/rooms")
    public ResponseEntity<ApiResponse<CreateRoomResponse>> createRoom(
            @Valid @RequestBody CreateRoomRequest request) {
        CreateRoomResponse res = workUpdateService.createRoom(request);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @GetMapping("/rooms")
    public ResponseEntity<ApiResponse<List<RoomSummaryDto>>> listRooms() {
        List<RoomSummaryDto> res = workUpdateService.listRooms();
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<ApiResponse<RoomDetailDto>> getRoom(
            @PathVariable String roomId,
            @RequestHeader(value = "X-Auth-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String queryToken) {
        String token = (headerToken != null && !headerToken.isBlank()) ? headerToken : queryToken;
        RoomDetailDto res = workUpdateService.getRoomDetail(roomId, token);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PostMapping("/rooms/{roomId}/start")
    public ResponseEntity<ApiResponse<RoomDetailDto>> startSession(
            @PathVariable String roomId,
            @RequestHeader(value = "X-Auth-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String queryToken) {
        String token = (headerToken != null && !headerToken.isBlank()) ? headerToken : queryToken;
        RoomDetailDto res = workUpdateService.startSession(roomId, token);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PostMapping("/rooms/{roomId}/pause")
    public ResponseEntity<ApiResponse<RoomDetailDto>> pauseSession(
            @PathVariable String roomId,
            @RequestHeader(value = "X-Auth-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String queryToken) {
        String token = (headerToken != null && !headerToken.isBlank()) ? headerToken : queryToken;
        RoomDetailDto res = workUpdateService.pauseSession(roomId, token);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PostMapping("/rooms/{roomId}/transcript")
    public ResponseEntity<ApiResponse<Void>> logTranscript(
            @PathVariable String roomId,
            @RequestHeader(value = "X-Auth-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String queryToken,
            @RequestBody TranscriptLogRequest request) {
        String token = (headerToken != null && !headerToken.isBlank()) ? headerToken : queryToken;
        workUpdateService.logTranscript(roomId, token, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/rooms/{roomId}/frame")
    public ResponseEntity<ApiResponse<ScreenFrameAnalysisResponse>> analyzeFrame(
            @PathVariable String roomId,
            @RequestHeader(value = "X-Auth-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String queryToken,
            @RequestBody ScreenFrameAnalysisRequest request) {
        String token = (headerToken != null && !headerToken.isBlank()) ? headerToken : queryToken;
        ScreenFrameAnalysisResponse res = workUpdateService.analyzeFrame(roomId, token, request);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PostMapping("/rooms/{roomId}/answer")
    public ResponseEntity<ApiResponse<Void>> answerQuestion(
            @PathVariable String roomId,
            @RequestHeader(value = "X-Auth-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String queryToken,
            @RequestBody FollowUpAnswerRequest request) {
        String token = (headerToken != null && !headerToken.isBlank()) ? headerToken : queryToken;
        workUpdateService.answerQuestion(roomId, token, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/rooms/{roomId}/complete")
    public ResponseEntity<ApiResponse<RoomDetailDto>> completeSession(
            @PathVariable String roomId,
            @RequestHeader(value = "X-Auth-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String queryToken) {
        String token = (headerToken != null && !headerToken.isBlank()) ? headerToken : queryToken;
        RoomDetailDto res = workUpdateService.completeSession(roomId, token);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @PutMapping("/rooms/{roomId}/review")
    public ResponseEntity<ApiResponse<RoomDetailDto>> updateReview(
            @PathVariable String roomId,
            @RequestHeader(value = "X-Auth-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String queryToken,
            @RequestBody ReviewerUpdateRequest request) {
        String token = (headerToken != null && !headerToken.isBlank()) ? headerToken : queryToken;
        RoomDetailDto res = workUpdateService.updateReview(roomId, token, request);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    @GetMapping("/rooms/{roomId}/export/pdf")
    public void exportPdf(
            @PathVariable String roomId,
            @RequestHeader(value = "X-Auth-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String queryToken,
            HttpServletResponse response) throws IOException {
        String token = (headerToken != null && !headerToken.isBlank()) ? headerToken : queryToken;

        response.setContentType(MediaType.APPLICATION_PDF_VALUE);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"work-update-" + roomId + ".pdf\"");
        workUpdateService.exportPdf(roomId, token, response.getOutputStream());
        response.flushBuffer();
    }
}
