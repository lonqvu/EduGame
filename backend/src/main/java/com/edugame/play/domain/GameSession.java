package com.edugame.play.domain;

import java.time.Instant;

import com.edugame.classroom.domain.Classroom;
import com.edugame.common.entity.AuditableEntity;
import com.edugame.game.domain.Game;
import com.edugame.game.domain.GameItem;
import com.edugame.game.domain.GameVersion;
import com.edugame.user.domain.User;
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

/** One play-through of a game during a lesson. Table {@code game_session}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "game_session")
public class GameSession extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    /** Composite FK (game_version_id, game_id) in DB: the version must belong to {@link #game}. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_version_id", nullable = false)
    private GameVersion gameVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    private Classroom classroom;

    @Column(name = "session_code", length = 10)
    private String sessionCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 20)
    private GameSessionMode mode = GameSessionMode.CLASSROOM;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private GameSessionStatus status = GameSessionStatus.WAITING;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "settings", nullable = false)
    private JsonNode settings = JsonNodeFactory.instance.objectNode();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "state", nullable = false)
    private JsonNode state = JsonNodeFactory.instance.objectNode();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_item_id")
    private GameItem currentItem;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;
}
