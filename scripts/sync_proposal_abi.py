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

# Additional ABIs to sync if present in Ape manifest
CONTRACTS_TO_SYNC = {
  "ProposalContract": REPO_ROOT / "app" / "src" / "abis" / "ProposalContract.json",
  "ERC1155": REPO_ROOT / "app" / "src" / "abis" / "ERC1155.json",
  "GovernanceHub": REPO_ROOT / "app" / "src" / "abis" / "GovernanceHub.json",
  "ProposalTemplate": REPO_ROOT / "app" / "src" / "abis" / "ProposalTemplate.json",
  "CommentTemplate": REPO_ROOT / "app" / "src" / "abis" / "CommentTemplate.json",
}


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


def _load_contract_types(path: Path):
  data = json.loads(path.read_text())
  return data.get("contractTypes") or {}


def _sync_one(name: str, abi, out_path: Path) -> bool:
  """
  Write ABI to out_path if changed.
  Returns True if file was updated.
  """
  new_hash = abi_hash(abi)
  if out_path.exists():
    try:
      current = json.loads(out_path.read_text())
      old_hash = abi_hash(current)
    except Exception:
      old_hash = "(invalid)"
  else:
    old_hash = "(none)"

  if old_hash == new_hash:
    print(f"[OK] {name}: no changes (hash={new_hash})")
    return False

  out_path.parent.mkdir(parents=True, exist_ok=True)
  out_path.write_text(json.dumps(abi, indent=2, sort_keys=True) + "\n", encoding="utf-8")
  print(f"[UPDATED] {name} ABI -> {out_path} (old={old_hash}, new={new_hash})")
  return True


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
  manifest = _find_ape_artifact()
  contract_types = _load_contract_types(manifest)

  any_updates = False
  for name, out_path in CONTRACTS_TO_SYNC.items():
    entry = contract_types.get(name)
    if not entry:
      print(f"[SKIP] {name}: not found in Ape manifest.")
      continue
    abi = entry.get("abi")
    if not abi:
      print(f"[WARN] {name}: found but missing 'abi' field. Skipping.")
      continue
    updated = _sync_one(name, abi, out_path)
    any_updates = any_updates or updated

  if not any_updates:
    print("All ABIs are up-to-date.")


if __name__ == "__main__":
  main()


