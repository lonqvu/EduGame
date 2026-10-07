package com.edugame.game.repository;

import com.edugame.game.domain.GameAsset;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameAssetRepository extends JpaRepository<GameAsset, Long> {
}
