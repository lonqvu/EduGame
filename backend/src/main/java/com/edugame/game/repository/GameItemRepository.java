package com.edugame.game.repository;

import java.util.List;

import com.edugame.game.domain.GameItem;
import com.edugame.game.domain.GameVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface GameItemRepository extends JpaRepository<GameItem, Long> {

    List<GameItem> findByGameVersionOrderByPosition(GameVersion gameVersion);

    /**
     * Postpones the (game_version_id, position) unique check to commit, so positions can be shifted or
     * swapped freely inside the current transaction.
     */
    @Modifying
    @Query(value = "SET CONSTRAINTS uq_game_item_version_position DEFERRED", nativeQuery = true)
    void deferPositionCheck();
}
