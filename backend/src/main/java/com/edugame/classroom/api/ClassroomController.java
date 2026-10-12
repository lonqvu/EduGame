package com.edugame.classroom.api;

import java.util.List;

import com.edugame.classroom.domain.ClassroomStatus;
import com.edugame.classroom.dto.AddStudentsRequest;
import com.edugame.classroom.dto.AwardStarsRequest;
import com.edugame.classroom.dto.ClassroomResponse;
import com.edugame.classroom.dto.CreateClassroomRequest;
import com.edugame.classroom.dto.ReorderStudentsRequest;
import com.edugame.classroom.dto.SessionResponse;
import com.edugame.classroom.dto.StartSessionRequest;
import com.edugame.classroom.dto.StudentResponse;
import com.edugame.classroom.dto.UpdateClassroomRequest;
import com.edugame.classroom.dto.UpdateStudentRequest;
import com.edugame.classroom.service.ClassroomService;
import com.edugame.play.service.PlaySessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Classrooms", description = "The teacher's classes, class lists, stars and games played with a class")
@RestController
@RequestMapping("/api/v1/classrooms")
@RequiredArgsConstructor
public class ClassroomController {

    private final ClassroomService classroomService;
    private final PlaySessionService playSessionService;

    // --- Classes ------------------------------------------------------------------------------------------------

    @Operation(summary = "My classes (active and paused, or one status), by grade then name, with their counts")
    @GetMapping
    public List<ClassroomResponse> list(@RequestParam(required = false) ClassroomStatus status) {
        return classroomService.listMyClassrooms(status);
    }

    @Operation(summary = "Create a class")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClassroomResponse create(@Valid @RequestBody CreateClassroomRequest request) {
        return classroomService.create(request);
    }

    @Operation(summary = "A class with its counts")
    @GetMapping("/{code}")
    public ClassroomResponse get(@PathVariable String code) {
        return classroomService.get(code);
    }

    @Operation(summary = "Rename / change details, pause or reactivate (null fields are left unchanged)")
    @PatchMapping("/{code}")
    public ClassroomResponse update(@PathVariable String code, @Valid @RequestBody UpdateClassroomRequest request) {
        return classroomService.update(code, request);
    }

    @Operation(summary = "Archive a class (soft delete; stars and history stay)")
    @DeleteMapping("/{code}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable String code) {
        classroomService.archive(code);
    }

    // --- Students -----------------------------------------------------------------------------------------------

    @Operation(summary = "Class list in roll call order, with weekly and total stars")
    @GetMapping("/{code}/students")
    public List<StudentResponse> listStudents(@PathVariable String code) {
        return classroomService.listStudents(code);
    }

    @Operation(summary = "Add students at the end of the class list (one, or a pasted list)")
    @PostMapping("/{code}/students")
    @ResponseStatus(HttpStatus.CREATED)
    public List<StudentResponse> addStudents(@PathVariable String code, @Valid @RequestBody AddStudentsRequest request) {
        return classroomService.addStudents(code, request);
    }

    @Operation(summary = "Rename a student or change their avatar")
    @PatchMapping("/{code}/students/{studentId}")
    public StudentResponse updateStudent(@PathVariable String code, @PathVariable Long studentId,
                                         @Valid @RequestBody UpdateStudentRequest request) {
        return classroomService.updateStudent(code, studentId, request);
    }

    @Operation(summary = "Remove a student from the class list (their stars stay in the history)")
    @DeleteMapping("/{code}/students/{studentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeStudent(@PathVariable String code, @PathVariable Long studentId) {
        classroomService.removeStudent(code, studentId);
    }

    @Operation(summary = "New roll call order: every student id once; roll numbers become 1..n")
    @PutMapping("/{code}/students/order")
    public List<StudentResponse> reorderStudents(@PathVariable String code,
                                                 @Valid @RequestBody ReorderStudentsRequest request) {
        return classroomService.reorderStudents(code, request);
    }

    @Operation(summary = "Give (or take away) stars; returns the student with updated totals")
    @PostMapping("/{code}/students/{studentId}/points")
    @ResponseStatus(HttpStatus.CREATED)
    public StudentResponse awardStars(@PathVariable String code, @PathVariable Long studentId,
                                      @Valid @RequestBody AwardStarsRequest request) {
        return classroomService.awardStars(code, studentId, request);
    }

    // --- Games played with the class ----------------------------------------------------------------------------

    @Operation(summary = "A game starts on the projector for this class (counts as an activity)")
    @PostMapping("/{code}/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse startSession(@PathVariable String code, @Valid @RequestBody StartSessionRequest request) {
        return playSessionService.start(code, request);
    }

    @Operation(summary = "The class reached the results screen (counts as completed)")
    @PostMapping("/{code}/sessions/{sessionId}/end")
    public SessionResponse endSession(@PathVariable String code, @PathVariable Long sessionId) {
        return playSessionService.end(code, sessionId);
    }
}
