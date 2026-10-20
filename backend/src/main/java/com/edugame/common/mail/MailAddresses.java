package com.edugame.common.mail;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;

/** Mail addresses as they go into headers. */
public final class MailAddresses {

    private MailAddresses() {
    }

    /**
     * The sender of {@code app.mail.from}, e.g. {@code Lớp vui <no-reply@edugame.vn>}. Its name has Vietnamese
     * letters, which a header may only carry encoded (RFC 2047): parsed as it is, it would go out raw and show up
     * garbled in some mail clients.
     */
    public static InternetAddress sender(String from) throws AddressException, UnsupportedEncodingException {
        InternetAddress parsed = new InternetAddress(from, true);
        String name = parsed.getPersonal();
        return name == null || name.isBlank()
                ? new InternetAddress(parsed.getAddress())
                : new InternetAddress(parsed.getAddress(), name, StandardCharsets.UTF_8.name());
    }
}
