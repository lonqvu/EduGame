package com.edugame.user.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import javax.imageio.ImageIO;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * A teacher's own profile picture against PostgreSQL: upload, the open address it is shown at, replacing and removing
 * it, and what is refused. Signed in as the seeded Cô Lan with real tokens. Every test is rolled back.
 */
@SpringBootTest(properties = "app.auth.default-user-code=")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class AvatarApiTest {

    private static final String AVATAR = "/api/v1/me/avatar";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void anUploadedPictureBecomesTheProfilePictureAndIsShownWithoutSigningIn() throws Exception {
        String token = login();

        JsonNode profile = body(upload(token, picture("photo.png", "image/png", "png", 900, 600)).andExpect(status().isOk()));

        assertThat(profile.path("avatar").asText()).isEqualTo("upload");
        String url = profile.path("avatarUrl").asText();
        assertThat(url).matches("/api/v1/avatars/[A-Za-z0-9_-]{22}");

        // Open to an <img>: no token, a JPEG of 256 x 256, cached for good.
        byte[] shown = mockMvc.perform(get(url))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "image/jpeg"))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=31536000, public, immutable"))
                .andReturn().getResponse().getContentAsByteArray();
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(shown));
        assertThat(image.getWidth()).isEqualTo(256);
        assertThat(image.getHeight()).isEqualTo(256);

        send(get("/api/v1/me/profile"), token).andExpect(jsonPath("$.avatarUrl").value(url));
    }

    @Test
    void aNewUploadReplacesThePictureAndItsAddress() throws Exception {
        String token = login();
        String first = body(upload(token, picture("a.jpg", "image/jpeg", "jpeg", 400, 400))).path("avatarUrl").asText();
        String second = body(upload(token, picture("b.jpg", "image/jpeg", "jpeg", 400, 400))).path("avatarUrl").asText();

        assertThat(second).isNotEqualTo(first);
        mockMvc.perform(get(first)).andExpect(status().isNotFound());
        mockMvc.perform(get(second)).andExpect(status().isOk());
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from user_avatar where user_id = (select id from users where code = 'u-lan')", Long.class))
                .isEqualTo(1);
    }

    @Test
    void savingTheProfileKeepsThePictureUntilADrawingIsPicked() throws Exception {
        String token = login();
        String url = body(upload(token, picture("a.png", "image/png", "png", 300, 300))).path("avatarUrl").asText();

        send(patch("/api/v1/me/profile"), token, Map.of("displayName", "Cô Lan", "phone", "", "avatar", "upload"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value(url));
        mockMvc.perform(get(url)).andExpect(status().isOk());

        send(patch("/api/v1/me/profile"), token, Map.of("displayName", "Cô Lan", "phone", "", "avatar", "owl"))
                .andExpect(jsonPath("$.avatar").value("owl"))
                .andExpect(jsonPath("$.avatarUrl").doesNotExist());
        mockMvc.perform(get(url)).andExpect(status().isNotFound());
    }

    @Test
    void removingThePictureGoesBackToTheDrawing() throws Exception {
        String token = login();
        String url = body(upload(token, picture("a.png", "image/png", "png", 300, 300))).path("avatarUrl").asText();

        send(delete(AVATAR), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar").doesNotExist())
                .andExpect(jsonPath("$.avatarUrl").doesNotExist());
        mockMvc.perform(get(url)).andExpect(status().isNotFound());
    }

    @Test
    void refusesWhatIsNotAProfilePicture() throws Exception {
        String token = login();

        upload(token, new MockMultipartFile("file", "notes.txt", "text/plain", "xin chào".getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_IMAGE"));
        // A picture's name and type are not trusted: the content decides.
        upload(token, new MockMultipartFile("file", "fake.png", "image/png", "<svg onload=alert(1)>".getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_IMAGE"));
        upload(token, picture("tiny.png", "image/png", "png", 30, 30))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("IMAGE_TOO_SMALL"));
        upload(token, new MockMultipartFile("file", "big.jpg", "image/jpeg", new byte[6 * 1024 * 1024]))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("IMAGE_TOO_LARGE"));
        upload(token, new MockMultipartFile("file", "empty.png", "image/png", new byte[0]))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_IMAGE"));
        send(multipart(AVATAR), token).andExpect(status().isBadRequest());
        // Keeping an upload there is none of.
        send(patch("/api/v1/me/profile"), token, Map.of("displayName", "Cô Lan", "phone", "", "avatar", "upload"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_AVATAR"));

        send(get("/api/v1/me/profile"), token).andExpect(jsonPath("$.avatarUrl").doesNotExist());
    }

    @Test
    void onlyASignedInTeacherUploadsAndUnknownPicturesAreNotFound() throws Exception {
        mockMvc.perform(multipart(AVATAR).file(picture("a.png", "image/png", "png", 300, 300)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete(AVATAR)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/avatars/khong-co-anh-nay-1234")).andExpect(status().isNotFound());
    }

    private String login() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("username", "colan", "password", "123456"));
        return body(mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())).path("accessToken").asText();
    }

    private ResultActions upload(String token, MockMultipartFile file) throws Exception {
        return mockMvc.perform(multipart(AVATAR).file(file).header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
    }

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
                               String token, Object... body) throws Exception {
        request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        if (body.length > 0) {
            request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body[0]));
        }
        return mockMvc.perform(request);
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
    }

    /** A picture file: a gradient, so the encoder has something to do. */
    private static MockMultipartFile picture(String name, String type, String format, int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        for (int x = 0; x < width; x++) {
            g.setColor(new Color(x * 255 / width, 120, 200));
            g.drawLine(x, 0, x, height);
        }
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, format, out);
        return new MockMultipartFile("file", name, type, out.toByteArray());
    }
}
