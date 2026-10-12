package com.edugame.common.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * The string takes at most {@link #value()} bytes in UTF-8. Needed for passwords: BCrypt only reads 72 bytes and
 * Spring refuses longer ones, and Vietnamese letters with diacritics take 2-3 bytes each, so a character limit is
 * not enough. {@code null} is valid (use {@code @NotBlank} for that).
 */
@Documented
@Constraint(validatedBy = MaxUtf8BytesValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface MaxUtf8Bytes {

    int value();

    String message() default "must be at most {value} bytes long (letters with diacritics count 2-3)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
