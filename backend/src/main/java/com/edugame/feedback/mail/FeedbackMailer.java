package com.edugame.feedback.mail;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import com.edugame.common.config.AppProperties;
import com.edugame.common.mail.MailAddresses;
import com.edugame.common.mail.MailLayout;
import com.edugame.feedback.FeedbackProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.HtmlUtils;

/**
 * Mails each new feedback to the team ({@code app.feedback.notify-to}) once it is stored, on another thread so the
 * teacher does not wait for the SMTP server. "Reply" answers the teacher when they agreed to be written back to.
 * A failure is only logged: the feedback is kept and listed for admins either way.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FeedbackMailer {

    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy");
    private static final int SUBJECT_EXCERPT = 60;

    private final JavaMailSender mailSender;
    private final AppProperties appProperties;
    private final FeedbackProperties feedbackProperties;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void send(FeedbackMail mail) {
        if (feedbackProperties.notifyTo().isEmpty()) {
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(MailAddresses.sender(appProperties.mail().from()));
            helper.setTo(feedbackProperties.notifyTo().toArray(String[]::new));
            if (mail.teacherEmail() != null) {
                helper.setReplyTo(mail.teacherEmail());
            }
            helper.setSubject(subject(mail));
            helper.setText(text(mail), html(mail));
            if (mail.screenshot() != null) {
                helper.addAttachment("anh-man-hinh-" + mail.code() + extension(mail.screenshotType()),
                        new ByteArrayResource(mail.screenshot()), mail.screenshotType());
            }
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException | RuntimeException ex) {
            log.error("Could not mail feedback {}", mail.code(), ex);
        }
    }

    /** "[Góp ý Lớp Vui] Báo lỗi – Cô Lan: Không lưu được câu hỏi khi…". */
    static String subject(FeedbackMail mail) {
        String firstLine = mail.message().lines().findFirst().orElse("").strip();
        String excerpt = firstLine.length() <= SUBJECT_EXCERPT ? firstLine : firstLine.substring(0, SUBJECT_EXCERPT) + "…";
        return "[Góp ý Lớp Vui] %s – %s: %s".formatted(mail.kind().label(), teacher(mail), excerpt);
    }

    private String text(FeedbackMail mail) {
        return """
                %s từ %s%s

                %s

                Đánh giá: %s
                Trang: %s
                Thiết bị: %s
                Gửi lúc: %s
                Mã góp ý: %s
                %s
                """.formatted(mail.kind().label(), teacher(mail), mail.teacherEmail() == null ? "" : " <" + mail.teacherEmail() + ">",
                mail.message(), stars(mail.rating()), orDash(mail.page()), device(mail), when(mail), mail.code(), replyNote(mail));
    }

    private String html(FeedbackMail mail) {
        String email = mail.teacherEmail() == null ? "" : " &lt;%s&gt;".formatted(escape(mail.teacherEmail()));
        return MailLayout.wrap("""
                <p style="margin:0 0 12px"><span style="display:inline-block;padding:2px 10px;border-radius:999px;\
                background:#E3EEFD;color:#3563E9;font-weight:800">%s</span> từ <b>%s</b>%s</p>
                <div style="margin:0 0 20px;padding:14px 16px;border-radius:14px;background:#F6F8FC;white-space:pre-wrap">%s</div>
                <table style="border-collapse:collapse;font-size:14px;color:#5A6788">
                  <tr><td style="padding:2px 12px 2px 0">Đánh giá</td><td>%s</td></tr>
                  <tr><td style="padding:2px 12px 2px 0">Trang</td><td>%s</td></tr>
                  <tr><td style="padding:2px 12px 2px 0">Thiết bị</td><td>%s</td></tr>
                  <tr><td style="padding:2px 12px 2px 0">Gửi lúc</td><td>%s</td></tr>
                  <tr><td style="padding:2px 12px 2px 0">Mã góp ý</td><td>%s</td></tr>
                </table>
                <p style="margin:16px 0 0;color:#5A6788;font-size:14px">%s</p>
                """.formatted(escape(mail.kind().label()), escape(teacher(mail)), email, escape(mail.message()),
                stars(mail.rating()), escape(orDash(mail.page())), escape(device(mail)), when(mail), mail.code(),
                escape(replyNote(mail))));
    }

    private static String teacher(FeedbackMail mail) {
        return mail.teacherName() == null ? "Giáo viên" : mail.teacherName();
    }

    private static String stars(Short rating) {
        return rating == null ? "–" : "★".repeat(rating) + "☆".repeat(5 - rating) + " (%d/5)".formatted(rating);
    }

    private static String device(FeedbackMail mail) {
        String device = orDash(mail.device());
        if (mail.viewport() != null) {
            device += ", cửa sổ " + mail.viewport();
        }
        if (mail.appVersion() != null) {
            device += ", bản " + mail.appVersion();
        }
        return device;
    }

    private static String replyNote(FeedbackMail mail) {
        return mail.teacherEmail() != null
                ? "Giáo viên đồng ý được liên hệ lại: trả lời email này để viết cho giáo viên."
                : "Giáo viên không muốn được liên hệ lại.";
    }

    private String when(FeedbackMail mail) {
        ZoneId zone = appProperties.timeZone() != null ? appProperties.timeZone() : ZoneId.of("Asia/Ho_Chi_Minh");
        return WHEN.format(mail.at().atZone(zone));
    }

    private static String extension(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/gif" -> ".gif";
            default -> ".webp";
        };
    }

    private static String orDash(String value) {
        return value == null ? "–" : value;
    }

    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value, StandardCharsets.UTF_8.name());
    }
}
