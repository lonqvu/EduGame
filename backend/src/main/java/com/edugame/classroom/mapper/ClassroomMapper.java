package com.edugame.classroom.mapper;

import com.edugame.classroom.domain.Classroom;
import com.edugame.classroom.domain.ClassroomStudent;
import com.edugame.classroom.dto.ClassroomResponse;
import com.edugame.classroom.dto.StudentResponse;
import org.mapstruct.Mapper;

@Mapper
public interface ClassroomMapper {

    ClassroomResponse toResponse(Classroom classroom, long studentCount);

    StudentResponse toStudentResponse(ClassroomStudent student, long weeklyStars, long totalStars);
}
