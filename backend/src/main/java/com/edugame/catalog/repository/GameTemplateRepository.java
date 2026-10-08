package com.edugame.catalog.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.edugame.catalog.domain.GameTemplate;
import com.edugame.catalog.domain.GameTemplateStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface GameTemplateRepository extends JpaRepository<GameTemplate, Long> {

    Optional<GameTemplate> findByCode(String code);

    /** Menu order: category first, then template. */
    @Query("""
            select t from GameTemplate t
            left join fetch t.category c
            where t.status in :statuses
            order by c.sortOrder, t.sortOrder, t.id
            """)
    List<GameTemplate> findMenu(Collection<GameTemplateStatus> statuses);
}
