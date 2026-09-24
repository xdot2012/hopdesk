import { expect, test } from '@playwright/test';

test.describe('auth pages smoke', () => {
  test('sign-in page renders form', async ({ page }) => {
    await page.goto('/auth/sign_in');

    await expect(page.getByRole('heading', { name: /entrar|sign in/i })).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar|sign in/i })).toBeVisible();
  });

  test('sign-up page renders form', async ({ page }) => {
    await page.goto('/auth/sign_up');

    await expect(page.getByRole('heading', { name: /criar conta|create account|sign up/i })).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
  });

  test('forgot-password page renders form', async ({ page }) => {
    await page.goto('/auth/password_recover');

    await expect(
      page.getByRole('heading', { name: /recuperar|esqueci|forgot|password/i }),
    ).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
  });
});

test('logout clears session and lands on sign-in', async ({ page }) => {
  await page.goto('/auth/logout');

  await expect(page).toHaveURL(/\/auth\/sign_in/);
  await expect(page.getByRole('heading', { name: /entrar|sign in/i })).toBeVisible();
});
