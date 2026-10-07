package com.edugame.reward.repository;

import com.edugame.reward.domain.StudentPoint;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentPointRepository extends JpaRepository<StudentPoint, Long> {
}
