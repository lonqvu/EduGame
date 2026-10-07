package com.edugame.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.edugame.catalog.repository.GameCategoryRepository;
import com.edugame.catalog.repository.GameTemplateRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

/**
 * Checks that JSONB columns map to {@link JsonNode}. Runs against the PostgreSQL from docker-compose
 * (JSONB has no embedded equivalent); each test is rolled back.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class GameTemplateJsonbTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private GameTemplateRepository gameTemplateRepository;

    @Autowired
    private GameCategoryRepository gameCategoryRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void savesAndReloadsJsonbColumns() throws Exception {
        JsonNode configSchema = objectMapper.readTree("""
                {"itemTypes": ["SINGLE_CHOICE"], "settings": {"type": "object"}}
                """);
        JsonNode defaultConfig = objectMapper.readTree("""
                {"timeLimitSec": 20, "rules": {"participants": {"mode": "SOLO"}, "win": {"type": "HIGHEST_SCORE"}}}
                """);

        GameTemplate template = new GameTemplate();
        template.setCode("TEST_JSONB");
        template.setCategory(gameCategoryRepository.findAll().getFirst());
        template.setEngine("RULES");
        template.setName("Test JSONB");
        template.setConfigSchema(configSchema);
        template.setDefaultConfig(defaultConfig);
        Long id = gameTemplateRepository.saveAndFlush(template).getId();
        entityManager.clear();

        GameTemplate reloaded = gameTemplateRepository.findById(id).orElseThrow();

        assertThat(reloaded.getConfigSchema()).isEqualTo(configSchema);
        assertThat(reloaded.getDefaultConfig()).isEqualTo(defaultConfig);
        assertThat(reloaded.getDefaultConfig().at("/rules/participants/mode").asText()).isEqualTo("SOLO");
        assertThat(reloaded.getStatus()).isEqualTo(GameTemplateStatus.BETA);
        assertThat(reloaded.getSchemaVersion()).isEqualTo(1);
        assertThat(reloaded.getCreatedAt()).isNotNull();
        assertThat(reloaded.getUpdatedAt()).isNotNull();
    }

    @Test
    void readsSeededTemplate() {
        GameTemplate quiz = gameTemplateRepository.findByCode("QUIZ").orElseThrow();

        assertThat(quiz.getStatus()).isEqualTo(GameTemplateStatus.ACTIVE);
        assertThat(quiz.getCategory().getCode()).isEqualTo("QUESTION");
        assertThat(quiz.getConfigSchema().get("itemTypes").get(0).asText()).isEqualTo("SINGLE_CHOICE");
        assertThat(quiz.getDefaultConfig().at("/rules/turn/type").asText()).isEqualTo("BUZZER");
    }
}
