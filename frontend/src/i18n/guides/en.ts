import type { GameGuide, GuideGameType } from '@/game-engine/gameGuide'
import type { PlaySettings } from '@/game-engine/shared/gameSettings'

/**
 * The rules of each game in English: the same rules and steps as vi.ts (checked by guides.test.ts), written as an
 * English-speaking teacher would say them to the class.
 */

const NO_PENALTY = 'A wrong answer doesn’t lose points.'

const teamsRule = (teams: number) => `The class splits into ${teams} teams.`
const timeRule = (seconds: number) => (seconds > 0 ? [`Each question has ${seconds} seconds to think.`] : [])
const pointsRule = (points: number, what = 'Right answer') => `${what}: the team gets ${points} points.`
const HIGHEST_SCORE = 'At the end of the game, the team with the most points wins.'

/** Rules of a quiz question with a buzzer: Quiz and Boat Race. */
function buzzerRules(s: PlaySettings): string[] {
  return [
    'The first team to raise a hand gets to answer.',
    s.allowSteal ? `${NO_PENALTY} The other teams can steal the question.` : `${NO_PENALTY} The teacher gives the right answer.`,
  ]
}

export function enGuide(type: GuideGameType, s: PlaySettings, teamColors: string[]): GameGuide {
  if (type === 'GRID_BOARD') {
    return {
      goal: 'Turn over numbered tiles, answer the question behind them and score as many points as you can for your team.',
      rules: [
        `The class splits into ${teamColors.length} teams: ${teamColors.join(', ')}.`,
        'Teams take turns choosing a numbered tile. Each tile is a question.',
        'Right answer: the team gets the points shown on the tile.',
        `${NO_PENALTY} The tile stays face down for another team to choose.`,
      ],
      steps: [
        { title: 'Choose a tile', text: 'The team whose turn it is chooses a numbered tile on the board.' },
        { title: 'Answer', text: 'The team talks it over, then gives its answer.' },
        { title: 'Score', text: 'The teacher marks it right or wrong, and the points go to the team at once.' },
        { title: 'Next turn', text: 'The turn passes to the next team until every tile is turned over.' },
      ],
      winner: HIGHEST_SCORE,
      teacherNotes: [
        'Click the tile the team chose to open its question; click "Show answer" when needed.',
        'Click "Another team steals" if a different team gets to answer this question.',
        'Each tile’s points are set for each question in the editor.',
      ],
    }
  }

  switch (type) {
    case 'QUIZ':
      return {
        goal: 'Choose the right answers to win as many points as you can for your team.',
        rules: [
          teamsRule(s.teams),
          'Each question has several answers, and only one is right.',
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          pointsRule(s.points),
          ...buzzerRules(s).slice(1),
        ],
        steps: [
          { title: 'Read the question', text: 'The question and its answers appear on the projector.' },
          { title: 'Buzz in', text: 'The first team to raise a hand gets to answer.' },
          { title: 'Choose an answer', text: 'The team says its answer, and the screen shows right or wrong.' },
          { title: 'See the results', text: 'After the last question, the class looks at the team scores.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click the name of the team that buzzed in, then the answer it chose.', 'Click "Next question" to move on.'],
      }

    case 'BOAT_RACE':
      return {
        goal: 'Answer right to bring your team’s boat to the finish first.',
        rules: [
          teamsRule(s.teams),
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          'Right answer: the team’s boat moves forward one stage.',
          ...buzzerRules(s).slice(1),
          `A boat needs ${s.raceSteps} stages to reach the finish.`,
        ],
        steps: [
          { title: 'Read the question', text: 'The question and its answers appear on the projector.' },
          { title: 'Buzz in', text: 'The first team to raise a hand gets to answer.' },
          { title: 'Row ahead', text: 'With a right answer, the team’s boat moves one stage forward.' },
          { title: 'Finish', text: 'The game ends when the first boat reaches the finish.' },
        ],
        winner: 'The team whose boat reaches the finish first wins.',
        teacherNotes: ['Click the lane of the team that buzzed in, then the answer it chose.', 'Click "Next question" to move on.'],
      }

    case 'MILLIONAIRE':
      return {
        goal: 'Answer each question right to climb to the 1,000,000-point prize.',
        rules: [
          'One student plays while the class cheers.',
          ...timeRule(s.timeLimitSec),
          'Choose an answer, then lock in your "final answer". If it’s right, you climb to the next step.',
          'Wrong answer: the game stops, and you keep the points of the last safe level you passed.',
          'You can stop at any time to keep the points you’ve won.',
          'There are 3 lifelines, each used once: 50:50, ask the class, and ask a friend.',
        ],
        steps: [
          { title: 'Read the question', text: 'The question and 4 answers appear on the projector.' },
          { title: 'Lifelines', text: 'When it’s hard, the player can use a lifeline.' },
          { title: 'Lock it in', text: 'The player chooses and locks in a final answer.' },
          { title: 'Climb', text: 'Right means a higher prize; wrong ends the game.' },
        ],
        winner: 'The student who answers the last question right becomes the class millionaire!',
        teacherNotes: [
          'Click the answer the player chose, then "Lock in". Click "Continue" for the next question.',
          'Ask the class: students raise their hands for each answer, and you click an answer’s bar to add the hands.',
          'Each game asks up to the first 15 questions.',
        ],
      }

    case 'TUG_OF_WAR':
      return {
        goal: 'Answer right to pull the rope to your team’s side.',
        rules: [
          'The class splits into 2 teams on either side of the rope.',
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          'Right answer: the team pulls the rope one step toward itself.',
          ...buzzerRules(s).slice(1),
          `The team that pulls the rope ${s.raceSteps} steps to its side wins.`,
        ],
        steps: [
          { title: 'Read the question', text: 'The question and its answers appear on the projector.' },
          { title: 'Buzz in', text: 'The first team to raise a hand gets to answer.' },
          { title: 'Pull', text: 'With a right answer, the rope moves toward your team.' },
          { title: 'Over the line', text: 'The team that gets the rope over its line wins.' },
        ],
        winner: `The team that pulls the rope ${s.raceSteps} steps to its side, or pulls it furthest when the questions run out, wins.`,
        teacherNotes: ['Click the name of the team that buzzed in, then the answer it chose.', 'Click "Next question" to move on.'],
      }

    case 'FLOWER_PICK':
      return {
        goal: 'Pick flowers from the tree and answer the question hidden in each one.',
        rules: [
          teamsRule(s.teams),
          'Teams take turns picking a flower. Each flower is a question.',
          ...timeRule(s.timeLimitSec),
          pointsRule(s.points),
          s.allowSteal ? `${NO_PENALTY} The other teams can steal the question.` : `${NO_PENALTY} The teacher gives the right answer.`,
        ],
        steps: [
          { title: 'Pick a flower', text: 'The team whose turn it is chooses a flower on the tree.' },
          { title: 'Read the question', text: 'The question in the flower appears on the projector.' },
          { title: 'Answer', text: 'The team talks it over, then gives its answer.' },
          { title: 'Next turn', text: 'The turn passes to the next team until every flower is picked.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click the flower the team chose, then the answer it gave.', 'Click "Continue" to go back to the tree.'],
      }

    case 'WHACK_MOLE':
      return {
        goal: 'Whack the mole carrying the right answer.',
        rules: [
          teamsRule(s.teams),
          'Moles pop out of their holes, each carrying an answer.',
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          pointsRule(s.points, 'Whacking the mole with the right answer'),
          ...buzzerRules(s).slice(1),
        ],
        steps: [
          { title: 'Read the question', text: 'The question appears at the top and the moles pop out.' },
          { title: 'Buzz in', text: 'The first team to raise a hand gets to answer; the moles wait.' },
          { title: 'Whack', text: 'The team points to the mole with the right answer to whack it.' },
          { title: 'See the results', text: 'After the last question, the class looks at the scores.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click the name of the team that buzzed in, then the mole it chose.', 'Click "Next question" to move on.'],
      }

    case 'TRUE_FALSE':
      return {
        goal: 'Decide whether the answer shown is true or false.',
        rules: [
          teamsRule(s.teams),
          'Each question comes with one answer; sometimes it’s right, sometimes it’s wrong.',
          ...timeRule(s.timeLimitSec),
          'All teams choose True or False at the same time.',
          pointsRule(s.points, 'Right choice'),
        ],
        steps: [
          { title: 'Read', text: 'A question and one answer appear on the projector.' },
          { title: 'Discuss', text: 'Each team decides quickly: is this answer true or false?' },
          { title: 'Raise hands', text: 'All teams raise their hands for True or False.' },
          { title: 'Reveal', text: 'The teacher reveals the answer, and teams that chose right score.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click True or False on each team’s card, then click "Reveal".', 'A wrong answer is always shown with the right one, so the class learns it.'],
      }

    case 'LUCKY_STAR':
      return {
        goal: 'Choose stars and answer right, or find a lucky star, to score points.',
        rules: [
          teamsRule(s.teams),
          'Teams take turns choosing a star on the board.',
          ...(s.luckyStars > 0 ? [`There are ${s.luckyStars} lucky stars: the team gets ${s.points} points without answering.`] : []),
          'The other stars are questions.',
          ...timeRule(s.timeLimitSec),
          pointsRule(s.points),
          s.allowSteal ? `${NO_PENALTY} The other teams can steal the question.` : `${NO_PENALTY} The turn passes to the next team.`,
        ],
        steps: [
          { title: 'Choose a star', text: 'The team whose turn it is chooses a star.' },
          { title: 'Lucky?', text: 'A lucky star gives points right away, with no question.' },
          { title: 'Answer', text: 'A question star: the team answers to score.' },
          { title: 'Next turn', text: 'The turn passes to the next team until the stars run out.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click the star the team chose, then the answer it gave.', 'The lucky stars move every time you play.'],
      }

    case 'SECRET_PICTURE':
      return {
        goal: 'Open the doors and guess what the secret picture is.',
        rules: [
          teamsRule(s.teams),
          'A secret picture hides behind the doors. Teams take turns choosing a door.',
          ...timeRule(s.timeLimitSec),
          pointsRule(s.points),
          'After the answer, the door opens so the class can see a bit more of the picture.',
          `The team that guesses the picture gets ${s.keywordPoints} points.`,
        ],
        steps: [
          { title: 'Choose a door', text: 'The team whose turn it is chooses a door.' },
          { title: 'Answer', text: 'The team answers the question behind the door.' },
          { title: 'Open the door', text: 'The door opens and shows more of the picture.' },
          { title: 'Guess the picture', text: 'Any team that thinks it knows the picture raises a hand!' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: [
          'Click the door the team chose, then the answer it gave.',
          'When a team guesses the picture, click "Reveal the picture", then the name of the team that guessed right.',
        ],
      }

    case 'MOUNTAIN_CLIMB':
      return {
        goal: 'Answer right to get your team’s climber to the summit first.',
        rules: [
          teamsRule(s.teams),
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          'Right answer: the team’s climber goes up one stage.',
          ...buzzerRules(s).slice(1),
          `It takes ${s.raceSteps} stages to reach the summit.`,
        ],
        steps: [
          { title: 'Read the question', text: 'The question and its answers appear on the projector.' },
          { title: 'Buzz in', text: 'The first team to raise a hand gets to answer.' },
          { title: 'Climb', text: 'With a right answer, the climber goes up one stage.' },
          { title: 'Plant the flag', text: 'The first team to the summit plants its winning flag.' },
        ],
        winner: 'The team whose climber reaches the summit first wins.',
        teacherNotes: ['Click the name of the team that buzzed in, then the answer it chose.', 'Click "Next question" to move on.'],
      }

    case 'POINT_WHEEL':
      return {
        goal: 'Spin the wheel to see what the question is worth, then answer right to win the points.',
        rules: [
          teamsRule(s.teams),
          'Teams take turns spinning the wheel.',
          'Points space: answer the question right to win those points.',
          '"Double" space: answer right and the team’s score is doubled.',
          '"Lose a turn" space: the turn passes straight to the next team.',
          ...timeRule(s.timeLimitSec),
          `${NO_PENALTY}`,
        ],
        steps: [
          { title: 'Spin', text: 'The team whose turn it is spins the wheel.' },
          { title: 'See the points', text: 'Wherever the wheel stops, that’s what the question is worth.' },
          { title: 'Answer', text: 'The team answers the question to win the points.' },
          { title: 'Next turn', text: 'The turn passes to the next team.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click "Spin" for the team whose turn it is, then the answer it gave.', 'Click "Continue" for the next team’s turn.'],
      }

    case 'TIC_TAC_TOE':
      return {
        goal: 'Answer right to mark squares and get three in a row before the other team.',
        rules: [
          'The class splits into 2 teams: X and O.',
          'The two teams take turns answering questions.',
          ...timeRule(s.timeLimitSec),
          'Right answer: the team chooses an empty square to mark.',
          'Wrong answer: the team loses its turn, and the teacher gives the right answer.',
          'The first team with 3 squares in a row — across, down or diagonally — wins.',
        ],
        steps: [
          { title: 'Answer', text: 'The team whose turn it is answers a question.' },
          { title: 'Choose a square', text: 'With a right answer, choose a square to mark.' },
          { title: 'Block', text: 'Choose cleverly to block the other team.' },
          { title: 'Three in a row', text: 'The first team with 3 in a row wins.' },
        ],
        winner: 'The first team with 3 in a row wins. If the board fills up with no winner, the team with more squares wins.',
        teacherNotes: ['Click the answer the team gave. If it’s right, click the square the team chose.', 'Click "New game" to play again on a new board.'],
      }

    case 'CONNECT_FOUR':
      return {
        goal: 'Answer right to drop pieces and get four in a row before the other team.',
        rules: [
          'The class splits into 2 teams, each with its own color.',
          'The two teams take turns answering questions.',
          ...timeRule(s.timeLimitSec),
          'Right answer: the team chooses a column to drop a piece into; it falls to the lowest empty space.',
          'Wrong answer: the team loses its turn.',
          'The first team with 4 pieces in a row — across, down or diagonally — wins.',
        ],
        steps: [
          { title: 'Answer', text: 'The team whose turn it is answers a question.' },
          { title: 'Drop a piece', text: 'With a right answer, choose a column to drop a piece.' },
          { title: 'Block', text: 'Drop cleverly to block the other team.' },
          { title: 'Four in a row', text: 'The first team with 4 in a row wins.' },
        ],
        winner: 'The first team with 4 pieces in a row wins.',
        teacherNotes: ['Click the answer the team gave. If it’s right, click the column the team chose.', 'When the questions run out, they start again from the beginning.'],
      }

    case 'TREASURE_CHEST':
      return {
        goal: 'Answer right to open treasure chests and collect as many points as you can.',
        rules: [
          teamsRule(s.teams),
          'Teams take turns answering questions.',
          ...timeRule(s.timeLimitSec),
          'Right answer: the team chooses one of three treasure chests.',
          'A chest may hold bonus points, double points, points taken from or swapped with the leading team — or nothing at all!',
          'Wrong answer: the team loses its turn.',
        ],
        steps: [
          { title: 'Answer', text: 'The team whose turn it is answers a question.' },
          { title: 'Choose a chest', text: 'With a right answer, choose one of the three chests.' },
          { title: 'Open the chest', text: 'The chest opens, and the team scores change.' },
          { title: 'Next turn', text: 'The turn passes to the next team.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click the answer the team gave. If it’s right, click the chest the team chose.', 'Click "Finish" when you want to stop the game.'],
      }

    case 'BUILD_TOWER':
      return {
        goal: 'Answer right to build your team’s tower the tallest.',
        rules: [
          teamsRule(s.teams),
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          'Right answer: the team’s tower gets one more block.',
          ...buzzerRules(s).slice(1),
        ],
        steps: [
          { title: 'Read the question', text: 'The question and its answers appear on the projector.' },
          { title: 'Buzz in', text: 'The first team to raise a hand gets to answer.' },
          { title: 'Build', text: 'With a right answer, the team’s tower grows one block.' },
          { title: 'Compare towers', text: 'After the last question, the tallest tower wins.' },
        ],
        winner: 'After the last question, the team with the tallest tower wins.',
        teacherNotes: ['Click the name of the team that buzzed in, then the answer it chose.', 'Click "Next question" to move on.'],
      }

    case 'BEE_FLOWER':
      return {
        goal: 'Guide the bee to the flower with the right answer.',
        rules: [
          teamsRule(s.teams),
          'Each flower carries an answer.',
          ...timeRule(s.timeLimitSec),
          ...buzzerRules(s).slice(0, 1),
          pointsRule(s.points, 'The bee reaching the right flower'),
          ...buzzerRules(s).slice(1),
        ],
        steps: [
          { title: 'Read the question', text: 'The question appears at the top, and the flowers carry the answers.' },
          { title: 'Buzz in', text: 'The first team to raise a hand guides the bee.' },
          { title: 'Fly to a flower', text: 'The bee flies to the flower the team chose.' },
          { title: 'Collect nectar', text: 'At the right flower, the bee collects nectar and the team scores.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click the name of the team that buzzed in, then the flower it chose.', 'Click "Next question" to move on.'],
      }

    case 'BINGO':
      return {
        goal: 'Find the answers on your team’s bingo card; a full row means you shout "Bingo!".',
        rules: [
          teamsRule(s.teams),
          'Each team has its own bingo card of answers, different from the others.',
          ...timeRule(s.timeLimitSec),
          'When a question appears, any team that sees the right answer on its card raises a hand.',
          `A team that finds it marks that square and gets ${s.points} points.`,
          'Choosing the wrong square means it isn’t marked.',
        ],
        steps: [
          { title: 'Read the question', text: 'The question appears on the projector.' },
          { title: 'Search your card', text: 'Teams look for the right answer on their cards.' },
          { title: 'Raise hands', text: 'A team that finds it raises a hand, and the teacher clicks the square it points to.' },
          { title: 'Bingo!', text: 'The first team with a full row across, down or diagonally wins.' },
        ],
        winner: 'The first team with a full row shouts "Bingo!" and wins. If the questions run out, the team with the most points wins.',
        teacherNotes: [
          'When a team raises a hand, click the square it points to on its card, then click "Reveal the answer".',
          'True/false questions aren’t used in Bingo.',
        ],
      }

    case 'WORD_SCRAMBLE':
      return {
        goal: 'Put the scrambled letters back into the right word, using the clue.',
        rules: [
          teamsRule(s.teams),
          'Each question has a clue, and the letters of the answer are mixed up.',
          ...timeRule(s.timeLimitSec),
          'The first team to raise a hand reads the letters in order, and the teacher places them on the board.',
          'Right order: the team gets the question’s points.',
          s.allowSteal ? 'Wrong order: the other teams can steal the question.' : 'Wrong order: the teacher gives the answer.',
          'The teacher can reveal letters as hints. With more than half the word given, the question is worth half the points.',
        ],
        steps: [
          { title: 'Read the clue', text: 'The clue and the scrambled letters appear on the projector.' },
          { title: 'Buzz in', text: 'The first team to raise a hand gets to answer.' },
          { title: 'Place letters', text: 'The team reads the letters one by one, and the teacher clicks to place them.' },
          { title: 'Score', text: 'When every letter is placed, the screen shows right or wrong.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: [
          'Click the name of the team that buzzed in, then the letters in the order the team reads them. Click "Delete letter" to remove the last one.',
          'Answers can have up to 16 letters; questions with longer answers or symbols are skipped.',
        ],
      }

    case 'HANGMAN':
      return {
        goal: 'Guess letters one at a time to reveal the mystery word, then solve it for bonus points.',
        rules: [
          teamsRule(s.teams),
          'The board shows the blank spaces of the word and a clue.',
          'Teams take turns guessing a letter.',
          `A letter in the word: each space it opens is worth ${s.points} points, and the team guesses again.`,
          'A letter not in the word: the turn passes to the next team.',
          `On its turn, a team can solve the whole word: right gives ${s.keywordPoints} bonus points plus the points of the remaining spaces; wrong loses the turn.`,
        ],
        steps: [
          { title: 'Read the clue', text: 'The clue and the blank spaces appear on the projector.' },
          { title: 'Guess a letter', text: 'The team whose turn it is guesses a letter.' },
          { title: 'Open spaces', text: 'If the letter is in the word, those spaces open.' },
          { title: 'Solve the word', text: 'A team that knows the whole word solves it for the bonus.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: [
          'Click the letter the team guessed. Guessing "O" also opens Vietnamese Ò, Ó, Ỏ, Õ, Ọ, but Ô and Ơ are separate letters.',
          'When a team solves the word, click "Solve the word", then mark it right or wrong.',
        ],
      }

    case 'GOLDEN_BELL':
      return {
        goal: 'Answer every question right to last until the end and ring the golden bell.',
        rules: [
          'The whole class plays; each student answers alone.',
          ...timeRule(s.timeLimitSec),
          'Students write their answer on a mini whiteboard and hold it up when time is up.',
          'A student who answers wrong leaves the game from the next question.',
          'If all the remaining students answer wrong, no one is out.',
          ...(s.rescues > 0 ? [`The teacher has ${s.rescues} rescues: they bring everyone who is out back into the game.`] : []),
        ],
        steps: [
          { title: 'Read the question', text: 'The question appears on the projector for the whole class.' },
          { title: 'Write the answer', text: 'Each student writes an answer on a mini whiteboard.' },
          { title: 'Hold it up', text: 'When time is up, everyone holds up their board, and the teacher gives the answer.' },
          { title: 'Knock-out', text: 'Students who answered wrong are out; the others keep playing.' },
        ],
        winner: 'The students who last until the final question, or the last one left, ring the golden bell.',
        teacherNotes: [
          'Click "Show answer", then click the names of the students who answered wrong.',
          'A class list is needed: students come from the class you’re teaching.',
          'Students who ring the bell get stars for the class when you click the reward button on the results screen.',
        ],
      }

    case 'MATCHING':
      return {
        goal: 'Match each card on the left with its partner on the right.',
        rules: [
          teamsRule(s.teams),
          'Teams take turns matching a pair.',
          pointsRule(s.points, 'Right match'),
          'A wrong match doesn’t lose points. After each match, right or wrong, the turn passes to the next team.',
        ],
        steps: [
          { title: 'Look', text: 'Two columns appear on the projector; the right one is shuffled.' },
          { title: 'Match', text: 'The team whose turn it is chooses a left card and its partner on the right.' },
          { title: 'Next turn', text: 'The turn passes to the next team.' },
          { title: 'See the results', text: 'When every set is matched, the class looks at the scores.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click the left card, then the right card the team chose.', 'Click "Next set" when a set is finished.'],
      }

    case 'MEMORY':
      return {
        goal: 'Remember where the cards are to find as many matching pairs as you can.',
        rules: [
          teamsRule(s.teams),
          'All the cards are face down. Each turn, a team turns over 2 cards.',
          `A matching pair: the team gets ${s.points} points and goes again.`,
          'Not a pair: the cards are turned back over and the next team plays.',
        ],
        steps: [
          { title: 'Turn over', text: 'The team whose turn it is chooses 2 cards to turn over.' },
          { title: 'Remember', text: 'The whole class remembers where the cards are.' },
          { title: 'Find pairs', text: 'With a pair, the team scores and plays again.' },
          { title: 'See the results', text: 'When every pair is found, the class looks at the scores.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click the 2 cards the team chose.', 'Click "Next set" when every pair of a set is found.'],
      }

    case 'CROSSWORD':
      return {
        goal: 'Solve the rows to reveal the secret keyword, letter by letter.',
        rules: [
          teamsRule(s.teams),
          'Teams take turns choosing a row and answering its clue.',
          pointsRule(s.points, 'Solving a row'),
          s.allowSteal ? `${NO_PENALTY} The other teams take turns answering that row.` : NO_PENALTY,
          `Between turns, any team can ask to guess the keyword: right gives ${s.keywordPoints} points, plus 10 points for each row still closed.`,
          'A team that guesses the keyword wrong can’t guess it again.',
        ],
        steps: [
          { title: 'Choose a row', text: 'The team whose turn it is chooses a row.' },
          { title: 'Answer', text: 'The team gives the answer to the row’s clue.' },
          { title: 'Reveal a letter', text: 'If it’s right, the row appears and shows one more letter of the keyword.' },
          { title: 'Guess the keyword', text: 'The sooner you guess the keyword, the more points you get.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click "Choose row", then "Right" or "Wrong" for the team’s answer.', 'Click "Guess the keyword" when a team asks to guess.'],
      }

    case 'ORDERING':
      return {
        goal: 'Put the cards in the right order.',
        rules: [
          teamsRule(s.teams),
          'The cards are shuffled. The team whose turn it is says the right order.',
          pointsRule(s.points, 'Getting the whole order right'),
          s.allowSteal
            ? `${NO_PENALTY} Cards in the right place stay; the others go back for the next team to try.`
            : `${NO_PENALTY} The teacher gives the right order.`,
        ],
        steps: [
          { title: 'Look', text: 'The shuffled cards appear on the projector.' },
          { title: 'Order', text: 'The team whose turn it is says the order of the cards.' },
          { title: 'Check', text: 'The screen shows which cards are in the right place.' },
          { title: 'See the results', text: 'When every task is done, the class looks at the scores.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click the cards in the order the team says, then click "Check".', 'Click "Next task" to move on.'],
      }

    case 'SORTING':
      return {
        goal: 'Put each card in its right basket.',
        rules: [
          teamsRule(s.teams),
          'One card appears at a time. The team whose turn it is says which basket it belongs in.',
          pointsRule(s.points, 'Right basket'),
          `${NO_PENALTY} The card goes to the bottom of the pile to be played again later.`,
          'After each card, the turn passes to the next team.',
        ],
        steps: [
          { title: 'See the card', text: 'A card appears on the projector.' },
          { title: 'Choose a basket', text: 'The team whose turn it is says the right basket for the card.' },
          { title: 'Score', text: 'In the right basket, the card goes in and the team scores.' },
          { title: 'See the results', text: 'When every card is in a basket, the class looks at the scores.' },
        ],
        winner: HIGHEST_SCORE,
        teacherNotes: ['Click the basket the team chose for the card shown.', 'Click "Next set" for a new set of cards.'],
      }
  }
}
