"use client";

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  type NonogramCell,
  NonogramCellValue,
  type NonogramClue,
  type NonogramInput,
  type ZoomLevel,
} from "./types";
import {
  getCellsInRange,
  getCluesForNonogram,
  getGridFromSolutionString,
  getMarkedCells,
  getUserSolutionStringFromGrid,
  isCellValid,
} from "./utils";

type HistoryEntry = {
  cells: {
    id: NonogramCell["id"];
    oldValue: NonogramCellValue;
    value: NonogramCellValue;
  }[];
};

type State = {
  cells: Record<NonogramCell["id"], NonogramCell>;
  clues: {
    cells: Record<NonogramClue["id"], NonogramClue>;
    columns: NonogramClue["id"][][];
    rows: NonogramClue["id"][][];
  };
  dragDirection: "horizontal" | "vertical" | undefined;
  dragEndCellId: NonogramCell["id"] | undefined;
  dragStartCellId: NonogramCell["id"] | undefined;
  grid: NonogramCell["id"][][];
  height: number;
  highlightedColumn: number | undefined;
  highlightedRow: number | undefined;
  history: HistoryEntry[];
  historyIndex: number;
  isComplete: boolean;
  isEditing: boolean;
  markedCellsCount: {
    blockCount: number;
    count: number;
  };
  userSolution: string | undefined;
  width: number;
  zoomLevel: ZoomLevel;
};

type Actions = {
  continueDragging: (cell: NonogramCell) => void;
  initialize: (
    input: NonogramInput,
    options?: {
      isEditing?: boolean;
      reset?: boolean;
      userSolution?: string;
    }
  ) => void;
  reset: () => void;
  setHighlightedColumn: (column: number | undefined) => void;
  setHighlightedRow: (row: number | undefined) => void;
  startDragging: (cell: NonogramCell) => void;
  stopDragging: () => void;
  toggleClue: (clueId: NonogramClue["id"]) => void;
  undo: () => void;
  redo: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoomLevel: (zoomLevel: ZoomLevel) => void;
};

type Store = State & Actions;

const initialState: State = {
  cells: {},
  clues: {
    cells: {},
    columns: [],
    rows: [],
  },
  dragDirection: undefined,
  dragEndCellId: undefined,
  dragStartCellId: undefined,
  grid: [],
  height: 0,
  highlightedColumn: undefined,
  highlightedRow: undefined,
  history: [],
  historyIndex: -1,
  isComplete: false,
  isEditing: false,
  markedCellsCount: {
    blockCount: 0,
    count: 0,
  },
  userSolution: undefined,
  width: 0,
  zoomLevel: "sm",
};

function updateCells(
  state: State,
  ids: NonogramCell["id"][],
  value: NonogramCellValue
) {
  const history: HistoryEntry = { cells: [] };

  for (const id of ids) {
    history.cells.push({
      id,
      oldValue: state.cells[id].userValue,
      value,
    });

    if (state.isEditing) {
      state.cells[id].isValid = true;
      state.cells[id].value = value;
    } else {
      state.cells[id].isValid = isCellValid({
        userValue: value,
        value: state.cells[id].value,
      });
    }

    state.cells[id].transientValue = undefined;
    state.cells[id].userValue = value;
  }

  if (history.cells.length > 0) {
    state.history = [
      ...state.history.slice(0, state.historyIndex + 1),
      history,
    ];
    state.historyIndex += 1;
  }

  const clueCells = Object.values(state.clues.cells).filter((clue) =>
    clue.cellIds.some((cellId) => ids.includes(cellId))
  );

  for (const clue of clueCells) {
    clue.isValid = clue.cellIds.every((cellId) => state.cells[cellId].isValid);
  }

  state.isComplete = state.isEditing
    ? false
    : Object.values(state.cells).every((cell) => cell.isValid);

  if (state.isEditing) {
    state.clues.cells = {};

    const clues = getCluesForNonogram(
      state.grid.map((row) => row.map((id) => state.cells[id]))
    );

    state.clues.columns = clues.columnClues.map((clue) =>
      clue.map((clue) => clue.id)
    );
    state.clues.rows = clues.rowClues.map((clue) =>
      clue.map((clue) => clue.id)
    );

    for (const clue of clues.columnClues) {
      for (const cell of clue) {
        state.clues.cells[cell.id] = cell;
      }
    }
    for (const clue of clues.rowClues) {
      for (const cell of clue) {
        state.clues.cells[cell.id] = cell;
      }
    }
  }

  state.userSolution = getUserSolutionStringFromGrid(state.grid, state.cells);
}

