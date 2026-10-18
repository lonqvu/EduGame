package com.edugame.asset.storage;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;

import com.edugame.asset.AssetProperties;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/**
 * Files on the server's disk, in {@code app.assets.dir}. Keys are checked by the caller, so they never contain a
 * path separator; a file is written to a temporary name first, then moved, so a reader never sees half of it.
 */
@Component
public class LocalAssetStorage implements AssetStorage {

    private final Path dir;

    public LocalAssetStorage(AssetProperties properties) {
        this.dir = properties.dir().toAbsolutePath().normalize();
    }

    @Override
    public void store(String key, byte[] bytes) {
        try {
            Files.createDirectories(dir);
            Path temporary = Files.createTempFile(dir, "upload-", ".part");
            try {
                Files.write(temporary, bytes);
                Files.move(temporary, dir.resolve(key), StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(temporary);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Could not store asset " + key, e);
        }
    }

    @Override
    public Optional<Resource> load(String key) {
        Path file = dir.resolve(key).normalize();
        return file.startsWith(dir) && Files.isRegularFile(file) ? Optional.of(new FileSystemResource(file))
                : Optional.empty();
    }
}
