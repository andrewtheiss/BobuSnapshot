"""
Sync the ProposalContract ABI from Ape build artifacts into the frontend.

Usage (from repo root):
    python scripts/sync_proposal_abi.py

You can also wire this into the frontend package.json, e.g.:
    "scripts": {
      "sync:abi": "python ../scripts/sync_proposal_abi.py"
    }
"""

import hashlib
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# Frontend ABI file (this is what wagmi/viem imports)
FRONTEND_ABI = REPO_ROOT / "app" / "src" / "abis" / "ProposalContract.json"


def _find_ape_artifact() -> Path:
  """
  Ape is generating a single __local__.json manifest with all ABIs under .build/.
  We load that file and extract the ProposalContract ABI from the "contractTypes" map.
  """
  build_root = REPO_ROOT / ".build"
  if not build_root.exists():
    raise SystemExit(f"Ape build folder not found at {build_root}. Run `ape compile` first.")

  manifest = build_root / "__local__.json"
  if not manifest.exists():
    raise SystemExit(
      f"Ape local build manifest not found at {manifest}. "
      "Ensure `ape compile` ran successfully."
    )

  print(f"Using Ape manifest at: {manifest}")
  return manifest


def load_abi_from_artifact(path: Path):
  data = json.loads(path.read_text())
  # For the __local__.json manifest, ABIs live under:
  #   data["contractTypes"]["ProposalContract"]["abi"]
  ct = data.get("contractTypes") or {}
  pc = ct.get("ProposalContract")
  if not pc:
    raise KeyError("Could not find 'ProposalContract' in Ape manifest contractTypes.")
  abi = pc.get("abi")
  if not abi:
    raise KeyError("Could not find 'abi' for ProposalContract in Ape manifest.")
  return abi


def abi_hash(abi) -> str:
  """Return a stable hash for the ABI structure."""
  normalized = json.dumps(abi, sort_keys=True, separators=(",", ":"))
  return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def main():
  ape_artifact = _find_ape_artifact()

  source_abi = load_abi_from_artifact(ape_artifact)
  source_hash = abi_hash(source_abi)

  if FRONTEND_ABI.exists():
    current_abi = json.loads(FRONTEND_ABI.read_text())
    current_hash = abi_hash(current_abi)
  else:
    current_abi = None
    current_hash = None

  print(f"Source ABI hash:   {source_hash}")
  print(f"Frontend ABI hash: {current_hash or '(none)'}")

  if current_hash == source_hash:
    print("ABIs match. No update needed.")
    return

  FRONTEND_ABI.write_text(
    json.dumps(source_abi, indent=2, sort_keys=True) + "\n",
    encoding="utf-8",
  )
  print(f"Frontend ABI updated at {FRONTEND_ABI}")


if __name__ == "__main__":
  main()


