package com.edugame.user.mapper;

import com.edugame.user.domain.User;
import com.edugame.user.dto.UserResponse;
import org.mapstruct.Mapper;

@Mapper
public interface UserMapper {

    UserResponse toResponse(User user);
}
