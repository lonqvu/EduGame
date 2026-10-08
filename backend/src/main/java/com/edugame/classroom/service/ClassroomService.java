package com.edugame.classroom.service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.edugame.classroom.domain.Classroom;
import com.edugame.classroom.domain.ClassroomStatus;
import com.edugame.classroom.domain.ClassroomStudent;
import com.edugame.classroom.domain.ClassroomStudentStatus;
import com.edugame.classroom.dto.AwardStarsRequest;
import com.edugame.classroom.dto.ClassroomResponse;
import com.edugame.classroom.dto.StudentResponse;
import com.edugame.classroom.mapper.ClassroomMapper;
import com.edugame.classroom.repository.ClassroomRepository;
import com.edugame.classroom.repository.ClassroomStudentRepository;
import com.edugame.classroom.repository.ClassroomStudentRepository.StudentCount;
import com.edugame.common.config.AppProperties;
import com.edugame.common.exception.BusinessException;
import com.edugame.common.exception.ResourceNotFoundException;
import com.edugame.reward.service.StudentPointService;
import com.edugame.reward.service.StudentPointService.StarTotals;
import com.edugame.user.domain.User;
import com.edugame.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClassroomService {

    private final ClassroomRepository classroomRepository;
    private final ClassroomStudentRepository classroomStudentRepository;
    private final StudentPointService studentPointService;
    private final CurrentUserService currentUserService;
    private final ClassroomMapper classroomMapper;
    private final AppProperties appProperties;

    @Transactional(readOnly = true)
    public List<ClassroomResponse> listMyClassrooms() {
        List<Classroom> classrooms = classroomRepository.findByTeacherAndStatusOrderByGradeAscNameAsc(
                currentUserService.getCurrentUser(), ClassroomStatus.ACTIVE);
        if (classrooms.isEmpty()) {
            return List.of();
        }
        Map<Long, Long> counts = classroomStudentRepository
                .countByClassroom(classrooms.stream().map(Classroom::getId).toList(), ClassroomStudentStatus.ACTIVE)
                .stream()
                .collect(Collectors.toMap(StudentCount::getClassroomId, StudentCount::getStudentCount));
        return classrooms.stream()
                .map(classroom -> classroomMapper.toResponse(classroom, counts.getOrDefault(classroom.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> listStudents(String classroomCode) {
        List<ClassroomStudent> students = classroomStudentRepository
                .findByClassroomAndStatusOrderByRollNumberAscDisplayNameAsc(
                        getOwnedClassroom(classroomCode), ClassroomStudentStatus.ACTIVE);
        Map<Long, StarTotals> stars = studentPointService.sumStars(
                students.stream().map(ClassroomStudent::getId).toList(), startOfWeek());
        return students.stream()
                .map(student -> toStudentResponse(student, stars.getOrDefault(student.getId(), StarTotals.NONE)))
                .toList();
    }

    @Transactional
    public StudentResponse awardStars(String classroomCode, Long studentId, AwardStarsRequest request) {
        if (request.points() == 0) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_POINTS", "points must not be 0");
        }
        User teacher = currentUserService.getCurrentUser();
        Classroom classroom = getOwnedClassroom(classroomCode);
        ClassroomStudent student = classroomStudentRepository
                .findByIdAndClassroomAndStatus(studentId, classroom, ClassroomStudentStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Student", studentId));

        String reason = request.reason() == null || request.reason().isBlank() ? null : request.reason().strip();
        studentPointService.award(student, request.points(), reason, teacher);

        StarTotals stars = studentPointService.sumStars(List.of(student.getId()), startOfWeek())
                .getOrDefault(student.getId(), StarTotals.NONE);
        return toStudentResponse(student, stars);
    }

    /** An active class of the current teacher; 404 otherwise. */
    private Classroom getOwnedClassroom(String code) {
        User teacher = currentUserService.getCurrentUser();
        return classroomRepository.findByCode(code)
                .filter(classroom -> classroom.getTeacher().getId().equals(teacher.getId())
                        && classroom.getStatus() == ClassroomStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", code));
    }

    /** Monday 00:00 of the current week, in the school's time zone. */
    private Instant startOfWeek() {
        return LocalDate.now(appProperties.timeZone())
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .atStartOfDay(appProperties.timeZone())
                .toInstant();
    }

    private StudentResponse toStudentResponse(ClassroomStudent student, StarTotals stars) {
        return classroomMapper.toStudentResponse(student, stars.weekly(), stars.total());
    }
}
