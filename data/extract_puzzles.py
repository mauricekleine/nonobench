#!/usr/bin/env python3
"""
Extracts valid nonogram puzzles from NPZ files and outputs them as TypeScript.

Filtering criteria for "valid" puzzles:
1. Every row AND column must have at least one clue (no empty rows/columns)
2. Fill ratio between 30-70% (not too sparse, not too dense)
3. At least one row or column has 2+ distinct clue groups (complexity)
"""

import argparse
import json
import numpy as np
from pathlib import Path

# Grid size configurations: (grid_size, max_clue_len, clues_file, solutions_file)
CONFIGS = {
    5: {
        "max_clue_len": 3,
        "clues": "5x5/train_combined.npz",
        "solutions": "5x5/target_combined.npz",
    },
    10: {
        "max_clue_len": 5,
        "clues": "10x10/x_train_dataset.npz",
        "solutions": "10x10/y_train_dataset.npz",
    },
    15: {
        "max_clue_len": 8,
        "clues": "15x15/x_test_15x15_ok.npz",
        "solutions": "15x15/y_test_15x15_ok.npz",
    },
}


def parse_clues(
    clue_row: np.ndarray, grid_size: int, max_clue_len: int
) -> tuple[list[list[int]], list[list[int]]]:
    """Parse a flat clue array into row clues and column clues."""
    half = len(clue_row) // 2

    row_clues_flat = clue_row[:half].reshape(grid_size, max_clue_len)
    col_clues_flat = clue_row[half:].reshape(grid_size, max_clue_len)

    row_clues = []
    for clue in row_clues_flat:
        non_zero = [int(c) for c in clue if c > 0]
        row_clues.append(non_zero if non_zero else [])

    col_clues = []
    for clue in col_clues_flat:
        non_zero = [int(c) for c in clue if c > 0]
        col_clues.append(non_zero if non_zero else [])

    return row_clues, col_clues


def solution_to_string(solution_row: np.ndarray) -> str:
    """Convert solution array to string of 1s and 0s."""
    return "".join(str(int(c)) for c in solution_row)


def is_valid_puzzle(
    row_clues: list[list[int]],
    col_clues: list[list[int]],
    solution: np.ndarray,
    grid_size: int,
) -> bool:
    """Check if puzzle meets our quality criteria."""
    # 1. Every row and column must have at least one clue
    if any(len(clue) == 0 for clue in row_clues):
        return False
    if any(len(clue) == 0 for clue in col_clues):
        return False

    # 2. Fill ratio between 30-70%
    fill_ratio = solution.sum() / len(solution)
    if fill_ratio < 0.30 or fill_ratio > 0.70:
        return False

    # 3. At least one row or column has 2+ clue groups (complexity)
    has_multiple_groups = any(len(clue) >= 2 for clue in row_clues) or any(
        len(clue) >= 2 for clue in col_clues
    )
    if not has_multiple_groups:
        return False

    return True


def format_clues_canonical(
    row_clues: list[list[int]], col_clues: list[list[int]]
) -> str:
    """Format clues in the canonical text format for the LLM prompt."""
    lines = ["Row clues:"]
    for i, clue in enumerate(row_clues):
        clue_str = " ".join(str(c) for c in clue) if clue else "-"
        lines.append(f"  Row {i + 1}: {clue_str}")

    lines.append("")
    lines.append("Column clues:")
    for i, clue in enumerate(col_clues):
        clue_str = " ".join(str(c) for c in clue) if clue else "-"
        lines.append(f"  Column {i + 1}: {clue_str}")

    return "\n".join(lines)


