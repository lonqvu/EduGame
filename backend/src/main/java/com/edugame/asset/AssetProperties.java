package com.edugame.asset;

import java.nio.file.Path;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings bound from {@code app.assets.*}.
 *
 * @param dir folder the uploaded files are written to (local disk storage)
 */
@ConfigurationProperties(prefix = "app.assets")
public record AssetProperties(Path dir) {
}
