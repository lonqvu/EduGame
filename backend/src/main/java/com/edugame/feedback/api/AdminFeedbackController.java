package com.edugame.feedback.api;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

import com.edugame.common.config.AppProperties;
import com.edugame.feedback.domain.FeedbackScreenshot;
import com.edugame.feedback.domain.FeedbackStatus;
import com.edugame.feedback.dto.AdminFeedbackPage;
import com.edugame.feedback.dto.AdminFeedbackResponse;
import com.edugame.feedback.dto.UpdateFeedbackStatusRequest;
import com.edugame.feedback.service.FeedbackCsv;
import com.edugame.feedback.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** What teachers sent from "Góp ý", for the EduGame team (role ADMIN). */
@Tag(name = "Feedback (admin)", description = "Read and follow up teachers' feedback")
@RestController
@RequestMapping("/api/v1/admin/feedback")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminFeedbackController {

    private final FeedbackService feedbackService;
    private final AppProperties appProperties;

    @Operation(summary = "Feedback, newest first; filter by status (repeat the parameter for several)")
    @GetMapping
    public AdminFeedbackPage list(@RequestParam(required = false) List<FeedbackStatus> status,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "50") int size) {
        return feedbackService.list(status, page, size);
    }

    @Operation(summary = "Feedback as a CSV file for Excel (newest 10 000)")
    @GetMapping(path = "/export", produces = "text/csv")
    public ResponseEntity<byte[]> export(@RequestParam(required = false) List<FeedbackStatus> status) {
        ZoneId zone = appProperties.timeZone() != null ? appProperties.timeZone() : ZoneId.of("Asia/Ho_Chi_Minh");
        List<AdminFeedbackResponse> feedback = feedbackService.export(status);
        String name = "gop-y-edugame-%s.csv".formatted(LocalDate.now(zone).format(DateTimeFormatter.BASIC_ISO_DATE));
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(name).build().toString())
                .cacheControl(CacheControl.noStore())
                .body(FeedbackCsv.of(feedback, zone).getBytes(StandardCharsets.UTF_8));
    }

    @Operation(summary = "The screenshot sent with a feedback")
    @GetMapping("/{code}/screenshot")
    public ResponseEntity<byte[]> screenshot(@PathVariable String code) {
        FeedbackScreenshot screenshot = feedbackService.screenshot(code);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(screenshot.getContentType()))
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .body(screenshot.getData());
    }

    @Operation(summary = "Mark a feedback read (SEEN) or dealt with (DONE)")
    @PatchMapping("/{code}")
    public AdminFeedbackResponse updateStatus(@PathVariable String code, @Valid @RequestBody UpdateFeedbackStatusRequest request) {
        return feedbackService.updateStatus(code, request.status());
    }
}
