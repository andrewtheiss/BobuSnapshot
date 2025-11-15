import pytest
from ape import project

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


