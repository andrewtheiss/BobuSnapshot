# @version ^0.4.3

interface IERC1155:
    def balanceOf(owner: address, id: uint256) -> uint256: view

event ProposalSubmitted:
    user: indexed(address)
    proposal: String[1024]

# State variables
tokenContract: public(address)
tokenId: public(uint256)
proposals: public(HashMap[address, String[1024]])

owner: public(address)

@deploy
def __init__(_tokenContract: address, _tokenId: uint256):
    """
    @dev Contract constructor.
    @param _tokenContract The address of the ERC-1155 token contract.
    @param _tokenId The ID of the token that users must hold to submit proposals.
    """
    assert _tokenContract != empty(address), "Token contract address cannot be zero"
    self.tokenContract = _tokenContract
    self.tokenId = _tokenId
    self.owner = msg.sender

@external
@view
def hasToken(user: address) -> bool:
    """
    @dev Check if a user holds the required token.
    @param user The address to check.
    @return True if the user holds at least one of the required token.
    """
    balance: uint256 = staticcall IERC1155(self.tokenContract).balanceOf(user, self.tokenId)
    return balance > 0

@external
def submitProposal(proposal: String[1024]):
    """
    @dev Submit a proposal. User must hold the required token.
    @param proposal The proposal text to submit.
    """
    # Check if user holds the required token
    balance: uint256 = staticcall IERC1155(self.tokenContract).balanceOf(msg.sender, self.tokenId)
    assert balance > 0, "Must hold the required token to submit proposal"

    self.proposals[msg.sender] = proposal
    log ProposalSubmitted(msg.sender, proposal)

@external
@view
def getProposal(user: address) -> String[1024]:
    """
    @dev Get a user's proposal.
    @param user The address of the user whose proposal to retrieve.
    @return The user's proposal string.
    """
    return self.proposals[user]

@external
def updateTokenRequirement(_tokenContract: address, _tokenId: uint256):
    """
    @dev Update the token requirement. Only owner can call.
    @param _tokenContract New token contract address.
    @param _tokenId New token ID.
    """
    assert msg.sender == self.owner, "Only owner can update token requirement"
    assert _tokenContract != empty(address), "Token contract address cannot be zero"

    self.tokenContract = _tokenContract
    self.tokenId = _tokenId
