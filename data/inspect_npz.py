#!/usr/bin/env python3
"""
Inspects all .npz files in the data directory and outputs detailed analysis
to a .txt file with the same name in the same location.

These files contain nonogram puzzles:
- X/train files: Clues (row clues + column clues, padded)
- Y/target files: Solutions (flattened grids, binary)
"""

import numpy as np
from pathlib import Path


def detect_grid_size(arr: np.ndarray, array_name: str, file_name: str) -> int | None:
    """Try to detect the grid size (5, 10, 15) from the data shape."""
    cols = arr.shape[1] if arr.ndim > 1 else arr.shape[0]

    # For solution arrays (y/target): cols = grid_size^2
    if "y_" in file_name.lower() or "target" in file_name.lower():
        for size in [5, 10, 15, 20, 25]:
            if cols == size * size:
                return size

    # For clue arrays (x/train): cols = 2 * grid_size * max_clue_len
    # 5x5: max_clue_len=3, so 5*3*2=30
    # 10x10: max_clue_len=5, so 10*5*2=100
    # 15x15: max_clue_len=8, so 15*8*2=240
    if "x_" in file_name.lower() or "train" in file_name.lower():
        clue_configs = [
            (5, 3, 30),  # 5x5 grid, max 3 clues, 30 total
            (10, 5, 100),  # 10x10 grid, max 5 clues, 100 total
            (15, 8, 240),  # 15x15 grid, max 8 clues, 240 total
        ]
        for size, max_clue, total in clue_configs:
            if cols == total:
                return size

    return None


def format_as_grid(arr_1d: np.ndarray, grid_size: int) -> str:
    """Format a 1D array as a 2D grid visualization."""
    if len(arr_1d) != grid_size * grid_size:
        return f"  Cannot format as {grid_size}x{grid_size} grid (got {len(arr_1d)} elements)"

    grid = arr_1d.reshape(grid_size, grid_size)
    lines = []
    for row in grid:
        # Use █ for filled (1), · for empty (0)
        row_str = " ".join("█" if cell else "·" for cell in row)
        lines.append(f"  {row_str}")
    return "\n".join(lines)


def format_clues(arr_1d: np.ndarray, grid_size: int, max_clue_len: int) -> str:
    """Format clue array as row and column clues."""
    expected_len = 2 * grid_size * max_clue_len
    if len(arr_1d) != expected_len:
        return f"  Cannot parse clues (expected {expected_len}, got {len(arr_1d)})"

    lines = []
    half = len(arr_1d) // 2

    # Row clues (first half)
    row_clues = arr_1d[:half].reshape(grid_size, max_clue_len)
    lines.append("  Row clues:")
    for i, clue in enumerate(row_clues):
        # Filter out zero padding
        non_zero = [str(c) for c in clue if c > 0]
        clue_str = " ".join(non_zero) if non_zero else "-"
        lines.append(f"    Row {i}: {clue_str}")

    # Column clues (second half)
    col_clues = arr_1d[half:].reshape(grid_size, max_clue_len)
    lines.append("  Column clues:")
    for i, clue in enumerate(col_clues):
        non_zero = [str(c) for c in clue if c > 0]
        clue_str = " ".join(non_zero) if non_zero else "-"
        lines.append(f"    Col {i}: {clue_str}")

    return "\n".join(lines)


def format_array_analysis(arr: np.ndarray, array_name: str, file_name: str) -> str:
    """Analyze and format array with nonogram-specific insights."""
    lines = []
    lines.append(f"## Array: '{array_name}'")
    lines.append(f"- Shape: {arr.shape}")
    lines.append(f"- Dtype: {arr.dtype}")

    if arr.ndim == 0:
        lines.append(f"- Value: {arr.item()}")
        return "\n".join(lines)

    # Basic statistics
    lines.append(f"- Total elements: {arr.size:,}")
    lines.append(f"- Value range: [{arr.min()}, {arr.max()}]")
    unique_vals = np.unique(arr)
    if len(unique_vals) <= 20:
        lines.append(f"- Unique values: {unique_vals}")
    else:
        lines.append(f"- Unique values count: {len(unique_vals)}")

    # Detect grid size
    grid_size = detect_grid_size(arr, array_name, file_name)
    if grid_size:
        lines.append(f"- Detected grid size: {grid_size}x{grid_size}")

    # For 2D arrays, show sample rows
    if arr.ndim >= 2:
        num_samples = min(5, len(arr))

        # Find interesting rows (not all zeros)
        non_zero_mask = (
            arr.any(axis=1) if arr.ndim == 2 else np.array([True] * len(arr))
        )
        non_zero_indices = np.where(non_zero_mask)[0]

        if len(non_zero_indices) > 0:
            # Sample from non-zero rows
            sample_indices = non_zero_indices[
                np.linspace(0, len(non_zero_indices) - 1, num_samples, dtype=int)
            ]
        else:
            sample_indices = range(num_samples)

        lines.append("")
        lines.append(f"### Sample rows ({num_samples} examples):")

        is_solution = "y_" in file_name.lower() or "target" in file_name.lower()
        is_clue = "x_" in file_name.lower() or (
            "train" in file_name.lower() and "y_" not in file_name.lower()
        )

        for idx in sample_indices:
            row = arr[idx]
            lines.append("")
            lines.append(f"#### Row {idx:,}:")

            if is_solution and grid_size:
                # Visualize as grid
                lines.append(format_as_grid(row, grid_size))
            elif is_clue and grid_size:
                # Parse as clues
                max_clue_configs = {5: 3, 10: 5, 15: 8}
                max_clue_len = max_clue_configs.get(grid_size, 5)
                lines.append(format_clues(row, grid_size, max_clue_len))
            else:
                # Raw display
                if len(row) <= 100:
                    lines.append(f"  {row}")
                else:
                    lines.append(f"  First 50: {row[:50]}")
                    lines.append(f"  Last 50:  {row[-50:]}")

    return "\n".join(lines)


def inspect_npz_file(npz_path: Path) -> str:
    """Inspect an NPZ file and return formatted content."""
    output_lines = []
    output_lines.append(f"# NPZ File: {npz_path.name}")
    output_lines.append(f"Path: {npz_path}")
    output_lines.append("")

    try:
        with np.load(npz_path, allow_pickle=True) as data:
            array_names = list(data.files)
            output_lines.append(f"Contains {len(array_names)} array(s): {array_names}")
            output_lines.append("")

            for name in array_names:
                arr = data[name]
                output_lines.append(format_array_analysis(arr, name, npz_path.name))
                output_lines.append("")
    except Exception as e:
        output_lines.append(f"Error loading file: {e}")

    return "\n".join(output_lines)


def main():
    data_dir = Path(__file__).parent
    npz_files = list(data_dir.rglob("*.npz"))

    print(f"Found {len(npz_files)} .npz files")

    for npz_path in sorted(npz_files):
        print(f"Processing: {npz_path.relative_to(data_dir)}")

        content = inspect_npz_file(npz_path)

        # Write to .txt file with same name
        txt_path = npz_path.with_suffix(".txt")
        txt_path.write_text(content)

        print(f"  -> Created: {txt_path.relative_to(data_dir)}")

    print(f"\nDone! Created {len(npz_files)} .txt files.")


if __name__ == "__main__":
    main()
