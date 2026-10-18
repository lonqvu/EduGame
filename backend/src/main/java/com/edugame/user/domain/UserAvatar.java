package com.edugame.user.domain;

import com.edugame.common.entity.CreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A picture a teacher uploaded for the profile (at most one per user). Table {@code user_avatar}. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "user_avatar")
public class UserAvatar extends CreatedEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    /** Random; the address of the picture, new with every upload. */
    @Column(name = "public_id", nullable = false, length = 32)
    private String publicId;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "data", nullable = false)
    private byte[] data;

    @Column(name = "size_bytes", nullable = false)
    private int sizeBytes;

    public static UserAvatar of(Long userId, String publicId, String contentType, byte[] data) {
        UserAvatar avatar = new UserAvatar();
        avatar.userId = userId;
        avatar.publicId = publicId;
        avatar.contentType = contentType;
        avatar.data = data;
        avatar.sizeBytes = data.length;
        return avatar;
    }
}
