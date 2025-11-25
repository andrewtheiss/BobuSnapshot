# @version ^0.4.3

"""
GovernanceHub
- Admin/controller for proposal and comment templates
- Manages cloning, lifecycle states, pagination, and access control
"""

interface IERC1155:
    def balanceOf(owner: address, id: uint256) -> uint256: view

interface IProposalTemplate:
    def initialize(
        _hub: address,
        _title: String[128],
        _author: address,
        _body: String[4096],
        _createdAt: uint256,
        _voteStart: uint256,
        _voteEnd: uint256
    ): nonpayable
    def addCommentAddress(_comment: address): nonpayable
    def hubCastVote(_voter: address, support: bool, weight: uint256): nonpayable
    def voteStart() -> uint256: view
    def voteEnd() -> uint256: view
    def author() -> address: view
    def votesFor() -> uint256: view
    def votesAgainst() -> uint256: view
    def hubSetVotingWindow(_voteStart: uint256, _voteEnd: uint256): nonpayable

interface ICommentTemplate:
    def initialize(
        _hub: address,
        _proposal: address,
        _author: address,
        _content: String[1024],
        _createdAt: uint256,
        _sentiment: uint256
    ): nonpayable
    def createdAt() -> uint256: view
    def proposal() -> address: view
    def markDeleted(): nonpayable

event ProposalCreated:
    proposal: indexed(address)
    author: indexed(address)
    title: String[128]

event StateChanged:
    proposal: indexed(address)
    oldState: uint256
    newState: uint256
    by: indexed(address)

event CommentAdded:
    proposal: indexed(address)
    comment: indexed(address)
    author: indexed(address)

event CommentDeleted:
    proposal: indexed(address)
    comment: indexed(address)
    byAdmin: indexed(address)

event TemplatesUpdated:
    proposalTemplate: address
    commentTemplate: address
    by: indexed(address)

event TokenGateUpdated:
    tokenContract1155: address
    tokenId1155: uint256
    gateProposals: bool
    gateComments: bool
    gateVotes: bool
    by: indexed(address)

event AdminsReset:
    bobuMultisig: indexed(address)
    creator: indexed(address)
    elected1: address
    elected2: address
    elected3: address

event BobuChanged:
    oldBobu: indexed(address)
    newBobu: indexed(address)

enum ProposalState:
    DRAFT
    OPEN
    ACTIVE
    CLOSED

STATE_DRAFT: constant(uint256) = 0
STATE_OPEN: constant(uint256) = 1
STATE_ACTIVE: constant(uint256) = 2
STATE_CLOSED: constant(uint256) = 3

MAX_PROPOSALS: constant(uint256) = 10000
PAGE_LIMIT: constant(uint256) = 100
COMMENT_DELETE_WINDOW: constant(uint256) = 14 * 86400

bobuMultisig: public(address)
creator: public(address)
electedAdmins: public(address[3])

proposalTemplate: public(address)
commentTemplate: public(address)

tokenContract1155: public(address)
tokenId1155: public(uint256)
gateProposals: public(bool)
gateComments: public(bool)
gateVotes: public(bool)

draftProposals: DynArray[address, MAX_PROPOSALS]
openProposals: DynArray[address, MAX_PROPOSALS]
activeProposals: DynArray[address, MAX_PROPOSALS]
closedProposals: DynArray[address, MAX_PROPOSALS]

stateByProposalPlusOne: HashMap[address, uint256]
indexByProposalPlusOne: HashMap[address, uint256]

# --------------------------
# Metrics
# --------------------------
totalProposals: public(uint256)
totalComments: public(uint256)
uniqueUsers: public(uint256)
_seenUser: HashMap[address, bool]
@deploy
def __init__(
    _bobuMultisig: address,
    _proposalTemplate: address,
    _commentTemplate: address,
    _elected1: address,
    _elected2: address,
    _elected3: address
):
    assert _bobuMultisig != empty(address), "bobu required"
    assert _proposalTemplate != empty(address), "proposal template required"
    assert _commentTemplate != empty(address), "comment template required"

    self.bobuMultisig = _bobuMultisig
    self.creator = msg.sender
    self.electedAdmins[0] = _elected1
    self.electedAdmins[1] = _elected2
    self.electedAdmins[2] = _elected3

    self.proposalTemplate = _proposalTemplate
    self.commentTemplate = _commentTemplate

    self.tokenContract1155 = empty(address)
    self.tokenId1155 = 0
    self.gateProposals = False
    self.gateComments = False
    self.gateVotes = False

    log AdminsReset(bobuMultisig=self.bobuMultisig, creator=self.creator, elected1=_elected1, elected2=_elected2, elected3=_elected3)
    log TemplatesUpdated(proposalTemplate=_proposalTemplate, commentTemplate=_commentTemplate, by=msg.sender)

