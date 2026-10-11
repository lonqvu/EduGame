package com.edugame.auth.mail;

import java.nio.charset.StandardCharsets;

import com.edugame.auth.domain.VerificationPurpose;
import com.edugame.common.config.AppProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.HtmlUtils;

/**
 * Sends {@link AuthMail}s after the transaction that published them commits (nothing is mailed for a rolled back
 * request), on another thread so the request does not wait for the SMTP server. A failure is logged; the user
 * can ask for a new code.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthMailer {

    private final JavaMailSender mailSender;
    private final AppProperties appProperties;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void send(AuthMail mail) {
        if (appProperties.mail().logCodes() && mail instanceof AuthMail.VerificationCode code) {
            log.info("[dev] Verification code for {}: {}", code.email(), code.code());
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            // Multipart: a plain-text and an HTML version of the same mail.
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(appProperties.mail().from());
            helper.setTo(mail.email());
            switch (mail) {
                case AuthMail.VerificationCode code -> {
                    Wording wording = Wording.of(code.purpose());
                    helper.setSubject(wording.subject() + code.code());
                    helper.setText(verificationText(code, wording), verificationHtml(code, wording));
                }
                case AuthMail.AccountExists exists -> {
                    helper.setSubject("Bạn đã có tài khoản EduGame");
                    helper.setText(accountExistsText(exists), accountExistsHtml(exists));
                }
            }
            mailSender.send(message);
        } catch (MessagingException | RuntimeException ex) {
            log.error("Could not send {} to {}", mail.getClass().getSimpleName(), mail.email(), ex);
        }
    }

    /** What a code mail says, per purpose. */
    private record Wording(String subject, String intro, String ignore) {

        static Wording of(VerificationPurpose purpose) {
            return switch (purpose) {
                case REGISTER -> new Wording("Mã xác nhận EduGame: ",
                        "Mã xác nhận email của bạn trên EduGame là:",
                        "Nếu bạn không đăng ký EduGame, hãy bỏ qua email này.");
                case RESET_PASSWORD -> new Wording("Mã đặt lại mật khẩu EduGame: ",
                        "Mã để đặt lại mật khẩu EduGame của bạn là:",
                        "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này: mật khẩu của bạn không đổi.");
            };
        }
    }

    private static String verificationText(AuthMail.VerificationCode code, Wording wording) {
        return """
                Xin chào,

                %s %s

                Mã có hiệu lực trong %d phút và chỉ dùng được một lần.
                %s
                """.formatted(wording.intro(), code.code(), code.validMinutes(), wording.ignore());
    }

    private static String verificationHtml(AuthMail.VerificationCode code, Wording wording) {
        return layout("""
                <p style="margin:0 0 16px">Xin chào,</p>
                <p style="margin:0 0 12px">%s</p>
                <p style="margin:0 0 20px;font-size:34px;font-weight:800;letter-spacing:8px;color:#3563E9">%s</p>
                <p style="margin:0 0 8px">Mã có hiệu lực trong <b>%d phút</b> và chỉ dùng được một lần.</p>
                <p style="margin:0;color:#5A6788">%s</p>
                """.formatted(wording.intro(), code.code(), code.validMinutes(), wording.ignore()));
    }

    private static String accountExistsText(AuthMail.AccountExists mail) {
        return """
                Xin chào,

                Có người vừa đăng ký EduGame bằng địa chỉ %s, nhưng địa chỉ này đã có tài khoản.
                Bạn có thể đăng nhập bằng email này. Nếu quên mật khẩu, hãy dùng "Quên mật khẩu?" ở trang đăng nhập.
                Nếu không phải bạn, hãy bỏ qua email này: tài khoản của bạn không bị thay đổi.
                """.formatted(mail.email());
    }

    private static String accountExistsHtml(AuthMail.AccountExists mail) {
        return layout("""
                <p style="margin:0 0 16px">Xin chào,</p>
                <p style="margin:0 0 12px">Có người vừa đăng ký EduGame bằng địa chỉ <b>%s</b>, nhưng địa chỉ này
                đã có tài khoản.</p>
                <p style="margin:0 0 12px">Bạn có thể đăng nhập bằng email này. Nếu quên mật khẩu, hãy dùng
                “Quên mật khẩu?” ở trang đăng nhập.</p>
                <p style="margin:0;color:#5A6788">Nếu không phải bạn, hãy bỏ qua email này: tài khoản của bạn không
                bị thay đổi.</p>
                """.formatted(HtmlUtils.htmlEscape(mail.email())));
    }

    private static String layout(String body) {
        return """
                <div style="background:#F3F9FE;padding:32px 16px;font-family:Nunito,'Segoe UI',Arial,sans-serif;\
                color:#1F2A44;font-size:16px;line-height:1.5">
                  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;padding:32px">
                    <p style="margin:0 0 24px;font-size:22px;font-weight:900">⭐ EduGame</p>
                    %s
                  </div>
                </div>
                """.formatted(body);
    }
}
