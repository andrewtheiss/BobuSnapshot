import pytest
from ape import project

@pytest.fixture(scope="module")
def erc1155_contract(accounts):
    """Deploy the ERC1155 contract for testing"""
    # Use accounts from ape's test framework
    # When running ape test, this should use test accounts automatically
    return accounts[0].deploy(project.ERC1155)

@pytest.fixture(scope="module")
def users(accounts):
    """Return test accounts"""
    # Return three test accounts - ape should provide these automatically
    return accounts[0], accounts[1], accounts[2]

def test_initial_state(erc1155_contract, users):
    """Test initial contract state"""
    owner, _, _ = users

    # Check initial owner
    assert erc1155_contract.owner() == owner.address

    # Check URI is empty
    assert erc1155_contract.uri(1) == ""

    # Check interface support
    assert erc1155_contract.supportsInterface(0x01ffc9a7, sender=owner)  # ERC165
    assert erc1155_contract.supportsInterface(0xd9b67a26, sender=owner)  # ERC1155
    assert erc1155_contract.supportsInterface(0x0e89341c, sender=owner)  # ERC1155 Metadata

def test_mint_single_token(erc1155_contract, users):
    """Test minting a single token"""
    owner, user1, _ = users
    token_id = 1
    amount = 100

    # Initial balance should be 0
    assert erc1155_contract.balanceOf(user1.address, token_id) == 0

    # Mint tokens
    erc1155_contract.mint(user1.address, token_id, amount, b"", sender=owner)

    # Check balance
    assert erc1155_contract.balanceOf(user1.address, token_id) == amount

def test_mint_batch_tokens(erc1155_contract, users):
    """Test minting multiple tokens in batch"""
    owner, user1, _ = users
    token_ids = [1, 2, 3]
    amounts = [50, 75, 25]

    # Initial balances should be 0
    for token_id in token_ids:
        assert erc1155_contract.balanceOf(user1.address, token_id) == 0

    # Mint tokens in batch
    erc1155_contract.mintBatch(user1.address, token_ids, amounts, b"", sender=owner)

    # Check balances
    for i, token_id in enumerate(token_ids):
        assert erc1155_contract.balanceOf(user1.address, token_id) == amounts[i]

def test_safe_transfer_from(erc1155_contract, users):
    """Test safe transfer of tokens"""
    owner, user1, user2 = users
    token_id = 1
    mint_amount = 100
    transfer_amount = 30

    # Mint tokens to user1
    erc1155_contract.mint(user1.address, token_id, mint_amount, b"", sender=owner)

    # Initial balances
    assert erc1155_contract.balanceOf(user1.address, token_id) == mint_amount
    assert erc1155_contract.balanceOf(user2.address, token_id) == 0

    # Transfer from user1 to user2
    erc1155_contract.safeTransferFrom(user1.address, user2.address, token_id, transfer_amount, b"", sender=user1)

    # Check balances after transfer
    assert erc1155_contract.balanceOf(user1.address, token_id) == mint_amount - transfer_amount
    assert erc1155_contract.balanceOf(user2.address, token_id) == transfer_amount

def test_safe_batch_transfer_from(erc1155_contract, users):
    """Test batch transfer of tokens"""
    owner, user1, user2 = users
    token_ids = [1, 2]
    mint_amounts = [100, 50]
    transfer_amounts = [30, 20]

    # Mint tokens to user1
    erc1155_contract.mintBatch(user1.address, token_ids, mint_amounts, b"", sender=owner)

    # Transfer batch from user1 to user2
    erc1155_contract.safeBatchTransferFrom(user1.address, user2.address, token_ids, transfer_amounts, b"", sender=user1)

    # Check balances after transfer
    assert erc1155_contract.balanceOf(user1.address, token_ids[0]) == mint_amounts[0] - transfer_amounts[0]
    assert erc1155_contract.balanceOf(user1.address, token_ids[1]) == mint_amounts[1] - transfer_amounts[1]
    assert erc1155_contract.balanceOf(user2.address, token_ids[0]) == transfer_amounts[0]
    assert erc1155_contract.balanceOf(user2.address, token_ids[1]) == transfer_amounts[1]

