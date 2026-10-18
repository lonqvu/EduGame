package com.edugame.user.api;

import java.util.UUID;

import com.edugame.auth.service.AccessTokenService;
import com.edugame.auth.service.PasswordChangeService;
import com.edugame.user.dto.ChangePasswordRequest;
import com.edugame.user.dto.ProfileResponse;
import com.edugame.user.dto.SignedOutResponse;
import com.edugame.user.dto.UpdateProfileRequest;
import com.edugame.user.dto.UserResponse;
import com.edugame.user.dto.UserSettings;
import com.edugame.user.service.AvatarService;
import com.edugame.user.service.CurrentUserService;
import com.edugame.user.service.ProfileService;
import com.edugame.user.service.UserSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Me", description = "The signed-in user")
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class MeController {

    private final CurrentUserService currentUserService;
    private final ProfileService profileService;
    private final PasswordChangeService passwordChangeService;
    private final AvatarService avatarService;
    private final UserSettingsService userSettingsService;

    @Operation(summary = "Current user (greeting on the home page)")
    @GetMapping
    public UserResponse getMe() {
        return currentUserService.getMe();
    }

    @Operation(summary = "Profile: the account and its activity (\"Hồ sơ của tôi\")")
    @GetMapping("/profile")
    public ProfileResponse getProfile() {
        return profileService.get();
    }

    @Operation(summary = "Change the display name, phone and picture")
    @PatchMapping("/profile")
    public ProfileResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return profileService.update(request);
    }

    @Operation(summary = "Upload a profile picture (JPEG or PNG, at most 5 MB); it becomes a 256 px square")
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProfileResponse uploadAvatar(@RequestPart("file") MultipartFile file) {
        return avatarService.upload(file);
    }

    @Operation(summary = "Remove the uploaded picture: back to the default drawing")
    @DeleteMapping("/avatar")
    public ProfileResponse removeAvatar() {
        return avatarService.remove();
    }

    @Operation(summary = "Change the password; every other session is signed out")
    @PostMapping("/password")
    public SignedOutResponse changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                            @AuthenticationPrincipal Jwt token) {
        return new SignedOutResponse(passwordChangeService.change(request, sessionOf(token)));
    }

    @Operation(summary = "Sign out of every other device")
    @PostMapping("/sessions/sign-out-others")
    public SignedOutResponse signOutOthers(@AuthenticationPrincipal Jwt token) {
        return new SignedOutResponse(passwordChangeService.signOutElsewhere(sessionOf(token)));
    }

    @Operation(summary = "Settings (\"Cài đặt\"); keys never saved have their default")
    @GetMapping("/settings")
    public UserSettings getSettings() {
        return userSettingsService.get();
    }

    @Operation(summary = "Replace the settings (the whole document)")
    @PutMapping("/settings")
    public UserSettings updateSettings(@Valid @RequestBody UserSettings settings) {
        return userSettingsService.update(settings);
    }

    /** The session of the access token; none without a token (the development default user). */
    private static UUID sessionOf(Jwt token) {
        String sid = token == null ? null : token.getClaimAsString(AccessTokenService.SESSION_CLAIM);
        return sid == null ? null : UUID.fromString(sid);
    }
}
