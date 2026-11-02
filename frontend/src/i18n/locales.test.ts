import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/locales/en'
import { vi } from '@/i18n/locales/vi'

/** Letters only Vietnamese uses (with its tone marks), lower and upper case. */
const VIETNAMESE = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i

type Tree = { [key: string]: string | Tree }

/** "nav.home" → "Trang chủ", for every string of a translation. */
function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.set(path, value)
    else for (const [k, v] of flatten(value, path)) out.set(k, v)
  }
  return out
}

const placeholders = (text: string) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort()

const viStrings = flatten(vi)
const enStrings = flatten(en)

describe('the translations', () => {
  it('have the same keys', () => {
    expect([...enStrings.keys()].sort()).toEqual([...viStrings.keys()].sort())
  })

  it('use the same {{values}} in every string', () => {
    for (const [key, text] of viStrings) {
      expect(placeholders(enStrings.get(key) ?? ''), key).toEqual(placeholders(text))
    }
  })

  // A form may leave the number out (a unit under a figure: "class" / "classes"): t() picks it by `count` anyway.
  it('give every count both forms, _one and _other, with the same values', () => {
    for (const strings of [viStrings, enStrings]) {
      for (const key of strings.keys()) {
        const plural = /^(.*)_(one|other)$/.exec(key)
        if (!plural) continue
        const [one, other] = [strings.get(`${plural[1]}_one`), strings.get(`${plural[1]}_other`)]
        expect(one !== undefined && other !== undefined, key).toBe(true)
        expect(placeholders(one!), key).toEqual(placeholders(other!))
      }
    }
  })

  // t('a.b') with a group "b" beside "b_one" would give the group, not a text.
  it('name no count like a group of keys', () => {
    for (const key of viStrings.keys()) {
      const plural = /^(.*)_(one|other)$/.exec(key)
      if (plural) expect([...viStrings.keys()].some((k) => k.startsWith(`${plural[1]}.`)), key).toBe(false)
    }
  })

  it('leave nothing empty', () => {
    for (const [key, text] of [...viStrings, ...enStrings]) expect(text.trim(), key).not.toBe('')
  })

  it('leave no Vietnamese in English (but the product name and the name of the Vietnamese language)', () => {
    for (const [key, text] of enStrings) {
      if (key === 'languages.vi') continue
      expect(text.replaceAll('Lớp Vui', ''), key).not.toMatch(VIETNAMESE)
    }
  })
})
