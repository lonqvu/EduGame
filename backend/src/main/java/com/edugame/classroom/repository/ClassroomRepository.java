package com.edugame.classroom.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.edugame.classroom.domain.Classroom;
import com.edugame.classroom.domain.ClassroomStatus;
import com.edugame.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {

    Optional<Classroom> findByCode(String code);

    List<Classroom> findByTeacherAndStatusOrderByGradeAscNameAsc(User teacher, ClassroomStatus status);

    List<Classroom> findByTeacherAndStatusInOrderByGradeAscNameAsc(User teacher, Collection<ClassroomStatus> statuses);

    long countByTeacherAndStatusNot(User teacher, ClassroomStatus status);

    /** Another class of the teacher, not archived, already has this name in this school year (case-insensitive). */
    @Query("""
            select count(c) > 0 from Classroom c
            where c.teacher = :teacher and lower(c.name) = lower(:name)
              and coalesce(c.schoolYear, '') = coalesce(:schoolYear, '')
              and c.status <> com.edugame.classroom.domain.ClassroomStatus.ARCHIVED
              and (:exceptId is null or c.id <> :exceptId)
            """)
    boolean isNameTaken(User teacher, String name, String schoolYear, Long exceptId);
}
