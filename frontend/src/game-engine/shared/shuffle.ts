/** Fisher-Yates shuffle into a new array; `random` is injectable for tests. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Shuffles so that, when possible, the order differs from the original (a "shuffled" column that comes out
 * unchanged would give the answers away).
 */
export function shuffleChanged<T>(items: readonly T[], random: () => number = Math.random): T[] {
  if (items.length < 2) return [...items]
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = shuffle(items, random)
    if (result.some((item, i) => item !== items[i])) return result
  }
  // Still unchanged (tiny lists, unlucky random): rotate by one.
  return [...items.slice(1), items[0]]
}
