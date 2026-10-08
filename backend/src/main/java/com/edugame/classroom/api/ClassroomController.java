package com.edugame.classroom.api;

import java.util.List;

import com.edugame.classroom.dto.AwardStarsRequest;
import com.edugame.classroom.dto.ClassroomResponse;
import com.edugame.classroom.dto.StudentResponse;
import com.edugame.classroom.service.ClassroomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Classrooms", description = "The teacher's classes, class lists and stars")
@RestController
@RequestMapping("/api/v1/classrooms")
@RequiredArgsConstructor
public class ClassroomController {

    private final ClassroomService classroomService;

    @Operation(summary = "My active classes")
    @GetMapping
    public List<ClassroomResponse> list() {
        return classroomService.listMyClassrooms();
    }

    @Operation(summary = "Class list in roll call order, with weekly and total stars")
    @GetMapping("/{code}/students")
    public List<StudentResponse> listStudents(@PathVariable String code) {
        return classroomService.listStudents(code);
    }

    @Operation(summary = "Give (or take away) stars; returns the student with updated totals")
    @PostMapping("/{code}/students/{studentId}/points")
    @ResponseStatus(HttpStatus.CREATED)
    public StudentResponse awardStars(@PathVariable String code, @PathVariable Long studentId,
                                      @Valid @RequestBody AwardStarsRequest request) {
        return classroomService.awardStars(code, studentId, request);
    }
}