@internal
@view
def _isElected(a: address) -> bool:
    return a == self.electedAdmins[0] or a == self.electedAdmins[1] or a == self.electedAdmins[2]

@external
@view
def isAdmin(a: address) -> bool:
    return a == self.bobuMultisig or a == self.creator or self._isElected(a)

@internal
@view
def _onlyAdminOrBobu():
    assert msg.sender == self.bobuMultisig or msg.sender == self.creator or self._isElected(msg.sender), "admin required"

@internal
@view
def _onlyBobu():
    assert msg.sender == self.bobuMultisig, "bobu only"

@external
def resetAllAdmins(_newCreator: address, _e1: address, _e2: address, _e3: address):
    self._onlyBobu()
    self.creator = _newCreator
    self.electedAdmins[0] = _e1
    self.electedAdmins[1] = _e2
    self.electedAdmins[2] = _e3
    log AdminsReset(bobuMultisig=self.bobuMultisig, creator=_newCreator, elected1=_e1, elected2=_e2, elected3=_e3)

@external
def setBobuMultisig(_newBobu: address):
    self._onlyBobu()
    assert _newBobu != empty(address), "bobu empty"
    old: address = self.bobuMultisig
    self.bobuMultisig = _newBobu
    log BobuChanged(oldBobu=old, newBobu=_newBobu)

@external
def setElectedAdmins(_e1: address, _e2: address, _e3: address):
    self._onlyBobu()
    self.electedAdmins[0] = _e1
    self.electedAdmins[1] = _e2
    self.electedAdmins[2] = _e3
    log AdminsReset(bobuMultisig=self.bobuMultisig, creator=self.creator, elected1=_e1, elected2=_e2, elected3=_e3)

@external
def setTemplates(_proposalTemplate: address, _commentTemplate: address):
    assert msg.sender == self.bobuMultisig or msg.sender == self.creator, "bobu or creator"
    assert _proposalTemplate != empty(address)
    assert _commentTemplate != empty(address)
    self.proposalTemplate = _proposalTemplate
    self.commentTemplate = _commentTemplate
    log TemplatesUpdated(proposalTemplate=_proposalTemplate, commentTemplate=_commentTemplate, by=msg.sender)

@external
def setTokenRequirement(_token: address, _tokenId: uint256):
    assert msg.sender == self.bobuMultisig or msg.sender == self.creator, "bobu or creator"
    self.tokenContract1155 = _token
    self.tokenId1155 = _tokenId

@external
def setGating(_gateProposals: bool, _gateComments: bool, _gateVotes: bool):
    self._onlyBobu()
    self.gateProposals = _gateProposals
    self.gateComments = _gateComments
    self.gateVotes = _gateVotes
    log TokenGateUpdated(tokenContract1155=self.tokenContract1155, tokenId1155=self.tokenId1155, gateProposals=_gateProposals, gateComments=_gateComments, gateVotes=_gateVotes, by=msg.sender)

@external
@view
def hasToken(user: address) -> bool:
    if self.tokenContract1155 == empty(address):
        return False
    bal: uint256 = staticcall IERC1155(self.tokenContract1155).balanceOf(user, self.tokenId1155)
    return bal > 0

@internal
@view
def _hasToken(user: address) -> bool:
    if self.tokenContract1155 == empty(address):
        return False
    bal: uint256 = staticcall IERC1155(self.tokenContract1155).balanceOf(user, self.tokenId1155)
    return bal > 0

@internal
@view
def _requireProposer(user: address):
    if self.gateProposals:
        assert self._hasToken(user), "token required to propose"

@internal
@view
def _requireCommenter(user: address):
    if self.gateComments:
        assert self._hasToken(user), "token required to comment"

@internal
@view
def _requireVoter(user: address):
    if self.gateVotes:
        assert self._hasToken(user), "token required to vote"

