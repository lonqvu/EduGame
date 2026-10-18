package com.edugame.feedback.api;

import com.edugame.feedback.dto.FeedbackRequest;
import com.edugame.feedback.dto.FeedbackResponse;
import com.edugame.feedback.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Feedback", description = "\"Góp ý\": teachers write to the EduGame team")
@RestController
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @Operation(summary = "Send feedback (multipart: JSON part \"feedback\", optional picture part \"screenshot\")")
    @PostMapping(path = "/api/v1/feedback", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FeedbackResponse send(@Valid @RequestPart("feedback") FeedbackRequest feedback,
                                 @RequestPart(value = "screenshot", required = false) MultipartFile screenshot,
                                 @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent) {
        return feedbackService.send(feedback, screenshot, userAgent);
    }
}
