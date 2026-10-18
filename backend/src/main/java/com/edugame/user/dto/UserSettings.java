package com.edugame.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * "Cài đặt" of a teacher: the whole document, read and written in one piece ({@code GET/PUT /me/settings}).
 *
 * @param display       how the app looks and behaves on this teacher's screens
 * @param games         rules every new game starts with; {@code null} keeps the game's own default
 * @param notifications security mails the teacher wants
 * @param sound         sounds of the projector games; may be left out of a PUT (an app opened before sounds existed),
 *                      the saved one is then kept
 */
public record UserSettings(@NotNull @Valid Display display, @NotNull @Valid GameDefaults games,
                           @NotNull @Valid Notifications notifications, @Valid Sound sound) {

    public static final UserSettings DEFAULTS = new UserSettings(
            new Display(false, false),
            new GameDefaults(null, null, null, null),
            new Notifications(true, true),
            new Sound(true, 80, true));

    /** The same settings with another sound section. */
    public UserSettings withSound(Sound newSound) {
        return new UserSettings(display, games, notifications, newSound);
    }

    /**
     * @param reduceMotion      animations off (slow projector computers, children sensitive to motion)
     * @param fullscreenOnStart "Bắt đầu trò chơi" also puts the browser in full screen
     */
    public record Display(@NotNull Boolean reduceMotion, @NotNull Boolean fullscreenOnStart) {
    }

    /**
     * Applied when a game is made, to the games that have the rule (see GameDefaults in module game); games already
     * made keep their settings.
     *
     * @param teams        number of teams of team games where the class is split at random
     * @param timeLimitSec seconds per question, 0 = no limit
     * @param allowSteal   another team may answer after a wrong answer
     * @param shuffleItems questions in a random order
     */
    public record GameDefaults(@Min(2) @Max(4) Integer teams, @Min(0) @Max(600) Integer timeLimitSec,
                               Boolean allowSteal, Boolean shuffleItems) {
    }

    /**
     * @param newSignInEmail       mail when the account signs in with a password on a browser it never used
     * @param passwordChangedEmail mail when the password is changed from the profile
     */
    public record Notifications(@NotNull Boolean newSignInEmail, @NotNull Boolean passwordChangedEmail) {
    }

    /**
     * @param enabled effects (and music) on the projector; the projector's speaker button turns it off and on
     * @param volume  0–100, of everything
     * @param music   the background music of the games
     */
    public record Sound(@NotNull Boolean enabled, @NotNull @Min(0) @Max(100) Integer volume, @NotNull Boolean music) {
    }
}
