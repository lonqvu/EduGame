package com.edugame.game.repository;

import java.util.Optional;

import com.edugame.game.domain.Game;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRepository extends JpaRepository<Game, Long> {

    Optional<Game> findByCode(String code);
}
