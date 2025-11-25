"""
Deploy ProposalContract (optionally with a fresh ERC1155 on testnets), and
auto-update the frontend config with the deployed ProposalContract address.

Script order: 02
File name    : deploy_02_proposal_contract.py

Networks
--------
- Works with sepolia and mainnet based on `--network`.

Examples
--------
- Sepolia:
    ape run deploy_02_proposal_contract --network ethereum:sepolia:alchemy
    # Force recompile + deploy fresh ERC1155 for gating:
    ape run deploy_02_proposal_contract --network ethereum:sepolia:alchemy -- --force --fresh-erc1155

- Mainnet:
    ape run deploy_02_proposal_contract --network ethereum:mainnet:alchemy
    # Optionally override gating token:
    PROPOSAL_TOKEN_CONTRACT=0xYourMainnet1155 PROPOSAL_TOKEN_ID=1 \
      ape run deploy_02_proposal_contract --network ethereum:mainnet:alchemy

Environment overrides
---------------------
- DEPLOYER_ACCOUNT_ALIAS  (default: deployer)
- PROPOSAL_TOKEN_CONTRACT (optional; if unset on testnet, deploy a fresh ERC1155)
- PROPOSAL_TOKEN_ID       (default: 1 on testnet; mainnet defaults to Bobu token id 1)
- FORCE_REDEPLOY=1        (or pass --force) re-compiles before deploy
- FORCE_DEPLOY_ERC1155=1  (or pass --fresh-erc1155) deploy fresh ERC1155 even if env is set

After deployment
----------------
- Writes ProposalContract address into app/src/config/contracts.ts for the active env (testnet/mainnet).
- Syncs ABIs into app/src/abis/*.json.
"""

import os
import re
from pathlib import Path
import shutil
import subprocess
import sys

from ape import accounts, networks, project


ENV_TOKEN_CONTRACT = "PROPOSAL_TOKEN_CONTRACT"
ENV_TOKEN_ID = "PROPOSAL_TOKEN_ID"
ENV_DEPLOYER_ALIAS = "DEPLOYER_ACCOUNT_ALIAS"
ENV_FORCE = "FORCE_REDEPLOY"
ENV_FORCE_ERC1155 = "FORCE_DEPLOY_ERC1155"

# Mainnet Bobu ERC1155 defaults
MAINNET_BOBU_ERC1155 = "0x2079812353E2C9409a788FBF5f383fa62aD85bE8"
MAINNET_BOBU_TOKEN_ID = 1  # Change if your Bobu token ID differs

# Default token ID for testnets / custom ERC1155
DEFAULT_TESTNET_TOKEN_ID = 1


def _get_env(name: str) -> str | None:
  value = os.getenv(name)
  if value is None or value.strip() == "":
    return None
  return value.strip()


def _update_frontend_proposal_contract(env_key: str, proposal_address: str) -> None:
  """
  Patch `app/src/config/contracts.ts` so the correct env entry uses the freshly
  deployed ProposalContract address (scoped precisely to proposalContract.address).
  """
  repo_root = Path(__file__).resolve().parents[1]
  ts_path = repo_root / "app" / "src" / "config" / "contracts.ts"

  if not ts_path.exists():
    print(f"[WARN] contracts.ts not found at {ts_path}, skipping frontend config update.")
    return

  content = ts_path.read_text(encoding="utf-8")

  pattern = rf"({env_key}:\s*{{[\s\S]*?proposalContract:\s*{{[\s\S]*?address:\s*')0x[0-9a-fA-F]{{40}}(')"

  def _repl(match):  # type: ignore[no-redef]
    prefix = match.group(1)
    suffix = match.group(2)
    return f"{prefix}{proposal_address}{suffix}"

  new_content, count = re.subn(pattern, _repl, content, flags=re.DOTALL)

  if count == 0:
    print(f"[WARN] Did not find proposalContract.address for env '{env_key}' in contracts.ts.")
    return

  ts_path.write_text(new_content, encoding="utf-8")
  print(f"[OK] Updated frontend contracts.ts for env '{env_key}' with ProposalContract address {proposal_address}")


