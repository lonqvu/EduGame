package com.edugame.question.dto;

import java.util.List;

/** A set with its questions in order, and the games made from it that are still in the library. */
public record QuestionSetResponse(
        QuestionSetSummaryResponse summary,
        List<QuestionResponse> questions,
        List<QuestionSetGameResponse> games) {
}
