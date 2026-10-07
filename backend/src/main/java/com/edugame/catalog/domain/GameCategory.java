package com.edugame.catalog.domain;

import com.edugame.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Group of game templates on the menu. Table {@code game_category}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "game_category")
public class GameCategory extends BaseEntity {

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "icon", length = 100)
    private String icon;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;
}
