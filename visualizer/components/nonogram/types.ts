export const NonogramCellValue = {
  EMPTY: "EMPTY",
  FILLED: "FILLED",
  MARKED: "MARKED",
} as const;

export type NonogramCellValue = (typeof NonogramCellValue)[keyof typeof NonogramCellValue];

export type NonogramCell = {
  column: number;
  id: string;
  isValid: boolean;
  row: number;
  transientValue?: NonogramCellValue;
  userValue: NonogramCellValue;
  value: NonogramCellValue;
};

export type NonogramClue = {
  cellIds: NonogramCell["id"][];
  id: string;
  index: number;
  isComplete: boolean;
  isValid: boolean;
  type: "column" | "row";
  value: number;
};

export type NonogramInput = {
  solution: string;
  height: number;
  width: number;
};

export type NonogramGrid = NonogramCell[][];

export type NonogramState = NonogramInput & {
  clues: {
    columns: NonogramClue[][];
    rows: NonogramClue[][];
  };
  grid: NonogramGrid;
  isComplete: boolean;
};

export type ZoomLevel = "xs" | "sm" | "md" | "lg" | "xl";
