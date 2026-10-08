package com.edugame.common.config;

import java.time.ZoneId;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Application-specific settings bound from the {@code app.*} namespace in application.yml.
 *
 * @param timeZone zone of the school, used for calendar boundaries such as "this week"
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Cors cors, Auth auth, ZoneId timeZone) {

    public record Cors(List<String> allowedOrigins) {
    }

    /**
     * @param defaultUserCode temporary until the auth module exists: {@code users.code} every request acts as;
     *                        blank means there is no current user
     */
    public record Auth(String defaultUserCode) {
    }
}
