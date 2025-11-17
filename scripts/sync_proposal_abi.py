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

# TODO: Update this path to point at your Ape artifact for ProposalContract.
# Common patterns:
#   .build/ProposalContract.json
#   .build/ethereum/sepolia/ProposalContract.json
#   .build/local/ProposalContract.json
APE_ARTIFACT = REPO_ROOT / ".build" / "ProposalContract.json"

# Frontend ABI file (this is what wagmi/viem imports)
FRONTEND_ABI = REPO_ROOT / "app" / "src" / "abis" / "ProposalContract.json"


def load_abi_from_artifact(path: Path):
  data = json.loads(path.read_text())
  # Adjust this if Ape stores the ABI under a different key
  # e.g. data["contract"]["abi"] or data["abi"]
  if "abi" in data:
    return data["abi"]
  raise KeyError("Could not find 'abi' in Ape artifact JSON. Adjust load_abi_from_artifact().")


def abi_hash(abi) -> str:
  """Return a stable hash for the ABI structure."""
  normalized = json.dumps(abi, sort_keys=True, separators=(",", ":"))
  return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def main():
  if not APE_ARTIFACT.exists():
    raise SystemExit(f"Ape artifact not found at {APE_ARTIFACT}. Update APE_ARTIFACT in sync_proposal_abi.py.")

  source_abi = load_abi_from_artifact(APE_ARTIFACT)
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


