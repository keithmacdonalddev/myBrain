/**
 * Smoke Tests
 *
 * Quick sanity checks that the app works at all.
 * Run these after any deployment or significant change.
 *
 * These tests verify:
 * - App loads without crashing
 * - Login flow works
 * - Key pages are accessible
 * - No JavaScript errors on main pages
 */
import { test, expect } from './fixtures.js';

test.describe('App Loads', () => {
  test('homepage redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('login page renders without errors', async ({ page }) => {
    // Collect any console errors
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/login');

    // Basic elements should be present
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // No JavaScript errors
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });
});

test.describe('Authentication', () => {
  test('can login with valid credentials', async ({ page, testUser }) => {
    await page.goto('/login');

    // Fill and submit login form
    await page.fill('input[type="email"], input[name="email"]', testUser.email);
    await page.fill('input[type="password"], input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message (not redirect)
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('Protected Pages (Authenticated)', () => {
  test('dashboard loads successfully', async ({ authenticatedPage: page }) => {
    // Collect errors
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/dashboard');

    // Dashboard should load (not redirect to login)
    await expect(page).toHaveURL(/.*dashboard/);

    // Should have some content (not blank page)
    await expect(page.locator('body')).not.toBeEmpty();

    // No JavaScript errors (excluding expected ones like favicon)
    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );
    expect(realErrors).toHaveLength(0);
  });

  test('tasks page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL(/.*tasks/);
    // Page should not show error
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();
  });

  test('notes page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/notes');
    await expect(page).toHaveURL(/.*notes/);
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();
  });

  test('projects page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/.*projects/);
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();
  });

  test('calendar page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL(/.*calendar/);
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();
  });

  test('settings page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/.*settings/);
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('sidebar navigation works', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Find and click a sidebar link (tasks)
    const tasksLink = page.locator('a[href*="tasks"], [data-testid="nav-tasks"]').first();
    if (await tasksLink.isVisible()) {
      await tasksLink.click();
      await expect(page).toHaveURL(/.*tasks/);
    }
  });

  test('can logout', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Look for logout button/link
    const logoutButton = page.locator(
      'button:has-text("logout"), button:has-text("sign out"), a:has-text("logout"), [data-testid="logout"]'
    ).first();

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      // Should redirect to login
      await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
    }
  });
});
