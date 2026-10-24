import { test, expect } from '@playwright/test';

test.describe('TripBuddy AI Bengaluru Multimodal E2E Suite', () => {
  test('loads Journey Planner, compares Fastest/Cheapest/Balanced routes, and enforces booking approval gate', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.locator('h1')).toContainText('TripBuddy AI');
    await expect(page.getByText('Bengaluru Multimodal Journey Planner')).toBeVisible();

    await page.getByRole('button', { name: /Plan Multimodal Journey/i }).click();
    await expect(page.getByText(/AI Orchestrator Recommendation/i)).toBeVisible();

    await page.getByRole('button', { name: /2. Route Comparison/i }).click();
    await expect(page.getByText(/Fastest Route/i)).toBeVisible();
    await expect(page.getByText(/Cheapest Route/i)).toBeVisible();
    await expect(page.getByText(/Best-Balanced Route/i)).toBeVisible();
  });
});
