
### Ape developing -- Install Process


# Install plugins
brew install pyenv
pyenv install 3.13.x
pyenv global 3.13.x
python3 --version (should be 3.13.3+)

# Create a virtual environment
make a venv
python3 -m venv vyperenv
source ./vyperenv/bin/activate

# Install vyper and ape
pip install vyper==0.4.3
brew install gcc@14
pip3 install eth-ape

# Install ape plugins
ape plugins install .
pip install --upgrade eth-ape
# (ape plugins install vyper alchemy -y)

# add private key to the ape 'deployer' account
ape accounts import deployer
# Enter pkey from .env when prompted
ape accounts list

## Ignore pythonwarnings in your profile
# export PYTHONWARNINGS="ignore::Warning:urllib3"



## Running tests:
# To run tests, first we must import the anime_exchange_deployer pkey into ape and create a passphrase (and update the .env file)
ape accounts import anime_exchange_deployer
source .env

ape test tests/deploy_L1_L2.py --verbose
ape test tests/test_L1QueryOwnership_testnet.py

# Plans for ROADMAP
- Create a way for artists to offer commissions to artists

## ATTENTION PLEASE USE PYTHON 3.13 for 100x faster compiling and testing
## Windows installation (Power Shell)
After installing 
pip install -r ./requirements.txt
Get-Command pip
python -m site
 (this shows the path of python)



# GLOBAL INSTALL !! WARNING: You should probably use a venv
https://docs.apeworx.io/ape/stable/userguides/quickstart.html
pip install pipx
pipx install eth-ape  (pipx installs everything in a venv system wide!)



# REMIXD Setup
remixd -s <absolute-path-to-the-shared-folder> --remix-ide https://remix.ethereum.org
remixd -s C:\Users\andre\Documents\Git\CommissionArt --remix-ide https://remix.ethereum.org


# Testing
Testing requires more accounts so we need to use foundary:
ape test --network ethereum:local
ape test --network ethereum:sepolia:alchemy
ape test .  --network ethereum:local -n 10


### Deploying ProposalContract (Sepolia & Mainnet)

- **Sepolia (testnet)**  
  - Optional overrides (otherwise ERC1155 is auto-deployed and token ID defaults to `1`):
    - `export PROPOSAL_TOKEN_CONTRACT=0xYourErc1155Address`  
    - `export PROPOSAL_TOKEN_ID=1`  
  - Deploy:
    - `ape run deploy_proposal_contract --network ethereum:sepolia:alchemy`

- **Mainnet**  
  - By default uses Bobu ERC1155 at `0x2079812353E2C9409a788FBF5f383fa62aD85bE8` and token ID `1`.  
  - Optional overrides if you want something else:
    - `export PROPOSAL_TOKEN_CONTRACT=0xYourErc1155Address`  
    - `export PROPOSAL_TOKEN_ID=YourTokenId`  
  - Deploy:
    - `ape run deploy_proposal_contract --network ethereum:mainnet:alchemy`

- **After any deploy**  
  - Update the frontend contract config (`app/src/config/contracts.ts`) with the new `ProposalContract` address for the appropriate env (`testnet` or `mainnet`).  
  - Rebuild or restart the frontend.


### Rebuilding ABIs and syncing frontend JSON

- To recompile contracts and sync the `ProposalContract` ABI into `app/src/abis/ProposalContract.json`:
  - From repo root:
    - `ape compile`
    - `python scripts/compile_and_sync_proposal_abi.py`

### Scripts quick reference (single-line)

- deploy_proposal_contract (Sepolia, auto-ERC1155 if none set):  
  `ape run deploy_proposal_contract --network ethereum:sepolia:alchemy`

- deploy_proposal_contract (Sepolia, reuse existing ERC1155):  
  `export PROPOSAL_TOKEN_CONTRACT=0xYourErc1155 && export PROPOSAL_TOKEN_ID=1 && ape run deploy_proposal_contract --network ethereum:sepolia:alchemy`

- deploy_proposal_contract (Sepolia, force recompile + re-export ABIs + redeploy):  
  `export FORCE_REDEPLOY=1 && ape run deploy_proposal_contract --network ethereum:sepolia:alchemy`

- deploy_proposal_contract (Sepolia, force and deploy a brand-new ERC1155):  
  `export FORCE_REDEPLOY=1 && export FORCE_DEPLOY_ERC1155=1 && ape run deploy_proposal_contract --network ethereum:sepolia:alchemy`

- deploy_proposal_contract (Mainnet defaults to Bobu ERC1155):  
  `ape run deploy_proposal_contract --network ethereum:mainnet:alchemy`

- sync multiple ABIs (ProposalContract, ERC1155, GovernanceHub, ProposalTemplate, CommentTemplate):  
  `ape compile && python scripts/sync_proposal_abi.py`

- compile then sync ABIs to app/src/abis:  
  `python scripts/compile_and_sync_proposal_abi.py`

Note: `ape run` does not pass arbitrary flags through to scripts; use environment variables as shown above.

### Environment variables and defaults

- PROPOSAL_TOKEN_CONTRACT: optional; on testnets if unset/empty, a fresh ERC1155 is deployed automatically; on mainnet if unset/empty, defaults to Bobu ERC1155 `0x2079812353E2C9409a788FBF5f383fa62aD85bE8`.
  - Disable/clear: `unset PROPOSAL_TOKEN_CONTRACT` (or `export PROPOSAL_TOKEN_CONTRACT=`).
- PROPOSAL_TOKEN_ID: optional; defaults to `1` (testnet) or `1` (mainnet Bobu). If set, must be an integer.
  - Disable/clear: `unset PROPOSAL_TOKEN_ID` (or `export PROPOSAL_TOKEN_ID=`).
- DEPLOYER_ACCOUNT_ALIAS: optional; defaults to `deployer`.
  - Disable/clear: `unset DEPLOYER_ACCOUNT_ALIAS` (or `export DEPLOYER_ACCOUNT_ALIAS=`).
- FORCE_REDEPLOY: optional; only `"1"` is treated as true; anything else (unset, empty, `"0"`, `"false"`) is false.
  - Enable: `export FORCE_REDEPLOY=1`
  - Disable: `unset FORCE_REDEPLOY` or `export FORCE_REDEPLOY=0`
- FORCE_DEPLOY_ERC1155: optional; only `"1"` is treated as true; anything else (unset, empty, `"0"`, `"false"`) is false.
  - Enable: `export FORCE_DEPLOY_ERC1155=1`
  - Disable: `unset FORCE_DEPLOY_ERC1155` or `export FORCE_DEPLOY_ERC1155=0`

Tip: environment variables persist in your shell; if you previously enabled force flags and want normal behavior again, either `unset` them or export them as `0`.