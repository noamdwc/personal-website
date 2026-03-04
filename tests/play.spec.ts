import { test, expect } from "@playwright/test";

test("play page renders chessboard and pieces", async ({ page }) => {
  await page.goto("/play");

  const statusMessage = page.locator("#status-message");
  await expect(statusMessage).toContainText("Waiting for your move");

  const restartGame = page.locator("#restart-game");
  await expect(restartGame).toBeHidden();

  // Chessground adds a wrapper and board squares dynamically.
  const board = page.locator("#board");
  await expect(board).toBeVisible();

  const cgWrap = page.locator("#board .cg-wrap");
  await expect(cgWrap).toBeVisible();

  const squares = page.locator("#board .cg-board");
  await expect(squares).toBeVisible();

  // Pieces should be present at the start position.
  const pieces = page.locator("#board .piece");
  await expect(pieces).toHaveCount(32);
});
