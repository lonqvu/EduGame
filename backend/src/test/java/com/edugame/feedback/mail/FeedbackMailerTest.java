package com.edugame.feedback.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import com.edugame.common.config.AppProperties;
import com.edugame.feedback.FeedbackProperties;
import com.edugame.feedback.domain.FeedbackKind;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeUtility;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/** Feedback mails reach the team with the teacher's words, where they were, and the screenshot. */
class FeedbackMailerTest {

    private static final AppProperties APP = new AppProperties(null, null,
            new AppProperties.Mail("EduGame <no-reply@edugame.vn>", false), ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};

    private final JavaMailSender mailSender = mock(JavaMailSender.class);

    @Test
    void theTeamGetsTheFeedbackAndCanReplyToTheTeacher() throws Exception {
        MimeMessage sent = send(new FeedbackProperties(List.of("gopy@edugame.vn", " tech@edugame.vn ", "")),
                mail("cohoa@truong.edu.vn", PNG, "Nút <Lưu> không chạy\nDòng hai"));

        assertThat(sent.getSubject()).isEqualTo("[Góp ý EduGame] Báo lỗi – Cô Hoa: Nút <Lưu> không chạy");
        assertThat(sent.getAllRecipients()).extracting(Object::toString).containsExactly("gopy@edugame.vn", "tech@edugame.vn");
        assertThat(sent.getReplyTo()[0].toString()).isEqualTo("cohoa@truong.edu.vn");
        String text = text(sent);
        assertThat(text).contains("Nút &lt;Lưu&gt; không chạy", "★★☆☆☆ (2/5)", "/games/g-quiz-vn/edit",
                "Chrome trên Windows, cửa sổ 1366x768, bản 1.4.0", "14:05 ngày 18/10/2026", "fb-abc", "trả lời email này");
        assertThat(attachment(sent)).isEqualTo("anh-man-hinh-fb-abc.png");
    }

    @Test
    void withoutConsentNoReplyAddressAndNoAttachmentWithoutAScreenshot() throws Exception {
        MimeMessage sent = send(new FeedbackProperties(List.of("gopy@edugame.vn")), mail(null, null, "Hay lắm"));

        assertThat(sent.getReplyTo()[0].toString()).contains("no-reply@edugame.vn");
        assertThat(text(sent)).contains("không muốn được liên hệ lại");
        assertThat(attachment(sent)).isNull();
    }

    @Test
    void aLongFirstLineIsCutInTheSubject() {
        assertThat(FeedbackMailer.subject(mail(null, null, "a".repeat(100))))
                .isEqualTo("[Góp ý EduGame] Báo lỗi – Cô Hoa: " + "a".repeat(60) + "…");
    }

    @Test
    void nothingIsSentWithoutAnAddress() {
        new FeedbackMailer(mailSender, APP, new FeedbackProperties(null)).send(mail(null, null, "Hay"));
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    private static FeedbackMail mail(String email, byte[] screenshot, String message) {
        return new FeedbackMail("fb-abc", FeedbackKind.BUG, (short) 2, message, "Cô Hoa", email, "/games/g-quiz-vn/edit",
                "Chrome trên Windows", "1366x768", "1.4.0", Instant.parse("2026-10-18T07:05:00Z"), screenshot,
                screenshot == null ? null : "image/png");
    }

    private MimeMessage send(FeedbackProperties properties, FeedbackMail mail) {
        when(mailSender.createMimeMessage()).thenAnswer(invocation -> new JavaMailSenderImpl().createMimeMessage());
        new FeedbackMailer(mailSender, APP, properties).send(mail);
        ArgumentCaptor<MimeMessage> message = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(message.capture());
        return message.getValue();
    }

    /** The decoded text and HTML of the mail. */
    private static String text(MimeMessage message) throws Exception {
        StringBuilder out = new StringBuilder();
        collect(message, out);
        return out.toString();
    }

    private static void collect(Part part, StringBuilder out) throws Exception {
        Object content = part.getContent();
        if (content instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                collect(multipart.getBodyPart(i), out);
            }
        } else if (content instanceof String text) {
            out.append(text).append('\n');
        }
    }

    private static String attachment(MimeMessage message) throws Exception {
        message.saveChanges();
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        message.writeTo(raw);
        String name = find(message);
        return name == null ? null : MimeUtility.decodeText(name);
    }

    private static String find(Part part) throws Exception {
        if (Part.ATTACHMENT.equalsIgnoreCase(part.getDisposition())) {
            return part.getFileName();
        }
        if (part.getContent() instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                String name = find(multipart.getBodyPart(i));
                if (name != null) {
                    return name;
                }
            }
        }
        return null;
    }
}
