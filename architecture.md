## Frontend / Web3 Architecture

### Layers Overview

- **UI components**  
  - Location: `app/src/pages` (for example `Governance.tsx`) and other React components.  
  - Responsibility: Render HTML/CSS, handle user interactions (clicks, forms), and call semantic web3 functions (e.g. `submitProposal(...)`).  
  - They **do not** import ABIs, addresses, or low-level wagmi/viem calls directly.

- **Providers**  
  - Location: `app/src/main.tsx`.  
  - Responsibility:
    - `WagmiProvider` – wires wagmi to the currently active chain using `wagmiConfig`.  
    - `QueryClientProvider` – React Query cache.  
    - `ProposalContractAddressProvider` – exposes the currently active Proposal contract address via React context.

- **Environment + contract config**  
  - Files:
    - `app/src/config/environment.ts` – exposes `APP_ENV: 'testnet' | 'mainnet'`.  
    - `app/src/config/contracts.ts` – maps environments to contract addresses + ABIs and exports `ACTIVE_CONTRACTS`.  
  - Responsibility:
    - Decide whether the app is in **testnet** (sepolia) or **mainnet** mode.  
    - Provide the correct ProposalContract address and ABI for that mode.  
  - Update flow when redeploying:
    1. Deploy contracts with Ape (sepolia or mainnet).  
    2. Run the ABI sync script to refresh the ABI file.  
    3. Update addresses in `contracts.ts`.  
    4. Rebuild the frontend with the desired `VITE_APP_ENV`.

- **Wagmi config**  
  - File: `app/src/web3/wagmi.ts`.  
  - Responsibility:  
    - Use `APP_ENV` to select a single active chain:  
      - `testnet` → sepolia  
      - `mainnet` → Ethereum mainnet  
    - Expose `wagmiConfig` used by both React hooks (`useAccount`, etc.) and low-level actions (`readContract`, `writeContract`).

- **Address context**  
  - File: `app/src/web3/proposalContractAddress.tsx`.  
  - Responsibility:  
    - Initialize the Proposal contract address from `ACTIVE_CONTRACTS.proposalContract.address`.  
    - Optionally allow a localStorage override for manual testing.  
  - UI components can consume this context when they need to show or log the active address.

- **Contract action layer (mapping layer)**  
  - File: `app/src/web3/proposalContractActions.ts`.  
  - Responsibility:
    - Provide **semantic functions** for ProposalContract interactions, e.g.:
      - `hasToken(user)` – read-only check.  
      - `getProposal(user)` – read a user’s proposal.  
      - `submitProposal(proposal)` – send a transaction to create/update a proposal.  
      - `updateTokenRequirement(tokenContract, tokenId)` – admin-only write.  
    - Encapsulate:
      - Choice of contract (`ACTIVE_CONTRACTS.proposalContract`).  
      - ABI and address usage.  
      - Calls to `readContract` / `writeContract` from `wagmi/actions` with `wagmiConfig`.
  - UI components **only call these functions**, not raw wagmi actions.  
  - When ABI details change (e.g. function name changes but semantics stay the same), you update this layer and the UI code stays unchanged.

- **ABI files + sync script**  
  - File: `app/src/abis/ProposalContract.json`.  
  - Sync script: `scripts/sync_proposal_abi.py`.  
  - Responsibility:
    - `ProposalContract.json` – the single source of truth for the frontend ABI.  
    - `sync_proposal_abi.py` – compares the Ape build artifact ABI with the frontend ABI and overwrites the frontend file when they differ.  
  - Typical flow after contract changes:
    1. Recompile / redeploy with Ape (sepolia or mainnet).  
    2. Run `python scripts/sync_proposal_abi.py` (or `npm run sync:abi` from `app/`).  
    3. Update `contracts.ts` addresses if deployments changed.  
    4. Rebuild frontend.

### How it all fits together at runtime

1. Build-time:
   - `VITE_APP_ENV` is set (`testnet` or `mainnet`).  
   - `environment.ts` and `contracts.ts` bake in the active environment and contract config.  
   - `wagmi.ts` picks the correct chain (sepolia or mainnet) and produces `wagmiConfig`.

2. App startup:
   - `main.tsx` mounts `WagmiProvider`, `QueryClientProvider`, and `ProposalContractAddressProvider`.  
   - The proposal address context is initialized from `ACTIVE_CONTRACTS`.

3. User interaction:
   - UI components import functions from `proposalContractActions.ts` (e.g. `submitProposal`).  
   - Those functions call `readContract` / `writeContract` with:
     - `wagmiConfig`  
     - `ACTIVE_CONTRACTS.proposalContract.address`  
     - `ACTIVE_CONTRACTS.proposalContract.abi`
   - Wallet (MetaMask) prompts the user to sign for writes.

This design keeps UI components decoupled from ABI details and addresses, while still making environment changes (sepolia ↔ mainnet) and redeploys easy to manage through small, centralized config files and the action layer.


