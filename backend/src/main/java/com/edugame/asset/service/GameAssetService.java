package com.edugame.asset.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;
import java.util.regex.Pattern;

import com.edugame.asset.domain.ImageFormat;
import com.edugame.asset.dto.AssetResponse;
import com.edugame.asset.storage.AssetStorage;
import com.edugame.common.exception.BusinessException;
import com.edugame.game.domain.Game;
import com.edugame.game.domain.GameAsset;
import com.edugame.game.domain.GameAssetType;
import com.edugame.game.repository.GameAssetRepository;
import com.edugame.game.service.GameService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

/**
 * Images of a game's questions. A file is checked (an image by its own bytes, not too big), stored under a random
 * key and recorded in {@code game_asset}; the question then keeps the returned URL in its {@code image} field.
 * Replaced images stay on disk: removing files nothing points to is left to a cleanup job.
 */
@Service
@RequiredArgsConstructor
public class GameAssetService {

    /** The editor shrinks big photos before sending them, so this is only reached by unusual files. */
    public static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;

    /** Every upload stays, even replaced ones: enough for 200 questions with a few changes of image each. */
    static final int MAX_ASSETS_PER_GAME = 500;

    public static final String URL_PREFIX = "/api/v1/assets/";

    private static final Pattern KEY = Pattern.compile("[A-Za-z0-9_-]{22}\\.([a-z]{3,4})");
    private static final int MAX_NAME_LENGTH = 255;

    private final SecureRandom random = new SecureRandom();
    private final GameService gameService;
    private final GameAssetRepository gameAssetRepository;
    private final AssetStorage assetStorage;

    @Transactional
    public AssetResponse uploadImage(String gameCode, MultipartFile file) {
        Game game = gameService.getOwnedGame(gameCode);
        if (file.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "EMPTY_FILE", "The file is empty");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw fileTooLarge();
        }
        byte[] bytes = readAll(file);
        ImageFormat format = ImageFormat.detect(bytes).orElseThrow(() -> new BusinessException(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_IMAGE", "Only PNG, JPEG, GIF and WebP images"));
        if (gameAssetRepository.countByGame(game) >= MAX_ASSETS_PER_GAME) {
            throw new BusinessException(HttpStatus.CONFLICT, "TOO_MANY_ASSETS",
                    "A game has at most %d uploaded files".formatted(MAX_ASSETS_PER_GAME));
        }

        String key = newKey() + "." + format.extension();
        assetStorage.store(key, bytes);
        GameAsset asset = gameAssetRepository.save(GameAsset.create(game, GameAssetType.IMAGE,
                displayName(file.getOriginalFilename()), URL_PREFIX + key, format.mimeType(), bytes.length));
        return new AssetResponse(asset.getId(), asset.getUrl(), asset.getName(), asset.getType().name(),
                asset.getMimeType(), asset.getSizeBytes());
    }

    /** A stored file and its type, for {@code GET /api/v1/assets/{key}}; empty for a key the server never made. */
    public Optional<StoredFile> find(String key) {
        var matcher = KEY.matcher(key);
        if (!matcher.matches()) {
            return Optional.empty();
        }
        return ImageFormat.fromExtension(matcher.group(1))
                .flatMap(format -> assetStorage.load(key).map(resource -> new StoredFile(resource, format)));
    }

    public static BusinessException fileTooLarge() {
        return new BusinessException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE",
                "An image is at most %d MB".formatted(MAX_IMAGE_BYTES / 1024 / 1024));
    }

    private String newKey() {
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static byte[] readAll(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file", e);
        }
    }

    /** The picked file's name without any folder (some browsers send a full path), never blank, at most 255. */
    private static String displayName(String original) {
        String name = original == null ? "" : StringUtils.getFilename(original.replace('\\', '/'));
        name = name == null || name.isBlank() ? "image" : name.strip();
        return name.length() > MAX_NAME_LENGTH ? name.substring(0, MAX_NAME_LENGTH) : name;
    }

    public record StoredFile(Resource resource, ImageFormat format) {
    }
}
