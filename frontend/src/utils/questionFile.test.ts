// Reads the template from public/ (tests run in Node).
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseCsv, readSheetFile } from '@/utils/classListFile'
import { parseQuestionRows } from '@/utils/questionFile'

const csv = (text: string) => parseQuestionRows(parseCsv(text))

describe('the template', () => {
  it('gives its five examples: multiple choice, short answer and true / false', async () => {
    const rows = await readSheetFile(new Blob([readFileSync('public/assets/question-sets/mau-cau-hoi.xlsx')]))
    expect(parseQuestionRows(rows)).toEqual([
      {
        row: 2,
        kind: 'MULTIPLE_CHOICE',
        question: { type: 'MULTIPLE_CHOICE', text: 'Thủ đô của Việt Nam là?', options: ['Hà Nội', 'Huế', 'Đà Nẵng', 'TP. Hồ Chí Minh'], correctOption: 0 },
      },
      { row: 3, kind: 'MULTIPLE_CHOICE', question: { type: 'MULTIPLE_CHOICE', text: '25 + 13 = ?', options: ['38', '37', '48'], correctOption: 0 } },
      { row: 4, kind: 'SHORT_ANSWER', question: { type: 'SHORT_ANSWER', text: 'Con gì kêu meo meo?', answer: 'Con mèo' } },
      {
        row: 5,
        kind: 'TRUE_FALSE',
        question: {
          type: 'MULTIPLE_CHOICE',
          text: 'Mặt trời mọc ở đằng Đông',
          options: ['Đúng', 'Sai'],
          correctOption: 0,
          explanation: 'Mặt trời mọc ở phía Đông, lặn ở phía Tây',
        },
      },
      {
        row: 6,
        kind: 'TRUE_FALSE',
        question: { type: 'MULTIPLE_CHOICE', text: 'Cá voi là loài cá', options: ['Đúng', 'Sai'], correctOption: 1, explanation: 'Cá voi là động vật có vú' },
      },
    ])
  })
})

describe('CSV', () => {
  it('reads Excel’s ";" CSV with loose headers, extra wrong answers and other columns', () => {
    const questions = csv('STT;CAU HOI;dap an dung;Dap an sai 1;Dap an sai 2;Đáp án sai 4;Ghi chú\n1;2 + 2 = ?;4;3;5;22;x\n')
    expect(questions).toEqual([
      { row: 2, kind: 'MULTIPLE_CHOICE', question: { type: 'MULTIPLE_CHOICE', text: '2 + 2 = ?', options: ['4', '3', '5', '22'], correctOption: 0 } },
    ])
  })

  it('skips the title rows and the header, however the columns are named', () => {
    const questions = csv('BỘ CÂU HỎI TOÁN LỚP 2,,\nGiáo viên: Cô Lan,,\nĐề bài,Đáp án,Phương án sai\n2 + 3 = ?,5,6\n')
    expect(questions).toEqual([
      { row: 4, kind: 'MULTIPLE_CHOICE', question: { type: 'MULTIPLE_CHOICE', text: '2 + 3 = ?', options: ['5', '6'], correctOption: 0 } },
    ])
  })

  it('keeps the first row when it is a question, even "… | Đúng | Sai"', () => {
    const questions = csv('Mặt trời mọc ở đằng Đông,Đúng,Sai\nCá voi là loài cá,Sai,\n')
    expect(questions.map((q) => [q.row, q.kind, q.question?.correctOption])).toEqual([
      [1, 'TRUE_FALSE', 0],
      [2, 'TRUE_FALSE', 1],
    ])
  })

  it('takes the template’s order without a header, and quoted cells with commas', () => {
    const questions = csv('Thủ đô?,Hà Nội,Huế\n"Mặt trời mọc ở đâu, lặn ở đâu?",Đông - Tây\n')
    expect(questions.map((q) => q.question)).toEqual([
      { type: 'MULTIPLE_CHOICE', text: 'Thủ đô?', options: ['Hà Nội', 'Huế'], correctOption: 0 },
      { type: 'SHORT_ANSWER', text: 'Mặt trời mọc ở đâu, lặn ở đâu?', answer: 'Đông - Tây' },
    ])
  })

  it('knows true / false however it is written, also with the other value as a wrong answer', () => {
    const questions = csv('Câu hỏi,Đáp án đúng,Đáp án sai 1\nA,đ,\nB,True,\nC,S,\nD,FALSE,\nE,Đúng,Sai\nF,Đúng,Không biết\n')
    expect(questions.map((q) => [q.kind, q.question?.correctOption])).toEqual([
      ['TRUE_FALSE', 0],
      ['TRUE_FALSE', 0],
      ['TRUE_FALSE', 1],
      ['TRUE_FALSE', 1],
      ['TRUE_FALSE', 0],
      // Another answer: a multiple choice question that happens to have "Đúng" as its right answer.
      ['MULTIPLE_CHOICE', 0],
    ])
  })

  it('reads exam-style files: options A to D and the right letter', () => {
    const questions = csv('Câu hỏi,A,B,C,D,Đáp án\nSố nào lớn nhất?,3,9,7,1,B\nThủ đô?,Huế,Hà Nội,,,Hà Nội\n')
    expect(questions.map((q) => q.question)).toEqual([
      { type: 'MULTIPLE_CHOICE', text: 'Số nào lớn nhất?', options: ['3', '9', '7', '1'], correctOption: 1 },
      { type: 'MULTIPLE_CHOICE', text: 'Thủ đô?', options: ['Huế', 'Hà Nội'], correctOption: 1 },
    ])
  })

  it('reads letters as the right answer when every row of the file has one', () => {
    const questions = csv('Số nào lớn nhất?,C,3,7,9\nSố nào nhỏ nhất?,A,1,4,8\n')
    expect(questions.map((q) => q.question?.correctOption)).toEqual([2, 0])
    expect(questions[0].question?.options).toEqual(['3', '7', '9'])
  })

  it('keeps letters as answers under named "Đáp án sai" columns (an alphabet quiz)', () => {
    const questions = csv('Câu hỏi,Đáp án đúng,Đáp án sai 1,Đáp án sai 2\nChữ đứng sau A?,B,C,D\nChữ đứng trước C?,B,A,D\n')
    expect(questions.map((q) => q.question)).toEqual([
      { type: 'MULTIPLE_CHOICE', text: 'Chữ đứng sau A?', options: ['B', 'C', 'D'], correctOption: 0 },
      { type: 'MULTIPLE_CHOICE', text: 'Chữ đứng trước C?', options: ['B', 'A', 'D'], correctOption: 0 },
    ])
  })

  it('skips empty rows and says why a row cannot be a question, with its row in the file', () => {
    const questions = csv(
      [
        'Câu hỏi,Đáp án đúng,Đáp án sai 1,Đáp án sai 2,Đáp án sai 3,Đáp án sai 4,Đáp án sai 5,Đáp án sai 6',
        ',Hà Nội,Huế',
        '',
        'Thủ đô?,,Huế',
        'Thủ đô?,Hà Nội,hà nội',
        'Nhiều quá?,1,2,3,4,5,6,7',
        'Được không?,Được',
      ].join('\n'),
    )
    expect(questions).toEqual([
      { row: 2, problem: 'Thiếu câu hỏi' },
      { row: 4, problem: 'Thiếu đáp án đúng' },
      { row: 5, problem: 'Có hai đáp án giống nhau.' },
      { row: 6, problem: 'Nhiều hơn 6 đáp án' },
      { row: 7, kind: 'SHORT_ANSWER', question: { type: 'SHORT_ANSWER', text: 'Được không?', answer: 'Được' } },
    ])
  })
})
