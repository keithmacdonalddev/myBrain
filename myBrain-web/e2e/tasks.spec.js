/**
 * Tasks E2E Tests
 *
 * Tests for task CRUD operations (Create, Read, Update, Delete).
 * These tests verify that users can manage their tasks through the UI.
 *
 * Required flow: create_task (per qa-config.md)
 */
import { test, expect } from './fixtures.js';

// Generate unique identifiers for test data to avoid conflicts
const generateTaskTitle = () => `E2E Test Task ${Date.now()}`;

test.describe('Tasks - Create', () => {
  test('can create a new task via slide panel', async ({ authenticatedPage: page }) => {
    const taskTitle = generateTaskTitle();

    // Navigate to tasks page
    await page.goto('/tasks');
    await expect(page).toHaveURL(/.*tasks/);

    // Wait for page to load (no error message visible)
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();

    // Click the "New Task" button (desktop version)
    // The button has a Plus icon and "New Task" text
    const newTaskButton = page.locator('button:has-text("New Task")').first();
    await newTaskButton.click();

    // Wait for the slide panel to open
    // The panel has a title input with placeholder "Task title..."
    const titleInput = page.locator('input[placeholder="Task title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Fill in the task title
    await titleInput.fill(taskTitle);

    // Optionally add a description
    const bodyInput = page.locator('textarea[placeholder="Add description..."]');
    if (await bodyInput.isVisible()) {
      await bodyInput.fill('This is an E2E test task description');
    }

    // Click the "Create Task" button
    const createButton = page.locator('button:has-text("Create Task")');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // Wait for the panel to close (the backdrop should disappear)
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });

    // Verify the task appears in the list
    // Tasks are displayed in TaskCard components with the title visible
    await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({ timeout: 10000 });
  });

  test('cannot create a task without a title', async ({ authenticatedPage: page }) => {
    // Navigate to tasks page
    await page.goto('/tasks');

    // Click the "New Task" button
    const newTaskButton = page.locator('button:has-text("New Task")').first();
    await newTaskButton.click();

    // Wait for the slide panel to open
    const titleInput = page.locator('input[placeholder="Task title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Leave title empty, just add a description
    const bodyInput = page.locator('textarea[placeholder="Add description..."]');
    if (await bodyInput.isVisible()) {
      await bodyInput.fill('Description without title');
    }

    // The "Create Task" button should be disabled when title is empty
    const createButton = page.locator('button:has-text("Create Task")');
    await expect(createButton).toBeDisabled();
  });
});

test.describe('Tasks - View/List', () => {
  test('displays tasks list page correctly', async ({ authenticatedPage: page }) => {
    await page.goto('/tasks');

    // Page should load without errors
    await expect(page).toHaveURL(/.*tasks/);
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();

    // Should have the page title/header
    await expect(page.locator('h1:has-text("Tasks")').or(page.locator('text="Tasks"').first())).toBeVisible();

    // Should have the "New Task" button
    await expect(page.locator('button:has-text("New Task")')).toBeVisible();
  });

  test('can view task tabs (Active, Archived, Trash)', async ({ authenticatedPage: page }) => {
    await page.goto('/tasks');

    // Check for tab navigation
    // Tabs are buttons with text "Active", "Archived", "Trash"
    await expect(page.locator('button:has-text("Active")')).toBeVisible();
    await expect(page.locator('button:has-text("Archived")')).toBeVisible();
    await expect(page.locator('button:has-text("Trash")')).toBeVisible();
  });

  test('can switch between task tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/tasks');

    // Click on Archived tab
    await page.locator('button:has-text("Archived")').click();

    // Should show archived view (may show empty state or archived tasks)
    // Wait for content to load
    await page.waitForTimeout(500);

    // Click on Trash tab
    await page.locator('button:has-text("Trash")').click();

    // Wait for content to load
    await page.waitForTimeout(500);

    // Go back to Active tab
    await page.locator('button:has-text("Active")').click();

    // Wait for content to load
    await page.waitForTimeout(500);
  });
});

