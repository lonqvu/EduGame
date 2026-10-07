package com.edugame.play.domain;

import com.edugame.common.entity.CreatedEntity;
import com.edugame.game.domain.GameItem;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** Ordered log of everything that happens in a session. Table {@code session_event}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "session_event")
public class SessionEvent extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private GameSession session;

    @Column(name = "seq", nullable = false)
    private Integer seq;

    @Column(name = "type", nullable = false, length = 50)
    private String type;

    /** Composite FK (player_id, session_id) in DB: the player must belong to {@link #session}. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id")
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private GameItem item;

    @Column(name = "is_correct")
    private Boolean correct;

    @Column(name = "score_delta", nullable = false)
    private int scoreDelta = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false)
    private JsonNode payload = JsonNodeFactory.instance.objectNode();

    @Column(name = "undone", nullable = false)
    private boolean undone = false;
}
