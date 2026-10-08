package com.edugame.catalog.service;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import com.edugame.catalog.domain.GameTemplate;
import com.edugame.catalog.domain.GameTemplateStatus;
import com.edugame.catalog.dto.GameTemplateResponse;
import com.edugame.catalog.mapper.GameTemplateMapper;
import com.edugame.catalog.repository.GameTemplateRepository;
import com.edugame.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GameTemplateService {

    /** Templates a teacher can pick. DRAFT / INACTIVE stay hidden. */
    private static final Set<GameTemplateStatus> AVAILABLE =
            EnumSet.of(GameTemplateStatus.BETA, GameTemplateStatus.ACTIVE);

    private final GameTemplateRepository gameTemplateRepository;
    private final GameTemplateMapper gameTemplateMapper;

    @Transactional(readOnly = true)
    public List<GameTemplateResponse> listAvailable() {
        return gameTemplateRepository.findMenu(AVAILABLE).stream()
                .map(gameTemplateMapper::toResponse)
                .toList();
    }

    /** For other modules that need the entity (e.g. creating a game). */
    @Transactional(readOnly = true)
    public GameTemplate getAvailable(String code) {
        return gameTemplateRepository.findByCode(code)
                .filter(template -> AVAILABLE.contains(template.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Game template", code));
    }
}
