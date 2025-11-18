"""
Compile contracts with Ape and sync the ProposalContract ABI into the frontend.

Usage (from repo root):
    python scripts/compile_and_sync_proposal_abi.py

This will:
  1. Run `ape compile` to ensure the latest artifacts are built.
  2. Call `scripts.sync_proposal_abi.main()` to update `app/src/abis/ProposalContract.json`.
"""

from pathlib import Path
import subprocess
import sys


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]

    # Step 1: Compile contracts with Ape
    print("=== Compiling contracts with Ape ===")
    try:
        subprocess.run(
            ["ape", "compile"],
            check=True,
            cwd=repo_root,
        )
    except subprocess.CalledProcessError as exc:
        print(f"'ape compile' failed with exit code {exc.returncode}", file=sys.stderr)
        raise SystemExit(exc.returncode)

    # Step 2: Sync ABI into frontend
    print("=== Syncing ProposalContract ABI into frontend ===")
    from scripts.sync_proposal_abi import main as sync_main

    sync_main()


if __name__ == "__main__":
    main()


