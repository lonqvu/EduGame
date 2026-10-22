package com.edugame.question.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import com.edugame.common.exception.BusinessException;
import com.edugame.game.dto.AddGameItemsRequest;
import com.edugame.game.dto.CreateGameItemRequest;
import com.edugame.game.dto.CreateGameRequest;
import com.edugame.game.dto.GameResponse;
import com.edugame.game.dto.UpdateGameRequest;
import com.edugame.game.service.GameItemService;
import com.edugame.game.service.GameService;
import com.edugame.question.domain.Question;
import com.edugame.question.domain.QuestionSet;
import com.edugame.question.domain.QuestionSetUse;
import com.edugame.question.domain.QuestionType;
import com.edugame.question.dto.UseQuestionSetRequest;
import com.edugame.question.dto.UsedQuestionSetResponse;
import com.edugame.question.repository.QuestionRepository;
import com.edugame.question.repository.QuestionSetUseRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Sử dụng": makes a game from a set by copying its questions into a new game.
 * <ul>
 *   <li>Quiz games (Trắc nghiệm, Rung chuông vàng, Đua thuyền) play the multiple choice questions; short answers are
 *       skipped.</li>
 *   <li>Lật ô plays every question as an open question: the answer is the correct option's text, or the short
 *       answer.</li>
 * </ul>
 * The game is the teacher's own afterwards: editing it does not change the set, and the reverse.
 */
@Service
@RequiredArgsConstructor
public class QuestionSetUseService {

    /** Points of a Lật ô tile made from a question. */
    static final int GRID_POINTS = 10;
    private static final String OPTION_IDS = "abcdef";
    /** Games played with open questions (a clue and its answer): every question of a set fits them. */
    private static final Set<String> OPEN_QUESTION_GAMES = Set.of("GRID_BOARD", "WORD_SCRAMBLE", "HANGMAN");
    private static final JsonNodeFactory JSON = JsonNodeFactory.instance;

    private final QuestionSetService questionSetService;
    private final QuestionRepository questionRepository;
    private final QuestionSetUseRepository questionSetUseRepository;
    private final GameService gameService;
    private final GameItemService gameItemService;

    @Transactional
    public UsedQuestionSetResponse use(String setCode, UseQuestionSetRequest request) {
        QuestionSet set = questionSetService.getOwnedSet(setCode);
        boolean grid = OPEN_QUESTION_GAMES.contains(request.templateCode());
        List<Question> questions = questionRepository.findByQuestionSetOrderByPosition(set);
        List<CreateGameItemRequest> items = new ArrayList<>();
        for (Question question : questions) {
            if (grid) {
                items.add(openQuestion(question));
            } else if (question.getType() == QuestionType.MULTIPLE_CHOICE) {
                items.add(singleChoice(question));
            }
        }
        if (items.isEmpty()) {
            throw new BusinessException(HttpStatus.CONFLICT, "NO_USABLE_QUESTIONS", questions.isEmpty()
                    ? "The set has no questions yet"
                    : "This game plays multiple choice questions; the set has none");
        }

        // Games are for primary school (grades 1-5): a set for another grade makes a game without one.
        Short grade = set.getGrade() != null && set.getGrade() <= 5 ? set.getGrade() : null;
        String title = request.title() != null ? request.title().strip() : set.getTitle();
        GameResponse game = gameService.create(new CreateGameRequest(request.templateCode(), title, grade));
        gameService.update(game.code(), new UpdateGameRequest(null, set.getDescription(), set.getSubject().label(), null, null));
        gameItemService.addItems(game.code(), new AddGameItemsRequest(items));
        questionSetUseRepository.save(QuestionSetUse.of(set, gameService.getOwnedGame(game.code())));
        return new UsedQuestionSetResponse(game.code(), request.templateCode(), items.size(), questions.size() - items.size());
    }

    private static CreateGameItemRequest singleChoice(Question question) {
        ArrayNode options = JSON.arrayNode();
        for (int i = 0; i < question.getOptions().size(); i++) {
            options.add(JSON.objectNode().put("id", String.valueOf(OPTION_IDS.charAt(i))).put("text", question.getOptions().get(i)));
        }
        ObjectNode content = JSON.objectNode().put("text", question.getText());
        content.set("options", options);
        ObjectNode solution = JSON.objectNode();
        solution.set("correct", JSON.arrayNode().add(String.valueOf(OPTION_IDS.charAt(question.getCorrectOption()))));
        return item("SINGLE_CHOICE", content, solution, question);
    }

    private static CreateGameItemRequest openQuestion(Question question) {
        JsonNode content = JSON.objectNode().put("text", question.getText()).put("points", GRID_POINTS);
        JsonNode solution = JSON.objectNode().put("answer", question.correctAnswer());
        return item("OPEN_QUESTION", content, solution, question);
    }

    private static CreateGameItemRequest item(String type, JsonNode content, JsonNode solution, Question question) {
        return new CreateGameItemRequest(type, content, solution, question.getExplanation());
    }
}
