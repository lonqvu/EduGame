package com.edugame.user.domain;

import java.time.Instant;

import com.edugame.common.entity.AuditableEntity;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Teacher or admin account. Table {@code users}. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "users")
public class User extends AuditableEntity {

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @Column(name = "username", nullable = false, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "email", length = 255)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    /** Digits only, maybe with a leading "+" (see ProfileRules#normalizePhone); {@code null} when not given. */
    @Column(name = "phone", length = 20)
    private String phone;

    /** Picture of the account (ProfileRules#AVATARS); {@code null}: the default teacher picture. */
    @Column(name = "avatar", length = 30)
    private String avatar;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    /** When the user proved the email is theirs (sign-up code); {@code null} for seeded / admin-made accounts. */
    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    /** Preferences of "Cài đặt", as stored; read them with UserSettingsService (it fills in the defaults). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "settings", nullable = false)
    private JsonNode settings = JsonNodeFactory.instance.objectNode();

    /** A teacher who signed up and confirmed the email address. */
    public static User verifiedTeacher(String code, String username, String passwordHash, String displayName,
                                       String email, Instant verifiedAt) {
        User user = new User();
        user.code = code;
        user.username = username;
        user.passwordHash = passwordHash;
        user.displayName = displayName;
        user.email = email;
        user.role = UserRole.TEACHER;
        user.emailVerifiedAt = verifiedAt;
        return user;
    }
}
