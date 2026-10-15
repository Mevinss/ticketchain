// Local EVM browser integration only; this is not MetaMask or Sepolia evidence.
const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs");
const { ethers } = require("ethers");
async function main() {
  const record = JSON.parse(
    fs.readFileSync(".superpowers/local-deployment.json"),
  );
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  if (Number((await provider.getNetwork()).chainId) !== 31337)
    throw Error("Browser test is local-only");
  const contract = new ethers.Contract(
    record.address,
    JSON.parse(fs.readFileSync("artifacts/TicketChain_abi.json")),
    await provider.getSigner(0),
  );
  const now = (await provider.getBlock("latest")).timestamp;
  const refundTitle = "Refund Browser " + Date.now();
  await (
    await contract.createEvent(
      refundTitle,
      "http://127.0.0.1:5173/metadata/cinema.json",
      now + 86400,
      now + 93600,
      ethers.parseEther("0.001"),
      40,
    )
  ).wait();
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  global.testPage = page;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(({ accounts }) => {
    let index = 1;
    const listeners = {};
    window.testSwitch = (i) => {
      index = i;
      (listeners.accountsChanged || []).forEach((fn) => fn([accounts[index]]));
    };
    window.ethereum = {
      on: (key, fn) => {
        (listeners[key] ??= []).push(fn);
      },
      removeListener: (key, fn) => {
        listeners[key] = (listeners[key] || []).filter((x) => x !== fn);
      },
      request: async ({ method, params = [] }) => {
        if (method === "eth_accounts" || method === "eth_requestAccounts")
          return [accounts[index]];
        if (method === "wallet_switchEthereumChain") return null;
        const response = await fetch("http://127.0.0.1:8545", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        });
        const value = await response.json();
        if (value.error)
          throw Object.assign(new Error(value.error.message), value.error);
        return value.result;
      },
    };
  }, record);
  fs.mkdirSync(".impeccable/review", { recursive: true });
  await page.goto("http://127.0.0.1:5173");
  await expect(
    page.getByRole("heading", { name: "Jazz Night" }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: ".impeccable/review/desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".impeccable/review/mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile horizontal overflow");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole("button", { name: "Кошелек", exact: true }).click();
  await page.getByRole("heading", { name: "Jazz Night" }).click();
  await expect(
    page.getByRole("heading", { name: "Выберите своё место" }),
  ).toBeVisible();
  await page.locator(".seat:not(:disabled)").first().click();
  await page.getByRole("button", { name: "Купить билет", exact: true }).click();
  await expect(page).toHaveURL(/\/tickets\/\d+$/, { timeout: 30000 });
  const firstId = page.url().split("/").pop();
  await expect(page.getByText("Действителен", { exact: true })).toBeVisible();
  await page.screenshot({
    path: ".impeccable/review/ticket.png",
    fullPage: true,
  });
  console.log("PASS browser purchase and QR ticket", firstId);
  await page.getByRole("link", { name: "Мои билеты", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Jazz Night" }).first(),
  ).toBeVisible();
  console.log("PASS wallet ticket list");
  await page.evaluate(() => window.testSwitch(3));
  await page.getByRole("link", { name: "Проверка", exact: true }).click();
  await page.getByLabel("Мероприятие", { exact: true }).selectOption("1");
  await page.getByLabel("ID билета или QR JSON").fill(firstId);
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(page.getByText("Действителен", { exact: true })).toBeVisible();
  await page.getByLabel("Я сверил владельца билета").check();
  await page
    .getByRole("button", { name: "Подтвердить вход", exact: true })
    .click();
  await expect(page.getByText("Использован", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "Подтвердить вход", exact: true }),
  ).toBeDisabled();
  console.log("PASS checker entry and repeated-entry UI block");
  await page.evaluate(() => window.testSwitch(1));
  await page.getByRole("link", { name: "Афиша", exact: true }).click();
  await page.getByRole("heading", { name: refundTitle }).click();
  await page.locator(".seat:not(:disabled)").first().click();
  await page.getByRole("button", { name: "Купить билет", exact: true }).click();
  await expect(page).toHaveURL(/\/tickets\/\d+$/, { timeout: 30000 });
  const refundId = page.url().split("/").pop();
  console.log("PASS second-event purchase");
  await page.evaluate(() => window.testSwitch(0));
  await page.getByRole("link", { name: "Организатор", exact: true }).click();
  const item = page.locator(".admin-event").filter({
    has: page.getByRole("heading", { name: refundTitle, exact: true }),
  });
  await item
    .getByRole("button", { name: "Отменить событие", exact: true })
    .click();
  await item
    .getByRole("button", { name: "Подтвердить отмену", exact: true })
    .click();
  await expect(item.getByText("Отменено", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  console.log("PASS organizer cancellation");
  await page.evaluate(() => window.testSwitch(1));
  await page.getByRole("link", { name: "Мои билеты", exact: true }).click();
  await page.getByRole("heading", { name: refundTitle, exact: true }).click();
  await page
    .getByRole("button", { name: "Вернуть 0.001 ETH", exact: true })
    .click();
  await expect(page.getByText("Возвращен", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  console.log("PASS buyer refund");
  await page.getByRole("button", { name: "Сменить язык на казахский" }).click();
  await expect(
    page.getByRole("heading", { name: "Билетіңіз", exact: true }),
  ).toBeVisible();
  console.log("PASS Kazakh locale");
  if (errors.length) throw Error(errors.join("\n"));
  console.log("PASS no browser runtime errors");
  await browser.close();
}
main().catch(async (e) => {
  console.error(e);
  if (global.testPage) {
    console.log(await global.testPage.locator("body").innerText());
    await global.testPage.screenshot({
      path: ".impeccable/review/failure.png",
      fullPage: true,
    });
  }
  process.exit(1);
});