@internal
def _touchUser(u: address):
    if not self._seenUser[u]:
        self._seenUser[u] = True
        self.uniqueUsers += 1
@internal
def _appendToState(p: address, st: uint256):
    assert self.stateByProposalPlusOne[p] == 0, "already indexed"
    if st == STATE_DRAFT:
        self.draftProposals.append(p)
        self.indexByProposalPlusOne[p] = len(self.draftProposals)
    elif st == STATE_OPEN:
        self.openProposals.append(p)
        self.indexByProposalPlusOne[p] = len(self.openProposals)
    elif st == STATE_ACTIVE:
        self.activeProposals.append(p)
        self.indexByProposalPlusOne[p] = len(self.activeProposals)
    else:
        self.closedProposals.append(p)
        self.indexByProposalPlusOne[p] = len(self.closedProposals)
    self.stateByProposalPlusOne[p] = st + 1

@internal
def _removeFromState(p: address):
    pos_plus_one: uint256 = self.indexByProposalPlusOne[p]
    assert pos_plus_one > 0, "not indexed"
    st_plus_one: uint256 = self.stateByProposalPlusOne[p]
    assert st_plus_one > 0, "no state"
    idx: uint256 = pos_plus_one - 1
    st: uint256 = st_plus_one - 1

    if st == STATE_DRAFT:
        last_idx: uint256 = len(self.draftProposals) - 1
        if idx != last_idx:
            last_addr: address = self.draftProposals[last_idx]
            self.draftProposals[idx] = last_addr
            self.indexByProposalPlusOne[last_addr] = idx + 1
        self.draftProposals.pop()
    elif st == STATE_OPEN:
        last_idx: uint256 = len(self.openProposals) - 1
        if idx != last_idx:
            last_addr: address = self.openProposals[last_idx]
            self.openProposals[idx] = last_addr
            self.indexByProposalPlusOne[last_addr] = idx + 1
        self.openProposals.pop()
    elif st == STATE_ACTIVE:
        last_idx: uint256 = len(self.activeProposals) - 1
        if idx != last_idx:
            last_addr: address = self.activeProposals[last_idx]
            self.activeProposals[idx] = last_addr
            self.indexByProposalPlusOne[last_addr] = idx + 1
        self.activeProposals.pop()
    else:
        last_idx: uint256 = len(self.closedProposals) - 1
        if idx != last_idx:
            last_addr: address = self.closedProposals[last_idx]
            self.closedProposals[idx] = last_addr
            self.indexByProposalPlusOne[last_addr] = idx + 1
        self.closedProposals.pop()

    self.indexByProposalPlusOne[p] = 0
    self.stateByProposalPlusOne[p] = 0

@internal
def _moveState(p: address, new_st: uint256):
    old_plus_one: uint256 = self.stateByProposalPlusOne[p]
    old_st: uint256 = 0
    if old_plus_one > 0:
        old_st = old_plus_one - 1
        if old_st == new_st:
            return
        self._removeFromState(p)
    self._appendToState(p, new_st)

@external
def createProposal(_title: String[128], _body: String[4096], _voteStart: uint256, _voteEnd: uint256) -> address:
    self._requireProposer(msg.sender)
    # Require either both zero (no voting) or a valid window end > start
    assert (_voteStart == 0 and _voteEnd == 0) or (_voteEnd > _voteStart), "invalid window"

    self._touchUser(msg.sender)

    p: address = create_minimal_proxy_to(self.proposalTemplate, revert_on_failure=True)
    extcall IProposalTemplate(p).initialize(self, _title, msg.sender, _body, block.timestamp, _voteStart, _voteEnd)

    target_state: uint256 = STATE_DRAFT
    if _voteStart > 0:
        if block.timestamp < _voteStart:
            target_state = STATE_OPEN
        elif block.timestamp <= _voteEnd:
            target_state = STATE_ACTIVE
        else:
            target_state = STATE_CLOSED

    self._appendToState(p, target_state)
    self.totalProposals += 1
    log ProposalCreated(proposal=p, author=msg.sender, title=_title)
    return p

