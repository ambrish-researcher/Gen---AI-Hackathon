import { test, expect } from "@playwright/test";
test.beforeEach(async ({ request }) => {
  const r = await request.get("/api/state");
  if (await r.json()) await request.post("/api/control/reset");
});
test("renders WebGL, completes different missions and persists verified memory", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("SIMULATOR ONLINE")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({
    path: "test-results/studio-initial.png",
    fullPage: true,
  });
  for (const dest of ["B", "C", "D"]) {
    await page.getByLabel("Mission prompt").fill(`Navigate to Station ${dest}`);
    await page.getByRole("button", { name: "Generate mission plan" }).click();
    await expect(
      page.getByText("TASK INTERPRETATION", { exact: true }),
    ).toBeVisible();
    const preview = await (await request.get("/api/state")).json();
    expect(preview.status).toBe("ready");
    expect(preview.path.length).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    if (dest === "C") {
      await page.getByRole("button", { name: "Insert obstacle" }).click();
      await expect
        .poll(async () => {
          const s = await (await request.get("/api/state")).json();
          return s.metrics.replans;
        })
        .toBeGreaterThan(0);
    }
    await expect(
      page.getByText("MISSION VERIFIED", { exact: true }),
    ).toBeVisible({ timeout: 45000 });
    const s = await (await request.get("/api/state")).json();
    expect(s.verified).toBe(true);
    expect(s.metrics.collisions).toBe(0);
    const memories = await (await request.get("/api/memory")).json();
    expect(
      memories.some((m: { id: string }) => m.id === s.id + "-memory"),
    ).toBe(true);
    const w = await (await request.get("/api/world")).json();
    expect(s.position).toEqual(w.stations[dest]);
    await page.screenshot({
      path: `test-results/mission-${dest}.png`,
      fullPage: true,
    });
    await page.getByLabel("Reset mission").click();
  }
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  await expect(
    page
      .getByRole("heading", { name: "Navigate to Station B", exact: true })
      .first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("rejects invalid tasks, shows evidence and runs reproducible experiments", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("SIMULATOR ONLINE")).toBeVisible();
  await page.getByLabel("Mission prompt").fill("Fly to Station Z");
  await page.getByRole("button", { name: "Generate mission plan" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Unsupported robot capability",
  );
  await page
    .getByLabel("Mission prompt")
    .fill("Deliver two packages from Station A to Station C and Station D");
  await page.getByRole("button", { name: "Generate mission plan" }).click();
  await expect(
    page.getByText("TASK INTERPRETATION", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /^Evidence/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Evidence ledger." }),
  ).toBeVisible();
  await expect(
    page.getByText("CONTRADICTION RESOLVED CONSERVATIVELY"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  await page.getByRole("button", { name: "Run experiment" }).click();
  await expect(
    page.getByText("Candidate retained.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("20 actual trials")).toBeVisible();
  await page
    .getByRole("button", { name: /PASS PRAXIS · candidate v2/ })
    .first()
    .click();
  await expect(page.getByText("RECORDED TRACE", { exact: true })).toBeVisible();
  await page.getByLabel("Replay frame").fill("3");
  await page.screenshot({ path: "test-results/replay.png", fullPage: true });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByText("UNAVAILABLE", { exact: true })).toHaveCount(4);
});
test("tablet and reduced motion remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByLabel("Mission prompt")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: "test-results/tablet.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
