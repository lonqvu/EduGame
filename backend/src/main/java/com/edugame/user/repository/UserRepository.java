package com.edugame.user.repository;

import java.util.Optional;

import com.edugame.user.domain.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByCode(String code);

    Optional<User> findByUsername(String username);

    boolean existsByCode(String code);

    boolean existsByUsername(String username);

    /** The user's row, locked until the transaction ends: one request of that user at a time where it matters. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> lockById(@Param("id") Long id);

    /** Uses the unique index on {@code lower(email)}. */
    @Query("select u from User u where lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoreCase(@Param("email") String email);
}
