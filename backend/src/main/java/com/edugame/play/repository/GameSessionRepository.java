package com.edugame.play.repository;

import com.edugame.play.domain.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameSessionRepository extends JpaRepository<GameSession, Long> {
}
