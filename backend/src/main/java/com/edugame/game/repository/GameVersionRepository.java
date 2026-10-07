package com.edugame.game.repository;

import com.edugame.game.domain.GameVersion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameVersionRepository extends JpaRepository<GameVersion, Long> {
}
