import { test, expect } from "@playwright/test";
import { createServer, Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { readData, writeData, visualState } from "./helpers";
import { State } from "../src/model";
test.skip(
  !process.env.UPGRADE_TEST,
  "Отдельная проверка четырёх настоящих production-сборок",
);
test.use({ baseURL: "http://127.0.0.1:4175" });
let server: Server,
  active = "legacy";
const releases: Record<string, string> = JSON.parse(
  process.env.UPGRADE_RELEASES || "{}",
);
test.beforeAll(async () => {
  if (!process.env.UPGRADE_TEST) return;
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url!, "http://localhost").pathname,
      );
      if (!pathname.startsWith("/workout/")) {
        res.writeHead(404).end();
        return;
      }
      const root = releases[active],
        path = resolve(
          root,
          pathname.slice("/workout/".length) || "index.html",
        );
      if (path !== root && !path.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      const body = await readFile(path);
      const type: Record<string, string> = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".webmanifest": "application/manifest+json",
        ".webp": "image/webp",
        ".woff2": "font/woff2",
        ".svg": "image/svg+xml",
        ".png": "image/png",
      };
      res.writeHead(200, {
        "Content-Type": type[extname(path)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) =>
    server.listen(4175, "127.0.0.1", resolve),
  );
});
test.afterAll(async () => {
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
});
test("старый кэш воспроизводится; новая версия обновляется без очистки истории и активного занятия", async ({
  page,
}) => {
  test.setTimeout(90000);
  active = "legacy";
  await page.goto("/workout/");
  await expect(
    page.getByRole("heading", { name: "Сегодня", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  const legacy = visualState(true);
  legacy.settings.theme = "dark";
  legacy.restEnd = Date.now() + 600000;
  await writeData(page, { ...legacy, version: 2 } as unknown as State);
  const before = await readData(page);
  expect(before.version).toBe(2);
  active = "waiting";
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    await r!.update();
  });
  await expect
    .poll(() =>
      page.evaluate(async () =>
        Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Сегодня", exact: true }),
  ).toBeVisible(); // Reproduces the original bug.
  await page.evaluate(() => {
    (window as any).oldController = navigator.serviceWorker.controller;
  });
  active = "first";
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())!.update();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          navigator.serviceWorker.controller !== (window as any).oldController,
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-app-version",
    "upgrade-one",
  );
  await expect(
    page.getByRole("heading", { name: "План", exact: true }),
  ).toBeVisible();
  const migrated = await readData(page);
  expect(migrated.version).toBe(3);
  for (const key of [
    "templates",
    "measurements",
    "rules",
    "exceptions",
    "settings",
    "restEnd",
  ] as const)
    expect(migrated[key], key).toEqual(before[key]);
  expect(migrated.sessions.map((s) => s.items.map((i) => i.sets))).toEqual(
    before.sessions.map((s) => s.items.map((i) => i.sets)),
  );
  await page.goto("/workout/#session/design-active");
  await expect(page.locator(".recorded-set")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Изменить подход 1", exact: true })
    .click();
  await page.getByLabel("Вес подхода 1", { exact: true }).fill("27,3");
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  const durable = await readData(page);
  active = "second";
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())!.update();
  });
  await expect(page.locator(".update-notice")).toContainText(
    "Доступна новая версия",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-app-version",
    "upgrade-one",
  ); // No forced reload.
  await page.evaluate(() => {
    (window as any).originalTransaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: any[]) {
      if (args[1] === "readwrite")
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      return (window as any).originalTransaction.apply(this, args);
    };
  });
  await page
    .locator(".update-notice")
    .getByRole("button", { name: "Обновить", exact: true })
    .click();
  await expect(page.locator(".update-notice [role=alert]")).toContainText(
    "Страница не перезагружена",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-app-version",
    "upgrade-one",
  );
  await page.evaluate(() => {
    IDBDatabase.prototype.transaction = (window as any).originalTransaction;
  });
  await page
    .getByRole("button", { name: "Изменить подход 1", exact: true })
    .click();
  await page.getByLabel("Вес подхода 1", { exact: true }).fill("28,7");
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await page
    .locator(".update-notice")
    .getByRole("button", { name: "Обновить", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-app-version",
    "upgrade-two",
  );
  await expect(page.locator(".recorded-set").first()).toContainText("28,7 кг");
  const after = await readData(page);
  for (const key of [
    "templates",
    "measurements",
    "rules",
    "exceptions",
    "settings",
    "restEnd",
  ] as const)
    expect(after[key], key).toEqual(durable[key]);
  const afterActive = after.sessions.find((s) => s.id === "design-active")!;
  expect(afterActive.items[0].sets[0]).toMatchObject({
    done: true,
    weight: 28.7,
  });
  expect(afterActive.status).toBe("active");
  expect(afterActive.startedAt).toBe(
    before.sessions.find((s) => s.id === "design-active")!.startedAt,
  );
});