@external
def addComment(_proposal: address, _content: String[1024], _sentiment: uint256) -> address:
    self._requireCommenter(msg.sender)
    st_plus_one: uint256 = self.stateByProposalPlusOne[_proposal]
    assert st_plus_one > 0, "unknown proposal"
    st: uint256 = st_plus_one - 1
    # Allow comments on all non-closed proposals (including DRAFT)
    assert st != STATE_CLOSED, "not commentable"

    self._touchUser(msg.sender)

    c: address = create_minimal_proxy_to(self.commentTemplate, revert_on_failure=True)
    extcall ICommentTemplate(c).initialize(self, _proposal, msg.sender, _content, block.timestamp, _sentiment)
    extcall IProposalTemplate(_proposal).addCommentAddress(c)
    self.totalComments += 1
    log CommentAdded(proposal=_proposal, comment=c, author=msg.sender)
    return c

@external
def castVote(_proposal: address, support: bool):
    self._requireVoter(msg.sender)
    vs: uint256 = staticcall IProposalTemplate(_proposal).voteStart()
    ve: uint256 = staticcall IProposalTemplate(_proposal).voteEnd()
    assert vs > 0 and ve > 0, "no voting window"
    assert block.timestamp >= vs and block.timestamp <= ve, "not in window"
    self._touchUser(msg.sender)
    # 1 address = 1 vote (weight=1). If token-weighted is desired, wire in balance here.
    extcall IProposalTemplate(_proposal).hubCastVote(msg.sender, support, 1)

@external
def adminMoveState(_proposal: address, _newState: uint256):
    self._onlyAdminOrBobu()
    assert _newState <= STATE_CLOSED, "bad state"
    old_plus_one: uint256 = self.stateByProposalPlusOne[_proposal]
    assert old_plus_one > 0, "unknown proposal"
    old_st: uint256 = old_plus_one - 1
    if old_st == _newState:
        return
    self._moveState(_proposal, _newState)
    log StateChanged(proposal=_proposal, oldState=old_st, newState=_newState, by=msg.sender)


@external
def setActiveByCreatorOrAdmin(_proposal: address, _active: bool):
    """
    Allow either the proposal's creator (author) or any admin (bobu, hub creator, elected)
    to mark a proposal as ACTIVE or CLOSED.
    """
    # Verify proposal is known
    old_plus_one: uint256 = self.stateByProposalPlusOne[_proposal]
    assert old_plus_one > 0, "unknown proposal"
    old_st: uint256 = old_plus_one - 1

    # Check caller permissions: author OR admin
    author: address = staticcall IProposalTemplate(_proposal).author()
    if msg.sender != author:
        self._onlyAdminOrBobu()

    new_st: uint256 = STATE_ACTIVE if _active else STATE_CLOSED
    if new_st == old_st:
        return

    self._moveState(_proposal, new_st)
    log StateChanged(proposal=_proposal, oldState=old_st, newState=new_st, by=msg.sender)

@external
def setVotingWindow(_proposal: address, _voteStart: uint256, _voteEnd: uint256):
    """
    Allow proposal author or any admin to set the voting window (start/end).
    Rules:
      - Either both zero (no voting) OR end > start.
      - After setting, the proposal's indexed state is synchronized.
    """
    # Verify proposal is known
    old_plus_one: uint256 = self.stateByProposalPlusOne[_proposal]
    assert old_plus_one > 0, "unknown proposal"
    old_st: uint256 = old_plus_one - 1

    # Check caller permissions: author OR admin
    author: address = staticcall IProposalTemplate(_proposal).author()
    if msg.sender != author:
        self._onlyAdminOrBobu()

    # Validate window
    assert (_voteStart == 0 and _voteEnd == 0) or (_voteEnd > _voteStart), "invalid window"

    # Apply on the child template (hub-only function)
    extcall IProposalTemplate(_proposal).hubSetVotingWindow(_voteStart, _voteEnd)

    # Sync state to reflect new window immediately (inline to avoid external self-call)
    vs_local: uint256 = _voteStart
    ve_local: uint256 = _voteEnd
    new_st: uint256 = old_st
    if ve_local > 0 and block.timestamp > ve_local:
        new_st = STATE_CLOSED
    elif vs_local > 0 and block.timestamp >= vs_local and block.timestamp <= ve_local:
        new_st = STATE_ACTIVE
    elif vs_local > 0 and block.timestamp < vs_local:
        new_st = STATE_OPEN
    else:
        new_st = STATE_DRAFT

    if new_st != old_st:
        self._moveState(_proposal, new_st)
        log StateChanged(proposal=_proposal, oldState=old_st, newState=new_st, by=msg.sender)

