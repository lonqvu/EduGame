package com.edugame.play.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.edugame.classroom.domain.Classroom;
import com.edugame.play.domain.GameSession;
import com.edugame.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface GameSessionRepository extends JpaRepository<GameSession, Long> {

    Optional<GameSession> findByIdAndClassroom(Long id, Classroom classroom);

    /** Games a teacher has run with a class (started, not cancelled): "Hoạt động đã tổ chức" of the profile. */
    @Query("""
            select count(s) from GameSession s
            where s.host = :host
              and s.status in (com.edugame.play.domain.GameSessionStatus.IN_PROGRESS,
                               com.edugame.play.domain.GameSessionStatus.ENDED)
            """)
    long countPlayedByHost(User host);

    /** Per class: games played (started, not cancelled) and how many of them reached the end. */
    @Query("""
            select s.classroom.id as classroomId,
                   count(s) as playedCount,
                   sum(case when s.status = com.edugame.play.domain.GameSessionStatus.ENDED then 1 else 0 end) as endedCount,
                   max(s.startedAt) as lastPlayedAt
            from GameSession s
            where s.classroom.id in :classroomIds
              and s.status in (com.edugame.play.domain.GameSessionStatus.IN_PROGRESS,
                               com.edugame.play.domain.GameSessionStatus.ENDED)
            group by s.classroom.id
            """)
    List<SessionCount> countByClassroom(Collection<Long> classroomIds);

    interface SessionCount {

        Long getClassroomId();

        long getPlayedCount();

        long getEndedCount();

        Instant getLastPlayedAt();
    }
}
