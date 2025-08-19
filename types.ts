
export enum TileStatus {
  Correct = 'correct', // Green
  Present = 'present', // Yellow
  Absent = 'absent',   // Gray
  Empty = 'empty',
  Typing = 'typing',
}

export type GameStatus = 'PLAYING' | 'WON' | 'LOST';

export type KeyStatus = Exclude<TileStatus, TileStatus.Empty | TileStatus.Typing>;
