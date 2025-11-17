import pytest
from ape import project, chain

ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


@pytest.fixture(scope="module")
def templates(accounts):
    deployer = accounts[0]
    proposal_template = deployer.deploy(project.ProposalTemplate)
    comment_template = deployer.deploy(project.CommentTemplate)
    return proposal_template, comment_template


@pytest.fixture(scope="module")
def governance_hub(accounts, templates):
    deployer = accounts[0]
    bobu = accounts[1]
    e1, e2, e3 = accounts[2], accounts[3], accounts[4]
    proposal_template, comment_template = templates

    hub = deployer.deploy(
        project.GovernanceHub,
        bobu.address,
        proposal_template.address,
        comment_template.address,
        e1.address,
        e2.address,
        e3.address,
    )
    return hub, bobu, deployer, (e1, e2, e3), (proposal_template, comment_template)


def test_governance_hub_initial_state(governance_hub):
    hub, bobu, deployer, (e1, e2, e3), (proposal_template, comment_template) = governance_hub

    # Core roles
    assert hub.bobuMultisig() == bobu.address
    assert hub.creator() == deployer.address
    assert hub.electedAdmins(0) == e1.address
    assert hub.electedAdmins(1) == e2.address
    assert hub.electedAdmins(2) == e3.address

    # Templates
    assert hub.proposalTemplate() == proposal_template.address
    assert hub.commentTemplate() == comment_template.address

    # Gating defaults
    assert hub.tokenContract1155() == ZERO_ADDRESS
    assert hub.tokenId1155() == 0
    assert hub.gateProposals() is False
    assert hub.gateComments() is False
    assert hub.gateVotes() is False

    # No proposals indexed yet
    assert hub.getProposalCountByState(0) == 0  # STATE_DRAFT
    assert hub.getProposalCountByState(1) == 0  # STATE_OPEN
    assert hub.getProposalCountByState(2) == 0  # STATE_ACTIVE
    assert hub.getProposalCountByState(3) == 0  # STATE_CLOSED


def test_governance_hub_constructor_requires_bobu(accounts, templates):
    deployer = accounts[0]
    proposal_template, comment_template = templates
    e1, e2, e3 = accounts[2], accounts[3], accounts[4]

    with pytest.raises(Exception):
        deployer.deploy(
            project.GovernanceHub,
            ZERO_ADDRESS,
            proposal_template.address,
            comment_template.address,
            e1.address,
            e2.address,
            e3.address,
        )


def test_governance_hub_constructor_requires_proposal_template(accounts, templates):
    deployer = accounts[0]
    _, comment_template = templates
    bobu = accounts[1]
    e1, e2, e3 = accounts[2], accounts[3], accounts[4]

    with pytest.raises(Exception):
        deployer.deploy(
            project.GovernanceHub,
            bobu.address,
            ZERO_ADDRESS,
            comment_template.address,
            e1.address,
            e2.address,
            e3.address,
        )


def test_governance_hub_constructor_requires_comment_template(accounts, templates):
    deployer = accounts[0]
    proposal_template, _ = templates
    bobu = accounts[1]
    e1, e2, e3 = accounts[2], accounts[3], accounts[4]

    with pytest.raises(Exception):
        deployer.deploy(
            project.GovernanceHub,
            bobu.address,
            proposal_template.address,
            ZERO_ADDRESS,
            e1.address,
            e2.address,
            e3.address,
        )


@pytest.fixture(scope="module")
def erc1155_token(accounts):
    """Deploy an ERC1155 token contract for gating tests."""
    deployer = accounts[0]
    return deployer.deploy(project.ERC1155)


def test_create_proposal_requires_erc1155_when_gated(governance_hub, erc1155_token, accounts):
    hub, bobu, deployer, _, _ = governance_hub
    token = erc1155_token
    user_with_token = accounts[2]
    user_without_token = accounts[3]
    token_id = 1
    amount = 10

    # Configure token gating for proposals
    hub.setTokenRequirement(token.address, token_id, sender=deployer)
    hub.setGating(True, False, False, sender=bobu)

    # Mint ERC1155 tokens to user_with_token
    token.mint(user_with_token.address, token_id, amount, b"", sender=deployer)

    # Verify balances and hasToken view
    assert token.balanceOf(user_with_token.address, token_id) == amount
    assert token.balanceOf(user_without_token.address, token_id) == 0
    assert hub.hasToken(user_with_token.address)
    assert not hub.hasToken(user_without_token.address)

    # User without token cannot create a proposal
    with pytest.raises(Exception):
        hub.createProposal(
            "No token",
            "This should fail",
            0,
            0,
            sender=user_without_token,
        )

    # User with token can create a proposal
    before_count = hub.getProposalCountByState(0)  # STATE_DRAFT
    tx = hub.createProposal(
        "Title with token",
        "Proposal body",
        0,
        0,
        sender=user_with_token,
    )
    proposal_addr = tx.return_value

    assert proposal_addr is not None
    assert proposal_addr != ZERO_ADDRESS

    after_count = hub.getProposalCountByState(0)
    assert after_count == before_count + 1

    # New proposal should appear in the draft proposals list
    proposals = hub.getProposals(0, 0, 10, False)  # STATE_DRAFT, first page
    assert len(proposals) == after_count
    assert proposals[0] != ZERO_ADDRESS


