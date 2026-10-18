package com.edugame.user.api;

import java.time.Duration;

import com.edugame.common.exception.ResourceNotFoundException;
import com.edugame.user.domain.UserAvatar;
import com.edugame.user.service.AvatarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Uploaded profile pictures, open to everyone so an {@code <img>} can show them (it sends no token). The address is
 * random and changes with every upload, so a picture can be cached for good.
 */
@Tag(name = "Avatars", description = "Profile pictures teachers uploaded")
@RestController
@RequestMapping("/api/v1/avatars")
@RequiredArgsConstructor
public class AvatarController {

    private final AvatarService avatarService;

    @Operation(summary = "An uploaded profile picture")
    @GetMapping("/{publicId}")
    public ResponseEntity<byte[]> get(@PathVariable String publicId) {
        UserAvatar avatar = avatarService.find(publicId).orElseThrow(() -> new ResourceNotFoundException("Avatar", publicId));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(avatar.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .body(avatar.getData());
    }
}
