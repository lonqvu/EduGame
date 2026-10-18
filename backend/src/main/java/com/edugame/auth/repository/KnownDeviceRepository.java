package com.edugame.auth.repository;

import com.edugame.auth.domain.KnownDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface KnownDeviceRepository extends JpaRepository<KnownDevice, KnownDevice.Key> {

    boolean existsByUserId(Long userId);

    boolean existsByUserIdAndDevice(Long userId, String device);

    /** Adds the device, or notes it was seen again; safe when two sign-ins race. */
    @Transactional
    @Modifying
    @Query(nativeQuery = true, value = """
            INSERT INTO user_known_device (user_id, device) VALUES (:userId, :device)
            ON CONFLICT (user_id, device) DO UPDATE SET last_seen_at = now()
            """)
    void remember(@Param("userId") Long userId, @Param("device") String device);
}
