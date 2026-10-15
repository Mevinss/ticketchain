// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
error NotAdmin();
error NotOrganizer(uint256 eventId);
error NotAuthorized(uint256 eventId);
error EmptyString();
error InvalidTimeRange();
error InvalidPrice();
error InvalidCapacity();
error EventNotFound(uint256 eventId);
error TicketNotFound(uint256 ticketId);
error EventIsCancelled(uint256 eventId);
error SalesPaused(uint256 eventId);
error EventAlreadyCancelled(uint256 eventId);
error EventStarted(uint256 eventId);
error EventNotCancelled(uint256 eventId);
error ZeroAddress();
error SeatOutOfRange(uint256 seat, uint256 capacity);
error SeatAlreadySold(uint256 seat);
error WrongPrice(uint256 sent, uint256 expected);
error TicketAlreadyUsed(uint256 ticketId);
error TicketAlreadyRefunded(uint256 ticketId);
error NotTicketOwner(uint256 ticketId);
error CheckInTooEarly(uint256 ticketId);
error CheckInTooLate(uint256 ticketId);
error CancelWindowClosed(uint256 eventId);
error WithdrawTooEarly(uint256 eventId);
error AlreadyWithdrawn(uint256 eventId);
error InvalidLimit();
error EtherRefused();

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

struct EventData {
    uint256 id;
    address organizer;
    string title;
    string metadataURI;
    uint256 startsAt;
    uint256 endsAt;
    uint256 ticketPrice;
    uint256 capacity;
    uint256 ticketsSold;
    uint256 checkedInCount;
    uint256 refundedCount;
    bool salesPaused;
    bool cancelled;
    uint256 escrowBalance;
    bool proceedsWithdrawn;
}

struct Ticket {
    uint256 id;
    uint256 eventId;
    uint256 seatNumber;
    address owner;
    uint256 pricePaid;
    bool used;
    bool refunded;
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/// @notice Educational ticket-sale smart contract for Ethereum Remix IDE.
/// @dev NOT production-ready and NOT audited. Intended for learning on
///      Remix VM or Ethereum Sepolia testnet with test ETH only.
///      Solidity 0.8.24, no external dependencies.
contract TicketChain {
    // --- State -------------------------------------------------------------

    address public immutable admin;

    uint256 public eventCount;
    uint256 public ticketCount;

    mapping(uint256 => EventData) private _events;
    mapping(uint256 => Ticket) private _tickets;

    // eventId => seatNumber => ticketId (0 = free)
    mapping(uint256 => mapping(uint256 => uint256)) private _seatTickets;

    // owner => array of ticket IDs
    mapping(address => uint256[]) private _userTickets;

    // eventId => checker => allowed
    mapping(uint256 => mapping(address => bool)) private _checkers;

    // --- Constants ---------------------------------------------------------

    uint256 public constant MAX_CAPACITY = 200;
    uint256 public constant CHECK_IN_WINDOW_BEFORE = 1 hours;

    // --- Events ------------------------------------------------------------

    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        string title,
        uint256 startsAt,
        uint256 endsAt,
        uint256 ticketPrice,
        uint256 capacity
    );
    event SalesPausedChanged(uint256 indexed eventId, bool paused);
    event CheckerUpdated(
        uint256 indexed eventId,
        address indexed checker,
        bool allowed
    );
    event TicketPurchased(
        uint256 indexed ticketId,
        uint256 indexed eventId,
        uint256 indexed seatNumber,
        address buyer,
        uint256 pricePaid
    );
    event TicketCheckedIn(
        uint256 indexed ticketId,
        uint256 indexed eventId,
        address indexed checker
    );
    event EventCancelled(uint256 indexed eventId, address indexed organizer);
    event TicketRefunded(
        uint256 indexed ticketId,
        uint256 indexed eventId,
        address indexed owner,
        uint256 amount
    );
    event ProceedsWithdrawn(
        uint256 indexed eventId,
        address indexed organizer,
        uint256 amount
    );

    // --- Constructor -------------------------------------------------------

    constructor() {
        admin = msg.sender;
    }

    // --- Modifiers ---------------------------------------------------------

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier eventExists(uint256 eventId) {
        if (eventId == 0 || eventId > eventCount)
            revert EventNotFound(eventId);
        _;
    }

    // --- Admin: createEvent ------------------------------------------------

