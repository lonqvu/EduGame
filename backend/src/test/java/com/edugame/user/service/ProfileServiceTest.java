package com.edugame.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import com.edugame.classroom.domain.ClassroomStatus;
import com.edugame.classroom.repository.ClassroomRepository;
import com.edugame.classroom.repository.ClassroomStudentRepository;
import com.edugame.common.exception.BusinessException;
import com.edugame.play.repository.GameSessionRepository;
import com.edugame.question.domain.QuestionSetStatus;
import com.edugame.question.repository.QuestionSetRepository;
import com.edugame.user.domain.User;
import com.edugame.user.dto.ProfileResponse;
import com.edugame.user.dto.UpdateProfileRequest;
import com.edugame.user.repository.UserAvatarRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** The profile's figures come from the four counts; edits are checked before anything changes. */
class ProfileServiceTest {

    private final CurrentUserService currentUserService = mock(CurrentUserService.class);
    private final ClassroomRepository classrooms = mock(ClassroomRepository.class);
    private final ClassroomStudentRepository students = mock(ClassroomStudentRepository.class);
    private final QuestionSetRepository questionSets = mock(QuestionSetRepository.class);
    private final GameSessionRepository sessions = mock(GameSessionRepository.class);
    private final UserAvatarRepository avatars = mock(UserAvatarRepository.class);
    private final ProfileService service =
            new ProfileService(currentUserService, classrooms, students, questionSets, sessions, avatars);

    private User teacher;

    @BeforeEach
    void signIn() {
        teacher = User.verifiedTeacher("u-long", "long", "{noop}secret123", "Vũ Long", "long@example.com", Instant.now());
        teacher.setPhone("0987654321");
        when(currentUserService.getCurrentUser()).thenReturn(teacher);
        when(classrooms.countByTeacherAndStatusNot(teacher, ClassroomStatus.ARCHIVED)).thenReturn(3L);
        when(students.countActiveOfTeacher(teacher)).thenReturn(45L);
        when(questionSets.countByOwnerAndStatus(teacher, QuestionSetStatus.ACTIVE)).thenReturn(12L);
        when(sessions.countPlayedByHost(teacher)).thenReturn(8L);
    }

    @Test
    void showsTheAccountAndItsActivity() {
        ProfileResponse profile = service.get();

        assertThat(profile.displayName()).isEqualTo("Vũ Long");
        assertThat(profile.email()).isEqualTo("long@example.com");
        assertThat(profile.phone()).isEqualTo("0987654321");
        assertThat(profile.avatar()).isNull();
        assertThat(profile.avatarUrl()).isNull();
        assertThat(profile.emailVerified()).isTrue();
        assertThat(profile.stats()).isEqualTo(new ProfileResponse.Stats(3, 45, 12, 8));
    }

    @Test
    void savesTheNameThePhoneWithoutSeparatorsAndThePicture() {
        ProfileResponse profile = service.update(new UpdateProfileRequest("  Thầy Long  ", "0912 345 678", "owl"));

        assertThat(teacher.getDisplayName()).isEqualTo("Thầy Long");
        assertThat(teacher.getPhone()).isEqualTo("0912345678");
        assertThat(teacher.getAvatar()).isEqualTo("owl");
        assertThat(profile.displayName()).isEqualTo("Thầy Long");
        assertThat(profile.stats().classrooms()).isEqualTo(3);
    }

    @Test
    void blankPhoneAndPictureAreRemoved() {
        teacher.setAvatar("fox");
        service.update(new UpdateProfileRequest("Vũ Long", " ", ""));

        assertThat(teacher.getPhone()).isNull();
        assertThat(teacher.getAvatar()).isNull();
    }

    @Test
    void aWrongPhoneOrPictureChangesNothing() {
        assertThatThrownBy(() -> service.update(new UpdateProfileRequest("Người khác", "12ab", null)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("code", "INVALID_PHONE");
        assertThatThrownBy(() -> service.update(new UpdateProfileRequest("Người khác", null, "dragon")))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("code", "INVALID_AVATAR");

        assertThat(teacher.getDisplayName()).isEqualTo("Vũ Long");
        assertThat(teacher.getPhone()).isEqualTo("0987654321");
    }

    @Test
    void anUploadedPictureHasItsAddress() {
        teacher.setAvatar("upload");
        when(avatars.findPublicIdByUserId(teacher.getId())).thenReturn(Optional.of("abc123"));

        assertThat(service.get().avatarUrl()).isEqualTo("/api/v1/avatars/abc123");
    }

    @Test
    void keepingTheUploadNeedsOneAndPickingADrawingDeletesIt() {
        when(avatars.findPublicIdByUserId(teacher.getId())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(new UpdateProfileRequest("Vũ Long", null, "upload")))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("code", "INVALID_AVATAR");
        verify(avatars, never()).deleteByUserId(teacher.getId());

        when(avatars.findPublicIdByUserId(teacher.getId())).thenReturn(Optional.of("abc123"));
        service.update(new UpdateProfileRequest("Vũ Long", null, "upload"));
        assertThat(teacher.getAvatar()).isEqualTo("upload");
        verify(avatars, never()).deleteByUserId(teacher.getId());

        service.update(new UpdateProfileRequest("Vũ Long", null, "fox"));
        assertThat(teacher.getAvatar()).isEqualTo("fox");
        verify(avatars).deleteByUserId(teacher.getId());
    }
}
