package com.edugame.question.domain;

import com.edugame.common.entity.CreatedEntity;
import com.edugame.game.domain.Game;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A game made from a set (its questions were copied into it). Table {@code question_set_use}. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "question_set_use")
public class QuestionSetUse extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_set_id", nullable = false)
    private QuestionSet questionSet;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    public static QuestionSetUse of(QuestionSet set, Game game) {
        QuestionSetUse use = new QuestionSetUse();
        use.questionSet = set;
        use.game = game;
        return use;
    }
}
