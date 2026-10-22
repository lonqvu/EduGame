package com.edugame.feedback.service;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.edugame.admin.domain.AdminAction;
import com.edugame.admin.domain.AdminTargetType;
import com.edugame.admin.service.AdminAuditService;
import com.edugame.asset.domain.ImageFormat;
import com.edugame.auth.service.DeviceNames;
import com.edugame.common.exception.BusinessException;
import com.edugame.common.exception.ResourceNotFoundException;
import com.edugame.feedback.domain.Feedback;
import com.edugame.feedback.domain.FeedbackScreenshot;
import com.edugame.feedback.domain.FeedbackStatus;
import com.edugame.feedback.dto.AdminFeedbackPage;
import com.edugame.feedback.dto.AdminFeedbackResponse;
import com.edugame.feedback.dto.FeedbackRequest;
import com.edugame.feedback.dto.FeedbackResponse;
import com.edugame.feedback.dto.FeedbackRules;
import com.edugame.feedback.mail.FeedbackMail;
import com.edugame.feedback.repository.FeedbackRepository;
import com.edugame.feedback.repository.FeedbackScreenshotRepository;
import com.edugame.user.domain.User;
import com.edugame.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** "Góp ý": teachers send feedback; admins read it, mark it, and export it. */
@Service
@RequiredArgsConstructor
public class FeedbackService {

    /** Formats a screenshot may come in (from the browser's canvas, or a picture the teacher picked). */
    private static final Set<ImageFormat> SCREENSHOT_FORMATS = EnumSet.of(ImageFormat.PNG, ImageFormat.JPEG, ImageFormat.WEBP);
    private static final String CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int CODE_LENGTH = 10;
    private static final SecureRandom RANDOM = new SecureRandom();
    public static final int MAX_PAGE_SIZE = 200;
    public static final int EXPORT_LIMIT = 10_000;

    private final CurrentUserService currentUserService;
    private final FeedbackRepository feedbackRepository;
    private final FeedbackScreenshotRepository screenshotRepository;
    private final ApplicationEventPublisher events;
    private final AdminAuditService auditService;

    /** Stores the teacher's feedback (and screenshot), then mails it to the team once committed. */
    @Transactional
    public FeedbackResponse send(FeedbackRequest request, MultipartFile screenshotFile, String userAgent) {
        User user = currentUserService.getCurrentUser();
        Instant now = Instant.now();
        if (feedbackRepository.countSentSince(user.getId(), now.minus(Duration.ofHours(1))) >= FeedbackRules.MAX_PER_HOUR) {
            throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_FEEDBACK",
                    "At most %d feedback an hour".formatted(FeedbackRules.MAX_PER_HOUR));
        }
        Screenshot screenshot = readScreenshot(screenshotFile);

        Short rating = request.rating() == null ? null : request.rating().shortValue();
        Feedback feedback = feedbackRepository.save(Feedback.create(newCode(), user, request.kind(), rating, request.message())
                .from(request.page(), request.viewport(), request.appVersion(), userAgent, request.contactOk()));
        if (screenshot != null) {
            screenshotRepository.save(FeedbackScreenshot.of(feedback.getId(), screenshot.format().mimeType(), screenshot.bytes()));
        }