def test_balance_of_batch(erc1155_contract, users):
    """Test balanceOfBatch function"""
    owner, user1, user2 = users
    token_ids = [1, 2, 3]
    amounts_user1 = [10, 20, 30]
    amounts_user2 = [5, 15, 25]

    # Mint tokens
    erc1155_contract.mintBatch(user1.address, token_ids, amounts_user1, b"", sender=owner)
    erc1155_contract.mintBatch(user2.address, token_ids, amounts_user2, b"", sender=owner)

    # Check batch balances
    owners = [user1.address, user2.address, user1.address]
    ids = [1, 1, 2]

    balances = erc1155_contract.balanceOfBatch(owners, ids)
    assert balances[0] == amounts_user1[0]  # user1 token 1
    assert balances[1] == amounts_user2[0]  # user2 token 1
    assert balances[2] == amounts_user1[1]  # user1 token 2

def test_approval_for_all(erc1155_contract, users):
    """Test approval for all functionality"""
    owner, user1, user2 = users

    # Initially not approved
    assert not erc1155_contract.isApprovedForAll(user1.address, user2.address)

    # Set approval
    erc1155_contract.setApprovalForAll(user2.address, True, sender=user1)

    # Check approval
    assert erc1155_contract.isApprovedForAll(user1.address, user2.address)

    # Remove approval
    erc1155_contract.setApprovalForAll(user2.address, False, sender=user1)

    # Check approval removed
    assert not erc1155_contract.isApprovedForAll(user1.address, user2.address)

def test_transfer_by_approved_operator(erc1155_contract, users):
    """Test transfer by approved operator"""
    owner, user1, user2 = users
    token_id = 1
    amount = 50

    # Mint tokens to user1
    erc1155_contract.mint(user1.address, token_id, amount, b"", sender=owner)

    # Approve user2 as operator for user1
    erc1155_contract.setApprovalForAll(user2.address, True, sender=user1)

    # Transfer by operator (user2 transferring user1's tokens to themselves)
    erc1155_contract.safeTransferFrom(user1.address, user2.address, token_id, amount, b"", sender=user2)

    # Check balances
    assert erc1155_contract.balanceOf(user1.address, token_id) == 0
    assert erc1155_contract.balanceOf(user2.address, token_id) == amount

def test_set_uri(erc1155_contract, users):
    """Test setting URI"""
    owner, _, _ = users
    new_uri = "https://example.com/metadata/{id}"

    # Set URI
    erc1155_contract.setURI(new_uri, sender=owner)

    # Check URI
    assert erc1155_contract.uri(1) == new_uri

def test_only_owner_can_mint(erc1155_contract, users):
    """Test that only owner can mint tokens"""
    _, user1, _ = users
    token_id = 1
    amount = 100

    # Try to mint from non-owner - should revert
    with pytest.raises(Exception):
        erc1155_contract.mint(user1.address, token_id, amount, b"", sender=user1)

def test_only_owner_can_set_uri(erc1155_contract, users):
    """Test that only owner can set URI"""
    _, user1, _ = users
    new_uri = "https://example.com/metadata/{id}"

    # Try to set URI from non-owner - should revert
    with pytest.raises(Exception):
        erc1155_contract.setURI(new_uri, sender=user1)

def test_insufficient_balance_transfer(erc1155_contract, users):
    """Test transfer with insufficient balance"""
    owner, user1, user2 = users
    token_id = 1

    # Try to transfer without having tokens - should revert
    with pytest.raises(Exception):
        erc1155_contract.safeTransferFrom(user1.address, user2.address, token_id, 1, b"", sender=user1)

def test_transfer_to_zero_address(erc1155_contract, users):
    """Test transfer to zero address"""
    owner, user1, _ = users
    token_id = 1
    amount = 100

    # Mint tokens to user1
    erc1155_contract.mint(user1.address, token_id, amount, b"", sender=owner)

    # Try to transfer to zero address - should revert
    with pytest.raises(Exception):
        erc1155_contract.safeTransferFrom(user1.address, "0x0000000000000000000000000000000000000000", token_id, amount, b"", sender=user1)

