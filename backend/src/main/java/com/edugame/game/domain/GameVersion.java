package com.edugame.game.domain;

import java.time.Instant;

import com.edugame.common.entity.CreatedEntity;
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

/** Snapshot of a game's content and settings. Table {@code game_version}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "game_version")
public class GameVersion extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "version", nullable = false)
    private Integer version;

    @Column(name = "schema_version", nullable = false)
    private Integer schemaVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "settings", nullable = false)
    private JsonNode settings = JsonNodeFactory.instance.objectNode();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private GameVersionStatus status = GameVersionStatus.DRAFT;

    @Column(name = "published_at")
    private Instant publishedAt;

    public static GameVersion draft(Game game, int version, int schemaVersion, JsonNode settings) {
        GameVersion draft = new GameVersion();
        draft.game = game;
        draft.version = version;
        draft.schemaVersion = schemaVersion;
        draft.settings = settings;
        return draft;
    }

    public boolean isDraft() {
        return status == GameVersionStatus.DRAFT;
    }

    void publish(Instant at) {
        status = GameVersionStatus.PUBLISHED;
        publishedAt = at;
    }
}
