package com.edugame.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI eduGameOpenApi() {
        return new OpenAPI().info(new Info()
                .title("EduGame Platform API")
                .description("REST API for creating and playing educational games for primary school students")
                .version("v1"));
    }
}
