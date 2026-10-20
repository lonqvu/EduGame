package com.edugame.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH = "bearerAuth";

    /** Swagger UI's "Authorize" button takes the {@code accessToken} from {@code POST /api/v1/auth/login}. */
    @Bean
    public OpenAPI eduGameOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Lớp vui API")
                        .description("REST API for creating and playing educational games for primary school students")
                        .version("v1"))
                .components(new Components().addSecuritySchemes(BEARER_AUTH, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH));
    }
}