def extract_puzzles(
    grid_size: int, count: int, data_dir: Path, seed: int = 42
) -> list[dict]:
    """Extract valid puzzles for a given grid size."""
    config = CONFIGS[grid_size]

    clues_path = data_dir / config["clues"]
    solutions_path = data_dir / config["solutions"]

    print(f"Loading {grid_size}x{grid_size} data...")
    print(f"  Clues: {clues_path}")
    print(f"  Solutions: {solutions_path}")

    clues_data = np.load(clues_path)["arr_0"]
    solutions_data = np.load(solutions_path)["arr_0"]

    total = len(clues_data)
    print(f"  Total puzzles: {total:,}")

    # Find all valid puzzle indices
    print("  Filtering valid puzzles...")
    valid_indices = []

    # Sample strategically to avoid scanning all 33M entries for 5x5
    if total > 100000:
        # For large datasets, sample random indices to check
        rng = np.random.default_rng(seed)
        sample_indices = rng.choice(total, size=min(50000, total), replace=False)
    else:
        sample_indices = range(total)

    for idx in sample_indices:
        row_clues, col_clues = parse_clues(
            clues_data[idx], grid_size, config["max_clue_len"]
        )
        if is_valid_puzzle(row_clues, col_clues, solutions_data[idx], grid_size):
            valid_indices.append(idx)
            if len(valid_indices) >= count * 10:  # Get 10x what we need for selection
                break

    print(f"  Found {len(valid_indices)} valid puzzles")

    if len(valid_indices) < count:
        raise ValueError(f"Only found {len(valid_indices)} valid puzzles, need {count}")

    # Randomly select from valid puzzles
    rng = np.random.default_rng(seed)
    selected_indices = rng.choice(valid_indices, size=count, replace=False)

    puzzles = []
    for idx in selected_indices:
        row_clues, col_clues = parse_clues(
            clues_data[idx], grid_size, config["max_clue_len"]
        )
        solution = solution_to_string(solutions_data[idx])

        puzzles.append(
            {
                "index": int(idx),
                "height": grid_size,
                "width": grid_size,
                "clues": {
                    "canonical": format_clues_canonical(row_clues, col_clues),
                    "rows": row_clues,
                    "columns": col_clues,
                },
                "solution": solution,
            }
        )

    return puzzles


def generate_typescript(puzzles: list[dict], grid_size: int) -> str:
    """Generate TypeScript file content for puzzles."""
    lines = [
        'import { codeBlock } from "common-tags";',
        'import type { Puzzle } from "./types";',
        "",
        f"export const PUZZLES_{grid_size}X{grid_size}: Puzzle[] = [",
    ]

    for puzzle in puzzles:
        canonical = puzzle["clues"]["canonical"]
        # Escape backticks if any
        canonical_escaped = canonical.replace("`", "\\`")

        lines.append("  {")
        lines.append("    clues: {")
        lines.append("      canonical: codeBlock`")
        for line in canonical_escaped.split("\n"):
            lines.append(f"        {line}")
        lines.append("      `,")
        lines.append("    },")
        lines.append(f"    height: {puzzle['height']},")
        lines.append(f"    width: {puzzle['width']},")
        lines.append(f'    solution: "{puzzle["solution"]}",')
        lines.append("  },")

    lines.append("];")
    lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Extract valid nonogram puzzles")
    parser.add_argument(
        "--size",
        type=int,
        choices=[5, 10, 15],
        help="Grid size to extract (5, 10, or 15). If not specified, extracts all.",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=5,
        help="Number of puzzles to extract per size (default: 5)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Output directory for TypeScript files",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON instead of TypeScript",
    )
    args = parser.parse_args()

    data_dir = Path(__file__).parent
    sizes = [args.size] if args.size else [5, 10, 15]

    all_puzzles = {}
    for size in sizes:
        puzzles = extract_puzzles(size, args.count, data_dir, args.seed)
        all_puzzles[size] = puzzles

        if args.json:
            print(json.dumps(puzzles, indent=2))
        elif args.output_dir:
            output_path = args.output_dir / f"puzzles-{size}x{size}.ts"
            ts_content = generate_typescript(puzzles, size)
            output_path.write_text(ts_content)
            print(f"  Written to: {output_path}")
        else:
            print(generate_typescript(puzzles, size))


if __name__ == "__main__":
    main()
