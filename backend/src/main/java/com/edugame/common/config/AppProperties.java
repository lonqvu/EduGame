package com.edugame.common.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Application-specific settings bound from the {@code app.*} namespace in application.yml.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Cors cors) {

    public record Cors(List<String> allowedOrigins) {
    }
}