def main():
  argv = [a.lower() for a in sys.argv[1:]]
  force = ("--force" in argv) or (_get_env(ENV_FORCE) == "1")
  fresh_erc1155 = ("--fresh-erc1155" in argv) or (_get_env(ENV_FORCE_ERC1155) == "1")

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

  print("=== ProposalContract deployment ===")
  print(f"Active network : {network.ecosystem.name}:{network.name}")
  print(f"Provider       : {provider.name}")

  deployer_alias = _get_env(ENV_DEPLOYER_ALIAS) or "deployer"
  print(f"Loading deployer account alias: {deployer_alias!r}")
  deployer = accounts.load(deployer_alias)
  print(f"Deployer address: {deployer.address}")

  is_mainnet = network.ecosystem.name == "ethereum" and network.name == "mainnet"
  is_sepolia = network.ecosystem.name == "ethereum" and network.name == "sepolia"

  token_contract_env = _get_env(ENV_TOKEN_CONTRACT)
  token_id_env = _get_env(ENV_TOKEN_ID)

  if is_mainnet:
    if token_contract_env:
      token_contract = token_contract_env
      print(f"Using {ENV_TOKEN_CONTRACT} override on mainnet: {token_contract}")
    else:
      token_contract = MAINNET_BOBU_ERC1155
      print(f"No {ENV_TOKEN_CONTRACT} set on mainnet; using Bobu ERC1155: {token_contract}")

    if token_id_env is not None:
      try:
        token_id = int(token_id_env)
      except ValueError as exc:
        raise RuntimeError(f"{ENV_TOKEN_ID} must be an integer, got: {token_id_env!r}") from exc
      print(f"Using {ENV_TOKEN_ID} override on mainnet: {token_id}")
    else:
      token_id = MAINNET_BOBU_TOKEN_ID
      print(f"No {ENV_TOKEN_ID} set on mainnet; defaulting to MAINNET_BOBU_TOKEN_ID={token_id}")
  else:
    if token_contract_env and not fresh_erc1155:
      token_contract = token_contract_env
      print(f"Using {ENV_TOKEN_CONTRACT} override: {token_contract}")
    else:
      print(f"{'(force) ' if fresh_erc1155 else ''}No usable {ENV_TOKEN_CONTRACT} set; deploying fresh ERC1155 for this network...")
      erc1155 = deployer.deploy(project.ERC1155)
      token_contract = erc1155.address
      print(f"Deployed ERC1155 at: {token_contract}")

    if token_id_env is not None:
      try:
        token_id = int(token_id_env)
      except ValueError as exc:
        raise RuntimeError(f"{ENV_TOKEN_ID} must be an integer, got: {token_id_env!r}") from exc
      print(f"Using {ENV_TOKEN_ID} override: {token_id}")
    else:
      token_id = DEFAULT_TESTNET_TOKEN_ID
      print(f"No {ENV_TOKEN_ID} set; defaulting to DEFAULT_TESTNET_TOKEN_ID={token_id}")

  print(f"Final token contract : {token_contract}")
  print(f"Final token ID       : {token_id}")

  print("Deploying ProposalContract...")
  contract = deployer.deploy(project.ProposalContract, token_contract, token_id)

  print("Deployment complete.")
  print(f"ProposalContract address: {contract.address}")

  try:
    if is_mainnet:
      _update_frontend_proposal_contract("mainnet", contract.address)
    elif is_sepolia:
      _update_frontend_proposal_contract("testnet", contract.address)
    else:
      print(f"[INFO] Network '{network.name}' not mapped to frontend env (testnet/mainnet); skipping contracts.ts update.")
  except Exception as exc:  # noqa: BLE001
    print(f"[WARN] Failed to update frontend contracts.ts: {exc!r}")

  try:
    from scripts.sync_proposal_abi import main as sync_abi_main
    print("Syncing ABIs into frontend...")
    sync_abi_main()
  except Exception as exc:  # noqa: BLE001
    print(f"[WARN] Failed to sync frontend ABI: {exc!r}")


if __name__ == "__main__":
  main()


