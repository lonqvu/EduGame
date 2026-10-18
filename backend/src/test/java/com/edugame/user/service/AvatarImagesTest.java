package com.edugame.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;

/** Any JPEG or PNG becomes its centre square, 256 px, re-encoded as JPEG; anything else is refused. */
class AvatarImagesTest {

    @Test
    void keepsTheCentreSquareOfAWidePicture() throws Exception {
        // 800 x 400: red bands of 200 px on both sides, blue in the middle 400 x 400.
        BufferedImage wide = new BufferedImage(800, 400, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = wide.createGraphics();
        g.setColor(Color.RED);
        g.fillRect(0, 0, 800, 400);
        g.setColor(Color.BLUE);
        g.fillRect(200, 0, 400, 400);
        g.dispose();

        BufferedImage avatar = decode(AvatarImages.toAvatar(encode(wide, "png")));

        assertThat(avatar.getWidth()).isEqualTo(256);
        assertThat(avatar.getHeight()).isEqualTo(256);
        for (int[] p : new int[][] {{2, 2}, {253, 128}, {128, 253}}) {
            Color c = new Color(avatar.getRGB(p[0], p[1]));
            assertThat(c.getBlue()).as("pixel %s", Arrays.toString(p)).isGreaterThan(200);
            assertThat(c.getRed()).as("pixel %s", Arrays.toString(p)).isLessThan(60);
        }
    }

    @Test
    void theResultIsANewJpeg() throws Exception {
        byte[] result = AvatarImages.toAvatar(encode(square(300, Color.GREEN), "jpeg"));

        assertThat(result).startsWith((byte) 0xFF, (byte) 0xD8);
        assertThat(ImageIO.getImageReadersByFormatName("jpeg").next().getOriginatingProvider()
                .canDecodeInput(ImageIO.createImageInputStream(new ByteArrayInputStream(result)))).isTrue();
        assertThat(result.length).isLessThan(64 * 1024);
    }

    @Test
    void aTransparentPictureGoesOnWhite() throws Exception {
        BufferedImage clear = new BufferedImage(200, 200, BufferedImage.TYPE_INT_ARGB);

        BufferedImage avatar = decode(AvatarImages.toAvatar(encode(clear, "png")));

        Color c = new Color(avatar.getRGB(128, 128));
        assertThat(c.getRed()).isGreaterThan(240);
        assertThat(c.getGreen()).isGreaterThan(240);
        assertThat(c.getBlue()).isGreaterThan(240);
    }

    @Test
    void refusesWhatIsNotAJpegOrPng() throws Exception {
        assertRefused("hello".getBytes(StandardCharsets.UTF_8), "INVALID_IMAGE");
        assertRefused(new byte[0], "INVALID_IMAGE");
        assertRefused(encode(square(100, Color.RED), "gif"), "INVALID_IMAGE");
        byte[] png = encode(square(300, Color.RED), "png");
        assertRefused(Arrays.copyOf(png, png.length / 3), "INVALID_IMAGE");
    }

    @Test
    void refusesPicturesTooSmallOrTooLarge() throws Exception {
        assertRefused(encode(square(40, Color.RED), "png"), "IMAGE_TOO_SMALL");
        assertRefused(encode(new BufferedImage(AvatarImages.MAX_SIDE + 1, 80, BufferedImage.TYPE_INT_RGB), "png"),
                "IMAGE_TOO_LARGE");
    }

    private static void assertRefused(byte[] upload, String code) {
        assertThatThrownBy(() -> AvatarImages.toAvatar(upload))
                .isInstanceOf(AvatarImages.InvalidImage.class)
                .satisfies(e -> assertThat(((AvatarImages.InvalidImage) e).code()).isEqualTo(code));
    }

    private static BufferedImage square(int side, Color color) {
        BufferedImage image = new BufferedImage(side, side, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, side, side);
        g.dispose();
        return image;
    }

    private static byte[] encode(BufferedImage image, String format) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        assertThat(ImageIO.write(image, format, out)).as("writer for " + format).isTrue();
        return out.toByteArray();
    }

    private static BufferedImage decode(byte[] bytes) throws Exception {
        return ImageIO.read(new ByteArrayInputStream(bytes));
    }
}
