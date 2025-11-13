# @version ^0.4.3

interface IERC1155Receiver:
    def onERC1155Received(operator: address, _from: address, id: uint256, amount: uint256, data: Bytes[1024]) -> bytes4: nonpayable
    def onERC1155BatchReceived(operator: address, _from: address, ids: DynArray[uint256, 100], amounts: DynArray[uint256, 100], data: Bytes[1024]) -> bytes4: nonpayable

event TransferSingle:
    operator: indexed(address)
    _from: indexed(address)
    to: indexed(address)
    id: uint256
    amount: uint256

event TransferBatch:
    operator: indexed(address)
    _from: indexed(address)
    to: indexed(address)
    ids: DynArray[uint256, 100]
    amounts: DynArray[uint256, 100]

event ApprovalForAll:
    owner: indexed(address)
    operator: indexed(address)
    approved: bool

event URI:
    value: String[256]
    id: indexed(uint256)

# ERC-165 interface support
interface IERC165:
    def supportsInterface(interfaceId: bytes4) -> bool: view

ERC165_INTERFACE_ID: constant(bytes4) = 0x01ffc9a7
ERC1155_INTERFACE_ID: constant(bytes4) = 0xd9b67a26
ERC1155_METADATA_INTERFACE_ID: constant(bytes4) = 0x0e89341c

# ERC1155 Receiver method IDs
ERC1155_RECEIVED: constant(bytes4) = 0xf23a6e61
ERC1155_BATCH_RECEIVED: constant(bytes4) = 0xbc197c81

# State variables
balances: HashMap[uint256, HashMap[address, uint256]]
operatorApprovals: HashMap[address, HashMap[address, bool]]
_uri: String[256]

owner: public(address)

@deploy
def __init__():
    """
    @dev Contract constructor.
    """
    self.owner = msg.sender
    self._uri = ""

@external
@view
def supportsInterface(interfaceId: bytes4) -> bool:
    """
    @dev See {IERC165-supportsInterface}.
    """
    if interfaceId == ERC165_INTERFACE_ID:
        return True
    if interfaceId == ERC1155_INTERFACE_ID:
        return True
    if interfaceId == ERC1155_METADATA_INTERFACE_ID:
        return True
    return False

@external
@view
def balanceOf(owner: address, id: uint256) -> uint256:
    """
    @dev See {IERC1155-balanceOf}.
    """
    return self.balances[id][owner]

@external
@view
def balanceOfBatch(owners: DynArray[address, 100], ids: DynArray[uint256, 100]) -> DynArray[uint256, 100]:
    """
    @dev See {IERC1155-balanceOfBatch}.
    """
    assert len(owners) == len(ids), "ERC1155: owners and ids length mismatch"
    result: DynArray[uint256, 100] = []
    for i: uint256 in range(100):
        if i >= len(owners):
            break
        result.append(self.balances[ids[i]][owners[i]])
    return result

@external
def setApprovalForAll(operator: address, approved: bool):
    """
    @dev See {IERC1155-setApprovalForAll}.
    """
    self.operatorApprovals[msg.sender][operator] = approved
    log ApprovalForAll(msg.sender, operator, approved)

@external
@view
def isApprovedForAll(owner: address, operator: address) -> bool:
    """
    @dev See {IERC1155-isApprovedForAll}.
    """
    return self.operatorApprovals[owner][operator]

@internal
def _safeTransferFrom(_from: address, to: address, id: uint256, amount: uint256, data: Bytes[1024]):
    """
    @dev Transfers `amount` tokens of token type `id` from `from` to `to`.
    """
    assert to != empty(address), "ERC1155: transfer to the zero address"

    from_balance: uint256 = self.balances[id][_from]
    assert from_balance >= amount, "ERC1155: insufficient balance for transfer"
    self.balances[id][_from] = from_balance - amount
    self.balances[id][to] += amount

    log TransferSingle(msg.sender, _from, to, id, amount)

    if to.is_contract:
        response: bytes4 = extcall IERC1155Receiver(to).onERC1155Received(msg.sender, _from, id, amount, data)
        assert response == ERC1155_RECEIVED, "ERC1155: ERC1155Receiver rejected tokens"

