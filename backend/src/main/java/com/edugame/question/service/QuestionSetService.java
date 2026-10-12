package com.edugame.question.service;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.edugame.common.exception.BusinessException;
import com.edugame.common.exception.ResourceNotFoundException;
import com.edugame.question.domain.Question;
import com.edugame.question.domain.QuestionSet;
import com.edugame.question.domain.QuestionSetStatus;
import com.edugame.question.domain.Subject;
import com.edugame.question.dto.CreateQuestionSetRequest;
import com.edugame.question.dto.QuestionSetResponse;
import com.edugame.question.dto.QuestionSetRules;
import com.edugame.question.dto.QuestionSetSummaryResponse;
import com.edugame.question.dto.UpdateQuestionSetRequest;
import com.edugame.question.repository.QuestionRepository;
import com.edugame.question.repository.QuestionRepository.QuestionCount;
import com.edugame.question.repository.QuestionSetRepository;
import com.edugame.question.repository.QuestionSetUseRepository;
import com.edugame.question.repository.QuestionSetUseRepository.UseCount;
import com.edugame.user.domain.User;
import com.edugame.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A teacher's question sets. Archived sets answer 404 like other teachers' sets; the games made from them keep
 * their own copy of the questions.
 */
@Service
@RequiredArgsConstructor
public class QuestionSetService {

    private static final String CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int CODE_LENGTH = 10;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String COPY_SUFFIX = " (bản sao)";

    private final QuestionSetRepository questionSetRepository;
    private final QuestionRepository questionRepository;
    private final QuestionSetUseRepository questionSetUseRepository;
    private final CurrentUserService currentUserService;
    private final QuestionSetMapper mapper;

    /** The teacher's sets, last changed first, with their numbers. */
    @Transactional(readOnly = true)
    public List<QuestionSetSummaryResponse> listMySets() {
        return toSummaries(questionSetRepository.findByOwnerAndStatusOrderByUpdatedAtDesc(
                currentUserService.getCurrentUser(), QuestionSetStatus.ACTIVE));
    }

    @Transactional(readOnly = true)
    public QuestionSetResponse get(String code) {
        return toResponse(getOwnedSet(code));
    }

    @Transactional
    public QuestionSetResponse create(CreateQuestionSetRequest request) {
        User owner = currentUserService.getCurrentUser();
        requireRoomForASet(owner);
        QuestionSet set = QuestionSet.create(newCode(), owner, request.title().strip(), Subject.valueOf(request.subject()),
                request.grade());
        set.setDescription(blankToNull(request.description()));
        return toResponse(questionSetRepository.save(set));
    }

    @Transactional
    public QuestionSetResponse update(String code, UpdateQuestionSetRequest request) {
        QuestionSet set = getOwnedSet(code);
        if (request.title() != null) {
            set.setTitle(request.title().strip());
        }
        if (request.description() != null) {
            set.setDescription(blankToNull(request.description()));
        }
        if (request.subject() != null) {
            set.setSubject(Subject.valueOf(request.subject()));
        }
        if (request.grade() != null) {
            set.setGrade(request.grade() == 0 ? null : request.grade());
        }
        set.touch();
        return toResponse(set);
    }

    /** Soft delete: the set leaves the bank; the games made from it keep their questions. */
    @Transactional
    public void archive(String code) {
        getOwnedSet(code).setStatus(QuestionSetStatus.ARCHIVED);
    }

    /** A new set "… (bản sao)" with the same details and questions; it has not been used yet. */
    @Transactional
    public QuestionSetResponse copy(String code) {
        QuestionSet source = getOwnedSet(code);
        User owner = source.getOwner();
        requireRoomForASet(owner);
        String title = source.getTitle();
        if (title.length() + COPY_SUFFIX.length() > QuestionSetRules.MAX_TITLE) {
            title = title.substring(0, QuestionSetRules.MAX_TITLE - COPY_SUFFIX.length()).strip();
        }
        QuestionSet copy = QuestionSet.create(newCode(), owner, title + COPY_SUFFIX, source.getSubject(), source.getGrade());
        copy.setDescription(source.getDescription());
        questionSetRepository.save(copy);
        List<Question> questions = questionRepository.findByQuestionSetOrderByPosition(source);
        for (Question question : questions) {
            questionRepository.save(question.copyTo(copy, question.getPosition()));
        }
        return toResponse(copy);
    }

    /** A set of the current teacher that is not archived; 404 otherwise (other teachers' sets stay hidden). */
    @Transactional(readOnly = true)
    public QuestionSet getOwnedSet(String code) {
        User owner = currentUserService.getCurrentUser();
        return questionSetRepository.findByCode(code)
                .filter(set -> set.isOwnedBy(owner) && set.getStatus() == QuestionSetStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Question set", code));
    }

    /** The set with its questions and live games, after a change (inside the caller's transaction). */
    public QuestionSetResponse toResponse(QuestionSet set) {
        return new QuestionSetResponse(
                toSummaries(List.of(set)).getFirst(),
                questionRepository.findByQuestionSetOrderByPosition(set).stream().map(mapper::toResponse).toList(),
                questionSetUseRepository.findLiveGames(set).stream().map(mapper::toResponse).toList());
    }

    private List<QuestionSetSummaryResponse> toSummaries(List<QuestionSet> sets) {
        if (sets.isEmpty()) {
            return List.of();
        }
        List<Long> ids = sets.stream().map(QuestionSet::getId).toList();
        Map<Long, QuestionCount> questions = questionRepository.countByType(ids).stream()
                .collect(Collectors.toMap(QuestionCount::getQuestionSetId, Function.identity()));
        Map<Long, UseCount> uses = questionSetUseRepository.countBySet(ids).stream()
                .collect(Collectors.toMap(UseCount::getQuestionSetId, Function.identity()));
        return sets.stream().map(set -> {
            QuestionCount q = questions.get(set.getId());
            UseCount u = uses.get(set.getId());
            long multipleChoice = q == null ? 0 : q.getMultipleChoiceCount();
            long shortAnswer = q == null ? 0 : q.getShortAnswerCount();
            return new QuestionSetSummaryResponse(set.getCode(), set.getTitle(), set.getDescription(), set.getSubject(),
                    set.getGrade(), multipleChoice + shortAnswer, multipleChoice, shortAnswer,
                    u == null ? 0 : u.getUseCount(), u == null ? 0 : u.getPlayCount(),
                    set.getOwner().getDisplayName(), set.getCreatedAt(), set.getUpdatedAt());
        }).toList();
    }

    private void requireRoomForASet(User owner) {
        if (questionSetRepository.countByOwnerAndStatus(owner, QuestionSetStatus.ACTIVE) >= QuestionSetRules.MAX_SETS) {
            throw new BusinessException(HttpStatus.CONFLICT, "TOO_MANY_QUESTION_SETS",
                    "A teacher keeps at most %d question sets".formatted(QuestionSetRules.MAX_SETS));
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static String newCode() {
        StringBuilder code = new StringBuilder("qs-");
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return code.toString();
    }
}
