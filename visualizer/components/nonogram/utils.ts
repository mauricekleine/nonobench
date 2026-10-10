import { nanoid } from "nanoid";

import {
  type NonogramCell,
  NonogramCellValue,
  type NonogramClue,
  type NonogramGrid,
  type NonogramInput,
} from "./types";

export function createEmptySolutionString({ height, width }: { height: number; width: number }) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => "0"))
    .flat()
    .join("");
}

function getClues(
  columnOrRow: NonogramCell[],
  index: number,
  type: "column" | "row",
): NonogramClue[] {
  const clues: NonogramClue[] = [];

  let cellIds: NonogramCell["id"][] = [];
  let count = 0;
  let isValid = true;

  for (const cell of columnOrRow) {
    if (cell.value === NonogramCellValue.FILLED) {
      cellIds.push(cell.id);
      count += 1;
      isValid = isValid && cell.isValid;
    } else {
      if (count > 0) {
        clues.push({
          cellIds,
          id: nanoid(),
          index,
          isComplete: false,
          isValid,
          type,
          value: count,
        });
      }

      cellIds = [];
      count = 0;
      isValid = true;
    }
  }

  if (count > 0) {
    clues.push({
      cellIds,
      id: nanoid(),
      index,
      isComplete: false,
      isValid,
      type,
      value: count,
    });
  }

  if (clues.length > 0) {
    return clues;
  }

  return [
    {
      cellIds: [],
      id: nanoid(),
      index,
      isComplete: false,
      isValid: true,
      type,
      value: 0,
    },
  ];
}

export function getCluesForNonogram(grid: NonogramGrid): {
  columnClues: NonogramClue[][];
  rowClues: NonogramClue[][];
} {
  const columnClues: NonogramClue[][] = [];
  for (let index = 0; index < (grid[0]?.length ?? 0); index++) {
    const column = grid.map((row) => row[index]).filter((cell) => cell !== undefined);
    const clues = getClues(column, index, "column");
    columnClues.push(clues);
  }

  const rowClues: NonogramClue[][] = [];
  for (const [index, row] of grid.entries()) {
    const clues = getClues(row, index, "row");
    rowClues.push(clues);
  }

  return { columnClues, rowClues };
}

export function getCellsInRange(
  grid: NonogramCell["id"][][],
  cellOne: NonogramCell,
  cellTwo: NonogramCell,
): NonogramCell["id"][] {
  const cells: NonogramCell["id"][] = [];

  const startRow = Math.min(cellOne.row, cellTwo.row);
  const endRow = Math.max(cellOne.row, cellTwo.row);
  const startColumn = Math.min(cellOne.column, cellTwo.column);
  const endColumn = Math.max(cellOne.column, cellTwo.column);

  for (let row = startRow; row <= endRow; row++) {
    for (let column = startColumn; column <= endColumn; column++) {
      const cell = grid[row]?.[column];

      if (cell === undefined) {
        continue;
      }

      cells.push(cell);
    }
  }

  return cells;
}

export function getGridFromSolutionString<ReturnValue = NonogramCell>({
  createCell,
  solution,
  width,
}: Omit<NonogramInput, "height"> & {
  createCell: ({
    column,
    row,
    value,
  }: {
    column: number;
    row: number;
    value: "0" | "1";
  }) => ReturnValue;
}): ReturnValue[][] {
  const grid: ReturnValue[][] = [];
  let currentRow: ReturnValue[] = [];

  for (const [index, value] of [...solution].entries()) {
    const row = Math.floor(index / width);
    const column = index % width;
    const cell = createCell({ column, row, value: value as "0" | "1" });

    currentRow.push(cell);

    if (currentRow.length === width) {
      grid.push(currentRow);
      currentRow = [];
    }
  }

  return grid;
}

export function getMarkedCells({
  cells,
  direction,
  end,
  grid,
  start,
}: {
  cells: Record<NonogramCell["id"], NonogramCell>;
  direction: "horizontal" | "vertical";
  end: NonogramCell;
  grid: NonogramCell["id"][][];
  start: NonogramCell;
}) {
  if (direction === "horizontal") {
    const count = Math.abs(end.column - start.column) + 1;

    const startColumn = Math.min(start.column, end.column);
    const endColumn = Math.max(start.column, end.column);

    let blockCount = 0;
    const rowCells = grid[start.row] ?? [];

    for (const id of rowCells) {
      const cell = cells[id];
      if (cell.column >= startColumn && cell.column <= endColumn) {
        continue;
      }

      if (cell.column < startColumn) {
        if (cell.userValue === start.userValue) {
          blockCount += 1;
        } else {
          blockCount = 0;
        }
      }

      if (cell.column > endColumn) {
        if (cell.userValue === start.userValue) {
          blockCount += 1;
        } else {
          break;
        }
      }
    }

    return {
      blockCount,
      count,
    };
  }

  const count = Math.abs(end.row - start.row) + 1;

  const startRow = Math.min(start.row, end.row);
  const endRow = Math.max(start.row, end.row);

  let blockCount = 0;
  const columnCells = grid.map((row) => row[start.column]);

  for (const id of columnCells) {
    const cell = cells[id];

    if (cell.row >= startRow && cell.row <= endRow) {
      continue;
    }

    if (cell.row < startRow) {
      if (cell.userValue === start.userValue) {
        blockCount += 1;
      } else {
        blockCount = 0;
      }
    }

    if (cell.row > endRow) {
      if (cell.userValue === start.userValue) {
        blockCount += 1;
      } else {
        break;
      }
    }
  }

  return {
    blockCount,
    count,
  };
}

export function getUserSolutionStringFromGrid(
  grid: NonogramCell["id"][][],
  cells: Record<NonogramCell["id"], NonogramCell>,
): string {
  return grid
    .flat()
    .map((id) => {
      const cell = cells[id];

      switch (cell.userValue) {
        case NonogramCellValue.FILLED: {
          return "1";
        }
        case NonogramCellValue.MARKED: {
          return "x";
        }
        default: {
          return "0";
        }
      }
    })
    .join("");
}

export function isCellValid(cell: Pick<NonogramCell, "userValue" | "value">): boolean {
  if (cell.value === cell.userValue) {
    return true;
  }

  if (cell.value === NonogramCellValue.EMPTY && cell.userValue === NonogramCellValue.MARKED) {
    return true;
  }

  return false;
}
