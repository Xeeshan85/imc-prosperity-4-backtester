"""
prosperity4mc — Monte Carlo launcher for IMC Prosperity 4.

This is a thin CLI shim bundled with prosperity4btx that locates and launches
the Monte Carlo engine from the imc-prosperity-4 repository.

IMPORTANT
---------
The actual Monte Carlo simulation is powered by a **Rust binary** in a
separate repository (imc-prosperity-4). This command is NOT a self-contained
Python package — it is a convenience launcher that:

  1. Locates the imc-prosperity-4 repo (via env var or auto-discovery).
  2. Verifies Rust/Cargo and the Python venv are installed there.
  3. Forwards all CLI arguments to ``prosperity4mcbt`` inside that venv.

If you have not set up the imc-prosperity-4 repo yet, this command will print
step-by-step setup instructions.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

# ── Constants ─────────────────────────────────────────────────────────────────

ENV_MC_REPO = "PROSPERITY4MC_REPO"
MC_REPO_NAME = "imc-prosperity-4"
MC_BACKTESTER_SUBDIR = "backtester"
MC_VENV_PYTHON_CANDIDATES = [
    Path(".venv") / "bin" / "python",       # Unix
    Path(".venv") / "Scripts" / "python.exe",  # Windows
]


# ── Repo discovery ────────────────────────────────────────────────────────────

def _find_mc_repo() -> Path | None:
    """Return the root of the imc-prosperity-4 repo or None if not found."""

    # 1. Explicit env var (highest priority)
    if env := os.environ.get(ENV_MC_REPO):
        p = Path(env).expanduser().resolve()
        if _looks_like_mc_repo(p):
            return p
        print(f"Warning: {ENV_MC_REPO}={env!r} does not look like the imc-prosperity-4 repo.")

    # 2. Auto-discover: common relative locations
    anchors = [
        Path.cwd(),
        Path(__file__).resolve().parents[2],  # up from prosperity4bt/
    ]
    for anchor in anchors:
        for candidate in [
            anchor / MC_REPO_NAME,
            anchor / ".." / MC_REPO_NAME,
            anchor / ".." / ".." / MC_REPO_NAME,
        ]:
            resolved = candidate.resolve()
            if _looks_like_mc_repo(resolved):
                return resolved

    return None


def _looks_like_mc_repo(path: Path) -> bool:
    return (path / MC_BACKTESTER_SUBDIR).is_dir() and (
        (path / "rust_simulator").is_dir()
        or (path / MC_BACKTESTER_SUBDIR / "prosperity4mcbt").is_dir()
    )


def _venv_python(mc_repo: Path) -> Path | None:
    bt = mc_repo / MC_BACKTESTER_SUBDIR
    for rel in MC_VENV_PYTHON_CANDIDATES:
        candidate = bt / rel
        if candidate.exists():
            return candidate
    return None


# ── Setup-instructions helper ─────────────────────────────────────────────────

def _print_setup_instructions(reason: str) -> None:
    print(f"\n[prosperity4mc] Error: {reason}\n")
    print("─" * 60)
    print("Monte Carlo requires a SEPARATE repo + Rust.")
    print("Follow these one-time setup steps:\n")
    print("  # 1. Clone the imc-prosperity-4 repo")
    print("  git clone https://github.com/<owner>/imc-prosperity-4")
    print()
    print("  # 2. Install Rust (if not already installed)")
    print("  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh")
    print("  source $HOME/.cargo/env")
    print()
    print("  # 3. Install Python dependencies (requires uv)")
    print("  cd imc-prosperity-4/backtester")
    print("  pip install uv   # if uv is not installed")
    print("  uv venv && source .venv/bin/activate")
    print("  uv sync")
    print()
    print("  # 4. (Optional) tell prosperity4mc where the repo lives:")
    print(f"  export {ENV_MC_REPO}=/path/to/imc-prosperity-4")
    print()
    print("  # 5. Now run Monte Carlo via prosperity4mc:")
    print("  prosperity4mc your_algo.py --sessions 200")
    print()
    print("  # Or run directly inside the MC repo (no env var needed):")
    print("  cd imc-prosperity-4/backtester")
    print("  prosperity4mcbt your_algo.py --sessions 200")
    print("─" * 60 + "\n")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    mc_repo = _find_mc_repo()
    if mc_repo is None:
        _print_setup_instructions(
            f"Could not find the {MC_REPO_NAME!r} repository.\n"
            f"  Set the {ENV_MC_REPO} environment variable to its path, or\n"
            "  clone it as a sibling of the imc-prosperity-4-backtester repo."
        )
        sys.exit(1)

    if shutil.which("cargo") is None:
        _print_setup_instructions(
            "Rust/Cargo is not installed or not on PATH.\n"
            "  Install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        )
        sys.exit(1)

    python = _venv_python(mc_repo)
    if python is None:
        bt = mc_repo / MC_BACKTESTER_SUBDIR
        _print_setup_instructions(
            f"No Python venv found in {bt}.\n"
            f"  Run: cd {bt} && uv sync"
        )
        sys.exit(1)

    cmd = [str(python), "-m", "prosperity4mcbt"] + sys.argv[1:]
    result = subprocess.run(cmd, cwd=str(mc_repo / MC_BACKTESTER_SUBDIR))
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
