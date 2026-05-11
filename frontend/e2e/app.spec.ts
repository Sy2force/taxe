import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Correcteur Fiscalité/);
});

test('navigation between pages', async ({ page }) => {
  await page.goto('/');
  
  // Navigate to Exercise page
  await page.click('text=Exercice');
  await expect(page).toHaveURL(/\/exercise/);
  
  // Navigate to Laws page
  await page.click('text=Lois');
  await expect(page).toHaveURL(/\/laws/);
  
  // Navigate to Answers page
  await page.click('text=Réponses');
  await expect(page).toHaveURL(/\/answers/);
});
