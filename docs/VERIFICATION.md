# Verification record

Source baseline: d644127. Solidity 0.8.24, London EVM, optimizer disabled. Contract business logic unchanged.

- Compilation: successful; actual compiler ABI replaces invalid committed JSON.
- Frontend tests: 11 passed, including wrong-RPC direct routes, network changes during preflight, QR identity and timestamp validation, hash recovery, real ethers/Ganache mined cancellation with original transaction lookup unavailable.
- Contract integration: 28 checks passed in independent Ganache EVM, with separate admin/buyers/checker/outsider and receiver contract. Covers purchase, duplicate seat, authorization, time windows, cancellation, refunds, withdrawal, cross-event accounting, reentry and rejected-transfer rollback.
- Browser integration: local EVM plus test injected provider in headless Edge. Purchase -> QR ticket -> wallet list -> checker entry -> repeated-entry blocked; separate-event purchase -> organizer cancellation -> buyer refund; Kazakh switching; no runtime errors. Desktop 1440 px and mobile 390 px screenshots inspected. This is not MetaMask testnet verification.
- TypeScript and production Vite build: passed. QR camera package is lazy loaded; bundler warns that its chunk is larger than 500 kB. Ganache uses a JS fallback on the installed Node version.
- Independent review: network binding, direct-route validation and transaction hash retention corrected. Retained TransactionResponse enables fixed-provider detection of replacement transactions; regression independently rerun by reviewer.

## Remaining manual verification

- Solidity Unit Testing plugin execution of tests/RemixTicketChain_test.sol in actual Remix VM.
- MetaMask Sepolia deployment, address configuration, published HTTPS metadata and real testnet transactions.
- Physical camera permission/scanning on user hardware. Manual ID/JSON entry is available.

## Monitoring limitation

If a wallet reports only a submission hash after an error, and the original transaction disappears from every accessible RPC before its sender/nonce response is obtained, automatic replacement detection is unavailable. The UI retains the hash and reports pending rather than falsely reporting failure. Verify the transaction using the explorer and the wallet's activity. Ordinary submissions and fetched responses retain replacement identity across account/network changes and retry attempts. This rare hash-only path is not claimed fully automatic.

No mainnet audit or production-readiness claim is made. No Sepolia transaction or event was created by the local checks.
