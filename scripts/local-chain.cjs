// Local test accounts only. No wallet secrets are read or written.
const fs = require("node:fs");
const ganache = require("ganache");
const { ethers } = require("ethers");
const { compile } = require("./compile-contract.cjs");
async function start() {
  const server = ganache.server({
    logging: { quiet: true },
    wallet: { totalAccounts: 6 },
    chain: { chainId: 31337, hardfork: "london" },
  });
  await server.listen(8545, "127.0.0.1");
  const p = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  p.pollingInterval = 20;
  const accounts = await p.listAccounts();
  const artifact = compile();
  const c = await new ethers.ContractFactory(
    artifact.abi,
    artifact.evm.bytecode.object,
    accounts[0],
  ).deploy();
  await c.waitForDeployment();
  const ts = (await p.getBlock("latest")).timestamp;
  const titles = [
    "Jazz Night",
    "Cinema Club",
    "Stand Up",
    "Theatre Evening",
    "Campus Fest",
    "Game Night",
  ];
  const slugs = ["night", "cinema", "standup", "theatre", "campus", "arena"];
  for (let i = 0; i < 6; i++) {
    const start = ts + (i === 0 ? 1800 : 86400 + i * 3600);
    await (
      await c.createEvent(
        titles[i],
        "http://127.0.0.1:5173/metadata/" + slugs[i] + ".json",
        start,
        start + 7200,
        ethers.parseEther("0.001"),
        40,
      )
    ).wait();
    await (
      await c.setChecker(i + 1, await accounts[3].getAddress(), true)
    ).wait();
  }
  const record = {
    chainId: 31337,
    address: await c.getAddress(),
    accounts: await Promise.all(accounts.map((a) => a.getAddress())),
  };
  fs.mkdirSync(".superpowers", { recursive: true });
  fs.writeFileSync(
    ".superpowers/local-deployment.json",
    JSON.stringify(record, null, 2),
  );
  if (process.argv.includes("--write-env")) {
    const path = "frontend/.env.local";
    if (fs.existsSync(path))
      throw Error(
        "frontend/.env.local already exists; preserve it and configure manually.",
      );
    fs.writeFileSync(
      path,
      `VITE_CHAIN_ID=31337\nVITE_RPC_URL=http://127.0.0.1:8545\nVITE_CONTRACT_ADDRESS=${record.address}\nVITE_EXPLORER_URL=\n`,
    );
  }
  console.log("Local EVM ready:", JSON.stringify(record));
  process.on("SIGINT", async () => {
    await server.close();
    process.exit();
  });
}
start().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