    function createEvent(
        string calldata title,
        string calldata metadataURI,
        uint256 startsAt,
        uint256 endsAt,
        uint256 ticketPrice,
        uint256 capacity
    ) external onlyAdmin returns (uint256 eventId) {
        if (bytes(title).length == 0) revert EmptyString();
        if (bytes(metadataURI).length == 0) revert EmptyString();
        if (startsAt <= block.timestamp) revert InvalidTimeRange();
        if (endsAt <= startsAt) revert InvalidTimeRange();
        if (ticketPrice == 0) revert InvalidPrice();
        if (capacity < 1 || capacity > MAX_CAPACITY) revert InvalidCapacity();

        eventId = ++eventCount;

        _events[eventId] = EventData({
            id: eventId,
            organizer: msg.sender,
            title: title,
            metadataURI: metadataURI,
            startsAt: startsAt,
            endsAt: endsAt,
            ticketPrice: ticketPrice,
            capacity: capacity,
            ticketsSold: 0,
            checkedInCount: 0,
            refundedCount: 0,
            salesPaused: false,
            cancelled: false,
            escrowBalance: 0,
            proceedsWithdrawn: false
        });

        emit EventCreated(
            eventId,
            msg.sender,
            title,
            startsAt,
            endsAt,
            ticketPrice,
            capacity
        );
    }

    // --- Organizer: setEventSalesPaused -----------------------------------

    function setEventSalesPaused(
        uint256 eventId,
        bool paused
    ) external eventExists(eventId) {
        EventData storage e = _events[eventId];
        if (msg.sender != e.organizer) revert NotOrganizer(eventId);
        if (e.cancelled) revert EventIsCancelled(eventId);
        if (block.timestamp >= e.startsAt) revert EventStarted(eventId);

        e.salesPaused = paused;
        emit SalesPausedChanged(eventId, paused);
    }

    // --- Organizer: setChecker --------------------------------------------

    function setChecker(
        uint256 eventId,
        address checker,
        bool allowed
    ) external eventExists(eventId) {
        EventData storage e = _events[eventId];
        if (msg.sender != e.organizer) revert NotOrganizer(eventId);
        if (checker == address(0)) revert ZeroAddress();

        _checkers[eventId][checker] = allowed;
        emit CheckerUpdated(eventId, checker, allowed);
    }

    // --- Public: buyTicket -------------------------------------------------

    function buyTicket(
        uint256 eventId,
        uint256 seatNumber
    ) external payable eventExists(eventId) returns (uint256 ticketId) {
        EventData storage e = _events[eventId];

        if (e.cancelled) revert EventIsCancelled(eventId);
        if (e.salesPaused) revert SalesPaused(eventId);
        if (block.timestamp >= e.startsAt) revert EventStarted(eventId);
        if (seatNumber < 1 || seatNumber > e.capacity)
            revert SeatOutOfRange(seatNumber, e.capacity);
        if (_seatTickets[eventId][seatNumber] != 0)
            revert SeatAlreadySold(seatNumber);
        if (msg.value != e.ticketPrice)
            revert WrongPrice(msg.value, e.ticketPrice);

        // effects
        ticketId = ++ticketCount;
        _tickets[ticketId] = Ticket({
            id: ticketId,
            eventId: eventId,
            seatNumber: seatNumber,
            owner: msg.sender,
            pricePaid: msg.value,
            used: false,
            refunded: false
        });

        _seatTickets[eventId][seatNumber] = ticketId;
        _userTickets[msg.sender].push(ticketId);

        e.ticketsSold += 1;
        e.escrowBalance += msg.value;

        emit TicketPurchased(
            ticketId,
            eventId,
            seatNumber,
            msg.sender,
            msg.value
        );
    }

    // --- Organizer / Checker: checkIn -------------------------------------

    function checkIn(uint256 ticketId) external {
        if (ticketId == 0 || ticketId > ticketCount)
            revert TicketNotFound(ticketId);

        Ticket storage t = _tickets[ticketId];
        EventData storage e = _events[t.eventId];

        bool isOrg = (msg.sender == e.organizer);
        bool isCheckerAssigned = _checkers[t.eventId][msg.sender];
        if (!isOrg && !isCheckerAssigned) revert NotAuthorized(t.eventId);

        if (e.cancelled) revert EventIsCancelled(t.eventId);
        if (t.used) revert TicketAlreadyUsed(ticketId);
        if (t.refunded) revert TicketAlreadyRefunded(ticketId);

        // Safe lower bound: startsAt - 1 hour, guarded against underflow
        uint256 windowStart = e.startsAt > CHECK_IN_WINDOW_BEFORE
            ? e.startsAt - CHECK_IN_WINDOW_BEFORE
            : 0;
        if (block.timestamp < windowStart) revert CheckInTooEarly(ticketId);
        if (block.timestamp > e.endsAt) revert CheckInTooLate(ticketId);

        // effects
        t.used = true;
        e.checkedInCount += 1;

        emit TicketCheckedIn(ticketId, t.eventId, msg.sender);
    }

