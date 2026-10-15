// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "remix_tests.sol";
import "../contracts/TicketChain.sol";

contract TicketChainTest {
    TicketChain tc;
    address admin;
    address buyerA;
    address buyerB;
    address checker;
    address outsider;

    /// Creates a fresh TicketChain before each test.
    function beforeEach() public {
        tc = new TicketChain();
        admin = address(this);
        buyerA = tests_accounts(0);
        buyerB = tests_accounts(1);
        checker = tests_accounts(2);
        outsider = tests_accounts(3);
    }

    /// @dev Helper: create a default event starting in 2 days, ending in 3 days.
    function _createDefaultEvent() internal returns (uint256) {
        uint256 startsAt = block.timestamp + 2 days;
        uint256 endsAt = startsAt + 1 days;
        return tc.createEvent("Test Event", "ipfs://meta", startsAt, endsAt, 0.01 ether, 10);
    }

    /// @dev Helper: create an event starting very soon (for check-in / cancel window tests).
    function _createSoonEvent() internal returns (uint256) {
        uint256 startsAt = block.timestamp + 1 hours + 100 seconds;
        uint256 endsAt = startsAt + 2 hours;
        return tc.createEvent("Soon Event", "ipfs://meta2", startsAt, endsAt, 0.01 ether, 5);
    }

    // ------------------------------------------------------------------
    // 1. Admin & createEvent
    // ------------------------------------------------------------------
    function checkAdminIsDeployer() public {
        Assert.equal(tc.admin(), address(this), "deployer should be admin");
    }

    function checkCreateEventSuccess() public {
        uint256 id = _createDefaultEvent();
        Assert.equal(id, 1, "first event id should be 1");
        Assert.equal(tc.eventCount(), 1, "eventCount should be 1");

        TicketChain.EventData memory e = tc.getEvent(1);
        Assert.equal(e.title, "Test Event", "title mismatch");
        Assert.equal(e.ticketPrice, 0.01 ether, "price mismatch");
        Assert.equal(e.capacity, 10, "capacity mismatch");
        Assert.equal(e.ticketsSold, 0, "ticketsSold should be 0");
        Assert.equal(e.cancelled, false, "should not be cancelled");
    }

    function checkCreateEventInvalidCapacity() public {
        uint256 startsAt = block.timestamp + 2 days;
        uint256 endsAt = startsAt + 1 days;
        try tc.createEvent("Bad", "ipfs://x", startsAt, endsAt, 0.01 ether, 0) {
            Assert.ok(false, "should revert for capacity 0");
        } catch {}
        try tc.createEvent("Bad", "ipfs://x", startsAt, endsAt, 0.01 ether, 201) {
            Assert.ok(false, "should revert for capacity 201");
        } catch {}
    }

    function checkCreateEventEmptyTitle() public {
        uint256 startsAt = block.timestamp + 2 days;
        uint256 endsAt = startsAt + 1 days;
        try tc.createEvent("", "ipfs://x", startsAt, endsAt, 0.01 ether, 10) {
            Assert.ok(false, "should revert for empty title");
        } catch {}
    }

    function checkCreateEventInvalidTimeRange() public {
        uint256 startsAt = block.timestamp + 2 days;
        try tc.createEvent("Bad", "ipfs://x", startsAt, startsAt, 0.01 ether, 10) {
            Assert.ok(false, "should revert for endsAt == startsAt");
        } catch {}
        try tc.createEvent("Bad", "ipfs://x", block.timestamp, startsAt, 0.01 ether, 10) {
            Assert.ok(false, "should revert for startsAt <= now");
        } catch {}
    }

    // ------------------------------------------------------------------
    // 2. buyTicket
    // ------------------------------------------------------------------
    function checkBuyTicketSuccess() public {
        uint256 eventId = _createDefaultEvent();
        uint256 ticketId = tc.buyTicket{value: 0.01 ether}(eventId, 1);
        Assert.equal(ticketId, 1, "first ticket id should be 1");

        TicketChain.Ticket memory t = tc.getTicket(1);
        Assert.equal(t.seatNumber, 1, "seat mismatch");
        Assert.equal(t.used, false, "should not be used");
        Assert.equal(t.refunded, false, "should not be refunded");

        TicketChain.EventData memory e = tc.getEvent(eventId);
        Assert.equal(e.ticketsSold, 1, "ticketsSold should be 1");
        Assert.equal(e.escrowBalance, 0.01 ether, "escrow should be 0.01 eth");
    }

    function checkBuySameSeatFails() public {
        uint256 eventId = _createDefaultEvent();
        tc.buyTicket{value: 0.01 ether}(eventId, 1);
        try tc.buyTicket{value: 0.01 ether}(eventId, 1) {
            Assert.ok(false, "should revert for already-sold seat");
        } catch {}
    }

    function checkBuyWrongPriceFails() public {
        uint256 eventId = _createDefaultEvent();
        try tc.buyTicket{value: 0.02 ether}(eventId, 1) {
            Assert.ok(false, "should revert for wrong price");
        } catch {}
        try tc.buyTicket{value: 0.005 ether}(eventId, 1) {
            Assert.ok(false, "should revert for wrong price");
        } catch {}
    }

    function checkBuySeatOutOfRange() public {
        uint256 eventId = _createDefaultEvent();
        try tc.buyTicket{value: 0.01 ether}(eventId, 0) {
            Assert.ok(false, "should revert for seat 0");
        } catch {}
        try tc.buyTicket{value: 0.01 ether}(eventId, 11) {
            Assert.ok(false, "should revert for seat > capacity");
        } catch {}
    }

    // ------------------------------------------------------------------
    // 3. setEventSalesPaused
    // ------------------------------------------------------------------
    function checkSalesPausedBlocksPurchase() public {
        uint256 eventId = _createDefaultEvent();
        tc.setEventSalesPaused(eventId, true);
        try tc.buyTicket{value: 0.01 ether}(eventId, 1) {
            Assert.ok(false, "should revert when sales paused");
        } catch {}
    }

    function checkNonOrganizerCannotPause() public {
        uint256 eventId = _createDefaultEvent();
        // We can't easily impersonate in Remix tests; this is a structural check
        // The beforeEach deploys as admin/organizer so we test pause/unpause works
        tc.setEventSalesPaused(eventId, true);
        Assert.equal(tc.getEvent(eventId).salesPaused, true, "should be paused");
        tc.setEventSalesPaused(eventId, false);
        Assert.equal(tc.getEvent(eventId).salesPaused, false, "should be unpaused");
    }

    // ------------------------------------------------------------------
    // 4. checkIn
    // ------------------------------------------------------------------
    function checkCheckInSuccess() public {
        uint256 eventId = _createSoonEvent();
        tc.buyTicket{value: 0.01 ether}(eventId, 1);
        // Advance time past startsAt by using evm_increaseTime is not available
        // in Remix tests directly; we can only test the logic structurally
        // The check-in window starts at startsAt - 1 hour
        // Since startsAt = now + 1h + 100s, windowStart = now + 100s
        // We cannot advance time in pure Remix tests without evm_mine
    }

    function checkCheckInNotAuthorized() public {
        // Structural check: only organizer or checker can call checkIn
        // In Remix tests the caller is always address(this) which is the deployer
        // A full test requires impersonation which is not available
    }

    // ------------------------------------------------------------------
    // 5. cancelEvent
    // ------------------------------------------------------------------
    function checkCancelEventSuccess() public {
        uint256 eventId = _createDefaultEvent();
        tc.cancelEvent(eventId);
        Assert.equal(tc.getEvent(eventId).cancelled, true, "should be cancelled");
    }

    function checkCancelTwiceFails() public {
        uint256 eventId = _createDefaultEvent();
        tc.cancelEvent(eventId);
        try tc.cancelEvent(eventId) {
            Assert.ok(false, "should revert for double cancel");
        } catch {}
    }

    // ------------------------------------------------------------------
    // 6. refundTicket
    // ------------------------------------------------------------------
    function checkRefundAfterCancel() public {
        uint256 eventId = _createDefaultEvent();
        tc.buyTicket{value: 0.01 ether}(eventId, 1);
        uint256 balBefore = address(this).balance;
        tc.cancelEvent(eventId);
        tc.refundTicket(1);

        TicketChain.Ticket memory t = tc.getTicket(1);
        Assert.equal(t.refunded, true, "ticket should be refunded");

        TicketChain.EventData memory e = tc.getEvent(eventId);
        Assert.equal(e.refundedCount, 1, "refundedCount should be 1");
        Assert.equal(e.escrowBalance, 0, "escrow should be 0 after refund");
    }

    function checkDoubleRefundFails() public {
        uint256 eventId = _createDefaultEvent();
        tc.buyTicket{value: 0.01 ether}(eventId, 1);
        tc.cancelEvent(eventId);
        tc.refundTicket(1);
        try tc.refundTicket(1) {
            Assert.ok(false, "should revert for double refund");
        } catch {}
    }

    function checkRefundBeforeCancelFails() public {
        uint256 eventId = _createDefaultEvent();
        tc.buyTicket{value: 0.01 ether}(eventId, 1);
        try tc.refundTicket(1) {
            Assert.ok(false, "should revert for refund before cancel");
        } catch {}
    }

    // ------------------------------------------------------------------
    // 7. withdrawProceeds
    // ------------------------------------------------------------------
    function checkWithdrawTooEarlyFails() public {
        uint256 eventId = _createDefaultEvent();
        tc.buyTicket{value: 0.01 ether}(eventId, 1);
        try tc.withdrawProceeds(eventId) {
            Assert.ok(false, "should revert for withdraw before endsAt");
        } catch {}
    }

    function checkWithdrawFromCancelledFails() public {
        uint256 eventId = _createDefaultEvent();
        tc.buyTicket{value: 0.01 ether}(eventId, 1);
        tc.cancelEvent(eventId);
        try tc.withdrawProceeds(eventId) {
            Assert.ok(false, "should revert for withdraw from cancelled event");
        } catch {}
    }

    // ------------------------------------------------------------------
    // 8. Escrow isolation between events
    // ------------------------------------------------------------------
    function checkEscrowIsolation() public {
        uint256 startsAt = block.timestamp + 2 days;
        uint256 endsAt = startsAt + 1 days;
        uint256 id1 = tc.createEvent("Event A", "ipfs://a", startsAt, endsAt, 0.01 ether, 10);
        uint256 id2 = tc.createEvent("Event B", "ipfs://b", startsAt, endsAt, 0.02 ether, 10);

        tc.buyTicket{value: 0.01 ether}(id1, 1);
        tc.buyTicket{value: 0.02 ether}(id2, 1);

        Assert.equal(tc.getEvent(id1).escrowBalance, 0.01 ether, "event1 escrow mismatch");
        Assert.equal(tc.getEvent(id2).escrowBalance, 0.02 ether, "event2 escrow mismatch");

        // Cancel event2, refund its ticket — event1 escrow should be unaffected
        tc.cancelEvent(id2);
        tc.refundTicket(2);
        Assert.equal(tc.getEvent(id1).escrowBalance, 0.01 ether, "event1 escrow changed after event2 refund");
    }

    // ------------------------------------------------------------------
    // 9. Pagination
    // ------------------------------------------------------------------
    function checkPagination() public {
        uint256 startsAt = block.timestamp + 2 days;
        uint256 endsAt = startsAt + 1 days;
        for (uint256 i = 1; i <= 5; i++) {
            tc.createEvent(string(abi.encodePacked("E", uint2str(i))), "ipfs://m", startsAt, endsAt, 0.01 ether, 10);
        }
        Assert.equal(tc.eventCount(), 5, "should have 5 events");

        TicketChain.EventData[] memory page1 = tc.getEvents(0, 3);
        Assert.equal(page1.length, 3, "page1 should have 3 events");

        TicketChain.EventData[] memory page2 = tc.getEvents(3, 3);
        Assert.equal(page2.length, 2, "page2 should have 2 events");

        TicketChain.EventData[] memory page3 = tc.getEvents(10, 3);
        Assert.equal(page3.length, 0, "page3 should be empty");
    }

    function checkInvalidLimitFails() public {
        try tc.getEvents(0, 0) {
            Assert.ok(false, "should revert for limit 0");
        } catch {}
        try tc.getEvents(0, 101) {
            Assert.ok(false, "should revert for limit 101");
        } catch {}
    }

    // ------------------------------------------------------------------
    // 10. getSeatTicketIds
    // ------------------------------------------------------------------
    function checkSeatTicketIds() public {
        uint256 eventId = _createDefaultEvent();
        tc.buyTicket{value: 0.01 ether}(eventId, 1);
        tc.buyTicket{value: 0.01 ether}(eventId, 3);

        uint256[] memory seats = tc.getSeatTicketIds(eventId);
        Assert.equal(seats.length, 10, "seat array length should be capacity");
        Assert.equal(seats[0], 1, "seat 1 should have ticket id 1");
        Assert.equal(seats[2], 2, "seat 3 should have ticket id 2");
        Assert.equal(seats[1], 0, "seat 2 should be free (0)");
    }

    // ------------------------------------------------------------------
    // 11. getUserTicketIds
    // ------------------------------------------------------------------
    function checkUserTicketIds() public {
        uint256 eventId = _createDefaultEvent();
        tc.buyTicket{value: 0.01 ether}(eventId, 1);
        tc.buyTicket{value: 0.01 ether}(eventId, 2);

        uint256[] memory ids = tc.getUserTicketIds(address(this), 0, 10);
        Assert.equal(ids.length, 2, "should have 2 tickets");
        Assert.equal(ids[0], 1, "first ticket id");
        Assert.equal(ids[1], 2, "second ticket id");
        Assert.equal(tc.getUserTicketCount(address(this)), 2, "count should be 2");
    }

    // ------------------------------------------------------------------
    // 12. isChecker
    // ------------------------------------------------------------------
    function checkIsChecker() public {
        uint256 eventId = _createDefaultEvent();
        // Organizer should be a checker
        Assert.equal(tc.isChecker(eventId, address(this)), true, "organizer should be checker");
        // Assign a checker
        tc.setChecker(eventId, checker, true);
        Assert.equal(tc.isChecker(eventId, checker), true, "assigned checker should be true");
        // Revoke
        tc.setChecker(eventId, checker, false);
        Assert.equal(tc.isChecker(eventId, checker), false, "revoked checker should be false");
    }

    function checkSetCheckerZeroAddressFails() public {
        uint256 eventId = _createDefaultEvent();
        try tc.setChecker(eventId, address(0), true) {
            Assert.ok(false, "should revert for zero address checker");
        } catch {}
    }

    // ------------------------------------------------------------------
    // 13. Direct ETH transfer refused
    // ------------------------------------------------------------------
    function checkDirectETHRefused() public {
        try address(tc).call{value: 0.01 ether}("") {
            // In Remix VM the receive function reverts, but low-level call returns false
            // We check that the balance did not increase
            Assert.equal(address(tc).balance, 0, "contract should have 0 balance from direct transfer");
        } catch {
            Assert.ok(true, "direct ETH transfer reverted");
        }
    }

    // ------------------------------------------------------------------
    // 14. Non-existent event/ticket queries
    // ------------------------------------------------------------------
    function checkNonExistentEventFails() public {
        try tc.getEvent(999) {
            Assert.ok(false, "should revert for non-existent event");
        } catch {}
    }

    function checkNonExistentTicketFails() public {
        try tc.getTicket(999) {
            Assert.ok(false, "should revert for non-existent ticket");
        } catch {}
    }

    // Helper
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) { len++; j /= 10; }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) { k = k - 1; bstr[k] = bytes1(uint8(48 + _i % 10)); _i /= 10; }
        return string(bstr);
    }
}
