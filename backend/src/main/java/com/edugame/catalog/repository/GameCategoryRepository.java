package com.edugame.catalog.repository;

import com.edugame.catalog.domain.GameCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameCategoryRepository extends JpaRepository<GameCategory, Long> {
}
