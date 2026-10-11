package com.edugame.auth.repository;

import java.time.Instant;
import java.util.Optional;

import com.edugame.auth.domain.EmailVerification;
import com.edugame.auth.domain.VerificationPurpose;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findFirstByEmailAndPurposeOrderByCreatedAtDescIdDesc(String email,
                                                                                    VerificationPurpose purpose);

    /** The newest code, locked: concurrent guesses are counted one after the other. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EmailVerification> findFirstForUpdateByEmailAndPurposeOrderByCreatedAtDescIdDesc(
            String email, VerificationPurpose purpose);

    long countByEmailAndPurposeAndCreatedAtAfter(String email, VerificationPurpose purpose, Instant since);

    @Modifying
    @Query("delete from EmailVerification v where v.expiresAt < :before")
    int deleteExpiredBefore(@Param("before") Instant before);
}
