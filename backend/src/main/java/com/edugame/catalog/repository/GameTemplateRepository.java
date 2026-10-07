package com.edugame.catalog.repository;

import java.util.Optional;

import com.edugame.catalog.domain.GameTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameTemplateRepository extends JpaRepository<GameTemplate, Long> {

    Optional<GameTemplate> findByCode(String code);
}
