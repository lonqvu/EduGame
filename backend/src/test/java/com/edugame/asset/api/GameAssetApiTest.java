package com.edugame.asset.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

import com.edugame.asset.service.GameAssetService;
import com.edugame.auth.service.AccessTokenService;
import com.edugame.auth.service.UserSessionService;
import com.edugame.user.domain.UserRole;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.dto.UserAccount;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * Images uploaded for questions, against PostgreSQL and a scratch folder. Requests carry real access tokens (no
 * default user), so the public file URL is checked without one. Cô Lan owns the seeded quiz g-quiz-vn, which may
 * already have images from using the app, so counts are compared with the count before. Every test is rolled back;
 * the files it wrote stay in target/test-assets.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestPropertySource(properties = {"app.assets.dir=target/test-assets", "app.auth.default-user-code="})
@Transactional
class GameAssetApiTest {

    private static final String QUIZ = "/api/v1/games/g-quiz-vn";
    private static final String UPLOAD = QUIZ + "/assets";

    private static final byte[] PNG = image(0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 13, 'I', 'H', 'D', 'R');
    private static final byte[] JPEG = image(0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 'J', 'F', 'I', 'F', 0);
    private static final byte[] GIF = image('G', 'I', 'F', '8', '9', 'a', 1, 0, 1, 0);
    private static final byte[] WEBP = image('R', 'I', 'F', 'F', 26, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' ');

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AccessTokenService accessTokenService;

    @Autowired
    private UserSessionService userSessionService;

    private String lan;
    private long assetsBefore;

    @BeforeEach
    void signIn() {
        assetsBefore = assetCount();
        Long id = jdbcTemplate.queryForObject("SELECT id FROM users WHERE code = 'u-lan'", Long.class);
        lan = bearer(new UserAccount(id, "u-lan", "colan", null, UserRole.TEACHER, UserStatus.ACTIVE));
    }

    // --- Upload -----------------------------------------------------------------------------------------------

    @Test
    void anImageIsStoredRecordedAndServedToAnyoneWithItsUrl() throws Exception {
        JsonNode asset = body(upload(lan, file("con-meo.png", MediaType.IMAGE_PNG_VALUE, PNG))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value(matchesPattern("/api/v1/assets/[A-Za-z0-9_-]{22}\\.png")))
                .andExpect(jsonPath("$.name").value("con-meo.png"))
                .andExpect(jsonPath("$.type").value("IMAGE"))
                .andExpect(jsonPath("$.mimeType").value("image/png"))
                .andExpect(jsonPath("$.sizeBytes").value(PNG.length)));

        Map<String, Object> row = jdbcTemplate.queryForMap("""
                SELECT a.type, a.name, a.url, a.mime_type, a.size_bytes FROM game_asset a JOIN game g ON g.id = a.game_id
                WHERE g.code = 'g-quiz-vn' AND a.id = ?
                """, asset.path("id").asLong());
        assertThat(row).containsEntry("type", "IMAGE").containsEntry("name", "con-meo.png")
                .containsEntry("url", asset.path("url").asText()).containsEntry("mime_type", "image/png")
                .containsEntry("size_bytes", (long) PNG.length);

