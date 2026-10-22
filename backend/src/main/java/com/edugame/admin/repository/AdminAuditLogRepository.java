package com.edugame.admin.repository;

import java.util.Collection;
import java.util.List;

import com.edugame.admin.domain.AdminAction;
import com.edugame.admin.domain.AdminAuditLog;
import com.edugame.admin.domain.AdminTargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {

    Page<AdminAuditLog> findByActionIn(Collection<AdminAction> actions, Pageable pageable);

    /** What was done to one teacher or one feedback, newest first. */
    List<AdminAuditLog> findTop20ByTargetTypeAndTargetCodeOrderByCreatedAtDescIdDesc(AdminTargetType targetType,
                                                                                    String targetCode);
}
