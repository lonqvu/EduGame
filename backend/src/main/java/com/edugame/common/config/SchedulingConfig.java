package com.edugame.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Background work: {@code @Scheduled} jobs (e.g. deleting ended sign-in sessions) and {@code @Async} tasks (e.g.
 * sending mail after the request has answered), on Spring Boot's default task executor and scheduler.
 */
@Configuration
@EnableScheduling
@EnableAsync
public class SchedulingConfig {
}
