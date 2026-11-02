// Reads the source files from disk (tests run in Node).
/// <reference types="node" />
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { expect, it } from 'vitest'

/**
 * Vietnamese still written in the code instead of the translations, file by file: the files not translated yet, and
 * the few that keep Vietnamese on purpose (reading "Đúng" / "Sai" in an imported file, the sample content...).
 *
 * untranslated.json holds the number of such lines per file. The test fails when a file gains some (new text must go
 * through t()), so the number only goes down as screens are translated. After translating, write the new numbers with
 *   UPDATE_I18N_BASELINE=1 npx vitest run src/i18n
 */

const VIETNAMESE = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i
const BASELINE = 'src/i18n/untranslated.json'

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__fixtures__' || path === join('src', 'i18n') ? [] : sources(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : []
  })
}

/** Lines with Vietnamese outside comments. */
function vietnameseLines(text: string): number {
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ''))
    .replace(/(^|\s)\/\/.*$/gm, '$1')
  return code.split('\n').filter((line) => VIETNAMESE.test(line)).length
}

it('adds no Vietnamese to the code outside the translations', () => {
  const now: Record<string, number> = {}
  for (const file of sources('src').sort()) {
    const lines = vietnameseLines(readFileSync(file, 'utf8'))
    if (lines) now[relative('src', file).replaceAll('\\', '/')] = lines
  }
  if (process.env.UPDATE_I18N_BASELINE) {
    writeFileSync(BASELINE, `${JSON.stringify(now, null, 2)}\n`)
    return
  }
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as Record<string, number>
  const grown = Object.entries(now)
    .filter(([file, lines]) => lines > (baseline[file] ?? 0))
    .map(([file, lines]) => `${file}: ${baseline[file] ?? 0} → ${lines}`)
  expect(grown, 'Vietnamese text added in the code: put it in src/i18n/locales (vi.ts and en.ts) and use t()').toEqual([])
})
