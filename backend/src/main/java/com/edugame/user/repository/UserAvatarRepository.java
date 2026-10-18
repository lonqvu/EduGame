package com.edugame.user.repository;

import java.util.Optional;

import com.edugame.user.domain.UserAvatar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface UserAvatarRepository extends JpaRepository<UserAvatar, Long> {

    Optional<UserAvatar> findByPublicId(String publicId);

    /** The address of the user's picture, without loading the picture. */
    @Query("select a.publicId from UserAvatar a where a.userId = :userId")
    Optional<String> findPublicIdByUserId(Long userId);

    @Modifying(flushAutomatically = true)
    @Query("delete from UserAvatar a where a.userId = :userId")
    int deleteByUserId(Long userId);
}
