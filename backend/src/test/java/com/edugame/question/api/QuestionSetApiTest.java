package com.edugame.question.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
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
 * The question bank against PostgreSQL: sets, their questions, and games made from them. Cô Lan has 13 seeded
 * sets, among them qs-toan2-cong100 (7 multiple choice + 1 short answer) and qs-tv1-doc-hieu (6 short answers);
 * six of them (qs-test-*) are data to try the games with.
 * Every test is rolled back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class QuestionSetApiTest {

    private static final String SETS = "/api/v1/question-sets";
    private static final String TOAN = SETS + "/qs-toan2-cong100";
    private static final String TIENG_VIET = SETS + "/qs-tv1-doc-hieu";
    private static final int SEEDED_SETS = 13;

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

    // --- Sets -------------------------------------------------------------------------------------------------

    @Test
    void listsTheTeachersSetsLastChangedFirstWithTheirCounts() throws Exception {
        // Seeded times depend on when each part of the seed ran, so the expected order is read from the table.
        List<String> lastChangedFirst = jdbcTemplate.queryForList("""
                SELECT s.code FROM question_set s JOIN users u ON u.id = s.owner_id
                WHERE u.code = 'u-lan' AND s.status = 'ACTIVE' ORDER BY s.updated_at DESC
                """, String.class);
        String toan = "$[?(@.code == 'qs-toan2-cong100')]";

        mockMvc.perform(get(SETS)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(SEEDED_SETS))
                .andExpect(jsonPath("$[*].code").value(contains(lastChangedFirst.toArray())))
                .andExpect(jsonPath(toan + ".subject").value(contains("TOAN")))
                .andExpect(jsonPath(toan + ".grade").value(contains(2)))
                .andExpect(jsonPath(toan + ".questionCount").value(contains(8)))
                .andExpect(jsonPath(toan + ".multipleChoiceCount").value(contains(7)))
                .andExpect(jsonPath(toan + ".shortAnswerCount").value(contains(1)))
                .andExpect(jsonPath(toan + ".useCount").value(contains(0)))
                .andExpect(jsonPath(toan + ".ownerName").value(contains("Cô Lan")))
                .andExpect(jsonPath("$[?(@.code == 'qs-tv1-doc-hieu')].multipleChoiceCount").value(contains(0)))
                .andExpect(jsonPath("$[?(@.code == 'qs-test-trong')].questionCount").value(contains(0)));
    }

    @Test
    void createsAnEmptySetAndPutsItFirst() throws Exception {
        JsonNode created = body(send(post(SETS), """
                {"title": "  Toán - Đo độ dài  ", "description": "  ", "subject": "TOAN", "grade": 2}
                """).andExpect(status().isCreated()));

        JsonNode summary = created.path("summary");
        assertThat(summary.path("code").asText()).matches("qs-[a-z0-9]{10}");
        assertThat(summary.path("title").asText()).isEqualTo("Toán - Đo độ dài");
        assertThat(summary.has("description")).isFalse();
        assertThat(summary.path("questionCount").asLong()).isZero();
        assertThat(created.path("questions")).isEmpty();
        assertThat(created.path("games")).isEmpty();

        mockMvc.perform(get(SETS)).andExpect(jsonPath("$[0].code").value(summary.path("code").asText()));
        // A set without a grade fits any grade.
        send(post(SETS), "{\"title\": \"Câu đố vui\", \"subject\": \"KHAC\"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.summary.grade").doesNotExist());
    }

    @Test
    void rejectsInvalidSets() throws Exception {
        send(post(SETS), "{\"subject\": \"TOAN\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        send(post(SETS), "{\"title\": \"  \", \"subject\": \"TOAN\"}").andExpect(status().isBadRequest());
        send(post(SETS), "{\"title\": \"%s\", \"subject\": \"TOAN\"}".formatted("x".repeat(121))).andExpect(status().isBadRequest());
        send(post(SETS), "{\"title\": \"Bộ mới\"}").andExpect(status().isBadRequest());
        send(post(SETS), "{\"title\": \"Bộ mới\", \"subject\": \"HOA_HOC\"}").andExpect(status().isBadRequest());
        send(post(SETS), "{\"title\": \"Bộ mới\", \"subject\": \"TOAN\", \"grade\": 0}").andExpect(status().isBadRequest());
        send(post(SETS), "{\"title\": \"Bộ mới\", \"subject\": \"TOAN\", \"grade\": 13}").andExpect(status().isBadRequest());
        send(post(SETS), "{\"title\": \"Bộ mới\", \"subject\": \"TOAN\", \"description\": \"%s\"}".formatted("x".repeat(501)))
                .andExpect(status().isBadRequest());
        assertThat(setCount()).isEqualTo(SEEDED_SETS);
    }

    @Test
    void editsOnlyTheGivenFields() throws Exception {
        send(patch(TOAN), "{\"subject\": \"KHAC\", \"grade\": 3}").andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.title").value("Toán lớp 2 - Phép cộng trong phạm vi 100"))
                .andExpect(jsonPath("$.summary.subject").value("KHAC"))
                .andExpect(jsonPath("$.summary.grade").value(3))
                .andExpect(jsonPath("$.questions.length()").value(8));

        // An empty description and grade 0 clear them.
        send(patch(TOAN), "{\"title\": \" Phép cộng \", \"description\": \"\", \"grade\": 0}").andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.title").value("Phép cộng"))
                .andExpect(jsonPath("$.summary.description").doesNotExist())
                .andExpect(jsonPath("$.summary.grade").doesNotExist());

        send(patch(TOAN), "{\"title\": \"  \"}").andExpect(status().isBadRequest());
        send(patch(TOAN), "{\"subject\": \"LICH_SU\"}").andExpect(status().isBadRequest());
        send(patch(TOAN), "{\"grade\": 13}").andExpect(status().isBadRequest());
        send(patch(SETS + "/qs-none"), "{\"grade\": 2}").andExpect(status().isNotFound());
    }

    @Test
    void aDeletedSetIsGoneButGamesMadeFromItKeepTheirQuestions() throws Exception {
        String game = use(TOAN, "QUIZ");

        mockMvc.perform(delete(TOAN)).andExpect(status().isNoContent());

        mockMvc.perform(get(SETS)).andExpect(jsonPath("$.length()").value(SEEDED_SETS - 1));
        mockMvc.perform(get(TOAN)).andExpect(status().isNotFound());
        send(patch(TOAN), "{\"grade\": 1}").andExpect(status().isNotFound());
        mockMvc.perform(delete(TOAN)).andExpect(status().isNotFound());
        mockMvc.perform(post(TOAN + "/copy")).andExpect(status().isNotFound());
        send(post(TOAN + "/games"), "{\"templateCode\": \"QUIZ\"}").andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/games/" + game)).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(7));
    }

    @Test
    void copiesASetWithItsQuestionsButNotItsUses() throws Exception {
        use(TOAN, "QUIZ");
        JsonNode copy = body(mockMvc.perform(post(TOAN + "/copy")).andExpect(status().isCreated()));
        String code = copy.path("summary").path("code").asText();

        assertThat(code).isNotEqualTo("qs-toan2-cong100");
        assertThat(copy.path("summary").path("title").asText()).isEqualTo("Toán lớp 2 - Phép cộng trong phạm vi 100 (bản sao)");
        assertThat(copy.path("summary").path("subject").asText()).isEqualTo("TOAN");
        assertThat(copy.path("summary").path("useCount").asLong()).isZero();
        assertThat(copy.path("games")).isEmpty();
        JsonNode original = body(mockMvc.perform(get(TOAN)));
        assertThat(texts(copy)).isEqualTo(texts(original));
        assertThat(copy.path("questions").get(1).path("explanation").asText()).startsWith("7 cộng 8 bằng 15");

        // The copy is its own: editing it leaves the original alone.
        long firstOfCopy = copy.path("questions").get(0).path("id").asLong();
        mockMvc.perform(delete(SETS + "/" + code + "/questions/" + firstOfCopy)).andExpect(status().isOk());
        assertThat(body(mockMvc.perform(get(TOAN))).path("questions")).hasSize(8);

        // A long title is cut to make room for "(bản sao)".
        send(patch(TOAN), "{\"title\": \"%s\"}".formatted("T".repeat(120))).andExpect(status().isOk());
        JsonNode longCopy = body(mockMvc.perform(post(TOAN + "/copy")).andExpect(status().isCreated()));
        assertThat(longCopy.path("summary").path("title").asText()).hasSize(120).endsWith(" (bản sao)");
    }

    @Test
    void aTeacherKeepsAtMost200Sets() throws Exception {
        jdbcTemplate.update("""
                INSERT INTO question_set (code, owner_id, title, subject)
                SELECT 'qs-fill-' || n, (SELECT id FROM users WHERE code = 'u-lan'), 'Bộ ' || n, 'KHAC'
                FROM generate_series(1, ?) AS n
                """, 200 - SEEDED_SETS);
        send(post(SETS), "{\"title\": \"Bộ 201\", \"subject\": \"TOAN\"}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TOO_MANY_QUESTION_SETS"));
        mockMvc.perform(post(TOAN + "/copy")).andExpect(status().isConflict());

        // Deleting one makes room again.
        mockMvc.perform(delete(TIENG_VIET)).andExpect(status().isNoContent());
        mockMvc.perform(post(TOAN + "/copy")).andExpect(status().isCreated());
    }

    @Test
    void anotherTeacherSeesNoneOfTheSets() throws Exception {
        String other = otherTeacher();
        long questionId = questionIds(TOAN).getFirst();

        mockMvc.perform(get(SETS).header(HttpHeaders.AUTHORIZATION, other)).andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get(TOAN).header(HttpHeaders.AUTHORIZATION, other)).andExpect(status().isNotFound());
        send(patch(TOAN).header(HttpHeaders.AUTHORIZATION, other), "{\"grade\": 1}").andExpect(status().isNotFound());
        mockMvc.perform(delete(TOAN).header(HttpHeaders.AUTHORIZATION, other)).andExpect(status().isNotFound());
        mockMvc.perform(post(TOAN + "/copy").header(HttpHeaders.AUTHORIZATION, other)).andExpect(status().isNotFound());
        send(post(TOAN + "/questions").header(HttpHeaders.AUTHORIZATION, other),
                "{\"questions\": [%s]}".formatted(shortAnswer("1 + 1 = ?", "2"))).andExpect(status().isNotFound());
        send(put(TOAN + "/questions/" + questionId).header(HttpHeaders.AUTHORIZATION, other), shortAnswer("x", "y"))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete(TOAN + "/questions/" + questionId).header(HttpHeaders.AUTHORIZATION, other))
                .andExpect(status().isNotFound());
        send(post(TOAN + "/games").header(HttpHeaders.AUTHORIZATION, other), "{\"templateCode\": \"QUIZ\"}")
                .andExpect(status().isNotFound());

        mockMvc.perform(get(TOAN)).andExpect(jsonPath("$.questions.length()").value(8))
                .andExpect(jsonPath("$.summary.grade").value(2));
    }

    // --- Questions --------------------------------------------------------------------------------------------

    @Test
    void addsQuestionsOfBothTypesAtTheEnd() throws Exception {
        JsonNode set = body(send(post(TOAN + "/questions"), """
                {"questions": [
                  {"type": "MULTIPLE_CHOICE", "text": "  12 + 9 = ?  ", "options": [" 21 ", "19", "22"], "correctOption": 0,
                   "explanation": "  2 + 9 = 11, viết 1 nhớ 1.  "},
                  {"type": "SHORT_ANSWER", "text": "Số tròn chục lớn nhất có hai chữ số?", "answer": " 90 ",
                   "options": ["bỏ qua"], "correctOption": 3}
                ]}
                """).andExpect(status().isCreated()));

        JsonNode questions = set.path("questions");
        assertThat(questions).hasSize(10);
        JsonNode choice = questions.get(8);
        assertThat(choice.path("type").asText()).isEqualTo("MULTIPLE_CHOICE");
        assertThat(choice.path("text").asText()).isEqualTo("12 + 9 = ?");
        assertThat(choice.path("options")).extracting(JsonNode::asText).containsExactly("21", "19", "22");
        assertThat(choice.path("correctOption").asInt()).isZero();
        assertThat(choice.path("explanation").asText()).isEqualTo("2 + 9 = 11, viết 1 nhớ 1.");
        JsonNode open = questions.get(9);
        assertThat(open.path("answer").asText()).isEqualTo("90");
        // Fields of the other type are dropped.
        assertThat(open.has("options")).isFalse();
        assertThat(open.has("correctOption")).isFalse();
        assertThat(set.path("summary").path("multipleChoiceCount").asLong()).isEqualTo(8);
        assertThat(set.path("summary").path("shortAnswerCount").asLong()).isEqualTo(2);
    }

    @Test
    void rejectsQuestionsThatCannotBePlayed() throws Exception {
        List<String> invalid = List.of(
                choice("Một đáp án", List.of("A"), 0),
                choice("Bảy đáp án", List.of("1", "2", "3", "4", "5", "6", "7"), 0),
                choice("Đáp án trống", List.of("A", "  "), 0),
                choice("Trùng đáp án", List.of("Hà Nội", " hà  nội "), 0),
                choice("Đáp án đúng ngoài danh sách", List.of("A", "B"), 2),
                choice("Đáp án đúng âm", List.of("A", "B"), -1),
                "{\"type\": \"MULTIPLE_CHOICE\", \"text\": \"Thiếu đáp án đúng\", \"options\": [\"A\", \"B\"]}",
                "{\"type\": \"MULTIPLE_CHOICE\", \"text\": \"Không có đáp án\"}",
                shortAnswer("Thiếu câu trả lời", "  "),
                "{\"type\": \"SHORT_ANSWER\", \"text\": \"Không có câu trả lời\"}",
                shortAnswer("  ", "Có"),
                shortAnswer("x".repeat(501), "Có"),
                shortAnswer("Câu trả lời dài", "x".repeat(201)),
                choice("Đáp án dài", List.of("A", "x".repeat(201)), 0),
                "{\"type\": \"TRUE_FALSE\", \"text\": \"Đúng hay sai?\", \"answer\": \"Đúng\"}",
                "{\"text\": \"Không có loại\", \"answer\": \"A\"}");
        for (String question : invalid) {
            send(post(TOAN + "/questions"), "{\"questions\": [%s]}".formatted(question))
                    .andExpect(status().isBadRequest());
        }
        send(post(TOAN + "/questions"), "{\"questions\": []}").andExpect(status().isBadRequest());
        assertThat(questionIds(TOAN)).hasSize(8);
    }

    @Test
    void oneBadQuestionInAPastedListRejectsThemAllAndNamesIt() throws Exception {
        send(post(TOAN + "/questions"), "{\"questions\": [%s, %s, %s]}".formatted(
                shortAnswer("Câu tốt 1", "A"), choice("Câu hỏng", List.of("Có", "có"), 0), shortAnswer("Câu tốt 2", "B")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUESTION"))
                // The set already has 8 questions: the bad one would have been the 10th.
                .andExpect(jsonPath("$.message").value(containsString("Question 10")));
        assertThat(questionIds(TOAN)).hasSize(8);
    }

    @Test
    void aSetHasAtMost200Questions() throws Exception {
        send(post(TOAN + "/questions"), shortAnswers(192)).andExpect(status().isCreated());
        send(post(TOAN + "/questions"), shortAnswers(1)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TOO_MANY_QUESTIONS"));
        assertThat(questionIds(TOAN)).hasSize(200);
        send(post(TIENG_VIET + "/questions"), shortAnswers(201)).andExpect(status().isBadRequest());
    }

    @Test
    void savesAQuestionOverTheOldOneEvenChangingItsType() throws Exception {
        long first = questionIds(TOAN).getFirst();
        send(put(TOAN + "/questions/" + first), shortAnswer("25 + 13 bằng mấy?", "38")).andExpect(status().isOk())
                .andExpect(jsonPath("$.questions[0].id").value(first))
                .andExpect(jsonPath("$.questions[0].type").value("SHORT_ANSWER"))
                .andExpect(jsonPath("$.questions[0].answer").value("38"))
                .andExpect(jsonPath("$.questions[0].options").doesNotExist())
                .andExpect(jsonPath("$.summary.shortAnswerCount").value(2));

        send(put(TOAN + "/questions/" + first), choice("25 + 13 = ?", List.of("38", "39"), 1)).andExpect(status().isOk())
                .andExpect(jsonPath("$.questions[0].correctOption").value(1))
                .andExpect(jsonPath("$.questions[0].answer").doesNotExist());

        send(put(TOAN + "/questions/" + first), choice("Hỏng", List.of("A"), 0)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Question 1")));
        long ofAnotherSet = questionIds(TIENG_VIET).getFirst();
        send(put(TOAN + "/questions/" + ofAnotherSet), shortAnswer("x", "y")).andExpect(status().isNotFound());
        send(put(TOAN + "/questions/999999999"), shortAnswer("x", "y")).andExpect(status().isNotFound());
    }

    @Test
    void deletingAQuestionMovesTheNextOnesUp() throws Exception {
        List<Long> ids = questionIds(TOAN);
        JsonNode set = body(mockMvc.perform(delete(TOAN + "/questions/" + ids.get(2))).andExpect(status().isOk()));

        List<Long> rest = new ArrayList<>(ids);
        rest.remove(2);
        assertThat(idsOf(set)).isEqualTo(rest);
        assertThat(jdbcTemplate.queryForList("""
                SELECT position FROM question q JOIN question_set s ON s.id = q.question_set_id
                WHERE s.code = 'qs-toan2-cong100' ORDER BY position
                """, Integer.class)).containsExactly(0, 1, 2, 3, 4, 5, 6);
        mockMvc.perform(delete(TOAN + "/questions/" + ids.get(2))).andExpect(status().isNotFound());

        // A set can be emptied.
        for (long id : rest) {
            mockMvc.perform(delete(TOAN + "/questions/" + id)).andExpect(status().isOk());
        }
        mockMvc.perform(get(TOAN)).andExpect(jsonPath("$.questions.length()").value(0))
                .andExpect(jsonPath("$.summary.questionCount").value(0));
    }

    @Test
    void reordersTheQuestions() throws Exception {
        List<Long> reversed = new ArrayList<>(questionIds(TOAN).reversed());
        JsonNode set = body(send(put(TOAN + "/questions/order"), order(reversed)).andExpect(status().isOk()));
        assertThat(idsOf(set)).isEqualTo(reversed);
        assertThat(questionIds(TOAN)).isEqualTo(reversed);
    }

    @Test
    void rejectsAnOrderThatIsNotTheWholeSet() throws Exception {
        List<Long> ids = questionIds(TOAN);
        long foreign = questionIds(TIENG_VIET).getFirst();
        List<List<Long>> invalid = List.of(
                ids.subList(1, ids.size()),
                replaced(ids, 0, ids.get(1)),
                replaced(ids, 0, foreign),
                appended(ids, ids.getFirst()));
        for (List<Long> order : invalid) {
            send(put(TOAN + "/questions/order"), order(order)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_QUESTION_ORDER"));
        }
        send(put(TOAN + "/questions/order"), "{\"questionIds\": []}").andExpect(status().isBadRequest());
        assertThat(questionIds(TOAN)).isEqualTo(ids);
    }

    // --- Use in a game ----------------------------------------------------------------------------------------

    @Test
    void aQuizGameGetsTheMultipleChoiceQuestionsOfTheSet() throws Exception {
        JsonNode used = body(send(post(TOAN + "/games"), "{\"templateCode\": \"QUIZ\"}").andExpect(status().isCreated()));
        assertThat(used.path("questionCount").asInt()).isEqualTo(7);
        assertThat(used.path("skippedCount").asInt()).isEqualTo(1);
        String code = used.path("gameCode").asText();

        JsonNode game = body(mockMvc.perform(get("/api/v1/games/" + code)).andExpect(status().isOk()));
        assertThat(game.path("templateCode").asText()).isEqualTo("QUIZ");
        assertThat(game.path("title").asText()).isEqualTo("Toán lớp 2 - Phép cộng trong phạm vi 100");
        assertThat(game.path("subject").asText()).isEqualTo("Toán");
        assertThat(game.path("grade").asInt()).isEqualTo(2);
        JsonNode second = game.path("items").get(1);
        assertThat(second.path("itemType").asText()).isEqualTo("SINGLE_CHOICE");
        assertThat(second.path("content").path("text").asText()).isEqualTo("47 + 8 = ?");
        assertThat(second.path("content").path("options").findValuesAsText("text")).containsExactly("54", "55", "56");
        assertThat(second.path("content").path("options").findValuesAsText("id")).containsExactly("a", "b", "c");
        assertThat(second.path("solution").path("correct").get(0).asText()).isEqualTo("b");
        assertThat(second.path("explanation").asText()).startsWith("7 cộng 8 bằng 15");

        // The set counts the use and lists the game.
        mockMvc.perform(get(TOAN)).andExpect(jsonPath("$.summary.useCount").value(1))
                .andExpect(jsonPath("$.games[0].code").value(code))
                .andExpect(jsonPath("$.games[0].templateCode").value("QUIZ"));
        mockMvc.perform(get("/api/v1/games")).andExpect(jsonPath("$[0].code").value(code));
    }

    @Test
    void theGameCanBeNamedWhenItIsMade() throws Exception {
        String code = body(send(post(TOAN + "/games"), "{\"templateCode\": \"QUIZ\", \"title\": \"  Đố vui 2A  \"}")
                .andExpect(status().isCreated())).path("gameCode").asText();
        mockMvc.perform(get("/api/v1/games/" + code)).andExpect(jsonPath("$.title").value("Đố vui 2A"));

        send(post(TOAN + "/games"), "{\"templateCode\": \"QUIZ\", \"title\": \"   \"}").andExpect(status().isBadRequest());
        send(post(TOAN + "/games"), "{\"templateCode\": \"QUIZ\", \"title\": \"%s\"}".formatted("x".repeat(256)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void gridBoardGetsEveryQuestionWithItsAnswer() throws Exception {
        JsonNode used = body(send(post(TOAN + "/games"), "{\"templateCode\": \"GRID_BOARD\"}").andExpect(status().isCreated()));
        assertThat(used.path("questionCount").asInt()).isEqualTo(8);
        assertThat(used.path("skippedCount").asInt()).isZero();

        JsonNode items = body(mockMvc.perform(get("/api/v1/games/" + used.path("gameCode").asText()))).path("items");
        assertThat(items).hasSize(8);
        assertThat(items.get(0).path("itemType").asText()).isEqualTo("OPEN_QUESTION");
        assertThat(items.get(0).path("content").path("points").asInt()).isEqualTo(10);
        // Multiple choice: the correct option's text; short answer: the answer.
        assertThat(items.get(0).path("solution").path("answer").asText()).isEqualTo("38");
        assertThat(items.get(7).path("content").path("text").asText()).isEqualTo("Tổng của 19 và 19 là bao nhiêu?");
        assertThat(items.get(7).path("solution").path("answer").asText()).isEqualTo("38");

        // A set of short answers only plays in Lật ô.
        send(post(TIENG_VIET + "/games"), "{\"templateCode\": \"GRID_BOARD\"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.questionCount").value(6));
    }

    @Test
    void aGameNeedsQuestionsItCanPlay() throws Exception {
        send(post(TIENG_VIET + "/games"), "{\"templateCode\": \"GOLDEN_BELL\"}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NO_USABLE_QUESTIONS"));
        String empty = body(send(post(SETS), "{\"title\": \"Trống\", \"subject\": \"KHAC\"}"))
                .path("summary").path("code").asText();
        send(post(SETS + "/" + empty + "/games"), "{\"templateCode\": \"GRID_BOARD\"}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NO_USABLE_QUESTIONS"));
        send(post(TOAN + "/games"), "{\"templateCode\": \"MATCHING\"}").andExpect(status().isBadRequest());
        send(post(TOAN + "/games"), "{}").andExpect(status().isBadRequest());
        mockMvc.perform(get(TIENG_VIET)).andExpect(jsonPath("$.summary.useCount").value(0));
    }

    @Test
    void aSetForUpperGradesMakesAGameWithoutAGrade() throws Exception {
        send(patch(TOAN), "{\"grade\": 7}").andExpect(status().isOk());
        String code = use(TOAN, "BOAT_RACE");
        mockMvc.perform(get("/api/v1/games/" + code)).andExpect(status().isOk())
                .andExpect(jsonPath("$.templateCode").value("BOAT_RACE"))
                .andExpect(jsonPath("$.grade").doesNotExist());
    }

    @Test
    void theGameKeepsItsQuestionsWhenTheSetChanges() throws Exception {
        String code = use(TOAN, "QUIZ");
        long first = questionIds(TOAN).getFirst();
        send(put(TOAN + "/questions/" + first), choice("Đã sửa", List.of("1", "2"), 0)).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/games/" + code))
                .andExpect(jsonPath("$.items[0].content.text").value("25 + 13 = ?"));
    }

    @Test
    void usesAndPlaysAreCountedAndArchivedGamesLeaveTheList() throws Exception {
        String quiz = use(TOAN, "QUIZ");
        String grid = use(TOAN, "GRID_BOARD");
        jdbcTemplate.update("""
                INSERT INTO game_session (game_id, game_version_id, host_id, mode, status, started_at)
                SELECT g.id, g.current_version_id, g.owner_id, 'CLASSROOM', s.status, now()
                FROM game g, (VALUES ('ENDED'), ('IN_PROGRESS'), ('WAITING')) AS s (status)
                WHERE g.code = ?
                """, quiz);

        mockMvc.perform(get(TOAN))
                .andExpect(jsonPath("$.summary.useCount").value(2))
                .andExpect(jsonPath("$.summary.playCount").value(2))
                .andExpect(jsonPath("$.games[*].code").value(contains(grid, quiz)));

        mockMvc.perform(delete("/api/v1/games/" + grid)).andExpect(status().isNoContent());
        mockMvc.perform(get(TOAN))
                .andExpect(jsonPath("$.summary.useCount").value(2))
                .andExpect(jsonPath("$.games[*].code").value(contains(quiz)));
        mockMvc.perform(get(SETS)).andExpect(jsonPath("$[?(@.code == 'qs-toan2-cong100')].playCount").value(2));
    }

    // --- Helpers ----------------------------------------------------------------------------------------------

    private String use(String set, String templateCode) throws Exception {
        return body(send(post(set + "/games"), "{\"templateCode\": \"%s\"}".formatted(templateCode))
                .andExpect(status().isCreated())).path("gameCode").asText();
    }

    private String choice(String text, List<String> options, int correct) throws Exception {
        return objectMapper.writeValueAsString(Map.of("type", "MULTIPLE_CHOICE", "text", text, "options", options,
                "correctOption", correct));
    }

    private String shortAnswer(String text, String answer) throws Exception {
        return objectMapper.writeValueAsString(Map.of("type", "SHORT_ANSWER", "text", text, "answer", answer));
    }

    private String shortAnswers(int count) {
        return IntStream.rangeClosed(1, count)
                .mapToObj("{\"type\": \"SHORT_ANSWER\", \"text\": \"Câu %1$d\", \"answer\": \"%1$d\"}"::formatted)
                .collect(Collectors.joining(",", "{\"questions\": [", "]}"));
    }

    private String order(List<Long> ids) throws Exception {
        return objectMapper.writeValueAsString(Map.of("questionIds", ids));
    }

    private List<Long> questionIds(String set) throws Exception {
        return idsOf(body(mockMvc.perform(get(set)).andExpect(status().isOk())));
    }

    private static List<Long> idsOf(JsonNode set) {
        List<Long> ids = new ArrayList<>();
        set.path("questions").forEach(q -> ids.add(q.path("id").asLong()));
        return ids;
    }

    private static List<String> texts(JsonNode set) {
        List<String> texts = new ArrayList<>();
        set.path("questions").forEach(q -> texts.add(q.path("type").asText() + ":" + q.path("text").asText()));
        return texts;
    }

    private static List<Long> replaced(List<Long> ids, int index, long id) {
        List<Long> copy = new ArrayList<>(ids);
        copy.set(index, id);
        return copy;
    }

    private static List<Long> appended(List<Long> ids, long id) {
        List<Long> copy = new ArrayList<>(ids);
        copy.add(id);
        return copy;
    }

    private long setCount() {
        return jdbcTemplate.queryForObject("""
                SELECT count(*) FROM question_set s JOIN users u ON u.id = s.owner_id
                WHERE u.code = 'u-lan' AND s.status = 'ACTIVE'
                """, Long.class);
    }

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

    private ResultActions send(MockHttpServletRequestBuilder request, String json) throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private JsonNode body(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
