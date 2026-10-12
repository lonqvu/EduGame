package com.edugame.question.service;

import com.edugame.question.domain.Question;
import com.edugame.question.domain.QuestionSetUse;
import com.edugame.question.dto.QuestionResponse;
import com.edugame.question.dto.QuestionSetGameResponse;
import org.springframework.stereotype.Component;

@Component
public class QuestionSetMapper {

    public QuestionResponse toResponse(Question q) {
        return new QuestionResponse(q.getId(), q.getType(), q.getText(), q.getOptions(),
                q.getCorrectOption() == null ? null : q.getCorrectOption().intValue(), q.getAnswer(), q.getExplanation());
    }

    public QuestionSetGameResponse toResponse(QuestionSetUse use) {
        return new QuestionSetGameResponse(use.getGame().getCode(), use.getGame().getTitle(),
                use.getGame().getTemplate().getCode(), use.getCreatedAt());
    }
}
