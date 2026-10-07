package com.edugame.classroom.repository;

import java.util.Optional;

import com.edugame.classroom.domain.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {

    Optional<Classroom> findByCode(String code);
}
