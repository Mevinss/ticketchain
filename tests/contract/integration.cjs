const fs = require("node:fs");
const assert = require("node:assert/strict");
const solc = require("solc");
const ganache = require("ganache");
const { ethers } = require("ethers");
async function main() {
  const root = ".";
  const source = fs.readFileSync(root + "/contracts/TicketChain.sol", "utf8");
  const result = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources: { "TicketChain.sol": { content: source } },
        settings: {
          optimizer: { enabled: false, runs: 200 },
          evmVersion: "london",
          outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
        },
      }),
    ),
  );
  const errors = (result.errors || []).filter((e) => e.severity === "error");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  const artifact = result.contracts["TicketChain.sol"].TicketChain;
  console.log("Compiler:", solc.version(), "EVM: london; optimizer: off");
  try {
    const saved = JSON.parse(
      fs.readFileSync(root + "/artifacts/TicketChain_abi.json", "utf8"),
    );
    console.log(
      "Committed ABI matches compiler:",
      JSON.stringify(saved) === JSON.stringify(artifact.abi),
    );
  } catch (e) {
    console.log("Committed ABI INVALID:", e.message);
  }
  fs.writeFileSync(
    "artifacts/TicketChain_abi.json",
    JSON.stringify(artifact.abi, null, 2),
  );
  const vm = ganache.provider({
    logging: { quiet: true },
    wallet: { totalAccounts: 5 },
    chain: { hardfork: "london" },
  });
  const provider = new ethers.BrowserProvider(vm);
  provider.pollingInterval = 20;
  const [admin, a, b, checker, outsider] = await Promise.all(
    [0, 1, 2, 3, 4].map((i) => provider.getSigner(i)),
  );
  const c = await new ethers.ContractFactory(
    artifact.abi,
    artifact.evm.bytecode.object,
    admin,
  ).deploy();
  await c.waitForDeployment();
  let passed = 0;
  const ok = (name) => {
    passed++;
    console.log("PASS", name);
  };
  async function reject(name, fn, errorName) {
    let caught;
    try {
      await fn();
    } catch (e) {
      caught = e;
    }
    assert(caught, name + " unexpectedly succeeded");
    if (errorName) {
      const data = caught.data || caught.info?.error?.data?.result;
      assert.equal(c.interface.parseError(data).name, errorName);
    }
    ok(name);
  }
  const tx = async (p) => (await p).wait();
  assert.equal(await c.admin(), await admin.getAddress());
  ok("admin is deployer");
  const block = await provider.getBlock("latest");
  const start = block.timestamp + 7200,
    end = start + 3600;
  const price = ethers.parseEther("0.001");
  await tx(
    c.createEvent(
      "Entry demo",
      "https://example.org/a.json",
      start,
      end,
      price,
      10,
    ),
  );
  await tx(
    c.createEvent(
      "Refund demo",
      "https://example.org/b.json",
      start,
      end,
      price,
      10,
    ),
  );
  ok("create two events");
  await reject(
    "non-admin cannot create",
    () => c.connect(a).createEvent.staticCall("x", "x", start, end, price, 10),
    "NotAdmin",
  );
  await tx(c.connect(a).buyTicket(1, 1, { value: price }));
  assert.equal((await c.getTicket(1)).owner, await a.getAddress());
  ok("buyer A purchase");
  await reject(
    "buyer B cannot buy same seat",
    () => c.connect(b).buyTicket.staticCall(1, 1, { value: price }),
    "SeatAlreadySold",
  );
  await reject(
    "wrong price rejected",
    () => c.connect(b).buyTicket.staticCall(1, 2, { value: price + 1n }),
    "WrongPrice",
  );
  await reject(
    "outsider cannot pause",
    () => c.connect(outsider).setEventSalesPaused.staticCall(1, true),
    "NotOrganizer",
  );
  await tx(c.setEventSalesPaused(1, true));
  await reject(
    "paused purchase rejected",
    () => c.connect(b).buyTicket.staticCall(1, 2, { value: price }),
    "SalesPaused",
  );
  await tx(c.setEventSalesPaused(1, false));
  await tx(c.connect(b).buyTicket(2, 1, { value: price }));
  await reject(
    "refund before cancellation rejected",
    () => c.connect(b).refundTicket.staticCall(2),
    "EventNotCancelled",
  );
  await tx(c.cancelEvent(2));
  await reject(
    "someone else cannot refund",
    () => c.connect(a).refundTicket.staticCall(2),
    "NotTicketOwner",
  );
  await tx(c.connect(b).refundTicket(2));
  assert.equal((await c.getTicket(2)).refunded, true);
  assert.equal((await c.getFunction("getEvent")(2)).escrowBalance, 0n);
  assert.equal((await c.getFunction("getEvent")(1)).escrowBalance, price);
  ok("refund and escrow isolation");
  await reject(
    "double refund rejected",
    () => c.connect(b).refundTicket.staticCall(2),
    "TicketAlreadyRefunded",
  );
  await reject(
    "cancelled withdrawal rejected",
    () => c.withdrawProceeds.staticCall(2),
    "EventIsCancelled",
  );
  await tx(c.setChecker(1, await checker.getAddress(), true));
  await reject(
    "early entry rejected",
    () => c.connect(checker).checkIn.staticCall(1),
    "CheckInTooEarly",
  );
  await reject(
    "outsider entry rejected",
    () => c.connect(outsider).checkIn.staticCall(1),
    "NotAuthorized",
  );
  await vm.request({ method: "evm_increaseTime", params: [3700] });
  await vm.request({ method: "evm_mine", params: [] });
  await tx(c.connect(checker).checkIn(1));
  assert.equal((await c.getTicket(1)).used, true);
  ok("assigned checker confirms entry");
  await reject(
    "repeat entry rejected",
    () => c.connect(checker).checkIn.staticCall(1),
    "TicketAlreadyUsed",
  );
  await reject(
    "cancel after entry window rejected",
    () => c.cancelEvent.staticCall(1),
    "CancelWindowClosed",
  );
  await reject(
    "early withdrawal rejected",
    () => c.withdrawProceeds.staticCall(1),
    "WithdrawTooEarly",
  );
  assert.equal((await c.getEvents(0, 1)).length, 1);
  assert.equal((await c.getEvents(2, 1)).length, 0);
  assert.deepEqual(
    Array.from(await c.getUserTicketIds(await a.getAddress(), 0, 10)),
    [1n],
  );
  ok("pagination and owner ticket IDs");
  await vm.request({ method: "evm_increaseTime", params: [8000] });
  await vm.request({ method: "evm_mine", params: [] });
  await tx(c.withdrawProceeds(1));
  assert.equal((await c.getFunction("getEvent")(1)).escrowBalance, 0n);
  ok("withdraw after end");
  await reject(
    "double withdrawal rejected",
    () => c.withdrawProceeds.staticCall(1),
    "AlreadyWithdrawn",
  );
  const receiverSource = fs.readFileSync("tests/contract/Receiver.sol", "utf8");
  const receiverOutput = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources: {
          "contracts/TicketChain.sol": { content: source },
          "tests/contract/Receiver.sol": { content: receiverSource },
        },
        settings: {
          evmVersion: "london",
          outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
        },
      }),
    ),
  );
  assert.equal(
    (receiverOutput.errors || []).filter((e) => e.severity === "error").length,
    0,
    JSON.stringify(receiverOutput.errors),
  );
  const ra = receiverOutput.contracts["tests/contract/Receiver.sol"].Receiver;
  const receiver = await new ethers.ContractFactory(
    ra.abi,
    ra.evm.bytecode.object,
    admin,
  ).deploy();
  await receiver.waitForDeployment();
  const timestamp = Number(
    (
      await vm.request({
        method: "eth_getBlockByNumber",
        params: ["latest", false],
      })
    ).timestamp,
  );
  await tx(
    c.createEvent(
      "Receiver refund",
      "https://example.org/c.json",
      timestamp + 7200,
      timestamp + 10800,
      price,
      10,
    ),
  );
  await tx(receiver.buy(await c.getAddress(), 3, { value: price }));
  await tx(c.cancelEvent(3));
  await tx(receiver.modes(true, false));
  await reject("receiver rejection reverts refund transaction", () =>
    tx(receiver.refund({ gasLimit: 300000 })),
  );
  assert.equal((await c.getTicket(3)).refunded, false);
  assert.equal((await c.getFunction("getEvent")(3)).escrowBalance, price);
  ok("failed refund rolls back state and escrow");
  await tx(receiver.modes(false, true));
  await tx(receiver.refund());
  assert.equal(await receiver.reentryBlocked(), true);
  assert.equal((await c.getFunction("getEvent")(3)).refundedCount, 1n);
  assert.equal((await c.getFunction("getEvent")(3)).escrowBalance, 0n);
  ok("reentrant duplicate refund blocked with one payment");
  const owned = new ethers.Contract(await receiver.owned(), artifact.abi, a);
  const timestamp2 = Number(
    (
      await vm.request({
        method: "eth_getBlockByNumber",
        params: ["latest", false],
      })
    ).timestamp,
  );
  await tx(receiver.create(timestamp2 + 10, timestamp2 + 20));
  await tx(owned.buyTicket(1, 1, { value: 1 }));
  await vm.request({ method: "evm_increaseTime", params: [30] });
  await vm.request({ method: "evm_mine", params: [] });
  await tx(receiver.modes(true, false));
  await reject("organizer receiver rejection reverts withdrawal", () =>
    tx(receiver.withdraw({ gasLimit: 300000 })),
  );
  assert.equal(
    (await owned.getFunction("getEvent")(1)).proceedsWithdrawn,
    false,
  );
  assert.equal((await owned.getFunction("getEvent")(1)).escrowBalance, 1n);
  ok("failed withdrawal restores claim and escrow");
  await tx(receiver.modes(false, false));
  await tx(receiver.withdraw());
  assert.equal(
    (await owned.getFunction("getEvent")(1)).proceedsWithdrawn,
    true,
  );
  ok("withdrawal retry succeeds after receiver accepts");
  console.log(
    "TOTAL",
    passed,
    "checks passed. Local Ganache EVM, not Remix VM or Sepolia.",
  );
  await vm.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
