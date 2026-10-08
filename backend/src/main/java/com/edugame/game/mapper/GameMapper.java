package com.edugame.game.mapper;

import java.util.List;

import com.edugame.game.domain.Game;
import com.edugame.game.domain.GameItem;
import com.edugame.game.domain.GameVersion;
import com.edugame.game.dto.GameItemResponse;
import com.edugame.game.dto.GameResponse;
import com.edugame.game.dto.GameSummaryResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface GameMapper {

    @Mapping(target = "templateCode", source = "game.template.code")
    GameSummaryResponse toSummary(Game game, long itemCount);

    @Mapping(target = "code", source = "game.code")
    @Mapping(target = "templateCode", source = "game.template.code")
    @Mapping(target = "status", source = "game.status")
    @Mapping(target = "updatedAt", source = "game.updatedAt")
    @Mapping(target = "version", source = "editing.version")
    @Mapping(target = "versionStatus", source = "editing.status")
    @Mapping(target = "settings", source = "editing.settings")
    GameResponse toResponse(Game game, GameVersion editing, List<GameItem> items);

    GameItemResponse toItemResponse(GameItem item);
}
