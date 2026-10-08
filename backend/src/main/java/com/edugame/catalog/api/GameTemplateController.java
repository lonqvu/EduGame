package com.edugame.catalog.api;

import java.util.List;

import com.edugame.catalog.dto.GameTemplateResponse;
import com.edugame.catalog.service.GameTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Game templates", description = "Kinds of game a teacher can create")
@RestController
@RequestMapping("/api/v1/game-templates")
@RequiredArgsConstructor
public class GameTemplateController {

    private final GameTemplateService gameTemplateService;

    @Operation(summary = "Templates for the \"choose a game\" page, in menu order")
    @GetMapping
    public List<GameTemplateResponse> list() {
        return gameTemplateService.listAvailable();
    }
}
