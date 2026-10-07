package com.edugame.reward.domain;

import java.time.Instant;

import com.edugame.common.entity.BaseEntity;
import com.edugame.play.domain.Player;
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
import org.hibernate.annotations.CreationTimestamp;

/** End-of-session award given to a player. Table {@code player_award}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "player_award")
public class PlayerAward extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @Column(name = "award_code", nullable = false, length = 50)
    private String awardCode;

    @CreationTimestamp
    @Column(name = "awarded_at", nullable = false, updatable = false)
    private Instant awardedAt;
}
