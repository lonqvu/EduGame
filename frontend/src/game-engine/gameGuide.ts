import { playableRows } from '@/game-engine/crossword/crosswordRound'
import { DEFAULT_TEAMS } from '@/game-engine/grid-board/teams'
import { playableMatchingSets } from '@/game-engine/matching/matchingRound'
import { playableMemorySets } from '@/game-engine/memory/memoryRound'
import { playableOrderSets } from '@/game-engine/ordering/orderingRound'
import { playableQuizQuestions } from '@/game-engine/quiz/quizRound'
import { PLAY_DEFAULTS, type PlaySettings, readPlaySettings, type RulesGameType } from '@/game-engine/shared/gameSettings'
import { playableSortSets } from '@/game-engine/sorting/sortingRound'
import type { CrosswordRow, GameItem, GameType, OrderSet, PairSet, Question, QuizQuestion, SortSet } from '@/types/game'

/** Games played on the projector with questions or cards (the tools have no rules to explain). */
export type GuideGameType = RulesGameType | 'GRID_BOARD'

export const isGuideGame = (type: GameType): type is GuideGameType => type === 'GRID_BOARD' || type in PLAY_DEFAULTS

/** Items the projector will actually play: half-written questions and sets are left out. */
export function countPlayable(type: GuideGameType, items: GameItem[]): number {
  switch (type) {
    case 'GRID_BOARD':
      return (items as Question[]).filter((q) => q.text.trim()).length
    case 'QUIZ':
    case 'GOLDEN_BELL':
    case 'BOAT_RACE':
      return playableQuizQuestions(items as QuizQuestion[], { shuffleOptions: false }).length
    case 'MATCHING':
      return playableMatchingSets(items as PairSet[]).length
    case 'MEMORY':
      return playableMemorySets(items as PairSet[]).length
    case 'CROSSWORD':
      return playableRows(items as CrosswordRow[]).length
    case 'ORDERING':
      return playableOrderSets(items as OrderSet[]).length
    case 'SORTING':
      return playableSortSets(items as SortSet[]).length
  }
}

export interface GuideStep {
  title: string
  text: string
}

/**
 * What the start page tells the teacher and the class about one game, written from the rules it is actually played
 * with: the numbers come from its settings, so the guide never says something the projector does not do.
 */
export interface GameGuide {
  /** One sentence for the class: what they try to do. */
  goal: string
  /** Short rules, said to the class. */
  rules: string[]
  /** The flow of a round, from the class's point of view. */
  steps: GuideStep[]
  /** Who wins. */
  winner: string
  /** How to drive the projector screen: for the teacher only, never projected. */
  teacherNotes: string[]
}

const NO_PENALTY = 'Trả lời sai không bị trừ điểm.'

const teamsRule = (teams: number) => `Lớp chia thành ${teams} đội.`
const timeRule = (seconds: number) => (seconds > 0 ? [`Mỗi câu có ${seconds} giây để suy nghĩ.`] : [])
const pointsRule = (points: number, what = 'Trả lời đúng') => `${what}: đội được cộng ${points} điểm.`
const HIGHEST_SCORE = 'Kết thúc trò chơi, đội có nhiều điểm nhất là đội chiến thắng.'

/** Rules of a quiz question with a buzzer: Trắc nghiệm and Đua thuyền. */
function buzzerRules(s: PlaySettings): string[] {
  return [
    'Đội nào giơ tay nhanh nhất được quyền trả lời.',
    s.allowSteal
      ? `${NO_PENALTY} Các đội còn lại được giành quyền trả lời tiếp.`
      : `${NO_PENALTY} Cô sẽ công bố đáp án đúng.`,
  ]
}

