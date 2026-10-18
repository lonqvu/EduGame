/** A right answer sounds a little higher with each one in a row (up to 5): the class hears the streak build. */
export const streakRate = (streak: number) => 1 + Math.min(Math.max(streak, 0), 5) * 0.04
