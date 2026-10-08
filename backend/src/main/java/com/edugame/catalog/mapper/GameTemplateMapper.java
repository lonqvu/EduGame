package com.edugame.catalog.mapper;

import com.edugame.catalog.domain.GameTemplate;
import com.edugame.catalog.dto.GameTemplateResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface GameTemplateMapper {

    @Mapping(target = "categoryCode", source = "category.code")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "isNew", expression = "java(template.isNew())")
    GameTemplateResponse toResponse(GameTemplate template);
}
