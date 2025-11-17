import pytest
from ape import project

ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


# ----------------- ProposalTemplate -----------------


def test_proposal_template_initial_state(accounts):
    deployer = accounts[0]
    template = deployer.deploy(project.ProposalTemplate)

    assert template.initialized() is False
    assert template.ownerHub() == ZERO_ADDRESS
    assert template.title() == ""
    assert template.author() == ZERO_ADDRESS
    assert template.body() == ""
    assert template.createdAt() == 0
    assert template.voteStart() == 0
    assert template.voteEnd() == 0
    assert template.votesFor() == 0
    assert template.votesAgainst() == 0


def test_proposal_template_initialize_sets_fields(accounts):
    deployer, hub_account, author = accounts[0], accounts[1], accounts[2]
    template = deployer.deploy(project.ProposalTemplate)

    hub_addr = hub_account.address
    title = "My proposal"
    body = "X" * 2000  # within 4096 bytes
    created = 123456789
    vote_start = 1_000
    vote_end = 2_000

    template.initialize(
        hub_addr,
        title,
        author.address,
        body,
        created,
        vote_start,
        vote_end,
        sender=deployer,
    )

    assert template.initialized() is True
    assert template.ownerHub() == hub_addr
    assert template.title() == title
    assert template.author() == author.address
    assert template.body() == body
    assert template.createdAt() == created
    assert template.voteStart() == vote_start
    assert template.voteEnd() == vote_end


def test_proposal_template_cannot_reinitialize(accounts):
    deployer, hub_account, author = accounts[0], accounts[1], accounts[2]
    template = deployer.deploy(project.ProposalTemplate)

    template.initialize(
        hub_account.address,
        "Title",
        author.address,
        "Body",
        1,
        0,
        0,
        sender=deployer,
    )
    assert template.initialized() is True

    with pytest.raises(Exception):
        template.initialize(
            hub_account.address,
            "Other",
            author.address,
            "Other body",
            2,
            0,
            0,
            sender=deployer,
        )


def test_proposal_template_requires_hub_address(accounts):
    deployer, author = accounts[0], accounts[1]
    template = deployer.deploy(project.ProposalTemplate)

    with pytest.raises(Exception):
        template.initialize(
            ZERO_ADDRESS,
            "Title",
            author.address,
            "Body",
            1,
            0,
            0,
            sender=deployer,
        )


# ----------------- CommentTemplate -----------------


def test_comment_template_initial_state(accounts):
    deployer = accounts[0]
    template = deployer.deploy(project.CommentTemplate)

    assert template.initialized() is False
    assert template.ownerHub() == ZERO_ADDRESS
    assert template.proposal() == ZERO_ADDRESS
    assert template.author() == ZERO_ADDRESS
    assert template.createdAt() == 0
    assert template.content() == ""
    assert template.deleted() is False


def test_comment_template_initialize_sets_fields(accounts):
    deployer, hub_account, proposal_account, author = (
        accounts[0],
        accounts[1],
        accounts[2],
        accounts[3],
    )
    template = deployer.deploy(project.CommentTemplate)

    hub_addr = hub_account.address
    proposal_addr = proposal_account.address
    content = "This is a comment."
    created = 555

    template.initialize(
        hub_addr,
        proposal_addr,
        author.address,
        content,
        created,
        sender=deployer,
    )

    assert template.initialized() is True
    assert template.ownerHub() == hub_addr
    assert template.proposal() == proposal_addr
    assert template.author() == author.address
    assert template.content() == content
    assert template.createdAt() == created
    assert template.deleted() is False


def test_comment_template_cannot_reinitialize(accounts):
    deployer, hub_account, proposal_account, author = (
        accounts[0],
        accounts[1],
        accounts[2],
        accounts[3],
    )
    template = deployer.deploy(project.CommentTemplate)

    template.initialize(
        hub_account.address,
        proposal_account.address,
        author.address,
        "First",
        1,
        sender=deployer,
    )
    assert template.initialized() is True

    with pytest.raises(Exception):
        template.initialize(
            hub_account.address,
            proposal_account.address,
            author.address,
            "Second",
            2,
            sender=deployer,
        )


def test_comment_template_requires_hub_and_proposal(accounts):
    deployer, hub_account, proposal_account, author = (
        accounts[0],
        accounts[1],
        accounts[2],
        accounts[3],
    )
    template = deployer.deploy(project.CommentTemplate)

    # hub zero
    with pytest.raises(Exception):
        template.initialize(
            ZERO_ADDRESS,
            proposal_account.address,
            author.address,
            "Content",
            1,
            sender=deployer,
        )

    # proposal zero
    with pytest.raises(Exception):
        template.initialize(
            hub_account.address,
            ZERO_ADDRESS,
            author.address,
            "Content",
            1,
            sender=deployer,
        )


def test_comment_template_mark_deleted_direct(accounts, project):
    deployer, hub_account, proposal_account, author = accounts[0:4]
    comment = deployer.deploy(project.CommentTemplate)

    # Initialize as if the hub had created it
    created_at = 123456
    comment.initialize(
        hub_account.address,
        proposal_account.address,
        author.address,
        "Comment to delete",
        created_at,
        sender=deployer,
    )

    assert comment.deleted() is False

    # Owner hub can mark it deleted
    comment.markDeleted(sender=hub_account)
    assert comment.deleted() is True


def test_proposal_template_add_comment_and_vote_direct(accounts, project):
    deployer, hub_account, commenter, voter = accounts[0:4]
    template = deployer.deploy(project.ProposalTemplate)

    created_at = 1
    template.initialize(
        hub_account.address,
        "Title",
        commenter.address,
        "Body",
        created_at,
        0,
        0,
        sender=deployer,
    )

    # Directly append a comment address as the hub
    template.addCommentAddress(commenter.address, sender=hub_account)
    comments = template.getComments(0, 10, False)
    assert len(comments) == 1
    assert comments[0] == commenter.address

    # Reverse pagination branch
    comments_rev = template.getComments(0, 10, True)
    assert comments_rev[0] == commenter.address

    # Cast a vote via hub-only entry point
    template.hubCastVote(voter.address, True, 1, sender=hub_account)
    assert template.votesFor() == 1
    assert template.votesAgainst() == 0

    # Double-vote should revert
    with pytest.raises(Exception):
        template.hubCastVote(voter.address, True, 1, sender=hub_account)

    # Zero-weight vote should revert
    with pytest.raises(Exception):
        template.hubCastVote(accounts[4].address, True, 0, sender=hub_account)



