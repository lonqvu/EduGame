package com.edugame.user.service;

import com.edugame.classroom.domain.ClassroomStatus;
import com.edugame.classroom.repository.ClassroomRepository;
import com.edugame.classroom.repository.ClassroomStudentRepository;
import com.edugame.common.exception.BusinessException;
import com.edugame.play.repository.GameSessionRepository;
import com.edugame.question.domain.QuestionSetStatus;
import com.edugame.question.repository.QuestionSetRepository;
import com.edugame.user.domain.User;
import com.edugame.user.dto.ProfileResponse;
import com.edugame.user.dto.ProfileRules;
import com.edugame.user.dto.UpdateProfileRequest;
import com.edugame.user.repository.UserAvatarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** "Hồ sơ của tôi": the signed-in teacher's account, what they have done with Lớp vui, and edits to it. */
@Service
@RequiredArgsConstructor
public class ProfileService {

    /** Path of an uploaded picture; GET is open to everyone (see AvatarController). */
    public static final String AVATAR_PATH = "/api/v1/avatars/";

    private final CurrentUserService currentUserService;
    private final ClassroomRepository classroomRepository;
    private final ClassroomStudentRepository classroomStudentRepository;
    private final QuestionSetRepository questionSetRepository;
    private final GameSessionRepository gameSessionRepository;
    private final UserAvatarRepository userAvatarRepository;

    @Transactional(readOnly = true)
    public ProfileResponse get() {
        return responseFor(currentUserService.getCurrentUser());
    }

    /**
     * Name, phone and picture; the email and username cannot be changed here. Picking a drawing deletes an uploaded
     * picture; {@link ProfileRules#UPLOADED} keeps it.
     */
    @Transactional
    public ProfileResponse update(UpdateProfileRequest request) {
        User user = currentUserService.getCurrentUser();
        String phone;
        try {
            phone = ProfileRules.normalizePhone(request.phone());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PHONE", "phone must be 9 to 15 digits");
        }
        String avatar = request.avatar() == null || request.avatar().isBlank() ? null : request.avatar().strip();
        boolean keepsUpload = ProfileRules.UPLOADED.equals(avatar);
        if (keepsUpload && userAvatarRepository.findPublicIdByUserId(user.getId()).isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_AVATAR", "No picture was uploaded");
        }
        if (avatar != null && !keepsUpload && !ProfileRules.AVATARS.contains(avatar)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_AVATAR", "Unknown avatar: " + avatar);
        }
        if (!keepsUpload) {
            userAvatarRepository.deleteByUserId(user.getId());
        }
        user.setDisplayName(request.displayName());
        user.setPhone(phone);
        user.setAvatar(avatar);
        return responseFor(user);
    }

    /** The profile of {@code user} with its figures (also after a picture upload, see AvatarService). */
    @Transactional(readOnly = true)
    public ProfileResponse responseFor(User user) {
        var stats = new ProfileResponse.Stats(
                classroomRepository.countByTeacherAndStatusNot(user, ClassroomStatus.ARCHIVED),
                classroomStudentRepository.countActiveOfTeacher(user),
                questionSetRepository.countByOwnerAndStatus(user, QuestionSetStatus.ACTIVE),
                gameSessionRepository.countPlayedByHost(user));
        String avatarUrl = ProfileRules.UPLOADED.equals(user.getAvatar())
                ? userAvatarRepository.findPublicIdByUserId(user.getId()).map(id -> AVATAR_PATH + id).orElse(null)
                : null;
        return new ProfileResponse(user.getCode(), user.getUsername(), user.getDisplayName(), user.getEmail(),
                user.getPhone(), user.getAvatar(), avatarUrl, user.getRole(), user.getEmailVerifiedAt() != null,
                user.getCreatedAt(), stats);
    }
}
