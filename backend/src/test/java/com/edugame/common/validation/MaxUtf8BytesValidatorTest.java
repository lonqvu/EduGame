package com.edugame.common.validation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class MaxUtf8BytesValidatorTest {

    @Test
    void countsBytesNotCharacters() {
        assertThat(MaxUtf8BytesValidator.utf8Length("abc")).isEqualTo(3);
        assertThat(MaxUtf8BytesValidator.utf8Length("Lan")).isEqualTo(3);
        assertThat(MaxUtf8BytesValidator.utf8Length("ệ")).isEqualTo(3);
        assertThat(MaxUtf8BytesValidator.utf8Length("đ")).isEqualTo(2);
        assertThat(MaxUtf8BytesValidator.utf8Length("😀")).isEqualTo(4);
    }

    @Test
    void acceptsUpToTheLimitAndNull() {
        MaxUtf8BytesValidator validator = new MaxUtf8BytesValidator();
        validator.initialize(limit(72));
        assertThat(validator.isValid(null, null)).isTrue();
        assertThat(validator.isValid("a".repeat(72), null)).isTrue();
        assertThat(validator.isValid("a".repeat(73), null)).isFalse();
        assertThat(validator.isValid("ệ".repeat(24), null)).isTrue();
        assertThat(validator.isValid("ệ".repeat(25), null)).isFalse();
    }

    private static MaxUtf8Bytes limit(int bytes) {
        return new MaxUtf8Bytes() {
            @Override
            public int value() {
                return bytes;
            }

            @Override
            public String message() {
                return "";
            }

            @Override
            public Class<?>[] groups() {
                return new Class<?>[0];
            }

            @SuppressWarnings("unchecked")
            @Override
            public Class<? extends jakarta.validation.Payload>[] payload() {
                return new Class[0];
            }

            @Override
            public Class<? extends java.lang.annotation.Annotation> annotationType() {
                return MaxUtf8Bytes.class;
            }
        };
    }
}
