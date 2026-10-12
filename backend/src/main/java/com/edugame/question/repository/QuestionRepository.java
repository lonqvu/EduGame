package com.edugame.question.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.edugame.question.domain.Question;
import com.edugame.question.domain.QuestionSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    List<Question> findByQuestionSetOrderByPosition(QuestionSet set);

    Optional<Question> findByIdAndQuestionSet(Long id, QuestionSet set);

    long countByQuestionSet(QuestionSet set);

    /** Questions of each set, by type. */
    @Query("""
            select q.questionSet.id as questionSetId,
                   sum(case when q.type = com.edugame.question.domain.QuestionType.MULTIPLE_CHOICE then 1 else 0 end)
                       as multipleChoiceCount,
                   sum(case when q.type = com.edugame.question.domain.QuestionType.SHORT_ANSWER then 1 else 0 end)
                       as shortAnswerCount
            from Question q
            where q.questionSet.id in :setIds
            group by q.questionSet.id
            """)
    List<QuestionCount> countByType(Collection<Long> setIds);

    /**
     * Postpones the (question_set_id, position) unique check to commit, so positions can be shifted or swapped
     * freely inside the current transaction.
     */
    @Modifying
    @Query(value = "SET CONSTRAINTS uq_question_set_position DEFERRED", nativeQuery = true)
    void deferPositionCheck();

    interface QuestionCount {

        Long getQuestionSetId();

        long getMultipleChoiceCount();

        long getShortAnswerCount();
    }
}
