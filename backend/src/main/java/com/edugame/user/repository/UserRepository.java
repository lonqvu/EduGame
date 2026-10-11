package com.edugame.user.repository;

import java.util.Optional;

import com.edugame.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByCode(String code);

    Optional<User> findByUsername(String username);

    boolean existsByCode(String code);

    boolean existsByUsername(String username);

    /** Uses the unique index on {@code lower(email)}. */
    @Query("select u from User u where lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoreCase(@Param("email") String email);
}
