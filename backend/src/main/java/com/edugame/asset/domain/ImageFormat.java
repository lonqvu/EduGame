package com.edugame.asset.domain;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Optional;

/**
 * Image formats a teacher can upload. The format is read from the file's first bytes, never from its name or
 * the type the browser claims, so a file that is not really an image (an SVG with scripts, an HTML page) is
 * never stored or served.
 */
public enum ImageFormat {
    PNG("image/png", "png"),
    JPEG("image/jpeg", "jpg"),
    GIF("image/gif", "gif"),
    WEBP("image/webp", "webp");

    /** Bytes needed by {@link #detect(byte[])}. */
    public static final int SIGNATURE_LENGTH = 12;

    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};

    private final String mimeType;
    private final String extension;

    ImageFormat(String mimeType, String extension) {
        this.mimeType = mimeType;
        this.extension = extension;
    }

    public String mimeType() {
        return mimeType;
    }

    public String extension() {
        return extension;
    }

    public static Optional<ImageFormat> detect(byte[] head) {
        if (startsWith(head, PNG_SIGNATURE)) {
            return Optional.of(PNG);
        }
        if (head.length >= 3 && head[0] == (byte) 0xFF && head[1] == (byte) 0xD8 && head[2] == (byte) 0xFF) {
            return Optional.of(JPEG);
        }
        if (startsWith(head, ascii("GIF87a")) || startsWith(head, ascii("GIF89a"))) {
            return Optional.of(GIF);
        }
        if (startsWith(head, ascii("RIFF")) && head.length >= 12
                && Arrays.equals(head, 8, 12, ascii("WEBP"), 0, 4)) {
            return Optional.of(WEBP);
        }
        return Optional.empty();
    }

    public static Optional<ImageFormat> fromExtension(String extension) {
        return Arrays.stream(values()).filter(format -> format.extension.equals(extension)).findFirst();
    }

    private static boolean startsWith(byte[] bytes, byte[] prefix) {
        return bytes.length >= prefix.length && Arrays.equals(bytes, 0, prefix.length, prefix, 0, prefix.length);
    }

    private static byte[] ascii(String text) {
        return text.getBytes(StandardCharsets.US_ASCII);
    }
}
