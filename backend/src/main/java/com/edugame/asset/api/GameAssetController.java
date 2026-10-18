package com.edugame.asset.api;

import java.time.Duration;

import com.edugame.asset.dto.AssetResponse;
import com.edugame.asset.service.GameAssetService;
import com.edugame.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Assets", description = "Images uploaded for questions")
@RestController
@RequiredArgsConstructor
public class GameAssetController {

    private final GameAssetService gameAssetService;

    @Operation(summary = "Upload an image for a question of the game (multipart field \"file\")")
    @PostMapping(path = "/api/v1/games/{code}/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AssetResponse upload(@PathVariable String code, @RequestPart("file") MultipartFile file) {
        return gameAssetService.uploadImage(code, file);
    }

    /**
     * Public, so {@code <img>} tags work without a token: the key is random and never listed. A file never
     * changes under its key, so it may be cached for good.
     */
    @Operation(summary = "An uploaded file (no sign-in needed)")
    @GetMapping("/api/v1/assets/{key}")
    public ResponseEntity<Resource> file(@PathVariable String key) {
        return gameAssetService.find(key)
                .map(file -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(file.format().mimeType()))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                        .header("Content-Security-Policy", "default-src 'none'; sandbox")
                        .body(file.resource()))
                .orElseThrow(() -> new ResourceNotFoundException("Asset", key));
    }
}
