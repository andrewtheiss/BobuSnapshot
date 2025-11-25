"""
Deploy GovernanceHub + its ProposalTemplate and CommentTemplate using Ape,
then auto-update the frontend config with the deployed GovernanceHub address.

Script order: 01
File name    : deploy_01_governance_hub_and_templates.py

Networks
--------
- Works with sepolia and mainnet based on `--network`.

Examples
--------
- Sepolia:
    ape run deploy_01_governance_hub_and_templates --network ethereum:sepolia:alchemy

- Mainnet:
    ape run deploy_01_governance_hub_and_templates --network ethereum:mainnet:alchemy

Environment overrides (optional)
--------------------------------
- DEPLOYER_ACCOUNT_ALIAS  (default: deployer)
- BOBU_MULTISIG           (default: accounts[1])
- ELECTED_ADMIN_1/2/3     (default: accounts[2..4])
- FORCE_REDEPLOY=1        (or pass --force) re-compiles before deploy

After deployment
----------------
- Writes GovernanceHub address into app/src/config/contracts.ts for the active env (testnet/mainnet).
- Syncs ABIs into app/src/abis/*.json.
"""

import os
import re
from pathlib import Path
import shutil
import subprocess
import sys

from ape import accounts, networks, project


ENV_DEPLOYER_ALIAS = "DEPLOYER_ACCOUNT_ALIAS"
ENV_BOBU = "BOBU_MULTISIG"
ENV_E1 = "ELECTED_ADMIN_1"
ENV_E2 = "ELECTED_ADMIN_2"
ENV_E3 = "ELECTED_ADMIN_3"
ENV_FORCE = "FORCE_REDEPLOY"


def _get_env(name: str) -> str | None:
  value = os.environ.get(name)
  if value:
    value = value.strip()
    if value == "":
      return None
    return value
  return None


def _update_frontend_governance_hub(env_key: str, hub_address: str) -> None:
  """
  Patch `app/src/config/contracts.ts` so the correct env entry
  (`testnet` or `mainnet`) uses the freshly deployed GovernanceHub address.
  """
  repo_root = Path(__file__).resolve().parents[1]
  ts_path = repo_root / "app" / "src" / "config" / "contracts.ts"

  if not ts_path.exists():
    print(f"[WARN] contracts.ts not found at {ts_path}, skipping frontend config update.")
    return

  content = ts_path.read_text(encoding="utf-8")

  # Replace only governanceHub.address within the target env block
  pattern = rf"({env_key}:\s*{{[\s\S]*?governanceHub:\s*{{[\s\S]*?address:\s*')0x[0-9a-fA-F]{{40}}(')"

  def _repl(match):
    prefix = match.group(1)
    suffix = match.group(2)
    return f"{prefix}{hub_address}{suffix}"

  new_content, count = re.subn(pattern, _repl, content, flags=re.DOTALL)

  if count == 0:
    print(f"[WARN] Did not find governanceHub.address for env '{env_key}' in contracts.ts.")
    return

  ts_path.write_text(new_content, encoding="utf-8")
  print(f"[OK] Updated frontend contracts.ts for env '{env_key}' with GovernanceHub address {hub_address}")


def main():
  argv = [a.lower() for a in sys.argv[1:]]
  force = ("--force" in argv) or (_get_env(ENV_FORCE) == "1")

  repo_root = Path(__file__).resolve().parents[1]
  build_dir = repo_root / ".build"

  if force:
    print("=== FORCE MODE ENABLED ===")
    if build_dir.exists():
      print(f"Removing build folder: {build_dir}")
      shutil.rmtree(build_dir)
    print("Running 'ape compile'...")
    subprocess.run(["ape", "compile"], check=True, cwd=repo_root)

  provider = networks.provider
  network = provider.network

  print("=== GovernanceHub deployment ===")
  print(f"Active network : {network.ecosystem.name}:{network.name}")
  print(f"Provider       : {provider.name}")

  deployer_alias = _get_env(ENV_DEPLOYER_ALIAS) or "deployer"
  print(f"Loading deployer account alias: {deployer_alias!r}")
  deployer = accounts.load(deployer_alias)
  print(f"Deployer address: {deployer.address}")

  is_mainnet = network.ecosystem.name == "ethereum" and network.name == "mainnet"
  is_sepolia = network.ecosystem.name == "ethereum" and network.name == "sepolia"
  env_key = "mainnet" if is_mainnet else "testnet" if is_sepolia else None
  if env_key is None:
    print("[WARN] Unknown network; will still deploy but cannot auto-update frontend env mapping.")

  bobu = _get_env(ENV_BOBU)
  e1 = _get_env(ENV_E1)
  e2 = _get_env(ENV_E2)
  e3 = _get_env(ENV_E3)

  # Helper to safely get an account by index, falling back to deployer
  def _addr_or_default(idx: int, default_addr: str) -> str:
    try:
      return accounts[idx].address  # type: ignore[index]
    except Exception:
      return default_addr

  if not bobu or not e1 or not e2 or not e3:
    print("[INFO] Role addresses not fully provided; falling back to deployer if no indexed account exists.")
    default_addr = deployer.address
    bobu = bobu or _addr_or_default(1, default_addr)
    e1 = e1 or _addr_or_default(2, default_addr)
    e2 = e2 or _addr_or_default(3, default_addr)
    e3 = e3 or _addr_or_default(4, default_addr)

  print("Deploying ProposalTemplate...")
  proposal_template = deployer.deploy(project.ProposalTemplate)
  print(f"ProposalTemplate: {proposal_template.address}")

  print("Deploying CommentTemplate...")
  comment_template = deployer.deploy(project.CommentTemplate)
  print(f"CommentTemplate: {comment_template.address}")

  print("Deploying GovernanceHub...")
  hub = deployer.deploy(
    project.GovernanceHub,
    bobu,
    proposal_template.address,
    comment_template.address,
    e1,
    e2,
    e3,
  )
  hub_address = hub.address
  print(f"[OK] GovernanceHub deployed at: {hub_address}")

  if env_key:
    try:
      _update_frontend_governance_hub(env_key, hub_address)
    except Exception as exc:  # noqa: BLE001
      print(f"[WARN] Failed to update frontend contracts.ts: {exc!r}")

  try:
    sys.path.insert(0, str((repo_root / "scripts").resolve()))
    from sync_proposal_abi import main as sync_abi_main  # type: ignore[import]
    print("Syncing ABIs into frontend...")
    sync_abi_main()
  except Exception as exc:  # noqa: BLE001
    print(f"[WARN] Failed to sync frontend ABIs: {exc!r}")


if __name__ == "__main__":
  main()


