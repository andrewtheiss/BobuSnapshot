import pytest
from ape import accounts, project, networks

@pytest.fixture(scope="module")
def erc1155_contract(accounts):
    """Deploy the ERC1155 contract for testing"""
    return accounts[0].deploy(project.ERC1155)

@pytest.fixture(scope="module")
def proposal_contract(erc1155_contract, accounts):
    """Deploy the ProposalContract for testing"""
    token_id = 1
    return accounts[0].deploy(project.ProposalContract, erc1155_contract.address, token_id)

@pytest.fixture(scope="module")
def users(accounts):
    """Return test accounts"""
    return accounts[0], accounts[1], accounts[2], accounts[3]

def test_initial_state(proposal_contract, erc1155_contract, users):
    """Test initial contract state"""
    owner, _, _, _ = users
    token_id = 1

    # Check initial owner
    assert proposal_contract.owner() == owner.address

    # Check token contract and ID
    assert proposal_contract.tokenContract() == erc1155_contract.address
    assert proposal_contract.tokenId() == token_id

def test_has_token_function(erc1155_contract, proposal_contract, users):
    """Test hasToken function"""
    owner, user1, user2, _ = users
    token_id = 1
    amount = 10

    # Initially no one has tokens
    assert not proposal_contract.hasToken(user1.address)
    assert not proposal_contract.hasToken(user2.address)

    # Mint tokens to user1
    erc1155_contract.mint(user1.address, token_id, amount, b"", sender=owner)

    # Now user1 has tokens, user2 doesn't
    assert proposal_contract.hasToken(user1.address)
    assert not proposal_contract.hasToken(user2.address)

def test_submit_proposal_with_token(erc1155_contract, proposal_contract, users):
    """Test submitting proposal when user holds token"""
    owner, user1, _, _ = users
    token_id = 1
    amount = 10
    proposal_text = "This is my proposal for improving the protocol."

    # Mint tokens to user1
    erc1155_contract.mint(user1.address, token_id, amount, b"", sender=owner)

    # Submit proposal
    proposal_contract.submitProposal(proposal_text, sender=user1)

    # Check proposal was stored
    assert proposal_contract.getProposal(user1.address) == proposal_text

def test_submit_proposal_without_token(erc1155_contract, proposal_contract, users):
    """Test submitting proposal when user doesn't hold token"""
    _, _, user2, _ = users
    proposal_text = "This proposal should fail."

    # Try to submit proposal without holding token - should revert
    with pytest.raises(Exception):
        proposal_contract.submitProposal(proposal_text, sender=user2)

def test_update_proposal(erc1155_contract, proposal_contract, users):
    """Test updating an existing proposal"""
    owner, user1, _, _ = users
    token_id = 1
    amount = 10
    initial_proposal = "Initial proposal."
    updated_proposal = "Updated proposal with new ideas."

    # Mint tokens to user1
    erc1155_contract.mint(user1.address, token_id, amount, b"", sender=owner)

    # Submit initial proposal
    proposal_contract.submitProposal(initial_proposal, sender=user1)
    assert proposal_contract.getProposal(user1.address) == initial_proposal

    # Update proposal
    proposal_contract.submitProposal(updated_proposal, sender=user1)
    assert proposal_contract.getProposal(user1.address) == updated_proposal

def test_multiple_users_proposals(erc1155_contract, proposal_contract, users):
    """Test multiple users submitting proposals"""
    owner, user1, user2, user3 = users
    token_id = 1
    amount = 10

    proposal1 = "User1's proposal."
    proposal2 = "User2's proposal."

    # Mint tokens to user1 and user2
    erc1155_contract.mint(user1.address, token_id, amount, b"", sender=owner)
    erc1155_contract.mint(user2.address, token_id, amount, b"", sender=owner)

    # Submit proposals
    proposal_contract.submitProposal(proposal1, sender=user1)
    proposal_contract.submitProposal(proposal2, sender=user2)

    # Check proposals
    assert proposal_contract.getProposal(user1.address) == proposal1
    assert proposal_contract.getProposal(user2.address) == proposal2

    # User3 has no proposal (empty string)
    assert proposal_contract.getProposal(user3.address) == ""

