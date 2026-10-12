package com.edugame.classroom.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import com.edugame.auth.service.AccessTokenService;
import com.edugame.auth.service.UserSessionService;
import com.edugame.user.domain.UserRole;
import com.edugame.user.domain.UserStatus;
import com.edugame.user.dto.UserAccount;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creating, editing, pausing and archiving classes, managing the class list and recording the games played with a
 * class, against PostgreSQL. Cô Lan has the seeded classes 1A (active), 2B (paused) and 3A (active). Every test is
 * rolled back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class ClassroomManagementApiTest {

    private static final String CLASSES = "/api/v1/classrooms";

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

    // --- Listing ------------------------------------------------------------------------------------------------

    @Test
    void listsActiveAndPausedClassesByGradeWithTheirCounts() throws Exception {
        mockMvc.perform(get(CLASSES)).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code").value(contains("c-1a", "c-2b", "c-3a")))
                .andExpect(jsonPath("$[0].schoolName").value("Tiểu học Kim Đồng"))
                .andExpect(jsonPath("$[0].avatar").value("rabbit"))
                .andExpect(jsonPath("$[0].studentCount").value(25))
                .andExpect(jsonPath("$[0].activityCount").value(8))
                .andExpect(jsonPath("$[0].completedCount").value(5))
                .andExpect(jsonPath("$[0].completionRate").value(63))
                .andExpect(jsonPath("$[1].status").value("PAUSED"))
                .andExpect(jsonPath("$[1].completionRate").value(33))
                .andExpect(jsonPath("$[2].lastPlayedAt").isNotEmpty());

        mockMvc.perform(get(CLASSES).param("status", "PAUSED")).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code").value(contains("c-2b")));
        mockMvc.perform(get(CLASSES).param("status", "ACTIVE")).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code").value(contains("c-1a", "c-3a")));
        mockMvc.perform(get(CLASSES).param("status", "ARCHIVED")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_STATUS"));
        mockMvc.perform(get(CLASSES).param("status", "LOST")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    // --- Creating and editing -----------------------------------------------------------------------------------

    @Test
    void createsAClassWithNoStudentsOrActivityYet() throws Exception {
        JsonNode created = body(createClass("""
                {"name": "  4C  ", "grade": 4, "schoolYear": "2026-2027", "schoolName": " Tiểu học Kim Đồng ", "avatar": "fox"}
                """).andExpect(status().isCreated()));

        String code = created.path("code").asText();
        assertThat(code).matches("c-[a-z0-9]{8}");
        assertThat(created.path("name").asText()).isEqualTo("4C");
        assertThat(created.path("schoolName").asText()).isEqualTo("Tiểu học Kim Đồng");
        assertThat(created.path("status").asText()).isEqualTo("ACTIVE");
        assertThat(created.path("studentCount").asLong()).isZero();
        assertThat(created.path("activityCount").asLong()).isZero();
        assertThat(created.path("completionRate").asInt()).isZero();
        assertThat(created.hasNonNull("lastPlayedAt")).isFalse();

        mockMvc.perform(get(CLASSES + "/" + code)).andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar").value("fox"))
                .andExpect(jsonPath("$.schoolYear").value("2026-2027"));
        mockMvc.perform(get(CLASSES)).andExpect(jsonPath("$[*].code").value(
                contains("c-1a", "c-2b", "c-3a", code)));
    }

    @Test
    void rejectsInvalidClasses() throws Exception {
        createClass("{\"grade\": 1}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        createClass("{\"name\": \"   \", \"grade\": 1}").andExpect(status().isBadRequest());
        createClass("{\"name\": \"%s\", \"grade\": 1}".formatted("x".repeat(51))).andExpect(status().isBadRequest());
        createClass("{\"name\": \"5A\"}").andExpect(status().isBadRequest());
        createClass("{\"name\": \"5A\", \"grade\": 0}").andExpect(status().isBadRequest());
        createClass("{\"name\": \"5A\", \"grade\": 13}").andExpect(status().isBadRequest());
        createClass("{\"name\": \"5A\", \"grade\": 5, \"schoolYear\": \"2026\"}").andExpect(status().isBadRequest());
        createClass("{\"name\": \"5A\", \"grade\": 5, \"avatar\": \"dragon\"}").andExpect(status().isBadRequest());
        createClass("{\"name\": \"5A\", \"grade\": 5, \"schoolName\": \"%s\"}".formatted("x".repeat(101)))
                .andExpect(status().isBadRequest());
        createClass("{\"name\": \"5A\", \"grade\": 5, \"schoolYear\": \"2026-2028\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SCHOOL_YEAR"));
        assertThat(countClasses()).isEqualTo(3);
    }

    @Test
    void aNameIsUsedOncePerSchoolYearIgnoringCase() throws Exception {
        // 3A is seeded for 2026-2027.
        createClass("{\"name\": \"3a\", \"grade\": 3, \"schoolYear\": \"2026-2027\"}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CLASSROOM_NAME_TAKEN"));
        createClass("{\"name\": \"3A\", \"grade\": 3, \"schoolYear\": \"2027-2028\"}").andExpect(status().isCreated());
        createClass("{\"name\": \"3A\", \"grade\": 3}").andExpect(status().isCreated());
        createClass("{\"name\": \"3a\", \"grade\": 3}").andExpect(status().isConflict());

        // Renaming into a taken name fails, keeping one's own name (other case) does not.
        send(patch(CLASSES + "/c-1a"), "{\"name\": \"3A\", \"schoolYear\": \"2026-2027\"}").andExpect(status().isConflict());
        send(patch(CLASSES + "/c-1a"), "{\"name\": \"1a\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("1a"));

        // An archived class frees its name.
        mockMvc.perform(delete(CLASSES + "/c-3a")).andExpect(status().isNoContent());
        createClass("{\"name\": \"3A\", \"grade\": 3, \"schoolYear\": \"2026-2027\"}").andExpect(status().isCreated());
    }

    @Test
    void aTeacherHasAtMostThirtyClasses() throws Exception {
        for (int i = 4; i <= 30; i++) {
            createClass("{\"name\": \"Lớp %d\", \"grade\": 1}".formatted(i)).andExpect(status().isCreated());
        }
        createClass("{\"name\": \"Lớp 31\", \"grade\": 1}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TOO_MANY_CLASSROOMS"));

        // Archiving one makes room again.
        mockMvc.perform(delete(CLASSES + "/c-2b")).andExpect(status().isNoContent());
        createClass("{\"name\": \"Lớp 31\", \"grade\": 1}").andExpect(status().isCreated());
    }

    @Test
    void editsOnlyTheGivenFields() throws Exception {
        send(patch(CLASSES + "/c-1a"), "{\"grade\": 2, \"avatar\": \"owl\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("1A"))
                .andExpect(jsonPath("$.grade").value(2))
                .andExpect(jsonPath("$.avatar").value("owl"))
                .andExpect(jsonPath("$.schoolName").value("Tiểu học Kim Đồng"))
                .andExpect(jsonPath("$.studentCount").value(25));

        // Empty strings clear the school year and the school name.
        send(patch(CLASSES + "/c-1a"), "{\"schoolYear\": \"\", \"schoolName\": \"\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.schoolYear").doesNotHaveJsonPath())
                .andExpect(jsonPath("$.schoolName").doesNotHaveJsonPath());

        send(patch(CLASSES + "/c-1a"), "{\"name\": \"  \"}").andExpect(status().isBadRequest());
        send(patch(CLASSES + "/c-1a"), "{\"status\": \"ARCHIVED\"}").andExpect(status().isBadRequest());
        send(patch(CLASSES + "/c-1a"), "{\"grade\": 13}").andExpect(status().isBadRequest());
        send(patch(CLASSES + "/c-none"), "{\"grade\": 2}").andExpect(status().isNotFound());
    }

    @Test
    void pausesAndReactivatesAClass() throws Exception {
        send(patch(CLASSES + "/c-3a"), "{\"status\": \"PAUSED\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAUSED"));
        mockMvc.perform(get(CLASSES).param("status", "ACTIVE"))
                .andExpect(jsonPath("$[*].code").value(contains("c-1a")));
        // A paused class keeps its class list and stars.
        mockMvc.perform(get(CLASSES + "/c-3a/students")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(28));

        send(patch(CLASSES + "/c-3a"), "{\"status\": \"ACTIVE\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void anArchivedClassIsGoneForTheTeacherButItsHistoryStays() throws Exception {
        long stars = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM student_point p JOIN classroom_student s ON s.id = p.classroom_student_id
                JOIN classroom c ON c.id = s.classroom_id WHERE c.code = 'c-3a'
                """, Long.class);

        mockMvc.perform(delete(CLASSES + "/c-3a")).andExpect(status().isNoContent());

        mockMvc.perform(get(CLASSES)).andExpect(jsonPath("$[*].code").value(contains("c-1a", "c-2b")));
        mockMvc.perform(get(CLASSES + "/c-3a")).andExpect(status().isNotFound());
        mockMvc.perform(get(CLASSES + "/c-3a/students")).andExpect(status().isNotFound());
        send(patch(CLASSES + "/c-3a"), "{\"status\": \"ACTIVE\"}").andExpect(status().isNotFound());
        mockMvc.perform(delete(CLASSES + "/c-3a")).andExpect(status().isNotFound());
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM classroom WHERE code = 'c-3a'", String.class))
                .isEqualTo("ARCHIVED");
        assertThat(jdbcTemplate.queryForObject("""
                SELECT count(*) FROM student_point p JOIN classroom_student s ON s.id = p.classroom_student_id
                JOIN classroom c ON c.id = s.classroom_id WHERE c.code = 'c-3a'
                """, Long.class)).isEqualTo(stars);
    }

    @Test
    void anotherTeacherSeesNoneOfTheClasses() throws Exception {
        String other = otherTeacher();
        long studentId = students("c-1a").get(0).path("id").asLong();

        mockMvc.perform(get(CLASSES).header(HttpHeaders.AUTHORIZATION, other))
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get(CLASSES + "/c-1a").header(HttpHeaders.AUTHORIZATION, other)).andExpect(status().isNotFound());
        send(patch(CLASSES + "/c-1a").header(HttpHeaders.AUTHORIZATION, other), "{\"status\": \"PAUSED\"}")
                .andExpect(status().isNotFound());
        mockMvc.perform(delete(CLASSES + "/c-1a").header(HttpHeaders.AUTHORIZATION, other)).andExpect(status().isNotFound());
        send(post(CLASSES + "/c-1a/students").header(HttpHeaders.AUTHORIZATION, other),
                "{\"students\": [{\"displayName\": \"Lạ\"}]}").andExpect(status().isNotFound());
        send(patch(CLASSES + "/c-1a/students/" + studentId).header(HttpHeaders.AUTHORIZATION, other),
                "{\"displayName\": \"Lạ\"}").andExpect(status().isNotFound());
        mockMvc.perform(delete(CLASSES + "/c-1a/students/" + studentId).header(HttpHeaders.AUTHORIZATION, other))
                .andExpect(status().isNotFound());
        send(post(CLASSES + "/c-1a/sessions").header(HttpHeaders.AUTHORIZATION, other),
                "{\"gameCode\": \"g-golden-bell\"}").andExpect(status().isNotFound());

        // Nothing changed, and the other teacher may use the same names for their own classes.
        mockMvc.perform(get(CLASSES + "/c-1a")).andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.studentCount").value(25));
        send(post(CLASSES).header(HttpHeaders.AUTHORIZATION, other), "{\"name\": \"1A\", \"grade\": 1}")
                .andExpect(status().isCreated());
    }

    // --- The class list -----------------------------------------------------------------------------------------

    @Test
    void addsStudentsAtTheEndOfTheRollCall() throws Exception {
        JsonNode added = body(send(post(CLASSES + "/c-1a/students"), """
                {"students": [{"displayName": "  Bảo Ngọc ", "avatar": "cat"}, {"displayName": "Gia Huy"}]}
                """).andExpect(status().isCreated()));

        assertThat(added).hasSize(2);
        assertThat(added.get(0).path("displayName").asText()).isEqualTo("Bảo Ngọc");
        assertThat(added.get(0).path("avatar").asText()).isEqualTo("cat");
        assertThat(added.get(0).path("rollNumber").asInt()).isEqualTo(26);
        assertThat(added.get(1).path("rollNumber").asInt()).isEqualTo(27);
        assertThat(added.get(1).path("totalStars").asLong()).isZero();

        JsonNode list = students("c-1a");
        assertThat(list).hasSize(27);
        assertThat(list.get(26).path("displayName").asText()).isEqualTo("Gia Huy");
        mockMvc.perform(get(CLASSES + "/c-1a")).andExpect(jsonPath("$.studentCount").value(27));
    }

    @Test
    void rejectsInvalidStudentsAndTooBigClasses() throws Exception {
        send(post(CLASSES + "/c-1a/students"), "{\"students\": []}").andExpect(status().isBadRequest());
        send(post(CLASSES + "/c-1a/students"), "{\"students\": [{\"displayName\": \" \"}]}").andExpect(status().isBadRequest());
        send(post(CLASSES + "/c-1a/students"), "{\"students\": [{\"displayName\": \"%s\"}]}".formatted("x".repeat(51)))
                .andExpect(status().isBadRequest());
        send(post(CLASSES + "/c-1a/students"), "{\"students\": [{\"displayName\": \"An\", \"avatar\": \"dragon\"}]}")
                .andExpect(status().isBadRequest());

        // 1A has 25 students: 35 more fill it to 60, one more is too many.
        send(post(CLASSES + "/c-1a/students"), newStudents(36)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TOO_MANY_STUDENTS"));
        assertThat(students("c-1a")).hasSize(25);
        send(post(CLASSES + "/c-1a/students"), newStudents(35)).andExpect(status().isCreated());
        send(post(CLASSES + "/c-1a/students"), newStudents(1)).andExpect(status().isConflict());
        assertThat(students("c-1a")).hasSize(60);
    }

    @Test
    void renamesAndRemovesStudents() throws Exception {
        JsonNode list = students("c-1a");
        long first = list.get(0).path("id").asLong();
        long last = list.get(24).path("id").asLong();

        send(patch(CLASSES + "/c-1a/students/" + first), "{\"displayName\": \" Minh Khôi \"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Minh Khôi"))
                .andExpect(jsonPath("$.rollNumber").value(1));
        send(patch(CLASSES + "/c-1a/students/" + first), "{\"avatar\": \"panda\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Minh Khôi"))
                .andExpect(jsonPath("$.avatar").value("panda"));
        send(patch(CLASSES + "/c-1a/students/" + first), "{\"displayName\": \"\"}").andExpect(status().isBadRequest());

        // The last student leaves: their roll number goes to the next student added.
        mockMvc.perform(delete(CLASSES + "/c-1a/students/" + last)).andExpect(status().isNoContent());
        mockMvc.perform(delete(CLASSES + "/c-1a/students/" + last)).andExpect(status().isNotFound());
        send(patch(CLASSES + "/c-1a/students/" + last), "{\"displayName\": \"X\"}").andExpect(status().isNotFound());
        assertThat(students("c-1a")).hasSize(24);
        send(post(CLASSES + "/c-1a/students"), newStudents(1)).andExpect(status().isCreated())
                .andExpect(jsonPath("$[0].rollNumber").value(25));

        // A student of another class is not found through this one.
        long ofThreeA = students("c-3a").get(0).path("id").asLong();
        send(patch(CLASSES + "/c-1a/students/" + ofThreeA), "{\"displayName\": \"X\"}").andExpect(status().isNotFound());
    }

    @Test
    void reordersTheRollCall() throws Exception {
        List<Long> ids = new ArrayList<>();
        students("c-1a").forEach(s -> ids.add(s.path("id").asLong()));
        List<Long> reversed = new ArrayList<>(ids.reversed());

        JsonNode ordered = body(send(put(CLASSES + "/c-1a/students/order"),
                objectMapper.writeValueAsString(Map.of("studentIds", reversed))).andExpect(status().isOk()));
        assertThat(ordered).hasSize(25);
        assertThat(ordered.get(0).path("id").asLong()).isEqualTo(ids.getLast());
        assertThat(ordered.get(0).path("rollNumber").asInt()).isEqualTo(1);

        JsonNode list = students("c-1a");
        for (int i = 0; i < list.size(); i++) {
            assertThat(list.get(i).path("id").asLong()).isEqualTo(reversed.get(i));
            assertThat(list.get(i).path("rollNumber").asInt()).isEqualTo(i + 1);
        }
    }

    @Test
    void rejectsAnOrderThatIsNotTheWholeClass() throws Exception {
        List<Long> ids = new ArrayList<>();
        students("c-1a").forEach(s -> ids.add(s.path("id").asLong()));
        long ofThreeA = students("c-3a").get(0).path("id").asLong();

        List<List<Long>> invalid = List.of(
                ids.subList(1, ids.size()),
                withReplaced(ids, 0, ids.get(1)),
                withReplaced(ids, 0, ofThreeA),
                append(ids, ids.get(0)));
        for (List<Long> order : invalid) {
            send(put(CLASSES + "/c-1a/students/order"), objectMapper.writeValueAsString(Map.of("studentIds", order)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_STUDENT_ORDER"));
        }
        send(put(CLASSES + "/c-1a/students/order"), "{\"studentIds\": []}").andExpect(status().isBadRequest());
        assertThat(students("c-1a").get(0).path("id").asLong()).isEqualTo(ids.get(0));
    }

    // --- Games played with the class ----------------------------------------------------------------------------

    @Test
    void sessionsCountAsActivitiesAndCompletion() throws Exception {
        JsonNode before = body(mockMvc.perform(get(CLASSES + "/c-1a")));

        JsonNode session = body(send(post(CLASSES + "/c-1a/sessions"), "{\"gameCode\": \"g-golden-bell\"}")
                .andExpect(status().isCreated()));
        assertThat(session.path("gameCode").asText()).isEqualTo("g-golden-bell");
        assertThat(session.path("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(session.path("startedAt").asText()).isNotEmpty();
        assertThat(session.hasNonNull("endedAt")).isFalse();

        JsonNode started = body(mockMvc.perform(get(CLASSES + "/c-1a")));
        assertThat(started.path("activityCount").asLong()).isEqualTo(before.path("activityCount").asLong() + 1);
        assertThat(started.path("completedCount").asLong()).isEqualTo(before.path("completedCount").asLong());
        assertThat(started.path("lastPlayedAt").asText()).isEqualTo(session.path("startedAt").asText());

        long id = session.path("id").asLong();
        JsonNode ended = body(mockMvc.perform(post(CLASSES + "/c-1a/sessions/" + id + "/end")).andExpect(status().isOk()));
        assertThat(ended.path("status").asText()).isEqualTo("ENDED");
        assertThat(ended.path("endedAt").asText()).isNotEmpty();
        // Ending again changes nothing.
        mockMvc.perform(post(CLASSES + "/c-1a/sessions/" + id + "/end")).andExpect(status().isOk())
                .andExpect(jsonPath("$.endedAt").value(ended.path("endedAt").asText()));

        // 1A: 9 played, 6 ended -> 67%.
        mockMvc.perform(get(CLASSES + "/c-1a"))
                .andExpect(jsonPath("$.activityCount").value(9))
                .andExpect(jsonPath("$.completedCount").value(6))
                .andExpect(jsonPath("$.completionRate").value(67));
    }

    @Test
    void sessionsNeedAnActiveClassAndOwnGame() throws Exception {
        send(post(CLASSES + "/c-2b/sessions"), "{\"gameCode\": \"g-golden-bell\"}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CLASSROOM_PAUSED"));
        send(post(CLASSES + "/c-1a/sessions"), "{\"gameCode\": \"g-none\"}").andExpect(status().isNotFound());
        send(post(CLASSES + "/c-1a/sessions"), "{}").andExpect(status().isBadRequest());
        send(post(CLASSES + "/c-none/sessions"), "{\"gameCode\": \"g-golden-bell\"}").andExpect(status().isNotFound());

        // A session of one class cannot be ended through another class.
        long id = body(send(post(CLASSES + "/c-1a/sessions"), "{\"gameCode\": \"g-golden-bell\"}")).path("id").asLong();
        mockMvc.perform(post(CLASSES + "/c-3a/sessions/" + id + "/end")).andExpect(status().isNotFound());
        mockMvc.perform(post(CLASSES + "/c-1a/sessions/999999999/end")).andExpect(status().isNotFound());
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM game_session WHERE id = ?", String.class, id))
                .isEqualTo("IN_PROGRESS");
    }

    // --- Helpers ------------------------------------------------------------------------------------------------

    private String otherTeacher() {
        Long userId = jdbcTemplate.queryForObject("""
                INSERT INTO users (code, username, password_hash, display_name, email, role)
                VALUES ('u-test-hoa', 'cohoa', '{noop}123456', 'Cô Hoa', 'cohoa@edugame.local', 'TEACHER')
                RETURNING id
                """, Long.class);
        UserAccount account = new UserAccount(userId, "u-test-hoa", "cohoa", null, UserRole.TEACHER, UserStatus.ACTIVE);
        UUID sid = userSessionService.open(account, false, "test").sid();
        return "Bearer " + accessTokenService.issue(account, sid).accessToken();
    }

    private long countClasses() {
        return jdbcTemplate.queryForObject("""
                SELECT count(*) FROM classroom c JOIN users u ON u.id = c.teacher_id WHERE u.code = 'u-lan'
                """, Long.class);
    }

    private static String newStudents(int count) {
        return IntStream.rangeClosed(1, count)
                .mapToObj("{\"displayName\": \"Học sinh %d\"}"::formatted)
                .collect(Collectors.joining(",", "{\"students\": [", "]}"));
    }

    private static List<Long> withReplaced(List<Long> ids, int index, long id) {
        List<Long> copy = new ArrayList<>(ids);
        copy.set(index, id);
        return copy;
    }

    private static List<Long> append(List<Long> ids, long id) {
        List<Long> copy = new ArrayList<>(ids);
        copy.add(id);
        return copy;
    }

    private JsonNode students(String code) throws Exception {
        return body(mockMvc.perform(get(CLASSES + "/" + code + "/students")).andExpect(status().isOk()));
    }

    private ResultActions createClass(String json) throws Exception {
        return send(post(CLASSES), json);
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String json) throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
