package com.edugame.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** The dev profile's default user (Cô Lan) stands in only for requests that carry no token at all. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class DefaultUserApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void requestWithoutTokenActsAsTheDefaultUser() throws Exception {
        mockMvc.perform(get("/api/v1/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("u-lan"));
    }

    @Test
    void badTokenIsNotReplacedByTheDefaultUser() throws Exception {
        mockMvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer not.a.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }
}
