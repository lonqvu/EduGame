package com.edugame.game.domain;

import com.edugame.common.entity.CreatedEntity;
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

/** One playable unit (question, card set, wheel segment...). Table {@code game_item}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "game_item")
public class GameItem extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_version_id", nullable = false)
    private GameVersion gameVersion;

    @Column(name = "item_type", nullable = false, length = 50)
    private String itemType;

    @Column(name = "position", nullable = false)
    private Integer position;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content", nullable = false)
    private JsonNode content = JsonNodeFactory.instance.objectNode();

    /** Backend only, never sent to the client. SQL NULL for games without a right answer. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "solution")
    private JsonNode solution;

    @Column(name = "explanation")
    private String explanation;
}
