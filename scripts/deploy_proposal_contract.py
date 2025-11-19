"""
Deploy the ProposalContract Vyper contract using Ape.

This script is network-agnostic and works with both **sepolia** and **mainnet**,
depending on the `--network` flag you pass to `ape run`.

Usage examples
--------------

1) Make sure you have:
   - Installed Ape & plugins (see DEVELOP.md).
   - Imported a deployer account into Ape (e.g. alias `deployer`).
   - (Optional) Set environment overrides:

       # If set, these override all defaults on any network:
       export PROPOSAL_TOKEN_CONTRACT=0xYourErc1155Address
       export PROPOSAL_TOKEN_ID=1
       # Optional (defaults to "deployer"):
       export DEPLOYER_ACCOUNT_ALIAS=deployer

2) Deploy to Sepolia (testnet):

       # On sepolia, if PROPOSAL_TOKEN_CONTRACT is not set,
       # this script deploys a fresh ERC1155 and uses it.
       ape run deploy_proposal_contract --network ethereum:sepolia:alchemy

3) Deploy to Mainnet:

       # On mainnet, if no overrides are set, this script uses
       # the existing Bobu ERC1155 contract as the gate.
       ape run deploy_proposal_contract --network ethereum:mainnet:alchemy

After deployment
----------------
- Note the deployed address printed by this script.
- Update `app/src/config/contracts.ts`:
    - For Sepolia, set `CONTRACTS_BY_ENV.testnet.proposalContract.address`.
    - For Mainnet, set `CONTRACTS_BY_ENV.mainnet.proposalContract.address`.
- Run the ABI sync script if the contract ABI changed:

       python scripts/sync_proposal_abi.py
"""

import os
import re
from pathlib import Path

from ape import accounts, networks, project


ENV_TOKEN_CONTRACT = "PROPOSAL_TOKEN_CONTRACT"
ENV_TOKEN_ID = "PROPOSAL_TOKEN_ID"
ENV_DEPLOYER_ALIAS = "DEPLOYER_ACCOUNT_ALIAS"

# Mainnet Bobu ERC1155 defaults
MAINNET_BOBU_ERC1155 = "0x2079812353E2C9409a788FBF5f383fa62aD85bE8"
MAINNET_BOBU_TOKEN_ID = 1  # Change if your Bobu token ID differs

# Default token ID for testnets / custom ERC1155
DEFAULT_TESTNET_TOKEN_ID = 1


def _get_env(name: str) -> str | None:
    """
    Thin wrapper around os.getenv so we can log/validate where needed.
    """
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return None
    return value.strip()


def _update_frontend_contracts(env_key: str, proposal_address: str) -> None:
    """
    Patch `app/src/config/contracts.ts` so the correct env entry
    (`testnet` or `mainnet`) uses the freshly deployed ProposalContract address.
    """
    repo_root = Path(__file__).resolve().parents[1]
    ts_path = repo_root / "app" / "src" / "config" / "contracts.ts"

    if not ts_path.exists():
        print(f"[WARN] contracts.ts not found at {ts_path}, skipping frontend config update.")
        return

    content = ts_path.read_text(encoding="utf-8")

    # Match the env block and replace the address inside it.
    # Example we target:
    #   testnet: {
    #     proposalContract: {
    #       address: '0x....',
    #       abi: ABIS.ProposalContract,
    #     },
    #   },
    pattern = rf"({env_key}:\s*{{\s*.*?address:\s*')0x[0-9a-fA-F]{{40}}(')"

    def _repl(match: re.Match) -> str:  # type: ignore[type-arg]
        prefix = match.group(1)
        suffix = match.group(2)
        return f"{prefix}{proposal_address}{suffix}"

    new_content, count = re.subn(pattern, _repl, content, flags=re.DOTALL)

    if count == 0:
        print(f"[WARN] Did not find an address entry to update for env '{env_key}' in contracts.ts.")
        return

    ts_path.write_text(new_content, encoding="utf-8")
    print(f"[OK] Updated frontend contracts.ts for env '{env_key}' with ProposalContract address {proposal_address}")


def main():
    """
    Ape entrypoint. Uses the current `--network` selected via Ape CLI.
    """
    provider = networks.provider
    network = provider.network

    print("=== ProposalContract deployment ===")
    print(f"Active network : {network.ecosystem.name}:{network.name}")
    print(f"Provider       : {provider.name}")

    # Load deployer account
    deployer_alias = _get_env(ENV_DEPLOYER_ALIAS) or "deployer"
    print(f"Loading deployer account alias: {deployer_alias!r}")
    deployer = accounts.load(deployer_alias)
    print(f"Deployer address: {deployer.address}")

    # Detect if we're on mainnet / sepolia (for frontend env mapping)
    is_mainnet = network.ecosystem.name == "ethereum" and network.name == "mainnet"
    is_sepolia = network.ecosystem.name == "ethereum" and network.name == "sepolia"

    # Read optional overrides
    token_contract_env = _get_env(ENV_TOKEN_CONTRACT)
    token_id_env = _get_env(ENV_TOKEN_ID)

    # Resolve token contract + ID
    if is_mainnet:
        # MAINNET: default to the real Bobu ERC1155 address and a default token ID,
        # but allow full override via env vars.
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
        # TESTNET / OTHER: if no ERC1155 is configured, deploy one and point to it.
        if token_contract_env:
            token_contract = token_contract_env
            print(f"Using {ENV_TOKEN_CONTRACT} override: {token_contract}")
        else:
            print(f"No {ENV_TOKEN_CONTRACT} set; deploying fresh ERC1155 for this network...")
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

    # Deploy ProposalContract
    print("Deploying ProposalContract...")
    contract = deployer.deploy(project.ProposalContract, token_contract, token_id)

    print("Deployment complete.")
    print(f"ProposalContract address: {contract.address}")

    # Update frontend contracts.ts mapping based on network
    try:
        if is_mainnet:
            _update_frontend_contracts("mainnet", contract.address)
        elif is_sepolia:
            # Frontend uses "testnet" to mean sepolia
            _update_frontend_contracts("testnet", contract.address)
        else:
            print(f"[INFO] Network '{network.name}' not mapped to frontend env (testnet/mainnet); skipping contracts.ts update.")
    except Exception as exc:  # noqa: BLE001
        print(f"[WARN] Failed to update frontend contracts.ts: {exc!r}")

    # Optionally sync ABI into frontend (uses existing script)
    try:
        from scripts.sync_proposal_abi import main as sync_abi_main

        print("Syncing ProposalContract ABI into frontend...")
        sync_abi_main()
    except Exception as exc:  # noqa: BLE001
        print(f"[WARN] Failed to sync frontend ABI: {exc!r}")