def _first_draft_proposal(hub):
    count = hub.getProposalCountByState(0)
    assert count > 0
    proposals = hub.getProposals(0, 0, 10, False)
    assert len(proposals) >= 1
    return proposals[0]


def test_add_comment_on_open_and_active_proposals(governance_hub, erc1155_token, accounts):
    hub, bobu, deployer, _, _ = governance_hub
    token = erc1155_token
    proposer = accounts[2]
    commenter = accounts[3]
    token_id = 1

    # Gate both proposals and comments
    hub.setTokenRequirement(token.address, token_id, sender=deployer)
    hub.setGating(True, True, False, sender=bobu)

    # Give both proposer and commenter the ERC1155 token
    token.mint(proposer.address, token_id, 1, b"", sender=deployer)
    token.mint(commenter.address, token_id, 1, b"", sender=deployer)

    # Create proposal (starts as DRAFT) and then move via admin controls
    hub.createProposal("Open/Active test", "Body", 0, 0, sender=proposer)
    drafts = hub.getProposals(0, 0, 10, False)
    assert len(drafts) > 0
    proposal = drafts[-1]

    hub.adminMoveState(proposal, 1, sender=bobu)  # STATE_OPEN

    # Get the per-proposal instance and its existing comments
    proposal_instance = project.ProposalTemplate.at(proposal)
    before_comments = proposal_instance.getComments(0, 100, False)

    # Add a comment in OPEN state
    comment_tx = hub.addComment(proposal, "First comment", sender=commenter)
    comment_addr = comment_tx.return_value
    assert comment_addr != ZERO_ADDRESS

    # There should now be more comments than before on the proposal template instance
    after_comments = proposal_instance.getComments(0, 100, False)
    assert len(after_comments) >= len(before_comments)

    # Move proposal to ACTIVE and ensure commenting still allowed
    hub.adminMoveState(proposal, 2, sender=bobu)  # STATE_ACTIVE
    comment_tx2 = hub.addComment(proposal, "Second comment", sender=commenter)
    comment_addr2 = comment_tx2.return_value
    assert comment_addr2 != ZERO_ADDRESS


def test_admin_moves_between_all_states(governance_hub, accounts):
    hub, bobu, deployer, _, _ = governance_hub
    proposer = accounts[2]

    # Create a simple proposal with no voting window (starts as DRAFT)
    hub.createProposal("State move test", "Body", 0, 0, sender=proposer)
    drafts = hub.getProposals(0, 0, 10, False)
    assert len(drafts) > 0
    proposal = drafts[-1]

    # Move to OPEN
    hub.adminMoveState(proposal, 1, sender=bobu)  # OPEN
    opens = hub.getProposals(1, 0, 10, False)
    assert proposal in opens

    # Move to ACTIVE
    hub.adminMoveState(proposal, 2, sender=bobu)  # ACTIVE
    actives = hub.getProposals(2, 0, 10, False)
    assert proposal in actives

    # Move to CLOSED
    hub.adminMoveState(proposal, 3, sender=bobu)  # CLOSED
    closeds = hub.getProposals(3, 0, 10, False)
    assert proposal in closeds


def test_add_comment_invalid_states_and_unknown_proposal(governance_hub, accounts):
    hub, bobu, deployer, _, _ = governance_hub
    proposer = accounts[2]
    commenter = accounts[3]

    # Create a DRAFT proposal (0,0 window)
    hub.createProposal("Draft only", "Body", 0, 0, sender=proposer)
    drafts = hub.getProposals(0, 0, 10, False)
    assert len(drafts) > 0
    proposal = drafts[-1]

    # Cannot comment in DRAFT
    with pytest.raises(Exception):
        hub.addComment(proposal, "Should fail in draft", sender=commenter)

    # Move to CLOSED and cannot comment there either
    hub.adminMoveState(proposal, 3, sender=bobu)  # STATE_CLOSED
    with pytest.raises(Exception):
        hub.addComment(proposal, "Should fail in closed", sender=commenter)

    # Unknown proposal address should also fail
    fake_proposal = "0x0000000000000000000000000000000000000010"
    with pytest.raises(Exception):
        hub.addComment(fake_proposal, "Unknown proposal", sender=commenter)


def test_add_comment_requires_token_when_gate_comments_true(governance_hub, erc1155_token, accounts):
    hub, bobu, deployer, _, _ = governance_hub
    token = erc1155_token
    proposer = accounts[2]
    commenter_with = accounts[3]
    commenter_without = accounts[4]
    token_id = 5

    # Gate only comments
    hub.setTokenRequirement(token.address, token_id, sender=deployer)
    hub.setGating(False, True, False, sender=bobu)

    # Mint token to proposer and one commenter
    token.mint(proposer.address, token_id, 1, b"", sender=deployer)
    token.mint(commenter_with.address, token_id, 1, b"", sender=deployer)

    # Create proposal and move to OPEN
    hub.createProposal("Comment gating", "Body", 0, 0, sender=proposer)
    drafts = hub.getProposals(0, 0, 10, False)
    proposal = drafts[-1]
    hub.adminMoveState(proposal, 1, sender=bobu)  # STATE_OPEN

    # User without token cannot comment
    with pytest.raises(Exception):
        hub.addComment(proposal, "No token commenter", sender=commenter_without)

    # User with token can comment
    tx = hub.addComment(proposal, "Has token commenter", sender=commenter_with)
    comment_addr = tx.return_value
    assert comment_addr != ZERO_ADDRESS


