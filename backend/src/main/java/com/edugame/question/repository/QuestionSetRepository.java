package com.edugame.question.repository;

import java.util.List;
import java.util.Optional;

import com.edugame.question.domain.QuestionSet;
import com.edugame.question.domain.QuestionSetStatus;
import com.edugame.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionSetRepository extends JpaRepository<QuestionSet, Long> {

    Optional<QuestionSet> findByCode(String code);

    List<QuestionSet> findByOwnerAndStatusOrderByUpdatedAtDesc(User owner, QuestionSetStatus status);

    long countByOwnerAndStatus(User owner, QuestionSetStatus status);
}
