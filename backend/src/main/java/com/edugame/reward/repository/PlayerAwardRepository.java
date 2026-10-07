package com.edugame.reward.repository;

import com.edugame.reward.domain.PlayerAward;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerAwardRepository extends JpaRepository<PlayerAward, Long> {
}
