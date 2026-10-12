package com.edugame.question.api;

import java.util.List;

import com.edugame.question.dto.AddQuestionsRequest;
import com.edugame.question.dto.CreateQuestionSetRequest;
import com.edugame.question.dto.QuestionRequest;
import com.edugame.question.dto.QuestionSetResponse;
import com.edugame.question.dto.QuestionSetSummaryResponse;
import com.edugame.question.dto.ReorderQuestionsRequest;
import com.edugame.question.dto.UpdateQuestionSetRequest;
import com.edugame.question.dto.UseQuestionSetRequest;
import com.edugame.question.dto.UsedQuestionSetResponse;
import com.edugame.question.service.QuestionService;
import com.edugame.question.service.QuestionSetService;
import com.edugame.question.service.QuestionSetUseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Question sets", description = "The teacher's question bank, and games made from it")
@RestController
@RequestMapping("/api/v1/question-sets")
@RequiredArgsConstructor
public class QuestionSetController {

    private final QuestionSetService questionSetService;
    private final QuestionService questionService;
    private final QuestionSetUseService questionSetUseService;

    // --- Sets -------------------------------------------------------------------------------------------------

    @Operation(summary = "My question sets, last changed first, with question and use counts")
    @GetMapping
    public List<QuestionSetSummaryResponse> list() {
        return questionSetService.listMySets();
    }

    @Operation(summary = "Create a question set (no questions yet)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public QuestionSetResponse create(@Valid @RequestBody CreateQuestionSetRequest request) {
        return questionSetService.create(request);
    }

    @Operation(summary = "A set with its questions and the games made from it")
    @GetMapping("/{code}")
    public QuestionSetResponse get(@PathVariable String code) {
        return questionSetService.get(code);
    }

    @Operation(summary = "Change title, description, subject or grade (null fields are left unchanged)")
    @PatchMapping("/{code}")
    public QuestionSetResponse update(@PathVariable String code, @Valid @RequestBody UpdateQuestionSetRequest request) {
        return questionSetService.update(code, request);
    }

    @Operation(summary = "Delete a set (archived; games made from it keep their questions)")
    @DeleteMapping("/{code}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable String code) {
        questionSetService.archive(code);
    }

    @Operation(summary = "Copy a set with its questions: \"… (bản sao)\"")
    @PostMapping("/{code}/copy")
    @ResponseStatus(HttpStatus.CREATED)
    public QuestionSetResponse copy(@PathVariable String code) {
        return questionSetService.copy(code);
    }

    // --- Questions --------------------------------------------------------------------------------------------

    @Operation(summary = "Add questions at the end (one, or a pasted list; all or none are saved)")
    @PostMapping("/{code}/questions")
    @ResponseStatus(HttpStatus.CREATED)
    public QuestionSetResponse addQuestions(@PathVariable String code, @Valid @RequestBody AddQuestionsRequest request) {
        return questionService.add(code, request);
    }

    @Operation(summary = "Save a question (its type may change)")
    @PutMapping("/{code}/questions/{questionId}")
    public QuestionSetResponse updateQuestion(@PathVariable String code, @PathVariable Long questionId,
                                              @Valid @RequestBody QuestionRequest request) {
        return questionService.update(code, questionId, request);
    }

    @Operation(summary = "Delete a question; the ones after it move up")
    @DeleteMapping("/{code}/questions/{questionId}")
    public QuestionSetResponse deleteQuestion(@PathVariable String code, @PathVariable Long questionId) {
        return questionService.delete(code, questionId);
    }

    @Operation(summary = "New order: every question id once")
    @PutMapping("/{code}/questions/order")
    public QuestionSetResponse reorderQuestions(@PathVariable String code,
                                                @Valid @RequestBody ReorderQuestionsRequest request) {
        return questionService.reorder(code, request);
    }

    // --- Use in a game ----------------------------------------------------------------------------------------

    @Operation(summary = "Make a game from the set (its questions are copied into the game)")
    @PostMapping("/{code}/games")
    @ResponseStatus(HttpStatus.CREATED)
    public UsedQuestionSetResponse use(@PathVariable String code, @Valid @RequestBody UseQuestionSetRequest request) {
        return questionSetUseService.use(code, request);
    }
}
