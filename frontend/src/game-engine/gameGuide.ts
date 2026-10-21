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
    case 'MILLIONAIRE':
    case 'TUG_OF_WAR':
    case 'FLOWER_PICK':
    case 'WHACK_MOLE':
    case 'TRUE_FALSE':
    case 'LUCKY_STAR':
    case 'SECRET_PICTURE':
    case 'MOUNTAIN_CLIMB':
    case 'POINT_WHEEL':
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

    case 'MILLIONAIRE':
      return {
        goal: 'Trả lời đúng từng câu để leo lên bậc thưởng 1.000.000 điểm.',
        rules: [
          'Một bạn lên chơi, cả lớp cổ vũ.',
          ...timeRule(s.timeLimitSec),
          'Chọn đáp án rồi chốt "Câu trả lời cuối cùng". Đúng thì leo lên bậc tiếp theo.',
          'Trả lời sai: cuộc chơi dừng lại, bạn giữ điểm của mốc an toàn gần nhất đã qua.',
          'Có thể dừng cuộc chơi bất cứ lúc nào để giữ số điểm đã đạt.',
          'Có 3 quyền trợ giúp, mỗi quyền dùng một lần: 50:50, hỏi ý kiến cả lớp, hỏi một bạn.',
        ],
        steps: [
          { title: 'Đọc câu hỏi', text: 'Câu hỏi và 4 đáp án hiện trên màn chiếu.' },
          { title: 'Trợ giúp', text: 'Khi khó, bạn chơi có thể dùng một quyền trợ giúp.' },
          { title: 'Chốt đáp án', text: 'Bạn chơi chọn và chốt câu trả lời cuối cùng.' },
          { title: 'Leo bậc', text: 'Đúng thì leo lên bậc thưởng cao hơn, sai thì dừng cuộc chơi.' },
        ],
        winner: 'Bạn trả lời đúng câu cuối cùng trở thành triệu phú của lớp!',
        teacherNotes: [
          'Bấm đáp án bạn chơi chọn, rồi bấm "Chốt đáp án". Bấm "Tiếp tục" để sang câu sau.',
          'Hỏi ý kiến cả lớp: các bạn giơ tay cho từng đáp án, cô bấm vào cột đáp án để cộng số bạn giơ tay.',
          'Mỗi trò hỏi tối đa 15 câu đầu tiên.',
        ],
      }

    case 'TUG_OF_WAR':
      return {
        goal: 'Trả lời đúng để kéo sợi dây về phía đội mình.',
        rules: [
          'Lớp chia thành 2 đội đứng hai bên sợi dây.',
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          'Trả lời đúng: đội kéo dây về phía mình một bước.',
          ...buzzerRules(s).slice(1),
          `Đội kéo được dây về phía mình ${s.raceSteps} bước là thắng.`,
        ],
        steps: [
          { title: 'Đọc câu hỏi', text: 'Câu hỏi và các đáp án hiện trên màn chiếu.' },
          { title: 'Giành quyền', text: 'Đội giơ tay nhanh nhất được trả lời.' },
          { title: 'Kéo dây', text: 'Trả lời đúng, sợi dây nhích về phía đội mình.' },
          { title: 'Qua vạch', text: 'Dây qua vạch của đội nào thì đội đó thắng.' },
        ],
        winner: `Đội kéo được dây ${s.raceSteps} bước về phía mình, hoặc kéo được xa hơn khi hết câu hỏi, là đội thắng.`,
        teacherNotes: ['Bấm vào tên đội giành được quyền, rồi bấm đáp án đội đó chọn.', 'Bấm "Câu tiếp theo" để sang câu mới.'],
      }

    case 'FLOWER_PICK':
      return {
        goal: 'Hái hoa trên cây và trả lời câu hỏi giấu trong mỗi bông hoa.',
        rules: [
          teamsRule(s.teams),
          'Các đội lần lượt lên hái một bông hoa. Mỗi bông hoa là một câu hỏi.',
          ...timeRule(s.timeLimitSec),
          pointsRule(s.points),
          s.allowSteal ? `${NO_PENALTY} Các đội khác được giành quyền trả lời.` : `${NO_PENALTY} Cô công bố đáp án đúng.`,
        ],
        steps: [
          { title: 'Hái hoa', text: 'Đội đến lượt chọn một bông hoa trên cây.' },
          { title: 'Đọc câu hỏi', text: 'Câu hỏi trong bông hoa hiện lên màn chiếu.' },
          { title: 'Trả lời', text: 'Đội bàn bạc rồi nói đáp án.' },
          { title: 'Đổi lượt', text: 'Lượt chuyển sang đội tiếp theo cho đến khi hái hết hoa.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Bấm vào bông hoa đội chọn, rồi bấm đáp án đội nói.', 'Bấm "Tiếp tục" để quay lại cây hoa.'],
      }

    case 'WHACK_MOLE':
      return {
        goal: 'Đập trúng chú chuột chũi mang đáp án đúng.',
        rules: [
          teamsRule(s.teams),
          'Những chú chuột chũi thò lên khỏi hang, mỗi chú mang một đáp án.',
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          pointsRule(s.points, 'Đập đúng chú chuột mang đáp án đúng'),
          ...buzzerRules(s).slice(1),
        ],
        steps: [
          { title: 'Đọc câu hỏi', text: 'Câu hỏi hiện ở trên, chuột chũi thò lên khỏi hang.' },
          { title: 'Giành quyền', text: 'Đội giơ tay nhanh nhất được trả lời, chuột đứng yên chờ.' },
          { title: 'Đập chuột', text: 'Đội chỉ chú chuột mang đáp án đúng để đập.' },
          { title: 'Xem kết quả', text: 'Hết câu hỏi, cả lớp xem bảng điểm.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Bấm vào tên đội giành được quyền, rồi bấm chú chuột đội đó chọn.', 'Bấm "Câu tiếp theo" để sang câu mới.'],
      }

    case 'TRUE_FALSE':
      return {
        goal: 'Đoán xem đáp án hiện ra là đúng hay sai.',
        rules: [
          teamsRule(s.teams),
          'Mỗi câu hỏi hiện kèm một đáp án, có khi đúng, có khi sai.',
          ...timeRule(s.timeLimitSec),
          'Tất cả các đội cùng chọn Đúng hoặc Sai.',
          pointsRule(s.points, 'Chọn đúng'),
        ],
        steps: [
          { title: 'Đọc', text: 'Câu hỏi và một đáp án hiện trên màn chiếu.' },
          { title: 'Bàn bạc', text: 'Mỗi đội bàn nhanh: đáp án này đúng hay sai?' },
          { title: 'Giơ tay', text: 'Các đội cùng giơ tay chọn Đúng hoặc Sai.' },
          { title: 'Công bố', text: 'Cô công bố, các đội chọn đúng được cộng điểm.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Bấm Đúng hoặc Sai trên thẻ của từng đội, rồi bấm "Công bố".', 'Đáp án sai luôn kèm đáp án đúng để cả lớp biết.'],
      }

    case 'LUCKY_STAR':
      return {
        goal: 'Chọn ngôi sao, trả lời đúng hoặc gặp ngôi sao may mắn để ghi điểm.',
        rules: [
          teamsRule(s.teams),
          'Các đội lần lượt chọn một ngôi sao trên bảng.',
          ...(s.luckyStars > 0 ? [`Có ${s.luckyStars} ngôi sao may mắn: đội được ${s.points} điểm mà không cần trả lời.`] : []),
          'Các ngôi sao còn lại là câu hỏi.',
          ...timeRule(s.timeLimitSec),
          pointsRule(s.points),
          s.allowSteal ? `${NO_PENALTY} Các đội khác được giành quyền trả lời.` : `${NO_PENALTY} Lượt chuyển sang đội tiếp theo.`,
        ],
        steps: [
          { title: 'Chọn sao', text: 'Đội đến lượt chọn một ngôi sao.' },
          { title: 'May mắn?', text: 'Ngôi sao may mắn cho điểm ngay, không cần trả lời.' },
          { title: 'Trả lời', text: 'Ngôi sao câu hỏi: đội trả lời để ghi điểm.' },
          { title: 'Đổi lượt', text: 'Lượt chuyển sang đội tiếp theo cho đến khi hết sao.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Bấm vào ngôi sao đội chọn, rồi bấm đáp án đội nói.', 'Vị trí ngôi sao may mắn thay đổi mỗi lần chơi.'],
      }

    case 'SECRET_PICTURE':
      return {
        goal: 'Mở các ô cửa và đoán xem bức tranh bí mật là gì.',
        rules: [
          teamsRule(s.teams),
          'Bức tranh bí mật nằm sau các ô cửa. Các đội lần lượt chọn một ô cửa.',
          ...timeRule(s.timeLimitSec),
          pointsRule(s.points),
          'Trả lời xong, ô cửa mở ra để cả lớp nhìn thêm một phần bức tranh.',
          `Đội nào đoán đúng bức tranh được ${s.keywordPoints} điểm.`,
        ],
        steps: [
          { title: 'Chọn ô cửa', text: 'Đội đến lượt chọn một ô cửa.' },
          { title: 'Trả lời', text: 'Đội trả lời câu hỏi sau ô cửa.' },
          { title: 'Mở cửa', text: 'Ô cửa mở ra, lộ thêm một phần bức tranh.' },
          { title: 'Đoán tranh', text: 'Đội nào đoán được bức tranh thì giơ tay!' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: [
          'Bấm vào ô cửa đội chọn, rồi bấm đáp án đội nói.',
          'Khi có đội đoán bức tranh, bấm "Mở bức tranh" rồi bấm tên đội đoán đúng.',
        ],
      }

    case 'MOUNTAIN_CLIMB':
      return {
        goal: 'Trả lời đúng để đưa người leo núi của đội lên đỉnh trước.',
        rules: [
          teamsRule(s.teams),
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          'Trả lời đúng: người leo núi của đội lên thêm một chặng.',
          ...buzzerRules(s).slice(1),
          `Cần leo ${s.raceSteps} chặng để lên đến đỉnh.`,
        ],
        steps: [
          { title: 'Đọc câu hỏi', text: 'Câu hỏi và các đáp án hiện trên màn chiếu.' },
          { title: 'Giành quyền', text: 'Đội giơ tay nhanh nhất được trả lời.' },
          { title: 'Leo lên', text: 'Trả lời đúng, người leo núi lên thêm một chặng.' },
          { title: 'Cắm cờ', text: 'Đội lên đỉnh đầu tiên cắm cờ chiến thắng.' },
        ],
        winner: 'Đội có người leo núi lên đỉnh đầu tiên là đội chiến thắng.',
        teacherNotes: ['Bấm vào tên đội giành được quyền, rồi bấm đáp án đội đó chọn.', 'Bấm "Câu tiếp theo" để sang câu mới.'],
      }

    case 'POINT_WHEEL':
      return {
        goal: 'Quay vòng quay để biết câu hỏi đáng bao nhiêu điểm, rồi trả lời đúng để nhận điểm.',
        rules: [
          teamsRule(s.teams),
          'Các đội lần lượt quay vòng quay.',
          'Ô điểm: trả lời đúng câu hỏi để nhận số điểm đó.',
          'Ô "Nhân đôi": trả lời đúng thì điểm của đội được nhân đôi.',
          'Ô "Mất lượt": lượt chuyển ngay sang đội tiếp theo.',
          ...timeRule(s.timeLimitSec),
          `${NO_PENALTY}`,
        ],
        steps: [
          { title: 'Quay', text: 'Đội đến lượt bấm quay vòng quay.' },
          { title: 'Xem điểm', text: 'Vòng quay dừng ở ô nào, câu hỏi đáng số điểm đó.' },
          { title: 'Trả lời', text: 'Đội trả lời câu hỏi để nhận điểm.' },
          { title: 'Đổi lượt', text: 'Lượt chuyển sang đội tiếp theo.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Bấm "Quay" cho đội đến lượt, rồi bấm đáp án đội nói.', 'Bấm "Tiếp tục" để sang lượt của đội sau.'],
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
