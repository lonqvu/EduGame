package com.edugame.reward.service;

import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;

import com.edugame.classroom.domain.ClassroomStudent;
import com.edugame.reward.domain.StudentPoint;
import com.edugame.reward.repository.StudentPointRepository;
import com.edugame.reward.repository.StudentPointRepository.StarSum;
import com.edugame.user.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Stars students collect across lessons. Callers check that the teacher may touch the student. */
@Service
@RequiredArgsConstructor
public class StudentPointService {

    private final StudentPointRepository studentPointRepository;

    /** Star totals by student id; students without any star are missing from the map. */
    @Transactional(readOnly = true)
    public Map<Long, StarTotals> sumStars(Collection<Long> studentIds, Instant weekStart) {
        if (studentIds.isEmpty()) {
            return Map.of();
        }
        return studentPointRepository.sumByStudent(studentIds, weekStart).stream()
                .collect(Collectors.toMap(StarSum::getStudentId,
                        sum -> new StarTotals(sum.getWeeklyStars(), sum.getTotalStars())));
    }

    /** @param points never 0; negative takes stars away */
    @Transactional
    public void award(ClassroomStudent student, int points, String reason, User teacher) {
        studentPointRepository.save(StudentPoint.of(student, points, reason, teacher));
    }

    public record StarTotals(long weekly, long total) {

        public static final StarTotals NONE = new StarTotals(0, 0);
    }
}
