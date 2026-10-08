package com.edugame.game.repository;

import java.util.List;
import java.util.Optional;

import com.edugame.game.domain.Game;
import com.edugame.game.domain.GameStatus;
import com.edugame.user.domain.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRepository extends JpaRepository<Game, Long> {

    @EntityGraph(attributePaths = "template")
    Optional<Game> findByCode(String code);

    /** A teacher's library, most recently edited first. */
    @EntityGraph(attributePaths = "template")
    List<Game> findByOwnerAndStatusNotOrderByUpdatedAtDesc(User owner, GameStatus status);
}
