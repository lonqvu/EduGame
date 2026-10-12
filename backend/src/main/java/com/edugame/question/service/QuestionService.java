package com.edugame.question.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.edugame.common.exception.BusinessException;
import com.edugame.common.exception.ResourceNotFoundException;
import com.edugame.question.domain.Question;
import com.edugame.question.domain.QuestionSet;
import com.edugame.question.dto.AddQuestionsRequest;
import com.edugame.question.dto.QuestionRequest;
import com.edugame.question.dto.QuestionSetResponse;
import com.edugame.question.dto.QuestionSetRules;
import com.edugame.question.dto.ReorderQuestionsRequest;
import com.edugame.question.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The questions of a set, at positions 0..n-1. Every change returns the whole set. */
@Service
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionSetService questionSetService;
    private final QuestionRepository questionRepository;
    private final QuestionValidator questionValidator;

    /** Adds questions at the end; one invalid question rejects them all. */
    @Transactional
    public QuestionSetResponse add(String setCode, AddQuestionsRequest request) {
        QuestionSet set = questionSetService.getOwnedSet(setCode);
        int position = (int) questionRepository.countByQuestionSet(set);
        if (position + request.questions().size() > QuestionSetRules.MAX_QUESTIONS) {
            throw new BusinessException(HttpStatus.CONFLICT, "TOO_MANY_QUESTIONS",
                    "A question set has at most %d questions".formatted(QuestionSetRules.MAX_QUESTIONS));
        }
        List<Question> added = new ArrayList<>();
        for (QuestionRequest r : request.questions()) {
            Question question = Question.create(set, position + added.size());
            questionValidator.apply(question, r, "Question %d".formatted(position + added.size() + 1));
            added.add(question);
        }
        questionRepository.saveAll(added);
        set.touch();
        return questionSetService.toResponse(set);
    }

    @Transactional
    public QuestionSetResponse update(String setCode, Long questionId, QuestionRequest request) {
        QuestionSet set = questionSetService.getOwnedSet(setCode);
        Question question = getQuestion(set, questionId);
        questionValidator.apply(question, request, "Question %d".formatted(question.getPosition() + 1));
        set.touch();
        return questionSetService.toResponse(set);
    }

    /** Deletes a question; the ones after it move up. */
    @Transactional
    public QuestionSetResponse delete(String setCode, Long questionId) {
        QuestionSet set = questionSetService.getOwnedSet(setCode);
        questionRepository.delete(getQuestion(set, questionId));
        questionRepository.flush();
        List<Question> rest = questionRepository.findByQuestionSetOrderByPosition(set);
        questionRepository.deferPositionCheck();
        renumber(rest);
        set.touch();
        return questionSetService.toResponse(set);
    }

    @Transactional
    public QuestionSetResponse reorder(String setCode, ReorderQuestionsRequest request) {
        QuestionSet set = questionSetService.getOwnedSet(setCode);
        List<Question> current = questionRepository.findByQuestionSetOrderByPosition(set);
        Map<Long, Question> byId = current.stream().collect(Collectors.toMap(Question::getId, Function.identity()));
        if (request.questionIds().size() != current.size() || !new HashSet<>(request.questionIds()).equals(byId.keySet())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_QUESTION_ORDER",
                    "questionIds must list every question of the set exactly once");
        }
        questionRepository.deferPositionCheck();
        renumber(request.questionIds().stream().map(byId::get).toList());
        questionRepository.flush();
        set.touch();
        return questionSetService.toResponse(set);
    }

    private Question getQuestion(QuestionSet set, Long questionId) {
        return questionRepository.findByIdAndQuestionSet(questionId, set)
                .orElseThrow(() -> new ResourceNotFoundException("Question", questionId));
    }

    private static void renumber(List<Question> questions) {
        for (int i = 0; i < questions.size(); i++) {
            questions.get(i).setPosition(i);
        }
    }
}
