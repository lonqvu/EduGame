import { describe, expect, it } from 'vitest'
import { numberNames, parseNames } from '@/utils/quickNames'

describe('parseNames', () => {
  it('takes one name a line, as pasted from Word, Excel or Zalo', () => {
    expect(parseNames('Nguyễn Minh Anh\r\n  Trần   Bảo Ngọc \n\nLê Hoàng\tPhạm Thu')).toEqual([
      'Nguyễn Minh Anh',
      'Trần Bảo Ngọc',
      'Lê Hoàng',
      'Phạm Thu',
    ])
  })

  it('drops numbering and bullets but keeps numbers inside a name', () => {
    expect(parseNames('1. An\n2) Bình\n3 - Chi\n- Dũng\n• Hà\nTổ 3')).toEqual(['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Tổ 3'])
  })

  it('keeps a class worth of names, each of a sensible length', () => {
    const names = parseNames(Array.from({ length: 80 }, (_, i) => `Bạn ${i}`).join('\n'))
    expect(names).toHaveLength(60)
    expect(parseNames('x'.repeat(200))[0]).toHaveLength(50)
    expect(parseNames('  \n \n')).toEqual([])
  })
})

describe('numberNames', () => {
  it('numbers the class from 1, within 1 and 60', () => {
    expect(numberNames(3)).toEqual(['Số 1', 'Số 2', 'Số 3'])
    expect(numberNames(0)).toHaveLength(1)
    expect(numberNames(500)).toHaveLength(60)
  })
})
