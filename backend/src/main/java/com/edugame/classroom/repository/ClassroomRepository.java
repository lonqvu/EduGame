package com.edugame.classroom.repository;

import java.util.List;
import java.util.Optional;

import com.edugame.classroom.domain.Classroom;
import com.edugame.classroom.domain.ClassroomStatus;
import com.edugame.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {

    Optional<Classroom> findByCode(String code);

    List<Classroom> findByTeacherAndStatusOrderByGradeAscNameAsc(User teacher, ClassroomStatus status);
}
