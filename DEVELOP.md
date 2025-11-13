
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