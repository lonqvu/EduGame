package com.edugame.auth.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import com.edugame.auth.domain.SessionRevokeReason;
import com.edugame.auth.domain.UserSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    /** Locks the row: two refreshes of the same session run one after the other. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from UserSession s where s.sid = :sid")
    Optional<UserSession> findBySidForUpdate(@Param("sid") UUID sid);

    Optional<UserSession> findBySid(UUID sid);

    @Query("""
            select count(s) > 0 from UserSession s
            where s.sid = :sid and s.revokedAt is null and s.expiresAt > :now
            """)
    boolean isActive(@Param("sid") UUID sid, @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update UserSession s set s.revokedAt = :now, s.revokeReason = :reason
            where s.userId = :userId and s.revokedAt is null
            """)
    int revokeAllOfUser(@Param("userId") Long userId,
                        @Param("reason") SessionRevokeReason reason,
                        @Param("now") Instant now);

    @Modifying
    @Query("delete from UserSession s where s.expiresAt < :before or s.revokedAt < :before")
    int deleteEndedBefore(@Param("before") Instant before);
}
