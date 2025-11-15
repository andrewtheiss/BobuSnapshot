# @version ^0.4.3

"""
ProposalTemplate
- Clonable instance for each proposal
- Stores metadata, voting window, votes, and linked comments
"""

event Voted:
    voter: indexed(address)
    support: bool
    weight: uint256

ownerHub: public(address)
initialized: public(bool)

title: public(String[128])
author: public(address)
body: public(String[4096])

createdAt: public(uint256)
voteStart: public(uint256)
voteEnd: public(uint256)

votesFor: public(uint256)
votesAgainst: public(uint256)

MAX_COMMENTS: constant(uint256) = 1000
comments: public(DynArray[address, MAX_COMMENTS])

# guard for duplicate voting
voted: HashMap[address, bool]

@external
def initialize(
    _hub: address,
    _title: String[128],
    _author: address,
    _body: String[4096],
    _createdAt: uint256,
    _voteStart: uint256,
    _voteEnd: uint256
):
    assert not self.initialized, "inited"
    assert _hub != empty(address), "hub required"
    self.initialized = True
    self.ownerHub = _hub
    self.title = _title
    self.author = _author
    self.body = _body
    self.createdAt = _createdAt
    self.voteStart = _voteStart
    self.voteEnd = _voteEnd

@external
def addCommentAddress(_comment: address):
    assert msg.sender == self.ownerHub, "hub only"
    self.comments.append(_comment)

@external
def hubCastVote(_voter: address, support: bool, weight: uint256):
    assert msg.sender == self.ownerHub, "hub only"
    assert not self.voted[_voter], "already voted"
    assert weight > 0, "weight"
    self.voted[_voter] = True
    if support:
        self.votesFor += weight
    else:
        self.votesAgainst += weight
    log Voted(_voter, support, weight)

PAGE_LIMIT: constant(uint256) = 100

@external
@view
def getComments(_offset: uint256, _count: uint256, reverse: bool) -> DynArray[address, PAGE_LIMIT]:
    result: DynArray[address, PAGE_LIMIT] = []
    arr_len: uint256 = len(self.comments)
    if arr_len == 0:
        return result

    if not reverse:
        if _offset >= arr_len:
            return result
        available: uint256 = arr_len - _offset
        count: uint256 = min(min(_count, available), PAGE_LIMIT)
        for i: uint256 in range(0, count, bound=PAGE_LIMIT):
            result.append(self.comments[_offset + i])
    else:
        if _offset >= arr_len:
            return result
        start_index: uint256 = arr_len - 1 - _offset
        available: uint256 = start_index + 1
        count: uint256 = min(min(_count, available), PAGE_LIMIT)
        for i: uint256 in range(0, count, bound=PAGE_LIMIT):
            idx: uint256 = start_index - i
            result.append(self.comments[idx])
    return result


