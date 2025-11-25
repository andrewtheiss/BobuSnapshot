# @version ^0.4.3

"""
CommentTemplate
- Clonable instance tied to a proposal, supports admin soft-delete
"""

ownerHub: public(address)
initialized: public(bool)

proposal: public(address)
author: public(address)
createdAt: public(uint256)
content: public(String[1024])
deleted: public(bool)
sentiment: public(uint256)  # 1=positive, 2=negative, 3=neutral, 4=inquiry

SENTIMENT_POSITIVE: constant(uint256) = 1
SENTIMENT_NEGATIVE: constant(uint256) = 2
SENTIMENT_NEUTRAL: constant(uint256) = 3
SENTIMENT_INQUIRY: constant(uint256) = 4

@external
def initialize(
    _hub: address,
    _proposal: address,
    _author: address,
    _content: String[1024],
    _createdAt: uint256,
    _sentiment: uint256
):
    assert not self.initialized, "inited"
    assert _hub != empty(address), "hub required"
    assert _proposal != empty(address), "proposal required"
    # sentiment must be one of the defined constants
    assert _sentiment == SENTIMENT_POSITIVE or _sentiment == SENTIMENT_NEGATIVE or _sentiment == SENTIMENT_NEUTRAL or _sentiment == SENTIMENT_INQUIRY, "bad sentiment"
    self.initialized = True
    self.ownerHub = _hub
    self.proposal = _proposal
    self.author = _author
    self.content = _content
    self.createdAt = _createdAt
    self.deleted = False
    self.sentiment = _sentiment

@external
def markDeleted():
    assert msg.sender == self.ownerHub, "hub only"
    self.deleted = True


