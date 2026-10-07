package com.edugame.classroom.repository;

import com.edugame.classroom.domain.ClassroomStudent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassroomStudentRepository extends JpaRepository<ClassroomStudent, Long> {
}
