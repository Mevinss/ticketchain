# TicketChain Implementation Plan

> For agentic workers: use superpowers:executing-plans to implement this plan task by task after review.

**Goal:** Deliver a Kazakh/Russian ticketing frontend connected to the actual TicketChain contract, with reproducible tests and Remix/Sepolia deployment instructions.

**Architecture:** Preserve the supplied single-contract model. React reads from an RPC independently of MetaMask; signed writes use the selected wallet and verified network. All ownership, money, inventory and permissions come from the contract. Metadata is public static JSON and cannot override on-chain values.

**Tech stack:** React, TypeScript, Vite, ethers v6, React Router; Solidity 0.8.24, London EVM, optimizer disabled initially to reproduce the repository build.

**Spec:** The user's attached frontend prompt, retained as docs/spec/frontend-requirements.txt during implementation. The existing contract at repository commit d644127 defines the API.

## Global constraints

- Six routes: /, /events/:eventId, /my-tickets, /tickets/:ticketId, /admin, /check-in.
- Russian and Kazakh localization, 360 px mobile layout, UTC+5 event date input/display.
- Prices remain bigint wei; timestamps are seconds on-chain.
- No simulated successful payments, no invented deployed addresses, no private keys in frontend.
- Transaction success means successful receipt; handle replacement/cancellation and wallet changes.
- QR identifies a ticket, not its human bearer. Verify chain, contract, event and current ticket status.
- One purchase is one seat, capacity 1..200, nontransferable tickets.
- Cancellation is allowed only before the one-hour check-in window; refunds are owner-initiated after cancellation.
- Existing Remix VM deployments cannot serve as Sepolia deployments.
- Keep changes on codex/ticketchain-frontend; publish a reviewable branch/PR when repository write access is available.

## Review focus

1. Wallet/account/network changes must invalidate old roles and tickets without losing pending transaction references.
2. A competing purchase must fail clearly and refresh the seat map.
3. Failed or malicious metadata must not prevent on-chain reads or inject HTML.
4. Malformed or foreign QR codes and unavailable camera must have safe manual alternatives.
5. Refund/withdraw calls must preserve per-event accounting, including rejected transfers and reentry attempts.

## Task 1 Contract baseline and reproducible tests

Files: package.json, scripts/compile-contract.cjs, tests/contract/*.test.cjs, contracts/TicketChain.sol, tests/TicketChain_test.sol, artifacts/TicketChain_abi.json.

Consumes: existing Solidity source. Produces: compiled ABI and reproducible contract tests.

- [ ] Pin solc 0.8.24 and a local EVM test runner; compile source rather than trusting stored artifacts.
- [ ] Reproduce the existing Solidity test compilation issues: tests_accounts usage, globally declared struct qualification, and try on a low-level call.
- [ ] Write and execute tests with distinct admin, buyer A/B, checker and outsider accounts before modifying contract behavior.
- [ ] Assert purchase ownership, duplicate-seat rejection, exact price, authorized/time-limited check-in, cancellation boundary, refund uniqueness and escrow isolation.
- [ ] Add receiver-contract cases for failed ETH transfers and reentry; change contract only if evidence requires it or an explicit guard is needed for the agreed requirement.
- [ ] Repair the Remix suite and remove empty/no-op test claims. Export ABI from compilation.
- [ ] Run npm run test:contract; require explicit pass counts, then commit.

## Task 2 Shared frontend and chain integration

Files: frontend/package.json, frontend/src/contracts/TicketChain.abi.json, frontend/src/lib/{config,contractService,metadata,qr,dates}.ts, frontend/src/context/{Wallet,Locale,Transactions}.tsx, frontend/.env.example.

Consumes: compiled ABI. Produces: typed read/write service, wallet and transaction providers, localized shell.

- [ ] Add tests for invalid configuration, QR chain/address validation, wei conversion and UTC+5 round trips; confirm failures before implementation.
- [ ] Validate read RPC chain and contract bytecode. Missing configuration is a visible setup state.
- [ ] Implement account/network invalidation and preflight checks before writes, receipt/replacement handling, explorer links and duplicate-submit blocking.
- [ ] Implement metadata parsing with timeout, size/type checks, fallback and safe text rendering.
- [ ] Build light interface with dark readable text and a single warm accent, clear seat controls, accessible labels/focus and responsive navigation.
- [ ] Run unit tests and TypeScript build; commit.

## Task 3 Catalog, seats and buyer tickets

Files: frontend/src/pages/{Catalog,EventDetail,MyTickets,TicketDetail}.tsx and related components.

Consumes: getEvents/getEvent/getSeatTicketIds/getUserTicketIds/getTicket; writes buyTicket/refundTicket.

- [ ] Test whole-catalog filters, metadata failure, occupied-seat race, rejection, successful receipt and account changes.
- [ ] Implement search, city/category/date filtering, date/price sorting and favorite persistence.
- [ ] Implement seat map, exact-value purchase, receipt event parsing, navigation to real ticket and refresh/polling cleanup.
- [ ] Implement wallet ticket pagination, event-aware ticket statuses, refund action, QR and print layout.
- [ ] Test on 360 px and desktop, keyboard navigation, refresh and no-wallet states; commit.

## Task 4 Organizer and entry workflows

Files: frontend/src/pages/{Admin,CheckIn}.tsx, frontend/src/components/MetadataEditor.tsx, frontend/public/metadata/*, frontend/public/posters/*.

Consumes: admin/isChecker/getEvent/getTicket; writes createEvent/setEventSalesPaused/setChecker/cancelEvent/withdrawProceeds/checkIn.

- [ ] Test role denial, time boundaries, foreign-event QR, camera failure and stale scan/account results.
- [ ] Build event form, metadata editor/download/URL validation, sales pause, checker permissions, cancellation confirmation, statistics and eligible withdrawal.
- [ ] Build event-scoped camera scanner with manual JSON/ID fallback and owner-verification acknowledgement; stop camera on exit.
- [ ] Supply six metadata/poster assets clearly separate from on-chain events. Create actual events only via admin wallet transactions.
- [ ] Verify all routes, localized error/empty/pending/success states and no inactive decorative controls; commit.

## Task 5 Integration, deployment and handoff

Files: README.md, docs/REMIX-DEPLOY.md, docs/CONTRACT-API.md, frontend/.env.example, deployment record template.

- [ ] Run compile, contract tests, frontend tests and production build.
- [ ] Run browser end-to-end checks against a local EVM with distinct test identities; distinguish them from Remix VM and Sepolia evidence.
- [ ] Document constructor with no arguments, Value 0 on deploy, exact prices/units, live timestamp examples and two separate entry/refund scenarios.
- [ ] User signs Sepolia deployment in MetaMask; record chain ID, address, tx hash, compiler/EVM settings and source commit. Never request seed/private key.
- [ ] Configure real address/RPC, publish metadata at reachable URLs, create events with admin transactions and perform wallet integration tests.
- [ ] Push branch and create PR if authenticated write access is available. Otherwise provide patch/source archive and exact publish steps; do not claim remote changes.

## External inputs

Sepolia deploy and real event creation require the user's wallet confirmations. The frontend and local tests can be completed before that. Required deployment record: chain ID, contract address, transaction hash and admin public address. Metadata hosting URL is set after a site host is selected; local preview remains fully usable for development.