def test_mint_10000_items_transfer_and_verify_possession(erc1155_contract, users):
    """Test minting 10000 items, transferring one to a user, and verifying possession"""
    owner, user1, user2 = users
    token_id = 1
    total_mint_amount = 10000
    transfer_amount = 1

    # Step 1: Mint 10000 items to the contract owner
    erc1155_contract.mint(owner.address, token_id, total_mint_amount, b"", sender=owner)

    # Verify owner has all 10000 tokens
    assert erc1155_contract.balanceOf(owner.address, token_id) == total_mint_amount

    # Verify user1 and user2 have zero tokens initially
    assert erc1155_contract.balanceOf(user1.address, token_id) == 0
    assert erc1155_contract.balanceOf(user2.address, token_id) == 0

    # Step 2: Transfer 1 token to user1
    erc1155_contract.safeTransferFrom(owner.address, user1.address, token_id, transfer_amount, b"", sender=owner)

    # Step 3: Verify possession
    # Owner should now have 9999 tokens (10000 - 1)
    assert erc1155_contract.balanceOf(owner.address, token_id) == total_mint_amount - transfer_amount

    # User1 should have 1 token
    assert erc1155_contract.balanceOf(user1.address, token_id) == transfer_amount

    # User2 should still have 0 tokens
    assert erc1155_contract.balanceOf(user2.address, token_id) == 0

def test_large_mint_and_multiple_transfers(erc1155_contract, users, accounts):
    """Test minting large quantities and multiple transfers to verify possession"""
    owner, user1, user2, user3 = accounts[0], accounts[1], accounts[2], accounts[3]
    token_id = 42  # Use a different token ID
    initial_mint = 10000

    # Mint large quantity
    erc1155_contract.mint(owner.address, token_id, initial_mint, b"", sender=owner)
    assert erc1155_contract.balanceOf(owner.address, token_id) == initial_mint

    # Transfer to multiple users
    erc1155_contract.safeTransferFrom(owner.address, user1.address, token_id, 2500, b"", sender=owner)
    erc1155_contract.safeTransferFrom(owner.address, user2.address, token_id, 3000, b"", sender=owner)
    erc1155_contract.safeTransferFrom(owner.address, user3.address, token_id, 1500, b"", sender=owner)

    # Verify final balances
    assert erc1155_contract.balanceOf(owner.address, token_id) == initial_mint - 2500 - 3000 - 1500  # 3000 remaining
    assert erc1155_contract.balanceOf(user1.address, token_id) == 2500
    assert erc1155_contract.balanceOf(user2.address, token_id) == 3000
    assert erc1155_contract.balanceOf(user3.address, token_id) == 1500

    # Verify other token IDs are unaffected
    assert erc1155_contract.balanceOf(user1.address, 1) == 0  # Different token ID
    assert erc1155_contract.balanceOf(user2.address, 99) == 0  # Different token ID

def test_token_possession_verification_scenario(erc1155_contract, users, accounts):
    """Test comprehensive token possession verification scenario"""
    owner, alice, bob, charlie = accounts[0], accounts[1], accounts[2], accounts[3]
    token_id = 123
    mint_amount = 10000

    # Setup: Mint tokens to owner
    erc1155_contract.mint(owner.address, token_id, mint_amount, b"", sender=owner)

    # Scenario: Distribute tokens to some users but not others
    # Alice gets tokens
    erc1155_contract.safeTransferFrom(owner.address, alice.address, token_id, 500, b"", sender=owner)

    # Bob gets tokens
    erc1155_contract.safeTransferFrom(owner.address, bob.address, token_id, 750, b"", sender=owner)

    # Charlie gets no tokens (intentionally)

    # Verify possession states
    # Users with tokens
    assert erc1155_contract.balanceOf(alice.address, token_id) > 0, "Alice should have tokens"
    assert erc1155_contract.balanceOf(bob.address, token_id) > 0, "Bob should have tokens"

    # User without tokens
    assert erc1155_contract.balanceOf(charlie.address, token_id) == 0, "Charlie should have no tokens"

    # Additional verification - check exact amounts
    assert erc1155_contract.balanceOf(alice.address, token_id) == 500
    assert erc1155_contract.balanceOf(bob.address, token_id) == 750
    assert erc1155_contract.balanceOf(charlie.address, token_id) == 0

    # Verify total supply conservation
    total_distributed = erc1155_contract.balanceOf(alice.address, token_id) + \
                       erc1155_contract.balanceOf(bob.address, token_id) + \
                       erc1155_contract.balanceOf(owner.address, token_id)

    assert total_distributed == mint_amount, "Total supply should be conserved"


def test_supports_interface_unknown(erc1155_contract, users):
    owner, _, _ = users
    # Unknown interface ID should return False
    assert not erc1155_contract.supportsInterface(0xFFFFFFFF, sender=owner)


def test_balance_of_batch_length_mismatch(erc1155_contract, users):
    owner, user1, user2 = users

    owners = [user1.address]
    ids = [1, 2]  # different length from owners

    with pytest.raises(Exception):
        erc1155_contract.balanceOfBatch(owners, ids)

