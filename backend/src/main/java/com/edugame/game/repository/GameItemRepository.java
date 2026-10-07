package com.edugame.game.repository;

import com.edugame.game.domain.GameItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameItemRepository extends JpaRepository<GameItem, Long> {
}
