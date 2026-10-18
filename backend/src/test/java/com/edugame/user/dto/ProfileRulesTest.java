package com.edugame.user.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Phone numbers are stored as typed, without the separators. */
class ProfileRulesTest {

    @Test
    void keepsTheDigitsOfANumberTypedInGroups() {
        assertThat(ProfileRules.normalizePhone("0987 654 321")).isEqualTo("0987654321");
        assertThat(ProfileRules.normalizePhone("0987.654.321")).isEqualTo("0987654321");
        assertThat(ProfileRules.normalizePhone("(024) 3825-1234")).isEqualTo("02438251234");
        assertThat(ProfileRules.normalizePhone("  +84 987 654 321 ")).isEqualTo("+84987654321");
    }

    @Test
    void blankMeansNoPhone() {
        assertThat(ProfileRules.normalizePhone(null)).isNull();
        assertThat(ProfileRules.normalizePhone("")).isNull();
        assertThat(ProfileRules.normalizePhone("   ")).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"12345678", "0987abc321", "09876543210123456", "84+987654321", "++84987654321"})
    void rejectsWhatIsNotAPhoneNumber(String phone) {
        assertThatThrownBy(() -> ProfileRules.normalizePhone(phone)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void avatarsAreTheTeacherAndTheClassAnimals() {
        assertThat(ProfileRules.AVATARS).contains("teacher", "bear", "owl").hasSize(9);
    }
}
