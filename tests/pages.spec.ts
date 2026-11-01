import { test, expect } from "@playwright/test";
test("GitHub Pages: ресурсы, манифест и офлайн в подпапке /workout/", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.SUBPATH_TEST,
    "Запускается отдельно со сборкой VITE_BASE_PATH=/workout/",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/workout/#catalog");
  await expect(
    page.getByRole("heading", { name: /Упражнения17/ }),
  ).toBeVisible();
  const response = await page.request.get("/workout/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.start_url).toBe("./");
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    expect((await page.request.get("/workout/" + icon.src)).ok()).toBe(true);
  }
  const scope = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
    return r.scope;
  });
  expect(scope).toContain("/workout/");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Упражнения17/ }),
  ).toBeVisible();
  const fontCount = await page.evaluate(async () => {
    const faces = await document.fonts.load(
      '16px "Golos Text Variable"',
      "Тренировки 0123",
    );
    return faces.filter((f) => f.status === "loaded").length;
  });
  expect(fontCount).toBeGreaterThan(0);
  expect(
    await page.evaluate(() =>
      document.fonts.check('16px "Golos Text Variable"', "Тренировки 0123"),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(async () =>
      (await fetch("./licenses/Golos-Text-OFL.txt")).text(),
    ),
  ).toContain("SIL OPEN FONT LICENSE");
  await page.getByLabel("Поиск упражнений").fill("Смита");
  await page.locator(".exercise-info").first().click();
  await expect(
    page.getByRole("dialog").locator(".exercise-photo > img"),
  ).toHaveCount(1);
  expect(errors).toEqual([]);
});
