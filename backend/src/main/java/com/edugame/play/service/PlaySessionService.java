package com.edugame.play.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import com.edugame.classroom.domain.Classroom;
import com.edugame.classroom.domain.ClassroomStatus;
import com.edugame.classroom.dto.SessionResponse;
import com.edugame.classroom.dto.StartSessionRequest;
import com.edugame.classroom.service.ClassroomService;
import com.edugame.common.exception.BusinessException;
import com.edugame.common.exception.ResourceNotFoundException;
import com.edugame.game.domain.Game;
import com.edugame.game.service.GameService;
import com.edugame.play.domain.GameSession;
import com.edugame.play.repository.GameSessionRepository;
import com.edugame.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Games played with a class on the projector. A session starts when the game opens for the class and ends when the
 * class reaches the results; a class's "activities" and "completion" are counted from them.
 */
@Service
@RequiredArgsConstructor
public class PlaySessionService {

    private final ClassroomService classroomService;
    private final GameService gameService;
    private final GameSessionRepository gameSessionRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public SessionResponse start(String classroomCode, StartSessionRequest request) {
        Classroom classroom = classroomService.getOwnedClassroom(classroomCode);
        if (classroom.getStatus() != ClassroomStatus.ACTIVE) {
            throw new BusinessException(HttpStatus.CONFLICT, "CLASSROOM_PAUSED",
                    "Class %s is paused; make it active to play with it".formatted(classroomCode));
        }
        Game game = gameService.getOwnedGame(request.gameCode());
        GameSession session = gameSessionRepository.save(GameSession.startInClassroom(
                game, gameService.latestVersion(game), currentUserService.getCurrentUser(), classroom, now()));
        return toResponse(session);
    }

    /** The class reached the results screen; ending twice is harmless. */
    @Transactional
    public SessionResponse end(String classroomCode, Long sessionId) {
        Classroom classroom = classroomService.getOwnedClassroom(classroomCode);
        GameSession session = gameSessionRepository.findByIdAndClassroom(sessionId, classroom)
                .orElseThrow(() -> new ResourceNotFoundException("Session", sessionId));
        session.end(now());
        return toResponse(session);
    }

    /** PostgreSQL keeps microseconds: the times answered now are the times read back later. */
    private static Instant now() {
        return Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    private static SessionResponse toResponse(GameSession session) {
        return new SessionResponse(session.getId(), session.getGame().getCode(), session.getStatus(),
                session.getStartedAt(), session.getEndedAt());
    }
}