export function gameGuide(type: GuideGameType, settings: Record<string, unknown> | undefined): GameGuide {
  if (type === 'GRID_BOARD') {
    return {
      goal: 'Lật ô số, trả lời câu hỏi phía sau và ghi thật nhiều điểm cho đội.',
      rules: [
        `Lớp chia thành ${DEFAULT_TEAMS.length} đội: ${DEFAULT_TEAMS.map((t) => t.name.replace('Đội ', '')).join(', ')}.`,
        'Các đội lần lượt chọn một ô số. Mỗi ô là một câu hỏi.',
        'Trả lời đúng: đội được số điểm ghi trên ô đó.',
        `${NO_PENALTY} Ô vẫn úp để đội sau chọn lại.`,
      ],
      steps: [
        { title: 'Chọn ô', text: 'Đội đến lượt chọn một ô số trên bảng.' },
        { title: 'Trả lời', text: 'Cả đội bàn bạc rồi nói câu trả lời.' },
        { title: 'Chấm điểm', text: 'Cô chấm đúng hoặc sai, điểm cộng ngay cho đội.' },
        { title: 'Đổi lượt', text: 'Lượt chuyển sang đội tiếp theo cho đến khi lật hết ô.' },
      ],
      winner: HIGHEST_SCORE,
      teacherNotes: [
        'Bấm vào ô đội vừa chọn để mở câu hỏi, bấm "Hiện đáp án" khi cần.',
        'Bấm "Đội khác giành quyền" nếu một đội khác được trả lời câu này.',
        'Điểm của mỗi ô được đặt cho từng câu hỏi trong trình soạn.',
      ],
    }
  }

  const s = readPlaySettings(settings, PLAY_DEFAULTS[type])
  switch (type) {
    case 'QUIZ':
      return {
        goal: 'Chọn đúng đáp án để giành thật nhiều điểm cho đội.',
        rules: [
          teamsRule(s.teams),
          'Mỗi câu hỏi có nhiều đáp án, chỉ một đáp án đúng.',
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          pointsRule(s.points),
          ...buzzerRules(s).slice(1),
        ],
        steps: [
          { title: 'Đọc câu hỏi', text: 'Câu hỏi và các đáp án hiện trên màn chiếu.' },
          { title: 'Giành quyền', text: 'Đội giơ tay nhanh nhất được trả lời.' },
          { title: 'Chọn đáp án', text: 'Đội nói đáp án, màn hình báo đúng hoặc sai.' },
          { title: 'Xem kết quả', text: 'Hết câu hỏi, cả lớp xem bảng điểm các đội.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: [
          'Bấm vào tên đội giành được quyền, rồi bấm đáp án đội đó chọn.',
          'Bấm "Câu tiếp theo" để sang câu mới.',
        ],
      }

    case 'BOAT_RACE':
      return {
        goal: `Trả lời đúng để đưa thuyền của đội về đích trước.`,
        rules: [
          teamsRule(s.teams),
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          'Trả lời đúng: thuyền của đội tiến lên một chặng.',
          ...buzzerRules(s).slice(1),
          `Thuyền cần đi ${s.raceSteps} chặng để về đích.`,
        ],
        steps: [
          { title: 'Đọc câu hỏi', text: 'Câu hỏi và các đáp án hiện trên màn chiếu.' },
          { title: 'Giành quyền', text: 'Đội giơ tay nhanh nhất được trả lời.' },
          { title: 'Tiến thuyền', text: 'Trả lời đúng, thuyền của đội tiến thêm một chặng.' },
          { title: 'Về đích', text: 'Thuyền đầu tiên về đích thì trò chơi kết thúc.' },
        ],
        winner: 'Đội có thuyền về đích đầu tiên là đội chiến thắng.',
        teacherNotes: [
          'Bấm vào làn thuyền của đội giành được quyền, rồi bấm đáp án đội đó chọn.',
          'Bấm "Câu tiếp theo" để sang câu mới.',
        ],
      }

    case 'GOLDEN_BELL':
      return {
        goal: 'Trả lời đúng mọi câu để trụ lại đến cuối và rung chuông vàng.',
        rules: [
          'Cả lớp cùng chơi, mỗi bạn tự trả lời.',
          ...timeRule(s.timeLimitSec),
          'Các bạn ghi đáp án lên bảng con và giơ bảng khi hết giờ.',
          'Trả lời sai thì bạn đó rời cuộc chơi từ câu sau.',
          'Nếu tất cả các bạn còn lại cùng sai, không ai bị loại.',
          ...(s.rescues > 0 ? [`Cô có ${s.rescues} lần cứu trợ: đưa tất cả các bạn đã bị loại trở lại.`] : []),
        ],
        steps: [
          { title: 'Đọc câu hỏi', text: 'Câu hỏi hiện trên màn chiếu cho cả lớp.' },
          { title: 'Ghi đáp án', text: 'Mỗi bạn ghi đáp án lên bảng con.' },
          { title: 'Giơ bảng', text: 'Hết giờ, cả lớp cùng giơ bảng, cô công bố đáp án.' },
          { title: 'Loại dần', text: 'Bạn trả lời sai rời cuộc chơi, các bạn còn lại chơi tiếp.' },
        ],
        winner: 'Các bạn trụ lại đến câu cuối, hoặc bạn cuối cùng còn lại, rung chuông vàng.',
        teacherNotes: [
          'Bấm "Hiện đáp án", rồi bấm vào tên các bạn trả lời sai.',
          'Cần danh sách lớp: học sinh lấy từ lớp cô đang dạy.',
          'Các bạn rung chuông được thưởng sao vào lớp khi cô bấm nút thưởng ở màn kết quả.',
        ],
      }

    case 'MATCHING':
      return {
        goal: 'Nối mỗi ô bên trái với ô đúng của nó bên phải.',
        rules: [
          teamsRule(s.teams),
          'Các đội lần lượt nối một cặp.',
          pointsRule(s.points, 'Nối đúng'),
          'Nối sai không bị trừ điểm. Mỗi lượt nối xong, đúng hay sai, đều chuyển sang đội tiếp theo.',
        ],
        steps: [
          { title: 'Quan sát', text: 'Hai cột hiện trên màn chiếu, cột phải đã được xáo trộn.' },
          { title: 'Nối cặp', text: 'Đội đến lượt chọn một ô trái và ô phải đi cùng.' },
          { title: 'Đổi lượt', text: 'Lượt chuyển sang đội tiếp theo.' },
          { title: 'Xem kết quả', text: 'Nối hết các bộ, cả lớp xem bảng điểm.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Bấm ô bên trái rồi bấm ô bên phải mà đội chọn.', 'Bấm "Bộ tiếp theo" khi đã nối xong một bộ.'],
      }

    case 'MEMORY':
      return {
        goal: 'Nhớ vị trí các thẻ để tìm ra thật nhiều cặp giống nhau.',
        rules: [
          teamsRule(s.teams),
          'Mọi thẻ đều úp. Mỗi lượt, đội lật 2 thẻ.',
          `Hai thẻ cùng cặp: đội được ${s.points} điểm và lật tiếp.`,
          'Không cùng cặp: thẻ úp lại và chuyển sang đội tiếp theo.',
        ],
        steps: [
          { title: 'Lật thẻ', text: 'Đội đến lượt chọn 2 thẻ để lật.' },
          { title: 'Ghi nhớ', text: 'Cả lớp nhớ vị trí các thẻ đã lật.' },
          { title: 'Tìm cặp', text: 'Đúng cặp thì đội được điểm và chơi tiếp.' },
          { title: 'Xem kết quả', text: 'Tìm hết các cặp, cả lớp xem bảng điểm.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Bấm vào 2 thẻ mà đội chọn.', 'Bấm "Bộ tiếp theo" khi đã tìm hết các cặp của một bộ.'],
      }

    case 'CROSSWORD':
      return {
        goal: 'Giải các hàng ngang để mở dần từ khóa bí mật.',
        rules: [
          teamsRule(s.teams),
          'Các đội lần lượt chọn một hàng ngang và trả lời gợi ý của hàng đó.',
          pointsRule(s.points, 'Giải đúng một hàng'),
          s.allowSteal ? `${NO_PENALTY} Các đội khác lần lượt được trả lời hàng đó.` : NO_PENALTY,
          `Đội nào cũng có thể xin đoán từ khóa giữa các lượt: đúng được ${s.keywordPoints} điểm, thêm 10 điểm cho mỗi hàng chưa mở.`,
          'Đoán sai từ khóa thì đội đó không được đoán lại nữa.',
        ],
        steps: [
          { title: 'Chọn hàng', text: 'Đội đến lượt chọn một hàng ngang.' },
          { title: 'Trả lời', text: 'Cả đội nói đáp án cho gợi ý của hàng.' },
          { title: 'Mở chữ', text: 'Đúng thì hàng hiện ra, lộ thêm một chữ của từ khóa.' },
          { title: 'Đoán từ khóa', text: 'Đoán được từ khóa càng sớm càng nhiều điểm.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: [
          'Bấm "Chọn hàng" rồi bấm "Đúng" hoặc "Sai" theo câu trả lời của đội.',
          'Bấm "Đoán từ khóa" khi một đội xin đoán.',
        ],
      }

    case 'ORDERING':
      return {
        goal: 'Sắp xếp các thẻ theo đúng thứ tự.',
        rules: [
          teamsRule(s.teams),
          'Các thẻ bị xáo trộn. Đội đến lượt nói thứ tự đúng.',
          pointsRule(s.points, 'Xếp đúng cả bài'),
          s.allowSteal
            ? `${NO_PENALTY} Thẻ đúng được giữ lại, thẻ sai quay về để đội tiếp theo xếp tiếp.`
            : `${NO_PENALTY} Cô sẽ công bố thứ tự đúng.`,
        ],
        steps: [
          { title: 'Quan sát', text: 'Các thẻ xáo trộn hiện trên màn chiếu.' },
          { title: 'Sắp xếp', text: 'Đội đến lượt nói thứ tự của các thẻ.' },
          { title: 'Kiểm tra', text: 'Màn hình cho biết thẻ nào đã đúng chỗ.' },
          { title: 'Xem kết quả', text: 'Xếp hết các bài, cả lớp xem bảng điểm.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Bấm các thẻ theo thứ tự đội nói, rồi bấm "Kiểm tra".', 'Bấm "Bài tiếp theo" để sang bài mới.'],
      }

    case 'SORTING':
      return {
        goal: 'Đưa mỗi thẻ vào đúng giỏ của nó.',
        rules: [
          teamsRule(s.teams),
          'Mỗi lần hiện một thẻ. Đội đến lượt nói thẻ thuộc giỏ nào.',
          pointsRule(s.points, 'Đúng giỏ'),
          `${NO_PENALTY} Thẻ quay về cuối chồng để chơi lại sau.`,
          'Mỗi thẻ xong, lượt chuyển sang đội tiếp theo.',
        ],
        steps: [
          { title: 'Xem thẻ', text: 'Một thẻ hiện trên màn chiếu.' },
          { title: 'Chọn giỏ', text: 'Đội đến lượt nói giỏ đúng cho thẻ.' },
          { title: 'Chấm điểm', text: 'Đúng giỏ thì thẻ vào giỏ và đội được điểm.' },
          { title: 'Xem kết quả', text: 'Mọi thẻ vào giỏ, cả lớp xem bảng điểm.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Bấm vào giỏ mà đội chọn cho thẻ đang hiện.', 'Bấm "Bộ tiếp theo" để sang bộ thẻ mới.'],
      }
  }
}
