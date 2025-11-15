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

@external
def initialize(_hub: address, _proposal: address, _author: address, _content: String[1024], _createdAt: uint256):
    assert not self.initialized, "inited"
    assert _hub != empty(address), "hub required"
    assert _proposal != empty(address), "proposal required"
    self.initialized = True
    self.ownerHub = _hub
    self.proposal = _proposal
    self.author = _author
    self.content = _content
    self.createdAt = _createdAt
    self.deleted = False

@external
def markDeleted():
    assert msg.sender == self.ownerHub, "hub only"
    self.deleted = True


