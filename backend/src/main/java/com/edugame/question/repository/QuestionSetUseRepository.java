package com.edugame.question.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import com.edugame.question.domain.QuestionSet;
import com.edugame.question.domain.QuestionSetUse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface QuestionSetUseRepository extends JpaRepository<QuestionSetUse, Long> {

    /** The games made from a set that are still in the teacher's library, newest first. */
    @Query("""
            select u from QuestionSetUse u join fetch u.game g join fetch g.template
            where u.questionSet = :set and g.status <> com.edugame.game.domain.GameStatus.ARCHIVED
            order by u.createdAt desc, u.id desc
            """)
    List<QuestionSetUse> findLiveGames(QuestionSet set);

    /**
     * For each set: the games made from it (archived ones too: they were uses), and how many times those games were
     * played with a class (sessions started).
     */
    @Query(value = """
            select u.question_set_id as questionSetId,
                   count(distinct u.id) as useCount,
                   count(s.id) as playCount,
                   max(u.created_at) as lastUsedAt
            from question_set_use u
            left join game_session s on s.game_id = u.game_id and s.status in ('IN_PROGRESS', 'ENDED')
            where u.question_set_id in (:setIds)
            group by u.question_set_id
            """, nativeQuery = true)
    List<UseCount> countBySet(Collection<Long> setIds);

    interface UseCount {

        Long getQuestionSetId();

        long getUseCount();

        long getPlayCount();

        Instant getLastUsedAt();
    }
}