@external
def syncProposalState(_proposal: address):
    old_plus_one: uint256 = self.stateByProposalPlusOne[_proposal]
    assert old_plus_one > 0, "unknown proposal"
    old_st: uint256 = old_plus_one - 1

    vs: uint256 = staticcall IProposalTemplate(_proposal).voteStart()
    ve: uint256 = staticcall IProposalTemplate(_proposal).voteEnd()

    new_st: uint256 = old_st
    if ve > 0 and block.timestamp > ve:
        new_st = STATE_CLOSED
    elif vs > 0 and block.timestamp >= vs and block.timestamp <= ve:
        new_st = STATE_ACTIVE
    elif vs > 0 and block.timestamp < vs:
        new_st = STATE_OPEN
    else:
        new_st = STATE_DRAFT

    if new_st != old_st:
        self._moveState(_proposal, new_st)
        log StateChanged(proposal=_proposal, oldState=old_st, newState=new_st, by=msg.sender)

@external
def adminDeleteComment(_proposal: address, _comment: address):
    self._onlyAdminOrBobu()
    assert staticcall ICommentTemplate(_comment).proposal() == _proposal, "not linked"
    created: uint256 = staticcall ICommentTemplate(_comment).createdAt()
    assert block.timestamp <= created + COMMENT_DELETE_WINDOW, "window passed"
    extcall ICommentTemplate(_comment).markDeleted()
    log CommentDeleted(proposal=_proposal, comment=_comment, byAdmin=msg.sender)

@internal
@view
def _getProposalCountByState(_state: uint256) -> uint256:
    assert _state <= STATE_CLOSED, "bad state"
    if _state == STATE_DRAFT:
        return len(self.draftProposals)
    elif _state == STATE_OPEN:
        return len(self.openProposals)
    elif _state == STATE_ACTIVE:
        return len(self.activeProposals)
    else:
        return len(self.closedProposals)

@external
@view
def getProposalCountByState(_state: uint256) -> uint256:
    return self._getProposalCountByState(_state)

@external
@view
def getProposals(_state: uint256, _offset: uint256, _count: uint256, reverse: bool) -> DynArray[address, PAGE_LIMIT]:
    assert _state <= STATE_CLOSED, "bad state"
    result: DynArray[address, PAGE_LIMIT] = []
    arr_len: uint256 = self._getProposalCountByState(_state)
    if arr_len == 0:
        return result

    if not reverse:
        if _offset >= arr_len:
            return result
        available: uint256 = arr_len - _offset
        count: uint256 = min(min(_count, available), PAGE_LIMIT)
        for i: uint256 in range(0, count, bound=PAGE_LIMIT):
            if _state == STATE_DRAFT:
                result.append(self.draftProposals[_offset + i])
            elif _state == STATE_OPEN:
                result.append(self.openProposals[_offset + i])
            elif _state == STATE_ACTIVE:
                result.append(self.activeProposals[_offset + i])
            else:
                result.append(self.closedProposals[_offset + i])
    else:
        if _offset >= arr_len:
            return result
        start_index: uint256 = arr_len - 1 - _offset
        available: uint256 = start_index + 1
        count: uint256 = min(min(_count, available), PAGE_LIMIT)
        for i: uint256 in range(0, count, bound=PAGE_LIMIT):
            idx: uint256 = start_index - i
            if _state == STATE_DRAFT:
                result.append(self.draftProposals[idx])
            elif _state == STATE_OPEN:
                result.append(self.openProposals[idx])
            elif _state == STATE_ACTIVE:
                result.append(self.activeProposals[idx])
            else:
                result.append(self.closedProposals[idx])
    return result


@external
@view
def getTopActiveProposal() -> address:
    """
    Return the active proposal with the highest total votes (for + against).
    If there are no active proposals, returns the zero address.
    """
    best: address = empty(address)
    best_votes: uint256 = 0
    count: uint256 = len(self.activeProposals)

    for i: uint256 in range(MAX_PROPOSALS):
        if i >= count:
            break
        p: address = self.activeProposals[i]
        vf: uint256 = staticcall IProposalTemplate(p).votesFor()
        va: uint256 = staticcall IProposalTemplate(p).votesAgainst()
        total: uint256 = vf + va
        if total > best_votes:
            best_votes = total
            best = p

    return best