export const useNonogramStore = create<Store>()(
  devtools(
    subscribeWithSelector(
      immer((set, _, store) => ({
        ...initialState,
        continueDragging: (cell) => {
          set((state) => {
            const dragStartCell = state.dragStartCellId
              ? state.cells[state.dragStartCellId]
              : undefined;

            if (dragStartCell) {
              const direction =
                state.dragDirection ??
                (dragStartCell.row === cell.row ? "horizontal" : "vertical");

              const newDragEndCellId =
                direction === "horizontal"
                  ? `${dragStartCell.row}-${cell.column}`
                  : `${cell.row}-${dragStartCell.column}`;
              const newDragEndCell = state.cells[newDragEndCellId];

              if (newDragEndCell) {
                const { blockCount, count } = getMarkedCells({
                  cells: state.cells,
                  direction,
                  end: newDragEndCell,
                  grid: state.grid,
                  start: dragStartCell,
                });

                state.markedCellsCount.blockCount = blockCount;
                state.markedCellsCount.count = count;
              }

              const cellsInRange = getCellsInRange(
                state.grid,
                dragStartCell,
                newDragEndCell
              );

              state.dragDirection =
                state.dragStartCellId === state.dragEndCellId
                  ? undefined
                  : direction;
              state.dragEndCellId = newDragEndCellId;

              for (const id of cellsInRange) {
                state.cells[id].transientValue =
                  dragStartCell.transientValue ?? dragStartCell.userValue;
              }
            }

            state.highlightedColumn = cell.column;
            state.highlightedRow = cell.row;
          });
        },
        initialize: (input, options) => {
          set((state) => {
            const grid = getGridFromSolutionString({
              createCell: ({ column, row, value }) => {
                const actualValue =
                  value === "1"
                    ? NonogramCellValue.FILLED
                    : NonogramCellValue.EMPTY;
                let isValid = false;
                let userValue: NonogramCellValue = NonogramCellValue.EMPTY;

                if (options?.isEditing) {
                  userValue = actualValue;
                } else if (options?.reset) {
                  userValue = NonogramCellValue.EMPTY;
                } else if (options?.userSolution) {
                  const index = row * input.width + column;
                  const value = options.userSolution[index];

                  switch (value) {
                    case "1": {
                      userValue = NonogramCellValue.FILLED;
                      break;
                    }
                    case "x": {
                      userValue = NonogramCellValue.MARKED;
                      break;
                    }
                    default: {
                      userValue = NonogramCellValue.EMPTY;
                    }
                  }

                  isValid =
                    options?.isEditing ||
                    isCellValid({
                      userValue,
                      value: actualValue,
                    });
                }

                const cell: NonogramCell = {
                  column,
                  id: `${row}-${column}`,
                  isValid,
                  row,
                  userValue,
                  value: actualValue,
                };

                state.cells[cell.id] = cell;

                return cell;
              },
              solution: input.solution,
              width: input.width,
            });

            const { columnClues, rowClues } = getCluesForNonogram(grid);

            for (const row of columnClues) {
              for (const cell of row) {
                state.clues.cells[cell.id] = cell;
              }
            }

            for (const row of rowClues) {
              for (const cell of row) {
                state.clues.cells[cell.id] = cell;
              }
            }

            state.clues.columns = columnClues.map((clue) =>
              clue.map((clue) => clue.id)
            );
            state.clues.rows = rowClues.map((clue) =>
              clue.map((clue) => clue.id)
            );

            state.grid = grid.map((row) => row.map((cell) => cell.id));
            state.height = input.height;
            state.isEditing = !!options?.isEditing;
            state.width = input.width;
          });
        },
        redo: () => {
          set((state) => {
            const nextState = state.history.at(state.historyIndex + 1);

            if (!nextState) {
              return;
            }

            if (state.historyIndex < state.history.length - 1) {
              state.historyIndex += 1;

              for (const nextCell of nextState.cells) {
                state.cells[nextCell.id].userValue = nextCell.value;
              }
            }
          });
        },
        reset: () => {
          set(store.getInitialState());
        },
        setHighlightedColumn: (column) => {
          set((state) => {
            state.highlightedColumn = column;
          });
        },
        setHighlightedRow: (row) => {
          set((state) => {
            state.highlightedRow = row;
          });
        },
        startDragging: (cell) => {
          set((state) => {
            switch (cell.userValue) {
              case NonogramCellValue.EMPTY: {
                state.cells[cell.id].transientValue = NonogramCellValue.FILLED;
                break;
              }
              case NonogramCellValue.FILLED: {
                state.cells[cell.id].transientValue = state.isEditing
                  ? NonogramCellValue.EMPTY
                  : NonogramCellValue.MARKED;
                break;
              }
              default: {
                state.cells[cell.id].transientValue = NonogramCellValue.EMPTY;
                break;
              }
            }

            state.dragEndCellId = cell.id;
            state.dragStartCellId = cell.id;
          });
        },
        stopDragging: () => {
          set((state) => {
            const dragStartCell = state.dragStartCellId
              ? state.cells[state.dragStartCellId]
              : undefined;
            const dragEndCell = state.dragEndCellId
              ? state.cells[state.dragEndCellId]
              : undefined;

            if (dragStartCell && dragEndCell) {
              const cellIds = getCellsInRange(
                state.grid,
                dragStartCell,
                dragEndCell
              );

              updateCells(
                state,
                cellIds,
                dragStartCell.transientValue ?? dragStartCell.userValue
              );

              // TODO: check for completion
              // TODO: update clues
            }

            state.dragDirection = undefined;
            state.dragStartCellId = undefined;
            state.dragEndCellId = undefined;
            state.markedCellsCount.blockCount = 0;
            state.markedCellsCount.count = 0;
          });
        },
        toggleClue: (clueId) => {
          set((state) => {
            const clue = state.clues.cells[clueId];

            if (!clue) {
              return;
            }

            state.clues.cells[clueId].isComplete = !clue.isComplete;

            /*
              TODO: update cells in column or row
            */

            // if (clue.type === "column") {
            //   const column = state.grid.map((row) => row[clue.index]);

            //   const emptyCells = column.filter(
            //     (id) => state.cells[id].userValue === NonogramCellValue.EMPTY
            //   );

            //   updateCells(state, emptyCells, NonogramCellValue.MARKED);
            // } else {
            //   const row = state.grid[clue.index];

            //   if (row === undefined) {
            //     return;
            //   }

            //   const emptyCells = row.filter(
            //     (id) => state.cells[id].userValue === NonogramCellValue.EMPTY
            //   );

            //   updateCells(state, emptyCells, NonogramCellValue.MARKED);
            // }
          });
        },
        undo: () => {
          set((state) => {
            if (state.historyIndex === -1) {
              return;
            }

            const previousState = state.history.at(state.historyIndex);

            if (!previousState) {
              return;
            }

            state.historyIndex -= 1;

            for (const previousCell of previousState.cells) {
              state.cells[previousCell.id].userValue = previousCell.oldValue;
            }
          });
        },
        setZoomLevel: (zoomLevel) => {
          set((state) => {
            state.zoomLevel = zoomLevel;
          });
        },
        zoomIn: () => {
          set((state) => {
            switch (state.zoomLevel) {
              case "xs": {
                state.zoomLevel = "sm";
                break;
              }
              case "sm": {
                state.zoomLevel = "md";
                break;
              }
              case "md": {
                state.zoomLevel = "lg";
                break;
              }
              case "lg": {
                state.zoomLevel = "xl";
                break;
              }
              default: {
                break;
              }
            }
          });
        },
        zoomOut: () => {
          set((state) => {
            switch (state.zoomLevel) {
              case "sm": {
                state.zoomLevel = "xs";
                break;
              }
              case "md": {
                state.zoomLevel = "sm";
                break;
              }
              case "lg": {
                state.zoomLevel = "md";
                break;
              }
              case "xl": {
                state.zoomLevel = "lg";
                break;
              }
              default: {
                break;
              }
            }
          });
        },
      }))
    )
  )
);
