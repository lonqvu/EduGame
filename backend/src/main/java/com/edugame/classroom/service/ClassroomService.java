package com.edugame.classroom.service;

import java.security.SecureRandom;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.edugame.classroom.domain.Classroom;
import com.edugame.classroom.domain.ClassroomStatus;
import com.edugame.classroom.domain.ClassroomStudent;
import com.edugame.classroom.domain.ClassroomStudentStatus;
import com.edugame.classroom.dto.AddStudentsRequest;
import com.edugame.classroom.dto.AwardStarsRequest;
import com.edugame.classroom.dto.ClassroomResponse;
import com.edugame.classroom.dto.ClassroomRules;
import com.edugame.classroom.dto.CreateClassroomRequest;
import com.edugame.classroom.dto.NewStudent;
import com.edugame.classroom.dto.ReorderStudentsRequest;
import com.edugame.classroom.dto.StudentResponse;
import com.edugame.classroom.dto.UpdateClassroomRequest;
import com.edugame.classroom.dto.UpdateStudentRequest;
import com.edugame.classroom.mapper.ClassroomMapper;
import com.edugame.classroom.repository.ClassroomRepository;
import com.edugame.classroom.repository.ClassroomStudentRepository;
import com.edugame.classroom.repository.ClassroomStudentRepository.StudentCount;
import com.edugame.common.config.AppProperties;
import com.edugame.common.exception.BusinessException;
import com.edugame.common.exception.ResourceNotFoundException;
import com.edugame.play.repository.GameSessionRepository;
import com.edugame.play.repository.GameSessionRepository.SessionCount;
import com.edugame.reward.service.StudentPointService;
import com.edugame.reward.service.StudentPointService.StarTotals;
import com.edugame.user.domain.User;
import com.edugame.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A teacher's classes and class lists.
 * <p>
 * Classes are ACTIVE (played with), PAUSED (kept, not played with) or ARCHIVED (deleted for the teacher; the rows stay
 * for the stars and sessions that point at them). Archived classes answer 404 like classes of other teachers.
 */
@Service
@RequiredArgsConstructor
public class ClassroomService {

    private static final String CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int CODE_LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final EnumSet<ClassroomStatus> SHOWN = EnumSet.of(ClassroomStatus.ACTIVE, ClassroomStatus.PAUSED);

    private final ClassroomRepository classroomRepository;
    private final ClassroomStudentRepository classroomStudentRepository;
    private final GameSessionRepository gameSessionRepository;
    private final StudentPointService studentPointService;
    private final CurrentUserService currentUserService;
    private final ClassroomMapper classroomMapper;
    private final AppProperties appProperties;

    // --- Classes ------------------------------------------------------------------------------------------------

