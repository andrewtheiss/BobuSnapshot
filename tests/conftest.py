import os
from dotenv import find_dotenv, load_dotenv
import pytest
from ape import networks

# Load .env before Ape connects; avoids demo-key fallback during collection
load_dotenv(find_dotenv(usecwd=True), override=False)

# Normalize common Alchemy env var names to what ape-alchemy expects
_candidates = [
    os.environ.get("WEB3_ETHEREUM_SEPOLIA_ALCHEMY_API_KEY"),
    os.environ.get("WEB3_ALCHEMY_API_KEY"),
    os.environ.get("WEB3_ALCHEMY_PROJECT_ID"),
    os.environ.get("ALCHEMY_API_KEY"),
    os.environ.get("ALCHEMY_PROJECT_ID"),
]
_api_key = next((v for v in _candidates if v), None)
if _api_key:
    os.environ.setdefault("WEB3_ETHEREUM_SEPOLIA_ALCHEMY_API_KEY", _api_key)
    os.environ.setdefault("WEB3_ALCHEMY_API_KEY", _api_key)
    os.environ.setdefault("WEB3_ALCHEMY_PROJECT_ID", _api_key)

# Ensure a local test provider is active so ephemeral test accounts exist.
@pytest.fixture(scope="session", autouse=True)
def _use_local_test_provider():
    # Use Ape's in-process test provider with pre-funded accounts
    with networks.parse_network_choice("ethereum:local:test") as _provider:
        yield