def test_transfer_token_and_submit_proposal(erc1155_contract, proposal_contract, users):
    """Test transferring token and then submitting proposal"""
    owner, user1, user2, _ = users
    token_id = 1
    amount = 10
    proposal_text = "Proposal after token transfer."

    # Mint tokens to user1
    erc1155_contract.mint(user1.address, token_id, amount, b"", sender=owner)

    # Transfer token to user2
    erc1155_contract.safeTransferFrom(user1.address, user2.address, token_id, amount, b"", sender=user1)

    # Now user1 doesn't have token, user2 does
    assert not proposal_contract.hasToken(user1.address)
    assert proposal_contract.hasToken(user2.address)

    # User1 cannot submit proposal
    with pytest.raises(Exception):
        proposal_contract.submitProposal("Should fail", sender=user1)

    # User2 can submit proposal
    proposal_contract.submitProposal(proposal_text, sender=user2)
    assert proposal_contract.getProposal(user2.address) == proposal_text

def test_update_token_requirement(erc1155_contract, proposal_contract, users):
    """Test updating token requirement"""
    owner, user1, _, _ = users
    new_token_id = 2

    # Update token requirement
    proposal_contract.updateTokenRequirement(erc1155_contract.address, new_token_id, sender=owner)

    # Check updated requirement
    assert proposal_contract.tokenId() == new_token_id

    # Mint old token to user1 - should not allow proposal
    erc1155_contract.mint(user1.address, 1, 10, b"", sender=owner)
    assert not proposal_contract.hasToken(user1.address)

    # Mint new required token
    erc1155_contract.mint(user1.address, new_token_id, 10, b"", sender=owner)
    assert proposal_contract.hasToken(user1.address)

def test_only_owner_can_update_token_requirement(erc1155_contract, proposal_contract, users):
    """Test that only owner can update token requirement"""
    _, user1, _, _ = users
    new_token_id = 3

    # Try to update from non-owner - should revert
    with pytest.raises(Exception):
        proposal_contract.updateTokenRequirement(erc1155_contract.address, new_token_id, sender=user1)

def test_constructor_validation(accounts):
    """Test constructor parameter validation"""
    # Try to deploy with zero address - should revert
    with pytest.raises(Exception):
        accounts[0].deploy(project.ProposalContract, "0x0000000000000000000000000000000000000000", 1)

def test_long_proposal_text(erc1155_contract, proposal_contract, users):
    """Test submitting a long proposal text"""
    owner, user1, _, _ = users
    token_id = 1
    amount = 10

    # Create a long proposal text (close to 1024 character limit)
    long_proposal = "A" * 1000 + " long proposal text."

    # Mint tokens to user1
    erc1155_contract.mint(user1.address, token_id, amount, b"", sender=owner)

    # Submit long proposal
    proposal_contract.submitProposal(long_proposal, sender=user1)

    # Check proposal was stored
    assert proposal_contract.getProposal(user1.address) == long_proposal

def test_zero_token_balance(erc1155_contract, proposal_contract, users):
    """Test that zero token balance doesn't allow proposal submission"""
    owner, user1, _, _ = users
    token_id = 1

    # Mint and then transfer away all tokens, leaving zero balance
    erc1155_contract.mint(user1.address, token_id, 10, b"", sender=owner)
    erc1155_contract.safeTransferFrom(user1.address, owner.address, token_id, 10, b"", sender=user1)

    # User should not be able to submit proposal with zero balance
    assert not proposal_contract.hasToken(user1.address)
    with pytest.raises(Exception):
        proposal_contract.submitProposal("Should fail", sender=user1)


def test_update_token_requirement_zero_address_reverts(erc1155_contract, proposal_contract, users):
    owner, _, _, _ = users

    with pytest.raises(Exception):
        proposal_contract.updateTokenRequirement(
            "0x0000000000000000000000000000000000000000", 1, sender=owner
        )

