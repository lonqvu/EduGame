package com.edugame.play.repository;

import com.edugame.play.domain.SessionEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionEventRepository extends JpaRepository<SessionEvent, Long> {
}
