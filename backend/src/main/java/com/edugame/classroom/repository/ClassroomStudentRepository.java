package com.edugame.classroom.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.edugame.classroom.domain.Classroom;
import com.edugame.classroom.domain.ClassroomStudent;
import com.edugame.classroom.domain.ClassroomStudentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ClassroomStudentRepository extends JpaRepository<ClassroomStudent, Long> {

    /** Roll call order; students without a number come last. */
    List<ClassroomStudent> findByClassroomAndStatusOrderByRollNumberAscDisplayNameAsc(
            Classroom classroom, ClassroomStudentStatus status);

    Optional<ClassroomStudent> findByIdAndClassroomAndStatus(
            Long id, Classroom classroom, ClassroomStudentStatus status);

    @Query("""
            select s.classroom.id as classroomId, count(s) as studentCount
            from ClassroomStudent s
            where s.classroom.id in :classroomIds and s.status = :status
            group by s.classroom.id
            """)
    List<StudentCount> countByClassroom(Collection<Long> classroomIds, ClassroomStudentStatus status);

    interface StudentCount {

        Long getClassroomId();

        long getStudentCount();
    }
}
