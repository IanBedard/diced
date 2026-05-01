export type Category =
  | 'Ones'
  | 'Twos'
  | 'Threes'
  | 'Fours'
  | 'Fives'
  | 'Sixes'
  | 'Three of a Kind'
  | 'Four of a Kind'
  | 'Full House'
  | 'Small Straight'
  | 'Large Straight'
  | 'Five of a Kind'
  | 'Chance';

export interface Player {
  id: number;
  name: string;
  color: string;
  scores: Partial<Record<Category, number>>;
}

export const categories: Category[] = [
  'Ones',
  'Twos',
  'Threes',
  'Fours',
  'Fives',
  'Sixes',
  'Three of a Kind',
  'Four of a Kind',
  'Full House',
  'Small Straight',
  'Large Straight',
  'Five of a Kind',
  'Chance',
];

export const categoryDescriptions: Record<Category, string> = {
  Ones: 'Add every 1',
  Twos: 'Add every 2',
  Threes: 'Add every 3',
  Fours: 'Add every 4',
  Fives: 'Add every 5',
  Sixes: 'Add every 6',
  'Three of a Kind': '3 matching dice scores the total',
  'Four of a Kind': '4 matching dice scores the total',
  'Full House': 'A pair and a triple scores 25',
  'Small Straight': '4 dice in a row scores 30',
  'Large Straight': '5 dice in a row scores 40',
  'Five of a Kind': 'All dice match scores 50',
  Chance: 'Score the total of all dice',
};

export const playerPresets = [
  { name: 'Red', color: '#d64045' },
  { name: 'Blue', color: '#2f80ed' },
  { name: 'Green', color: '#219653' },
  { name: 'Gold', color: '#d49a00' },
];

const faceTotal = (dice: number[], face: number) =>
  dice.filter(value => value === face).length * face;

const hasSet = (dice: number[], size: number) =>
  dice.some(value => dice.filter(item => item === value).length >= size);

const hasStraight = (dice: number[], straight: number[]) =>
  straight.every(value => dice.includes(value));

export function totalScore(dice: number[]): number {
  return dice.reduce((sum, value) => sum + value, 0);
}

export function calculateScore(category: Category, dice: number[]): number {
  switch (category) {
    case 'Ones':
      return faceTotal(dice, 1);
    case 'Twos':
      return faceTotal(dice, 2);
    case 'Threes':
      return faceTotal(dice, 3);
    case 'Fours':
      return faceTotal(dice, 4);
    case 'Fives':
      return faceTotal(dice, 5);
    case 'Sixes':
      return faceTotal(dice, 6);
    case 'Three of a Kind':
      return hasSet(dice, 3) ? totalScore(dice) : 0;
    case 'Four of a Kind':
      return hasSet(dice, 4) ? totalScore(dice) : 0;
    case 'Full House': {
      const counts = Object.values(
        dice.reduce<Record<number, number>>((acc, value) => {
          acc[value] = (acc[value] || 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => a - b);

      return counts.join(',') === '2,3' ? 25 : 0;
    }
    case 'Small Straight':
      return hasStraight(dice, [1, 2, 3, 4]) ||
        hasStraight(dice, [2, 3, 4, 5]) ||
        hasStraight(dice, [3, 4, 5, 6])
        ? 30
        : 0;
    case 'Large Straight':
      return hasStraight(dice, [1, 2, 3, 4, 5]) ||
        hasStraight(dice, [2, 3, 4, 5, 6])
        ? 40
        : 0;
    case 'Five of a Kind':
      return dice.every(value => value === dice[0]) ? 50 : 0;
    case 'Chance':
      return totalScore(dice);
    default:
      return 0;
  }
}

export function playerTotal(player: Player): number {
  return Object.values(player.scores).reduce((sum, value) => sum + (value || 0), 0);
}

export function isPlayerComplete(player: Player): boolean {
  return categories.every(category => player.scores[category] !== undefined);
}

export function buildPlayers(count: number): Player[] {
  return playerPresets.slice(0, count).map((preset, index) => ({
    id: index,
    name: preset.name,
    color: preset.color,
    scores: {},
  }));
}
