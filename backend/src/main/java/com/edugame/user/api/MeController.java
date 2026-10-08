package com.edugame.user.api;

import com.edugame.user.dto.UserResponse;
import com.edugame.user.service.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Me", description = "The signed-in user")
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class MeController {

    private final CurrentUserService currentUserService;

    @Operation(summary = "Current user (greeting on the home page)")
    @GetMapping
    public UserResponse getMe() {
        return currentUserService.getMe();
    }
}