        // No token: <img> tags and the projector load it like any picture, and may keep it for good.
        mockMvc.perform(get(asset.path("url").asText()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(content().bytes(PNG))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=31536000, public, immutable"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; sandbox"));
    }

    @Test
    void eachUploadGetsItsOwnUrlEvenForTheSameFile() throws Exception {
        String first = body(upload(lan, file("a.png", "image/png", PNG))).path("url").asText();
        String second = body(upload(lan, file("a.png", "image/png", PNG))).path("url").asText();

        assertThat(first).isNotEqualTo(second);
        mockMvc.perform(get(first)).andExpect(status().isOk());
        mockMvc.perform(get(second)).andExpect(status().isOk());
    }

    @Test
    void jpegGifAndWebpAreReadFromTheirBytesWhateverTheBrowserCalledThem() throws Exception {
        // Names and claimed types are often wrong (a ".png" saved as JPEG, "application/octet-stream" from phones).
        upload(lan, file("anh.png", "image/png", JPEG)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.mimeType").value("image/jpeg"))
                .andExpect(jsonPath("$.url").value(matchesPattern(".*\\.jpg")));
        upload(lan, file("dong.gif", "application/octet-stream", GIF)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.mimeType").value("image/gif"));
        String webp = body(upload(lan, file("hinh", null, WEBP)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.mimeType").value("image/webp"))).path("url").asText();

        mockMvc.perform(get(webp)).andExpect(content().contentType("image/webp"));
    }

    @Test
    void theNameKeepsOnlyTheFileNameAndIsNeverBlank() throws Exception {
        upload(lan, file("C:\\Users\\Lan\\Pictures\\voi.png", "image/png", PNG))
                .andExpect(jsonPath("$.name").value("voi.png"));
        upload(lan, file("", "image/png", PNG)).andExpect(jsonPath("$.name").value("image"));
        upload(lan, file("a".repeat(300) + ".png", "image/png", PNG))
                .andExpect(jsonPath("$.name").value("a".repeat(255)));
    }

    @Test
    void filesThatAreNotPicturesAreRefused() throws Exception {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>";
        upload(lan, file("logo.svg", "image/svg+xml", svg.getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_IMAGE"));
        upload(lan, file("trang.png", "image/png", "<html><body>hi</body></html>".getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isUnsupportedMediaType());
        // HEIC (iPhone photos): the editor converts them before upload when the browser can read them.
        upload(lan, file("IMG_0001.HEIC", "image/heic", image(0, 0, 0, 24, 'f', 't', 'y', 'p', 'h', 'e', 'i', 'c')))
                .andExpect(status().isUnsupportedMediaType());
        upload(lan, file("rong.png", "image/png", new byte[0]))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("EMPTY_FILE"));

        assertThat(assetCount()).isEqualTo(assetsBefore);
    }

    @Test
    void anImageIsAtMostFiveMegabytes() throws Exception {
        byte[] limit = Arrays.copyOf(PNG, (int) GameAssetService.MAX_IMAGE_BYTES);
        upload(lan, file("vua-du.png", "image/png", limit)).andExpect(status().isCreated());

        byte[] over = Arrays.copyOf(PNG, (int) GameAssetService.MAX_IMAGE_BYTES + 1);
        upload(lan, file("qua-lon.png", "image/png", over))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.code").value("FILE_TOO_LARGE"))
                .andExpect(jsonPath("$.message").value("An image is at most 5 MB"));
        assertThat(assetCount()).isEqualTo(assetsBefore + 1);
    }

    @Test
    void aRequestWithoutTheFileIsABadRequest() throws Exception {
        mockMvc.perform(multipart(UPLOAD).file(new MockMultipartFile("picture", "x.png", "image/png", PNG))
                        .header(HttpHeaders.AUTHORIZATION, lan))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
        mockMvc.perform(patch(UPLOAD).header(HttpHeaders.AUTHORIZATION, lan).contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void aGameTakesAtMostFiveHundredFiles() throws Exception {
        jdbcTemplate.update("""
                INSERT INTO game_asset (game_id, type, name, url)
                SELECT g.id, 'IMAGE', 'cu.png', '/api/v1/assets/old-' || n || '.png'
                FROM game g, generate_series(1, ?) n WHERE g.code = 'g-quiz-vn'
                """, 499 - assetsBefore);
        upload(lan, file("cuoi.png", "image/png", PNG)).andExpect(status().isCreated());

        upload(lan, file("thua.png", "image/png", PNG))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TOO_MANY_ASSETS"));
    }

    // --- Who may upload ----------------------------------------------------------------------------------------

    @Test
    void onlyTheGamesOwnerUploadsToIt() throws Exception {
        upload(null, file("a.png", "image/png", PNG))
                .andExpect(status().isUnauthorized());
        upload(otherTeacher(), file("a.png", "image/png", PNG))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
        mockMvc.perform(multipart("/api/v1/games/g-khong-co/assets").file(file("a.png", "image/png", PNG))
                        .header(HttpHeaders.AUTHORIZATION, lan))
                .andExpect(status().isNotFound());

        assertThat(assetCount()).isEqualTo(assetsBefore);
    }

    @Test
    void anArchivedGameTakesNoMoreImagesButItsImagesStillShow() throws Exception {
        String url = body(upload(lan, file("a.png", "image/png", PNG))).path("url").asText();
        mockMvc.perform(delete(QUIZ).header(HttpHeaders.AUTHORIZATION, lan)).andExpect(status().isNoContent());

        upload(lan, file("b.png", "image/png", PNG)).andExpect(status().isNotFound());
        // Results and copies of the game may still point at it.
        mockMvc.perform(get(url)).andExpect(status().isOk());
    }

    // --- Serving ----------------------------------------------------------------------------------------------

    @Test
    void onlyKeysTheServerMadeAreServed() throws Exception {
        String url = body(upload(lan, file("a.png", "image/png", PNG))).path("url").asText();
        String key = url.substring(url.lastIndexOf('/') + 1);
        String base = key.substring(0, key.indexOf('.'));

        mockMvc.perform(get("/api/v1/assets/" + base + ".gif")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/assets/" + base + ".svg")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/assets/" + base)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/assets/AAAAAAAAAAAAAAAAAAAAAA.png"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
        // Encoded slashes are already turned away by Spring Security's firewall.
        mockMvc.perform(get("/api/v1/assets/..%2F..%2Fpom.xml")).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/assets/..pom.xml")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/assets/upload-1.part")).andExpect(status().isNotFound());
    }

    // --- Helpers ----------------------------------------------------------------------------------------------

    private ResultActions upload(String token, MockMultipartFile file) throws Exception {
        var request = multipart(UPLOAD).file(file);
        return mockMvc.perform(token == null ? request : request.header(HttpHeaders.AUTHORIZATION, token));
    }

    private static MockMultipartFile file(String name, String contentType, byte[] bytes) {
        return new MockMultipartFile("file", name, contentType, bytes);
    }

    /** The first bytes of an image, followed by some padding. */
    private static byte[] image(int... head) {
        byte[] bytes = Arrays.copyOf(new byte[0], head.length + 32);
        for (int i = 0; i < head.length; i++) {
            bytes[i] = (byte) head[i];
        }
        return bytes;
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private long assetCount() {
        Long count = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM game_asset a JOIN game g ON g.id = a.game_id WHERE g.code = 'g-quiz-vn'
                """, Long.class);
        return count == null ? 0 : count;
    }

    private String otherTeacher() {
        Long userId = jdbcTemplate.queryForObject("""
                INSERT INTO users (code, username, password_hash, display_name, email, role)
                VALUES ('u-test-hoa', 'cohoa', '{noop}123456', 'Cô Hoa', 'cohoa@edugame.local', 'TEACHER')
                RETURNING id
                """, Long.class);
        return bearer(new UserAccount(userId, "u-test-hoa", "cohoa", null, UserRole.TEACHER, UserStatus.ACTIVE));
    }

    private String bearer(UserAccount account) {
        UUID sid = userSessionService.open(account, false, "test").sid();
        return "Bearer " + accessTokenService.issue(account, sid).accessToken();
    }
}