@internal
def _safeBatchTransferFrom(_from: address, to: address, ids: DynArray[uint256, 100], amounts: DynArray[uint256, 100], data: Bytes[1024]):
    """
    @dev Transfers `amounts` tokens of token types `ids` from `from` to `to`.
    """
    assert to != empty(address), "ERC1155: transfer to the zero address"
    assert len(ids) == len(amounts), "ERC1155: ids and amounts length mismatch"

    for i: uint256 in range(100):
        if i >= len(ids):
            break
        id: uint256 = ids[i]
        amount: uint256 = amounts[i]

        from_balance: uint256 = self.balances[id][_from]
        assert from_balance >= amount, "ERC1155: insufficient balance for transfer"
        self.balances[id][_from] = from_balance - amount
        self.balances[id][to] += amount

    log TransferBatch(msg.sender, _from, to, ids, amounts)

    if to.is_contract:
        response: bytes4 = extcall IERC1155Receiver(to).onERC1155BatchReceived(msg.sender, _from, ids, amounts, data)
        assert response == ERC1155_BATCH_RECEIVED, "ERC1155: ERC1155Receiver rejected tokens"

@external
def safeTransferFrom(_from: address, to: address, id: uint256, amount: uint256, data: Bytes[1024]):
    """
    @dev See {IERC1155-safeTransferFrom}.
    """
    assert _from == msg.sender or self.operatorApprovals[_from][msg.sender], "ERC1155: caller is not owner nor approved"
    self._safeTransferFrom(_from, to, id, amount, data)

@external
def safeBatchTransferFrom(_from: address, to: address, ids: DynArray[uint256, 100], amounts: DynArray[uint256, 100], data: Bytes[1024]):
    """
    @dev See {IERC1155-safeBatchTransferFrom}.
    """
    assert _from == msg.sender or self.operatorApprovals[_from][msg.sender], "ERC1155: caller is not owner nor approved"
    self._safeBatchTransferFrom(_from, to, ids, amounts, data)

@external
def mint(to: address, id: uint256, amount: uint256, data: Bytes[1024]):
    """
    @dev Mint tokens. Only owner can mint.
    """
    assert msg.sender == self.owner, "ERC1155: only owner can mint"
    assert to != empty(address), "ERC1155: mint to the zero address"

    self.balances[id][to] += amount
    log TransferSingle(msg.sender, empty(address), to, id, amount)

    if to.is_contract:
        response: bytes4 = extcall IERC1155Receiver(to).onERC1155Received(msg.sender, empty(address), id, amount, data)
        assert response == ERC1155_RECEIVED, "ERC1155: ERC1155Receiver rejected tokens"

@external
def mintBatch(to: address, ids: DynArray[uint256, 100], amounts: DynArray[uint256, 100], data: Bytes[1024]):
    """
    @dev Mint tokens in batch. Only owner can mint.
    """
    assert msg.sender == self.owner, "ERC1155: only owner can mint"
    assert to != empty(address), "ERC1155: mint to the zero address"
    assert len(ids) == len(amounts), "ERC1155: ids and amounts length mismatch"

    for i: uint256 in range(100):
        if i >= len(ids):
            break
        self.balances[ids[i]][to] += amounts[i]

    log TransferBatch(msg.sender, empty(address), to, ids, amounts)

    if to.is_contract:
        response: bytes4 = extcall IERC1155Receiver(to).onERC1155BatchReceived(msg.sender, empty(address), ids, amounts, data)
        assert response == ERC1155_BATCH_RECEIVED, "ERC1155: ERC1155Receiver rejected tokens"

@external
@view
def uri(id: uint256) -> String[256]:
    """
    @dev See {IERC1155MetadataURI-uri}.
    """
    return self._uri

@external
def setURI(newuri: String[256]):
    """
    @dev Set the base URI for all token types. Only owner can set.
    """
    assert msg.sender == self.owner, "ERC1155: only owner can set URI"
    self._uri = newuri
    # Note: In a full implementation, you might want to emit URI events for each token ID
    # For simplicity, we're emitting for ID 0
    log URI(newuri, 0)
