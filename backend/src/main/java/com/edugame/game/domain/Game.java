package com.edugame.game.domain;

import com.edugame.catalog.domain.GameTemplate;
import com.edugame.common.entity.AuditableEntity;
import com.edugame.user.domain.User;
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

/** A game a teacher created from a template. Table {@code game}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "game")
public class Game extends AuditableEntity {

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private GameTemplate template;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "subject", length = 50)
    private String subject;

    @Enumerated(EnumType.STRING)
    @Column(name = "education_level", nullable = false, length = 20)
    private EducationLevel educationLevel = EducationLevel.TIEU_HOC;

    @Column(name = "grade")
    private Short grade;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 20)
    private GameVisibility visibility = GameVisibility.PRIVATE;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private GameStatus status = GameStatus.DRAFT;

    /** Composite FK (current_version_id, id) in DB: the version must belong to this game. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_version_id")
    private GameVersion currentVersion;
}
