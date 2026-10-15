// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import "remix_tests.sol";
import "../contracts/TicketChain.sol";

// Actors give each call a genuinely different msg.sender.
contract TicketBuyer {
    function buy(TicketChain c,uint256 eventId,uint256 seat) external payable {c.buyTicket{value:msg.value}(eventId,seat);}
    function refund(TicketChain c,uint256 id) external {c.refundTicket(id);}
    function enter(TicketChain c,uint256 id) external {c.checkIn(id);}
    receive() external payable {}
}
contract TicketChainTest {
    TicketChain c;
    TicketBuyer buyer;
    TicketBuyer checker;
    function beforeEach() public {c=new TicketChain();buyer=new TicketBuyer();checker=new TicketBuyer();}
    function create(uint256 delay) internal returns(uint256){return c.createEvent("Demo","https://example.org/demo.json",block.timestamp+delay,block.timestamp+delay+7200,0.001 ether,10);}
    function checkAdmin() public {Assert.equal(c.admin(),address(this),"deployer is admin");}
    function checkCreate() public {uint256 id=create(7200);EventData memory e=c.getEvent(id);Assert.equal(e.capacity,10,"capacity");Assert.equal(e.title,"Demo","title");}
    /// #value: 1000000000000000
    function checkPurchase() public payable {uint256 id=create(7200);buyer.buy{value:0.001 ether}(c,id,1);Ticket memory t=c.getTicket(1);Assert.equal(t.owner,address(buyer),"actual buyer owns ticket");Assert.equal(c.getEvent(id).escrowBalance,0.001 ether,"escrow");}
    /// #value: 2000000000000000
    function checkDuplicateSeat() public payable {uint256 id=create(7200);buyer.buy{value:0.001 ether}(c,id,1);bool failed;try checker.buy{value:0.001 ether}(c,id,1) {} catch {failed=true;}Assert.ok(failed,"second buyer cannot buy occupied seat");}
    /// #value: 1000000000000000
    function checkEntryAndRepeatedEntry() public payable {uint256 id=create(1800);buyer.buy{value:0.001 ether}(c,id,1);bool unauthorized;try checker.enter(c,1) {} catch {unauthorized=true;}Assert.ok(unauthorized,"unassigned checker denied");c.setChecker(id,address(checker),true);checker.enter(c,1);Assert.ok(c.getTicket(1).used,"entry marked");bool duplicate;try checker.enter(c,1) {} catch {duplicate=true;}Assert.ok(duplicate,"second entry denied");}
    /// #value: 1000000000000000
    function checkRefund() public payable {uint256 id=create(7200);buyer.buy{value:0.001 ether}(c,id,1);c.cancelEvent(id);uint256 beforeBalance=address(buyer).balance;buyer.refund(c,1);Assert.equal(address(buyer).balance,beforeBalance+0.001 ether,"full ticket amount returned");Assert.ok(c.getTicket(1).refunded,"refund state");bool duplicate;try buyer.refund(c,1) {} catch {duplicate=true;}Assert.ok(duplicate,"second refund denied");}
    function checkPagination() public {create(7200);create(7200);EventData[] memory page=c.getEvents(1,1);Assert.equal(page.length,1,"one result");Assert.equal(page[0].id,2,"offset semantics");Assert.equal(c.getEvents(2,1).length,0,"empty beyond end");}
    /// #value: 1000000000000000
    function checkDirectTransferRejected() public payable {(bool ok,)=address(c).call{value:0.001 ether}("");Assert.ok(!ok,"direct transfer rejected");}
    receive() external payable {}
}
