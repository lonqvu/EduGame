package com.edugame.user.repository;

import java.util.Optional;

import com.edugame.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByCode(String code);

    Optional<User> findByUsername(String username);
}
