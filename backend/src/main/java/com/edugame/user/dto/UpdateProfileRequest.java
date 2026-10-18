package com.edugame.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Changes to the profile; every field is sent (the form shows them all).
 *
 * @param phone  "0987 654 321", "+84 987 654 321"...; blank removes it
 * @param avatar one of {@link ProfileRules#AVATARS}; blank: the default picture
 */
public record UpdateProfileRequest(
        @NotBlank @Size(max = ProfileRules.MAX_DISPLAY_NAME) String displayName,
        @Size(max = 30) String phone,
        @Size(max = 30) String avatar) {

    public UpdateProfileRequest {
        displayName = displayName == null ? null : displayName.strip();
    }
}
