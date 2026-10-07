package com.edugame.catalog.domain;

import com.edugame.common.entity.AuditableEntity;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A kind of game: which engine runs it, its JSON schema and default config. Table {@code game_template}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "game_template")
public class GameTemplate extends AuditableEntity {

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private GameCategory category;

    @Column(name = "engine", nullable = false, length = 50)
    private String engine;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "icon", length = 100)
    private String icon;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "schema_version", nullable = false)
    private int schemaVersion = 1;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config_schema", nullable = false)
    private JsonNode configSchema = JsonNodeFactory.instance.objectNode();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "default_config", nullable = false)
    private JsonNode defaultConfig = JsonNodeFactory.instance.objectNode();

    @Column(name = "is_new", nullable = false)
    private boolean isNew = false;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private GameTemplateStatus status = GameTemplateStatus.BETA;
}
