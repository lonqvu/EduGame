package com.edugame.game.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

/** The PATCH semantics of {@link UpdateGameItemRequest} rely on Jackson telling "omitted" from "null". */
class UpdateGameItemRequestJsonTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void omittedSolutionIsJavaNull() throws Exception {
        UpdateGameItemRequest request = objectMapper.readValue("{\"content\": {\"text\": \"x\"}}",
                UpdateGameItemRequest.class);

        assertThat(request.solution()).isNull();
    }

    @Test
    void explicitNullSolutionIsJsonNullNode() throws Exception {
        UpdateGameItemRequest request = objectMapper.readValue("{\"solution\": null}", UpdateGameItemRequest.class);

        assertThat(request.solution()).isNotNull();
        assertThat(request.solution().isNull()).isTrue();
    }
}
