package com.edugame.user.service;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

/**
 * Turns an uploaded picture into the profile picture that is stored: the centre square, {@value #SIZE} px, as a new
 * JPEG. Nothing of the upload is kept but its pixels: no metadata (camera, GPS position), no hidden payload.
 */
public final class AvatarImages {

    public static final int SIZE = 256;
    public static final String CONTENT_TYPE = "image/jpeg";

    /** Smaller pictures are too blurry to be a face; larger ones could exhaust memory when decoded. */
    static final int MIN_SIDE = 64;
    static final int MAX_SIDE = 6000;

    private static final Set<String> FORMATS = Set.of("jpeg", "png");
    private static final float QUALITY = 0.88f;

    /** Why an upload was refused; {@link #code} goes to the API error. */
    public static final class InvalidImage extends Exception {

        private final String code;

        InvalidImage(String code, String message) {
            super(message);
            this.code = code;
        }

        public String code() {
            return code;
        }
    }

    private AvatarImages() {
    }

    public static byte[] toAvatar(byte[] upload) throws InvalidImage {
        BufferedImage source = read(upload);
        int side = Math.min(source.getWidth(), source.getHeight());
        int x = (source.getWidth() - side) / 2;
        int y = (source.getHeight() - side) / 2;

        BufferedImage avatar = new BufferedImage(SIZE, SIZE, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = avatar.createGraphics();
        try {
            // A transparent PNG goes on white, as on the page.
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, SIZE, SIZE);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(source, 0, 0, SIZE, SIZE, x, y, x + side, y + side, null);
        } finally {
            g.dispose();
        }
        return jpeg(avatar);
    }

    /** Decodes a JPEG or PNG, checking its size before decoding it. */
    private static BufferedImage read(byte[] upload) throws InvalidImage {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(upload))) {
            Iterator<ImageReader> readers = in == null ? null : ImageIO.getImageReaders(in);
            if (readers == null || !readers.hasNext()) {
                throw new InvalidImage("INVALID_IMAGE", "Not a picture");
            }
            ImageReader reader = readers.next();
            try {
                if (!FORMATS.contains(reader.getFormatName().toLowerCase(Locale.ROOT))) {
                    throw new InvalidImage("INVALID_IMAGE", "Only JPEG and PNG pictures are taken");
                }
                reader.setInput(in, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width > MAX_SIDE || height > MAX_SIDE) {
                    throw new InvalidImage("IMAGE_TOO_LARGE", "At most %d px a side".formatted(MAX_SIDE));
                }
                if (width < MIN_SIDE || height < MIN_SIDE) {
                    throw new InvalidImage("IMAGE_TOO_SMALL", "At least %d px a side".formatted(MIN_SIDE));
                }
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException e) {
            // Truncated or damaged files, unsupported colour models...
            throw new InvalidImage("INVALID_IMAGE", "The picture cannot be read");
        }
    }

    private static byte[] jpeg(BufferedImage image) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ImageOutputStream out = ImageIO.createImageOutputStream(bytes)) {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(QUALITY);
            writer.setOutput(out);
            writer.write(null, new IIOImage(image, null, null), param);
        } catch (IOException e) {
            throw new IllegalStateException("JPEG encoding failed", e);
        } finally {
            writer.dispose();
        }
        return bytes.toByteArray();
    }
}
