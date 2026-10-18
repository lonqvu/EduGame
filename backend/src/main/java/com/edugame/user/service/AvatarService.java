package com.edugame.user.service;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

import com.edugame.common.exception.BusinessException;
import com.edugame.user.domain.User;
import com.edugame.user.domain.UserAvatar;
import com.edugame.user.dto.ProfileResponse;
import com.edugame.user.dto.ProfileRules;
import com.edugame.user.repository.UserAvatarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** A teacher's own profile picture: upload (re-encoded, see AvatarImages), removal, and serving it. */
@Service
@RequiredArgsConstructor
public class AvatarService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final CurrentUserService currentUserService;
    private final UserAvatarRepository userAvatarRepository;
    private final ProfileService profileService;

    /** Replaces the teacher's picture with this upload; the previous picture's address stops working. */
    @Transactional
    public ProfileResponse upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE", "No picture was sent");
        }
        if (file.getSize() > ProfileRules.MAX_UPLOAD_BYTES) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "IMAGE_TOO_LARGE", "At most 5 MB");
        }
        byte[] picture;
        try {
            picture = AvatarImages.toAvatar(file.getBytes());
        } catch (AvatarImages.InvalidImage e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, e.code(), e.getMessage());
        } catch (IOException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE", "The picture could not be read");
        }

        User user = currentUserService.getCurrentUser();
        userAvatarRepository.deleteByUserId(user.getId());
        userAvatarRepository.save(UserAvatar.of(user.getId(), newPublicId(), AvatarImages.CONTENT_TYPE, picture));
        user.setAvatar(ProfileRules.UPLOADED);
        return profileService.responseFor(user);
    }

    /** Back to the default drawing. */
    @Transactional
    public ProfileResponse remove() {
        User user = currentUserService.getCurrentUser();
        userAvatarRepository.deleteByUserId(user.getId());
        if (ProfileRules.UPLOADED.equals(user.getAvatar())) {
            user.setAvatar(null);
        }
        return profileService.responseFor(user);
    }

    @Transactional(readOnly = true)
    public Optional<UserAvatar> find(String publicId) {
        return userAvatarRepository.findByPublicId(publicId);
    }

    /** 128 random bits, URL-safe: 22 characters. */
    private static String newPublicId() {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
