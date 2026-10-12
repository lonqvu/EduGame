package com.edugame.classroom.mapper;

import com.edugame.classroom.domain.ClassroomStudent;
import com.edugame.classroom.dto.StudentResponse;
import org.mapstruct.Mapper;

@Mapper
public interface ClassroomMapper {

    StudentResponse toStudentResponse(ClassroomStudent student, long weeklyStars, long totalStars);
}
