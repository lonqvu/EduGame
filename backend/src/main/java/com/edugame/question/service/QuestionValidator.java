package com.edugame.question.service;

import java.text.Normalizer;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.edugame.common.exception.BusinessException;
import com.edugame.question.domain.Question;
import com.edugame.question.domain.QuestionType;
import com.edugame.question.dto.QuestionRequest;
import com.edugame.question.dto.QuestionSetRules;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Turns a {@link QuestionRequest} into a complete question: a set only holds questions that can be played. Texts are
 * trimmed; a multiple choice question has 2-6 different options and one correct; a short answer question has its
 * answer. Fields of the other type are dropped.
 */
@Component
public class QuestionValidator {

    /**
     * Writes the request into {@code question}.
     *
     * @param label "Câu 3" style name of the question in error messages (bulk adds name the faulty one)
     */
    public void apply(Question question, QuestionRequest request, String label) {
        String text = request.text().strip();
        String explanation = blankToNull(request.explanation());
        if (QuestionType.valueOf(request.type()) == QuestionType.MULTIPLE_CHOICE) {
            List<String> options = request.options() == null ? List.of()
                    : request.options().stream().map(String::strip).toList();
            if (options.size() < QuestionSetRules.MIN_OPTIONS || options.size() > QuestionSetRules.MAX_OPTIONS) {
                throw invalid(label, "needs %d to %d options".formatted(QuestionSetRules.MIN_OPTIONS, QuestionSetRules.MAX_OPTIONS));
            }
            Set<String> seen = new HashSet<>();
            for (String option : options) {
                if (option.isEmpty()) {
                    throw invalid(label, "has an empty option");
                }
                if (!seen.add(fold(option))) {
                    throw invalid(label, "has the option \"%s\" twice".formatted(option));
                }
            }
            Integer correct = request.correctOption();
            if (correct == null || correct < 0 || correct >= options.size()) {
                throw invalid(label, "correctOption must be the index of one of its options");
            }
            question.makeMultipleChoice(text, options, correct, explanation);
        } else {
            String answer = blankToNull(request.answer());
            if (answer == null) {
                throw invalid(label, "needs its answer");
            }
            question.makeShortAnswer(text, answer, explanation);
        }
    }

    /** Case, accents in NFD/NFC form and inner spaces do not make two options different. */
    private static String fold(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFC).replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private static BusinessException invalid(String label, String problem) {
        return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_QUESTION", "%s %s".formatted(label, problem));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
