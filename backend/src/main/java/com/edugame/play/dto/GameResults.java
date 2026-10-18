package com.edugame.play.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * What the results screen showed when a game ended, kept for the reports: the teams with their points (team games),
 * or the students still in at the end (Rung chuông vàng).
 *
 * @param teams   every team, in any order
 * @param winners names of the students who won, for games played alone
 * @param players how many students played, for games played alone
 */
public record GameResults(
        @Size(max = 8) List<@Valid Team> teams,
        @Size(max = 100) List<@NotBlank @Size(max = 50) String> winners,
        @Min(0) @Max(1000) Integer players) {

    /** A team: its name, points and right answers. */
    public record Team(@NotBlank @Size(max = 50) String name,
                       @Min(-100_000) @Max(100_000) int score,
                       @Min(0) @Max(10_000) int correct) {
    }
}
