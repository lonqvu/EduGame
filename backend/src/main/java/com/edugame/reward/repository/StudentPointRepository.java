package com.edugame.reward.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import com.edugame.reward.domain.StudentPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StudentPointRepository extends JpaRepository<StudentPoint, Long> {

    /** Stars per student: all time, and since {@code since} (start of the week). Students without stars are absent. */
    @Query("""
            select p.classroomStudent.id as studentId,
                   sum(p.points) as totalStars,
                   sum(case when p.createdAt >= :since then p.points else 0 end) as weeklyStars
            from StudentPoint p
            where p.classroomStudent.id in :studentIds
            group by p.classroomStudent.id
            """)
    List<StarSum> sumByStudent(Collection<Long> studentIds, Instant since);

    interface StarSum {

        Long getStudentId();

        long getTotalStars();

        long getWeeklyStars();
    }
}