    // --- Organizer: cancelEvent -------------------------------------------

    function cancelEvent(uint256 eventId) external eventExists(eventId) {
        EventData storage e = _events[eventId];
        if (msg.sender != e.organizer) revert NotOrganizer(eventId);
        if (e.cancelled) revert EventAlreadyCancelled(eventId);

        // Only before the check-in window opens
        uint256 windowStart = e.startsAt > CHECK_IN_WINDOW_BEFORE
            ? e.startsAt - CHECK_IN_WINDOW_BEFORE
            : 0;
        if (block.timestamp >= windowStart) revert CancelWindowClosed(eventId);

        e.cancelled = true;
        emit EventCancelled(eventId, msg.sender);
    }

    // --- Ticket owner: refundTicket ---------------------------------------

    function refundTicket(uint256 ticketId) external {
        if (ticketId == 0 || ticketId > ticketCount)
            revert TicketNotFound(ticketId);

        Ticket storage t = _tickets[ticketId];
        EventData storage e = _events[t.eventId];

        if (msg.sender != t.owner) revert NotTicketOwner(ticketId);
        if (!e.cancelled) revert EventNotCancelled(t.eventId);
        if (t.used) revert TicketAlreadyUsed(ticketId);
        if (t.refunded) revert TicketAlreadyRefunded(ticketId);

        uint256 refundAmount = t.pricePaid;

        // effects
        t.refunded = true;
        e.escrowBalance -= refundAmount;
        e.refundedCount += 1;

        emit TicketRefunded(ticketId, t.eventId, msg.sender, refundAmount);

        // interaction
        (bool ok, ) = payable(msg.sender).call{value: refundAmount}("");
        if (!ok) revert EtherRefused();
    }

    // --- Organizer: withdrawProceeds --------------------------------------

    function withdrawProceeds(uint256 eventId) external eventExists(eventId) {
        EventData storage e = _events[eventId];
        if (msg.sender != e.organizer) revert NotOrganizer(eventId);
        if (e.cancelled) revert EventIsCancelled(eventId);
        if (block.timestamp < e.endsAt) revert WithdrawTooEarly(eventId);
        if (e.proceedsWithdrawn) revert AlreadyWithdrawn(eventId);

        uint256 amount = e.escrowBalance;

        // effects
        e.escrowBalance = 0;
        e.proceedsWithdrawn = true;

        emit ProceedsWithdrawn(eventId, msg.sender, amount);

        // interaction
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert EtherRefused();
    }

    // -----------------------------------------------------------------------
    // Read API
    // -----------------------------------------------------------------------

    function getEvent(
        uint256 eventId
    ) external view eventExists(eventId) returns (EventData memory) {
        return _events[eventId];
    }

    function getTicket(
        uint256 ticketId
    ) external view returns (Ticket memory) {
        if (ticketId == 0 || ticketId > ticketCount)
            revert TicketNotFound(ticketId);
        return _tickets[ticketId];
    }

    function getEvents(
        uint256 offset,
        uint256 limit
    ) external view returns (EventData[] memory) {
        if (limit < 1 || limit > 100) revert InvalidLimit();
        if (offset >= eventCount) return new EventData[](0);

        uint256 end = offset + limit;
        if (end > eventCount) end = eventCount;
        uint256 size = end - offset;

        EventData[] memory result = new EventData[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = _events[offset + i + 1];
        }
        return result;
    }

    function getUserTicketIds(
        address owner,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory) {
        if (limit < 1 || limit > 100) revert InvalidLimit();
        uint256 total = _userTickets[owner].length;
        if (offset >= total) return new uint256[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 size = end - offset;

        uint256[] memory result = new uint256[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = _userTickets[owner][offset + i];
        }
        return result;
    }

    function getUserTicketCount(address owner) external view returns (uint256) {
        return _userTickets[owner].length;
    }

    function getSeatTicketIds(
        uint256 eventId
    ) external view eventExists(eventId) returns (uint256[] memory) {
        EventData storage e = _events[eventId];
        uint256[] memory seats = new uint256[](e.capacity);
        for (uint256 i = 0; i < e.capacity; i++) {
            seats[i] = _seatTickets[eventId][i + 1];
        }
        return seats;
    }

    function isChecker(
        uint256 eventId,
        address account
    ) external view eventExists(eventId) returns (bool) {
        EventData storage e = _events[eventId];
        return (account == e.organizer) || _checkers[eventId][account];
    }

    // --- Fallback: reject direct ETH --------------------------------------

    receive() external payable {
        revert EtherRefused();
    }

    fallback() external payable {
        revert EtherRefused();
    }
}