    /** The teacher's classes (ACTIVE and PAUSED, or only {@code status}), by grade then name. */
    @Transactional(readOnly = true)
    public List<ClassroomResponse> listMyClassrooms(ClassroomStatus status) {
        if (status == ClassroomStatus.ARCHIVED) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Archived classes are not listed");
        }
        List<Classroom> classrooms = classroomRepository.findByTeacherAndStatusInOrderByGradeAscNameAsc(
                currentUserService.getCurrentUser(), status == null ? SHOWN : EnumSet.of(status));
        return toResponses(classrooms);
    }

    @Transactional(readOnly = true)
    public ClassroomResponse get(String code) {
        return toResponses(List.of(getOwnedClassroom(code))).getFirst();
    }

    @Transactional
    public ClassroomResponse create(CreateClassroomRequest request) {
        User teacher = currentUserService.getCurrentUser();
        if (classroomRepository.countByTeacherAndStatusNot(teacher, ClassroomStatus.ARCHIVED) >= ClassroomRules.MAX_CLASSROOMS) {
            throw new BusinessException(HttpStatus.CONFLICT, "TOO_MANY_CLASSROOMS",
                    "A teacher has at most %d classes".formatted(ClassroomRules.MAX_CLASSROOMS));
        }
        String name = request.name().strip();
        String schoolYear = checkSchoolYear(blankToNull(request.schoolYear()));
        requireNameFree(teacher, name, schoolYear, null);

        Classroom classroom = Classroom.create(newCode(), teacher, name, request.grade());
        classroom.setSchoolYear(schoolYear);
        classroom.setSchoolName(blankToNull(request.schoolName()));
        classroom.setAvatar(request.avatar());
        return toResponses(List.of(classroomRepository.save(classroom))).getFirst();
    }

    @Transactional
    public ClassroomResponse update(String code, UpdateClassroomRequest request) {
        Classroom classroom = getOwnedClassroom(code);
        String name = request.name() != null ? request.name().strip() : classroom.getName();
        String schoolYear = request.schoolYear() != null ? checkSchoolYear(blankToNull(request.schoolYear())) : classroom.getSchoolYear();
        if (!name.equalsIgnoreCase(classroom.getName()) || !Objects.equals(schoolYear, classroom.getSchoolYear())) {
            requireNameFree(classroom.getTeacher(), name, schoolYear, classroom.getId());
        }
        classroom.setName(name);
        classroom.setSchoolYear(schoolYear);
        if (request.grade() != null) {
            classroom.setGrade(request.grade());
        }
        if (request.schoolName() != null) {
            classroom.setSchoolName(blankToNull(request.schoolName()));
        }
        if (request.avatar() != null) {
            classroom.setAvatar(request.avatar());
        }
        if (request.status() != null) {
            classroom.setStatus(ClassroomStatus.valueOf(request.status()));
        }
        classroom.touch();
        return toResponses(List.of(classroom)).getFirst();
    }

    /** Soft delete: the class leaves the teacher's lists; its stars and sessions stay. */
    @Transactional
    public void archive(String code) {
        getOwnedClassroom(code).setStatus(ClassroomStatus.ARCHIVED);
    }

    /** A class of the current teacher that is not archived; 404 otherwise (other teachers' classes stay hidden). */
    @Transactional(readOnly = true)
    public Classroom getOwnedClassroom(String code) {
        User teacher = currentUserService.getCurrentUser();
        return classroomRepository.findByCode(code)
                .filter(classroom -> classroom.isOwnedBy(teacher) && classroom.getStatus() != ClassroomStatus.ARCHIVED)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", code));
    }

    // --- Students -----------------------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<StudentResponse> listStudents(String classroomCode) {
        return toStudentResponses(activeStudents(getOwnedClassroom(classroomCode)));
    }

    /** Adds students at the end of the roll call, numbered after the last one. */
    @Transactional
    public List<StudentResponse> addStudents(String classroomCode, AddStudentsRequest request) {
        Classroom classroom = getOwnedClassroom(classroomCode);
        long count = classroomStudentRepository.countByClassroomAndStatus(classroom, ClassroomStudentStatus.ACTIVE);
        if (count + request.students().size() > ClassroomRules.MAX_STUDENTS) {
            throw new BusinessException(HttpStatus.CONFLICT, "TOO_MANY_STUDENTS",
                    "A class has at most %d students".formatted(ClassroomRules.MAX_STUDENTS));
        }
        int roll = classroomStudentRepository.maxRollNumber(classroom);
        List<ClassroomStudent> added = new ArrayList<>();
        for (NewStudent student : request.students()) {
            added.add(classroomStudentRepository.save(ClassroomStudent.create(
                    classroom, student.displayName().strip(), student.avatar(), (short) ++roll)));
        }
        classroom.touch();
        return toStudentResponses(added);
    }

    @Transactional
    public StudentResponse updateStudent(String classroomCode, Long studentId, UpdateStudentRequest request) {
        ClassroomStudent student = getStudent(getOwnedClassroom(classroomCode), studentId);
        if (request.displayName() != null) {
            student.setDisplayName(request.displayName().strip());
        }
        if (request.avatar() != null) {
            student.setAvatar(request.avatar());
        }
        return toStudentResponses(List.of(student)).getFirst();
    }

    /** The student leaves the class list; their stars stay in the history, their roll number is free again. */
    @Transactional
    public void removeStudent(String classroomCode, Long studentId) {
        Classroom classroom = getOwnedClassroom(classroomCode);
        getStudent(classroom, studentId).setStatus(ClassroomStudentStatus.INACTIVE);
        classroom.touch();
    }

    /** New roll call order: the listed students get roll numbers 1..n. */
    @Transactional
    public List<StudentResponse> reorderStudents(String classroomCode, ReorderStudentsRequest request) {
        Classroom classroom = getOwnedClassroom(classroomCode);
        List<ClassroomStudent> students = activeStudents(classroom);
        Map<Long, ClassroomStudent> byId = students.stream().collect(Collectors.toMap(ClassroomStudent::getId, Function.identity()));
        if (request.studentIds().size() != students.size() || !new HashSet<>(request.studentIds()).equals(byId.keySet())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_STUDENT_ORDER",
                    "studentIds must list every student of the class exactly once");
        }
        // Roll numbers are unique in the class: clear them all before numbering again.
        students.forEach(s -> s.setRollNumber(null));
        classroomStudentRepository.flush();
        List<ClassroomStudent> ordered = request.studentIds().stream().map(byId::get).toList();
        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).setRollNumber((short) (i + 1));
        }
        classroomStudentRepository.flush();
        return toStudentResponses(ordered);
    }

    @Transactional
    public StudentResponse awardStars(String classroomCode, Long studentId, AwardStarsRequest request) {
        if (request.points() == 0) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_POINTS", "points must not be 0");
        }
        User teacher = currentUserService.getCurrentUser();
        ClassroomStudent student = getStudent(getOwnedClassroom(classroomCode), studentId);
        String reason = request.reason() == null || request.reason().isBlank() ? null : request.reason().strip();
        studentPointService.award(student, request.points(), reason, teacher);
        return toStudentResponses(List.of(student)).getFirst();
    }

    // --- Helpers ------------------------------------------------------------------------------------------------

    private List<ClassroomStudent> activeStudents(Classroom classroom) {
        return classroomStudentRepository.findByClassroomAndStatusOrderByRollNumberAscDisplayNameAsc(
                classroom, ClassroomStudentStatus.ACTIVE);
    }

    private ClassroomStudent getStudent(Classroom classroom, Long studentId) {
        return classroomStudentRepository.findByIdAndClassroomAndStatus(studentId, classroom, ClassroomStudentStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Student", studentId));
    }

    private List<ClassroomResponse> toResponses(List<Classroom> classrooms) {
        if (classrooms.isEmpty()) {
            return List.of();
        }
        List<Long> ids = classrooms.stream().map(Classroom::getId).toList();
        Map<Long, Long> students = classroomStudentRepository.countByClassroom(ids, ClassroomStudentStatus.ACTIVE).stream()
                .collect(Collectors.toMap(StudentCount::getClassroomId, StudentCount::getStudentCount));
        Map<Long, SessionCount> sessions = gameSessionRepository.countByClassroom(ids).stream()
                .collect(Collectors.toMap(SessionCount::getClassroomId, Function.identity()));
        Map<Long, Long> stars = studentPointService.sumClassStars(ids, startOfWeek());
        return classrooms.stream().map(c -> {
            SessionCount played = sessions.get(c.getId());
            long playedCount = played == null ? 0 : played.getPlayedCount();
            long endedCount = played == null ? 0 : played.getEndedCount();
            int rate = playedCount == 0 ? 0 : (int) Math.round(endedCount * 100.0 / playedCount);
            return new ClassroomResponse(c.getCode(), c.getName(), c.getGrade(), c.getSchoolYear(), c.getSchoolName(),
                    c.getAvatar(), c.getStatus(), students.getOrDefault(c.getId(), 0L), playedCount, endedCount, rate,
                    played == null ? null : played.getLastPlayedAt(), stars.getOrDefault(c.getId(), 0L), c.getCreatedAt());
        }).toList();
    }

    private List<StudentResponse> toStudentResponses(List<ClassroomStudent> students) {
        Map<Long, StarTotals> stars = studentPointService.sumStars(students.stream().map(ClassroomStudent::getId).toList(), startOfWeek());
        return students.stream()
                .map(s -> {
                    StarTotals totals = stars.getOrDefault(s.getId(), StarTotals.NONE);
                    return classroomMapper.toStudentResponse(s, totals.weekly(), totals.total());
                })
                .toList();
    }

    private void requireNameFree(User teacher, String name, String schoolYear, Long exceptId) {
        if (classroomRepository.isNameTaken(teacher, name, schoolYear, exceptId)) {
            throw new BusinessException(HttpStatus.CONFLICT, "CLASSROOM_NAME_TAKEN",
                    "You already have a class named %s%s".formatted(name, schoolYear == null ? "" : " in " + schoolYear));
        }
    }

    /** "2026-2027": the second year must follow the first. */
    private static String checkSchoolYear(String schoolYear) {
        if (schoolYear == null) {
            return null;
        }
        int first = Integer.parseInt(schoolYear.substring(0, 4));
        int second = Integer.parseInt(schoolYear.substring(5));
        if (second != first + 1) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_SCHOOL_YEAR",
                    "The school year must be two following years, e.g. 2026-2027");
        }
        return schoolYear;
    }

    /** Monday 00:00 of the current week, in the school's time zone. */
    private Instant startOfWeek() {
        return LocalDate.now(appProperties.timeZone())
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .atStartOfDay(appProperties.timeZone())
                .toInstant();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static String newCode() {
        StringBuilder code = new StringBuilder("c-");
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return code.toString();
    }
}
