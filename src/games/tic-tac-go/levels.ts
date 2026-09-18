import { parseLevel } from './engine'
import { eightByEightLevel } from './generate'

const level5Fallback = parseLevel(
  '5',
  'Cái túi',
  18,
  `
P.X.X..O
.X.###..
..O...X.
.###.X..
.X..X...
....X...
XX.X.XX.
X.X.....
`,
)

const level6Fallback = parseLevel(
  '6',
  'Lưới chật',
  22,
  `
P.X.#...
...O#...
....##O.
...X....
........
XX.XX.XX
.XX.XX.X
X.X.....
`,
)

export const levels = [
  parseLevel(
    '1',
    'Quanh tường',
    7,
    `
#######
#P.#.O#
#X.#X.#
#..O..#
#..X..#
#######
`,
  ),
  parseLevel(
    '2',
    'Né X',
    11,
    `
########
#P#..O.#
#.#X...#
#.O..X.#
#X.....#
#..X...#
########
`,
  ),
  parseLevel(
    '3',
    'Mưa X',
    12,
    `
#########
#P.X.X.X#
#...##O.#
#..O#X.X#
#.X.....#
#..X..X.#
#########
`,
  ),
  parseLevel(
    '4',
    'Hành lang',
    18,
    `
##########
#P.X.X..O#
#.X.###..#
#..O...X.#
#.###.X..#
#.X..X...#
#....X...#
##########
`,
  ),
  eightByEightLevel('5', 'Cái túi', 81421) ?? level5Fallback,
  eightByEightLevel('6', 'Lưới chật', 93607) ?? level6Fallback,
]