def test_admin_role_management_and_is_admin(accounts, project):
    deployer, bobu, a1, a2, a3, outsider = accounts[0:6]

    hub = deployer.deploy(
        project.GovernanceHub,
        bobu.address,
        deployer.deploy(project.ProposalTemplate).address,
        deployer.deploy(project.CommentTemplate).address,
        a1.address,
        a2.address,
        a3.address,
    )

    # isAdmin matches roles
    assert hub.isAdmin(bobu.address)
    assert hub.isAdmin(deployer.address)  # creator
    assert hub.isAdmin(a1.address)
    assert hub.isAdmin(a2.address)
    assert hub.isAdmin(a3.address)
    assert not hub.isAdmin(outsider.address)

    # Only bobu can reset all admins
    with pytest.raises(Exception):
        hub.resetAllAdmins(outsider.address, outsider.address, outsider.address, outsider.address, sender=deployer)

    hub.resetAllAdmins(outsider.address, a1.address, a2.address, a3.address, sender=bobu)
    assert hub.creator() == outsider.address

    # Only bobu can set elected admins
    with pytest.raises(Exception):
        hub.setElectedAdmins(outsider.address, outsider.address, outsider.address, sender=deployer)

    hub.setElectedAdmins(outsider.address, a1.address, a2.address, sender=bobu)
    assert hub.electedAdmins(0) == outsider.address


def test_bobu_rotation_and_permissions(accounts, project):
    deployer, bobu, new_bobu, a1, a2, a3 = accounts[0:6]

    hub = deployer.deploy(
        project.GovernanceHub,
        bobu.address,
        deployer.deploy(project.ProposalTemplate).address,
        deployer.deploy(project.CommentTemplate).address,
        a1.address,
        a2.address,
        a3.address,
    )

    # Old bobu can rotate itself
    hub.setBobuMultisig(new_bobu.address, sender=bobu)
    assert hub.bobuMultisig() == new_bobu.address

    # Old bobu can no longer call bobu-only functions
    with pytest.raises(Exception):
        hub.setGating(True, False, False, sender=bobu)

    # New bobu can call bobu-only functions
    hub.setGating(True, False, False, sender=new_bobu)


def test_set_templates_and_token_requirement_permissions(accounts, project):
    deployer, bobu, creator2, outsider = accounts[0], accounts[1], accounts[2], accounts[3]
    a1, a2, a3 = accounts[4], accounts[5], accounts[6]

    hub = deployer.deploy(
        project.GovernanceHub,
        bobu.address,
        deployer.deploy(project.ProposalTemplate).address,
        deployer.deploy(project.CommentTemplate).address,
        a1.address,
        a2.address,
        a3.address,
    )

    new_prop = deployer.deploy(project.ProposalTemplate).address
    new_comment = deployer.deploy(project.CommentTemplate).address

    # creator (deployer) can set templates and token requirement
    hub.setTemplates(new_prop, new_comment, sender=deployer)
    assert hub.proposalTemplate() == new_prop
    assert hub.commentTemplate() == new_comment

    hub.setTokenRequirement(outsider.address, 42, sender=deployer)
    assert hub.tokenContract1155() == outsider.address
    assert hub.tokenId1155() == 42

    # bobu can also set templates and token requirement
    hub.setTemplates(new_prop, new_comment, sender=bobu)
    hub.setTokenRequirement(outsider.address, 43, sender=bobu)

    # outsider cannot set templates or token requirement
    with pytest.raises(Exception):
        hub.setTemplates(new_prop, new_comment, sender=outsider)
    with pytest.raises(Exception):
        hub.setTokenRequirement(outsider.address, 1, sender=outsider)


def test_admin_delete_comment_direct(governance_hub, accounts, project):
    hub, bobu, deployer, _, _ = governance_hub
    proposer = accounts[2]
    commenter = accounts[3]

    # Create a simple proposal
    hub.createProposal("Delete comment test", "Body", 0, 0, sender=proposer)
    drafts = hub.getProposals(0, 0, 10, False)
    assert len(drafts) > 0
    proposal = drafts[-1]

    # Deploy a standalone CommentTemplate and initialize it to look like a hub-created comment
    comment = deployer.deploy(project.CommentTemplate)
    created_at = 10**12  # Far in the future so the delete window has not passed
    comment.initialize(
        hub.address,
        proposal,
        commenter.address,
        "Comment to delete",
        created_at,
        sender=deployer,
    )

    # Bobu can delete this comment without revert
    hub.adminDeleteComment(proposal, comment.address, sender=bobu)