        events.publishEvent(new FeedbackMail(feedback.getCode(), feedback.getKind(), feedback.getRating(), feedback.getMessage(),
                user.getDisplayName(), feedback.isContactOk() ? user.getEmail() : null, feedback.getPage(),
                DeviceNames.of(userAgent), feedback.getViewport(), feedback.getAppVersion(), now,
                screenshot == null ? null : screenshot.bytes(), screenshot == null ? null : screenshot.format().mimeType()));
        return new FeedbackResponse(feedback.getCode(), now);
    }

    /** Newest first; {@code statuses} empty: all of them. */
    @Transactional(readOnly = true)
    public AdminFeedbackPage list(Collection<FeedbackStatus> statuses, int page, int size) {
        Page<Feedback> found = newestFirst(statuses, Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE));
        return new AdminFeedbackPage(responses(found.getContent()), found.getTotalElements());
    }

    /** The newest {@value #EXPORT_LIMIT} feedback (the CSV export); the download is written to the admin log. */
    @Transactional
    public List<AdminFeedbackResponse> export(Collection<FeedbackStatus> statuses) {
        List<AdminFeedbackResponse> feedback = responses(newestFirst(statuses, 0, EXPORT_LIMIT).getContent());
        auditService.record(AdminAction.FEEDBACK_EXPORTED, AdminTargetType.FEEDBACK, null, null,
                Map.of("rows", feedback.size(), "statuses", statuses == null ? List.of() : statuses));
        return feedback;
    }

    private Page<Feedback> newestFirst(Collection<FeedbackStatus> statuses, int page, int size) {
        Collection<FeedbackStatus> wanted = statuses == null || statuses.isEmpty() ? EnumSet.allOf(FeedbackStatus.class) : statuses;
        return feedbackRepository.findByStatusIn(wanted,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))));
    }

    @Transactional(readOnly = true)
    public FeedbackScreenshot screenshot(String code) {
        Feedback feedback = find(code);
        return screenshotRepository.findById(feedback.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Screenshot", code));
    }

    @Transactional
    public AdminFeedbackResponse updateStatus(String code, FeedbackStatus status) {
        Feedback feedback = find(code);
        FeedbackStatus from = feedback.getStatus();
        if (from != status) {
            feedback.setStatus(status);
            auditService.record(AdminAction.FEEDBACK_STATUS_CHANGED, AdminTargetType.FEEDBACK, code, label(feedback),
                    Map.of("from", from, "to", status));
        }
        return responses(List.of(feedback)).getFirst();
    }

    /** "Báo lỗi – Cô Lan", as the admin log keeps it. */
    private static String label(Feedback feedback) {
        return feedback.getKind().label() + (feedback.getUser() == null ? "" : " – " + feedback.getUser().getDisplayName());
    }

    private Feedback find(String code) {
        return feedbackRepository.findByCode(code).orElseThrow(() -> new ResourceNotFoundException("Feedback", code));
    }

    private List<AdminFeedbackResponse> responses(List<Feedback> feedback) {
        Set<Long> withScreenshot = feedback.isEmpty()
                ? Set.of()
                : screenshotRepository.findIdsAmong(feedback.stream().map(Feedback::getId).toList());
        return feedback.stream().map(f -> {
            User user = f.getUser();
            AdminFeedbackResponse.Teacher teacher = user == null
                    ? null
                    : new AdminFeedbackResponse.Teacher(user.getCode(), user.getDisplayName(), user.getEmail());
            String screenshotUrl = withScreenshot.contains(f.getId())
                    ? "/api/v1/admin/feedback/%s/screenshot".formatted(f.getCode())
                    : null;
            return new AdminFeedbackResponse(f.getCode(), f.getKind(), f.getRating(), f.getMessage(), f.getPage(), f.getViewport(),
                    f.getAppVersion(), DeviceNames.of(f.getUserAgent()), f.isContactOk(), f.getStatus(), f.getCreatedAt(), teacher,
                    screenshotUrl);
        }).toList();
    }

    private record Screenshot(ImageFormat format, byte[] bytes) {
    }

    /** The screenshot if one was sent: a real PNG, JPEG or WebP (read from its bytes), at most 3 MB. */
    private static Screenshot readScreenshot(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        if (file.getSize() > FeedbackRules.MAX_SCREENSHOT_BYTES) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "IMAGE_TOO_LARGE", "The screenshot is at most 3 MB");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE", "The screenshot could not be read");
        }
        ImageFormat format = ImageFormat.detect(Arrays.copyOf(bytes, Math.min(bytes.length, ImageFormat.SIGNATURE_LENGTH)))
                .filter(SCREENSHOT_FORMATS::contains)
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE",
                        "The screenshot must be a PNG, JPEG or WebP picture"));
        return new Screenshot(format, bytes);
    }

    private static String newCode() {
        StringBuilder code = new StringBuilder("fb-");
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return code.toString();
    }
}
