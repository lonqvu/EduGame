package com.edugame.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

/** Random secrets and how they are stored: SHA-256 only, compared in constant time. */
final class Secrets {

    static final SecureRandom RANDOM = new SecureRandom();

    private Secrets() {
    }

    static String sha256Hex(String secret) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    /** Whether a hash computed from user input equals the stored one, without leaking where they differ. */
    static boolean matches(String presentedHash, String storedHash) {
        return storedHash != null && MessageDigest.isEqual(presentedHash.getBytes(StandardCharsets.US_ASCII),
                storedHash.getBytes(StandardCharsets.US_ASCII));
    }
}