test.describe('Tasks - Edit', () => {
  test('can open and edit an existing task', async ({ authenticatedPage: page }) => {
    // First create a task to edit
    const originalTitle = generateTaskTitle();
    const updatedTitle = `Updated ${originalTitle}`;

    await page.goto('/tasks');

    // Create a task first
    const newTaskButton = page.locator('button:has-text("New Task")').first();
    await newTaskButton.click();

    const titleInput = page.locator('input[placeholder="Task title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(originalTitle);

    const createButton = page.locator('button:has-text("Create Task")');
    await createButton.click();

    // Wait for panel to close and task to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${originalTitle}"`)).toBeVisible({ timeout: 10000 });

    // Click on the task card to open it
    await page.locator(`text="${originalTitle}"`).click();

    // Wait for the edit panel to open
    const editTitleInput = page.locator('input[placeholder="Task title..."]');
    await expect(editTitleInput).toBeVisible({ timeout: 5000 });

    // Clear and update the title
    await editTitleInput.clear();
    await editTitleInput.fill(updatedTitle);

    // The task should auto-save, but we can also click the Save button if visible
    const saveButton = page.locator('button:has-text("Save")').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
    }

    // Wait a moment for auto-save
    await page.waitForTimeout(2000);

    // Close the panel by clicking the X button or backdrop
    const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    // Verify the updated title appears in the list
    await expect(page.locator(`text="${updatedTitle}"`)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Tasks - Delete', () => {
  test('can move a task to trash', async ({ authenticatedPage: page }) => {
    // First create a task to delete
    const taskTitle = generateTaskTitle();

    await page.goto('/tasks');

    // Create a task first
    const newTaskButton = page.locator('button:has-text("New Task")').first();
    await newTaskButton.click();

    const titleInput = page.locator('input[placeholder="Task title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(taskTitle);

    const createButton = page.locator('button:has-text("Create Task")');
    await createButton.click();

    // Wait for panel to close and task to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({ timeout: 10000 });

    // Click on the task card to open it
    await page.locator(`text="${taskTitle}"`).click();

    // Wait for the edit panel to open
    await expect(page.locator('input[placeholder="Task title..."]')).toBeVisible({ timeout: 5000 });

    // Click the trash button (Move to Trash tooltip)
    // Look for the Trash2 icon button in the header
    const trashButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
    await trashButton.click();

    // Wait for panel to close
    await page.waitForTimeout(1000);

    // Task should no longer be visible in Active tab
    await expect(page.locator(`text="${taskTitle}"`)).not.toBeVisible();

    // Navigate to Trash tab to verify the task is there
    await page.locator('button:has-text("Trash")').click();
    await page.waitForTimeout(500);

    // Task should be visible in trash
    await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Tasks - Status Toggle', () => {
  test('can mark a task as complete', async ({ authenticatedPage: page }) => {
    // First create a task
    const taskTitle = generateTaskTitle();

    await page.goto('/tasks');

    // Create a task first
    const newTaskButton = page.locator('button:has-text("New Task")').first();
    await newTaskButton.click();

    const titleInput = page.locator('input[placeholder="Task title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(taskTitle);

    const createButton = page.locator('button:has-text("Create Task")');
    await createButton.click();

    // Wait for panel to close and task to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({ timeout: 10000 });

    // Find the task card and click the checkbox/status button
    // The checkbox is a button within the task card with a circular element
    const taskCard = page.locator(`text="${taskTitle}"`).locator('..');
    const checkbox = taskCard.locator('button').first();
    await checkbox.click();

    // Wait for status update
    await page.waitForTimeout(1000);

    // The task should now be in the Archived tab (completed tasks go there)
    // Navigate to Archived tab to verify
    await page.locator('button:has-text("Archived")').click();
    await page.waitForTimeout(500);

    // Task should be visible in archived with a completed status
    await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Tasks - Search', () => {
  test('can search for tasks', async ({ authenticatedPage: page }) => {
    // First create a task with a unique search term
    const searchTerm = `SearchTest${Date.now()}`;
    const taskTitle = `${searchTerm} Task`;

    await page.goto('/tasks');

    // Create a task first
    const newTaskButton = page.locator('button:has-text("New Task")').first();
    await newTaskButton.click();

    const titleInput = page.locator('input[placeholder="Task title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(taskTitle);

    const createButton = page.locator('button:has-text("Create Task")');
    await createButton.click();

    // Wait for panel to close and task to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });

    // Use the search input
    const searchInput = page.locator('input[placeholder="Search tasks..."]');
    await searchInput.fill(searchTerm);

    // Wait for search results
    await page.waitForTimeout(500);

    // Task should still be visible (it matches the search)
    await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({ timeout: 5000 });

    // Clear search and verify task is still there
    await searchInput.clear();
    await page.waitForTimeout(500);

    await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({ timeout: 5000 });
  });
});
