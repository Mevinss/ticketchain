// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import "../../contracts/TicketChain.sol";
contract Receiver {
    TicketChain public owned;
    TicketChain public target;
    uint256 public ticketId;
    bool public rejectPayment;
    bool public attack;
    bool public reentryBlocked;
    constructor(){owned=new TicketChain();}
    function buy(TicketChain c,uint256 eventId) external payable {target=c;ticketId=c.buyTicket{value:msg.value}(eventId,1);}
    function modes(bool reject_,bool attack_) external {rejectPayment=reject_;attack=attack_;}
    function refund() external {target.refundTicket(ticketId);}
    function create(uint256 start,uint256 end) external {owned.createEvent("Receiver event","https://example.org/x",start,end,1,10);}
    function withdraw() external {owned.withdrawProceeds(1);}
    receive() external payable {require(!rejectPayment,"receiver rejects");if(attack){attack=false;(bool ok,)=address(target).call(abi.encodeCall(target.refundTicket,(ticketId)));reentryBlocked=!ok;}}
}
