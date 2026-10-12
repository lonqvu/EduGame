package com.edugame.question.dto;

import java.util.List;

import com.edugame.question.domain.QuestionType;

/** {@code options} / {@code correctOption} for multiple choice, {@code answer} for short answer. */
public record QuestionResponse(
        Long id,
        QuestionType type,
        String text,
        List<String> options,
        Integer correctOption,
        String answer,
        String explanation) {
}
