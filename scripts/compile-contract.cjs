const fs = require("node:fs");
const solc = require("solc");
function compile() {
  const source = fs.readFileSync("contracts/TicketChain.sol", "utf8");
  const output = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources: { "contracts/TicketChain.sol": { content: source } },
        settings: {
          optimizer: { enabled: false, runs: 200 },
          evmVersion: "london",
          outputSelection: {
            "*": { "*": ["abi", "evm.bytecode.object", "metadata"] },
          },
        },
      }),
    ),
  );
  const errors = (output.errors || []).filter((e) => e.severity === "error");
  if (errors.length)
    throw new Error(errors.map((e) => e.formattedMessage).join("\n"));
  return output.contracts["contracts/TicketChain.sol"].TicketChain;
}
if (require.main === module) {
  const a = compile();
  for (const dir of ["artifacts", "frontend/src/contracts"])
    fs.mkdirSync(dir, { recursive: true });
  for (const path of [
    "artifacts/TicketChain_abi.json",
    "frontend/src/contracts/TicketChain.abi.json",
  ])
    fs.writeFileSync(path, JSON.stringify(a.abi, null, 2) + "\n");
  fs.writeFileSync(
    "artifacts/TicketChain.json",
    JSON.stringify(
      {
        contractName: "TicketChain",
        compiler: solc.version(),
        evmVersion: "london",
        optimizer: false,
        abi: a.abi,
        bytecode: "0x" + a.evm.bytecode.object,
      },
      null,
      2,
    ) + "\n",
  );
  fs.writeFileSync("artifacts/TicketChain_metadata.json", a.metadata + "\n");
  console.log(
    "Compiled TicketChain with",
    solc.version(),
    "; London; optimizer off; ABI exported.",
  );
}
module.exports = { compile };
