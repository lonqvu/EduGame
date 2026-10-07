package com.edugame.game.domain;

import com.edugame.common.entity.CreatedEntity;
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

/** Media file of a game, shared by all its versions. Table {@code game_asset}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "game_asset")
public class GameAsset extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private GameAssetType type;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "url", nullable = false, length = 500)
    private String url;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "size_bytes")
    private Long sizeBytes;
}
