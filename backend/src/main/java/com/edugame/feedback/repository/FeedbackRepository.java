package com.edugame.feedback.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.Optional;

import com.edugame.feedback.domain.Feedback;
import com.edugame.feedback.domain.FeedbackStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<Feedback> findByCode(String code);

    /** Sent by the teacher since then (the hourly limit). */
    @Query("select count(f) from Feedback f where f.user.id = :userId and f.createdAt > :since")
    long countSentSince(Long userId, Instant since);

    /** Newest first, with their teacher. */
    @EntityGraph(attributePaths = "user")
    Page<Feedback> findByStatusIn(Collection<FeedbackStatus> statuses, Pageable pageable);
}
