package com.edugame.auth.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import com.edugame.auth.domain.VerificationPurpose;
import com.edugame.common.config.AppProperties;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/** The mails are built completely (both versions) and handed to the mail sender. */
class AuthMailerTest {

    private final JavaMailSender mailSender = mock(JavaMailSender.class);
    private final AuthMailer mailer = new AuthMailer(mailSender,
            new AppProperties(null, null, new AppProperties.Mail("Lớp Vui <no-reply@edugame.vn>", false), null));

    @Test
    void verificationCodeMail() throws Exception {
        MimeMessage sent = send(new AuthMail.VerificationCode("co.hoa@truong.edu.vn", VerificationPurpose.REGISTER,
                "042917", 10));

        assertThat(sent.getSubject()).isEqualTo("Mã xác nhận Lớp Vui: 042917");
        assertThat(sent.getAllRecipients()[0].toString()).isEqualTo("co.hoa@truong.edu.vn");
        assertThat(sent.getFrom()[0].toString()).contains("no-reply@edugame.vn");
        // The Vietnamese sender name goes out encoded, and reads back as it is.
        assertThat(((InternetAddress) sent.getFrom()[0]).getPersonal()).isEqualTo("Lớp Vui");
        assertThat(sent.getHeader("From")[0]).startsWith("=?UTF-8?").doesNotContain("Lớp");
        assertThat(raw(sent)).contains("042917", "text/plain", "text/html");
    }

    @Test
    void accountExistsMailEscapesTheAddress() throws Exception {
        MimeMessage sent = send(new AuthMail.AccountExists("a<b>@truong.edu.vn"));

        assertThat(sent.getSubject()).isEqualTo("Bạn đã có tài khoản Lớp Vui");
        assertThat(raw(sent)).contains("a&lt;b&gt;@truong.edu.vn");
    }

    private MimeMessage send(AuthMail mail) {
        when(mailSender.createMimeMessage()).thenAnswer(invocation -> new JavaMailSenderImpl().createMimeMessage());
        mailer.send(mail);
        ArgumentCaptor<MimeMessage> message = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(message.capture());
        return message.getValue();
    }

    /** The decoded body parts, as the mail client would read them. */
    private static String raw(MimeMessage message) throws Exception {
        message.saveChanges();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        message.writeTo(out);
        String encoded = out.toString(StandardCharsets.UTF_8);
        StringBuilder decoded = new StringBuilder(encoded);
        Object content = message.getContent();
        if (content instanceof jakarta.mail.Multipart multipart) {
            appendParts(multipart, decoded);
        }
        return decoded.toString();
    }

    private static void appendParts(jakarta.mail.Multipart multipart, StringBuilder into) throws Exception {
        for (int i = 0; i < multipart.getCount(); i++) {
            Object part = multipart.getBodyPart(i).getContent();
            if (part instanceof jakarta.mail.Multipart nested) {
                appendParts(nested, into);
            } else {
                into.append('\n').append(part);
            }
        }
    }
}
