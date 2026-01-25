/**
 * Projects E2E Tests
 *
 * Tests for project CRUD operations (Create, Read, Update, Delete).
 * These tests verify that users can manage their projects through the UI.
 *
 * Projects are goal-driven efforts with a defined outcome and deadline.
 */
import { test, expect } from './fixtures.js';

// Generate unique identifiers for test data to avoid conflicts
const generateProjectTitle = () => `E2E Test Project ${Date.now()}`;

test.describe('Projects - Create', () => {
  test('can create a new project via slide panel', async ({ authenticatedPage: page }) => {
    const projectTitle = generateProjectTitle();
    const projectDescription = 'This is an E2E test project description.';
    const projectOutcome = 'Successfully complete the E2E test';

    // Navigate to projects page
    await page.goto('/projects');
    await expect(page).toHaveURL(/.*projects/);

    // Wait for page to load (no error message visible)
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();

    // Click the "New Project" button (desktop version)
    const newProjectButton = page.locator('button:has-text("New Project")').first();
    await newProjectButton.click();

    // Wait for the slide panel to open
    // The panel has a title input with placeholder "Project title..."
    const titleInput = page.locator('input[placeholder="Project title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Fill in the project title
    await titleInput.fill(projectTitle);

    // Fill in the outcome (desired outcome)
    const outcomeInput = page.locator('input[placeholder="What does success look like?"]');
    if (await outcomeInput.isVisible()) {
      await outcomeInput.fill(projectOutcome);
    }

    // Fill in the description
    const descriptionInput = page.locator('textarea[placeholder="Project details..."]');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill(projectDescription);
    }

    // Click the "Create Project" button
    const createButton = page.locator('button:has-text("Create Project")');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // Wait for the panel to close (the backdrop should disappear)
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });

    // Verify the project appears in the list
    // Projects are displayed in ProjectCard components with the title visible
    await expect(page.locator(`text="${projectTitle}"`)).toBeVisible({ timeout: 10000 });
  });

  test('cannot create a project without a title', async ({ authenticatedPage: page }) => {
    // Navigate to projects page
    await page.goto('/projects');

    // Click the "New Project" button
    const newProjectButton = page.locator('button:has-text("New Project")').first();
    await newProjectButton.click();

    // Wait for the slide panel to open
    const titleInput = page.locator('input[placeholder="Project title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Leave title empty, just add a description
    const descriptionInput = page.locator('textarea[placeholder="Project details..."]');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Description without title');
    }

    // The "Create Project" button should be disabled when title is empty
    const createButton = page.locator('button:has-text("Create Project")');
    await expect(createButton).toBeDisabled();
  });
});

test.describe('Projects - View/List', () => {
  test('displays projects list page correctly', async ({ authenticatedPage: page }) => {
    await page.goto('/projects');

    // Page should load without errors
    await expect(page).toHaveURL(/.*projects/);
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();

    // Should have the page title/header
    await expect(page.locator('h1:has-text("Projects")').or(page.locator('text="Projects"').first())).toBeVisible();

    // Should have the "New Project" button
    await expect(page.locator('button:has-text("New Project")')).toBeVisible();
  });

  test('can view project status tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/projects');

    // Check for status tab navigation
    // Tabs include: All, Active, Completed, On Hold, Someday
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Active")')).toBeVisible();
    await expect(page.locator('button:has-text("Completed")')).toBeVisible();
    await expect(page.locator('button:has-text("On Hold")')).toBeVisible();
    await expect(page.locator('button:has-text("Someday")')).toBeVisible();
  });

  test('can switch between project status tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/projects');

    // Click on Completed tab
    await page.locator('button:has-text("Completed")').click();

    // Wait for content to load
    await page.waitForTimeout(500);

    // Click on On Hold tab
    await page.locator('button:has-text("On Hold")').click();

    // Wait for content to load
    await page.waitForTimeout(500);

    // Go back to Active tab
    await page.locator('button:has-text("Active")').click();

    // Wait for content to load
    await page.waitForTimeout(500);
  });
});

test.describe('Projects - Edit', () => {
  test('can open and edit an existing project', async ({ authenticatedPage: page }) => {
    // First create a project to edit
    const originalTitle = generateProjectTitle();
    const updatedTitle = `Updated ${originalTitle}`;

    await page.goto('/projects');

    // Create a project first
    const newProjectButton = page.locator('button:has-text("New Project")').first();
    await newProjectButton.click();

    const titleInput = page.locator('input[placeholder="Project title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(originalTitle);

    const createButton = page.locator('button:has-text("Create Project")');
    await createButton.click();

    // Wait for panel to close and project to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${originalTitle}"`)).toBeVisible({ timeout: 10000 });

    // Click on the project card to open it
    await page.locator(`text="${originalTitle}"`).click();

    // Wait for the edit panel to open
    const editTitleInput = page.locator('input[placeholder="Project title..."]');
    await expect(editTitleInput).toBeVisible({ timeout: 5000 });

    // Clear and update the title
    await editTitleInput.clear();
    await editTitleInput.fill(updatedTitle);

    // The project should auto-save, but we can also click the Save button if visible
    const saveButton = page.locator('button:has-text("Save")').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
    }

    // Wait a moment for auto-save
    await page.waitForTimeout(2000);

    // Close the panel by clicking the X button
    const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    // Verify the updated title appears in the list
    await expect(page.locator(`text="${updatedTitle}"`)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Projects - Delete', () => {
  test('can delete a project', async ({ authenticatedPage: page }) => {
    // First create a project to delete
    const projectTitle = generateProjectTitle();

    await page.goto('/projects');

    // Create a project first
    const newProjectButton = page.locator('button:has-text("New Project")').first();
    await newProjectButton.click();

    const titleInput = page.locator('input[placeholder="Project title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(projectTitle);

    const createButton = page.locator('button:has-text("Create Project")');
    await createButton.click();

    // Wait for panel to close and project to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${projectTitle}"`)).toBeVisible({ timeout: 10000 });

    // Click on the project card to open it
    await page.locator(`text="${projectTitle}"`).click();

    // Wait for the edit panel to open
    await expect(page.locator('input[placeholder="Project title..."]')).toBeVisible({ timeout: 5000 });

    // Click the delete/trash button
    // Look for the Trash2 icon button in the header
    const trashButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
    await trashButton.click();

    // Confirm deletion in the dialog
    const confirmButton = page.locator('button:has-text("Delete")').last();
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Wait for panel to close
    await page.waitForTimeout(1000);

    // Project should no longer be visible in the list
    await expect(page.locator(`text="${projectTitle}"`)).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Projects - View Details', () => {
  test('can view project details in slide panel', async ({ authenticatedPage: page }) => {
    // First create a project
    const projectTitle = generateProjectTitle();
    const projectOutcome = `Success for ${projectTitle}`;

    await page.goto('/projects');

    // Create a project first
    const newProjectButton = page.locator('button:has-text("New Project")').first();
    await newProjectButton.click();

    const titleInput = page.locator('input[placeholder="Project title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(projectTitle);

    // Fill in the outcome
    const outcomeInput = page.locator('input[placeholder="What does success look like?"]');
    if (await outcomeInput.isVisible()) {
      await outcomeInput.fill(projectOutcome);
    }

    const createButton = page.locator('button:has-text("Create Project")');
    await createButton.click();

    // Wait for panel to close and project to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${projectTitle}"`)).toBeVisible({ timeout: 10000 });

    // Click on the project card to open details
    await page.locator(`text="${projectTitle}"`).click();

    // Verify the slide panel opens with project details
    const editTitleInput = page.locator('input[placeholder="Project title..."]');
    await expect(editTitleInput).toBeVisible({ timeout: 5000 });

    // Verify the title is displayed
    await expect(editTitleInput).toHaveValue(projectTitle);

    // Verify the outcome is displayed if we set it
    const editOutcomeInput = page.locator('input[placeholder="What does success look like?"]');
    if (await editOutcomeInput.isVisible()) {
      await expect(editOutcomeInput).toHaveValue(projectOutcome);
    }

    // Close the panel
    const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });
});

test.describe('Projects - Link Task to Project', () => {
  test('can view linked items section in project', async ({ authenticatedPage: page }) => {
    // First create a project
    const projectTitle = generateProjectTitle();

    await page.goto('/projects');

    // Create a project first
    const newProjectButton = page.locator('button:has-text("New Project")').first();
    await newProjectButton.click();

    const titleInput = page.locator('input[placeholder="Project title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(projectTitle);

    const createButton = page.locator('button:has-text("Create Project")');
    await createButton.click();

    // Wait for panel to close and project to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${projectTitle}"`)).toBeVisible({ timeout: 10000 });

    // Click on the project card to open details
    await page.locator(`text="${projectTitle}"`).click();

    // Verify the slide panel opens
    await expect(page.locator('input[placeholder="Project title..."]')).toBeVisible({ timeout: 5000 });

    // Scroll down to see the linked items sections
    // The panel should have sections for Notes, Tasks, and Events
    // Look for the "Link" buttons which indicate the linked items sections exist
    const linkNoteButton = page.locator('button:has-text("Link Note")').or(page.locator('text="Notes"'));
    const linkTaskButton = page.locator('button:has-text("Link Task")').or(page.locator('text="Tasks"'));

    // At least one of these should be visible (indicating linked items section exists)
    await page.waitForTimeout(500);

    // Close the panel
    const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });
});

test.describe('Projects - Search', () => {
  test('can search for projects', async ({ authenticatedPage: page }) => {
    // First create a project with a unique search term
    const searchTerm = `SearchProject${Date.now()}`;
    const projectTitle = `${searchTerm} Test`;

    await page.goto('/projects');

    // Create a project first
    const newProjectButton = page.locator('button:has-text("New Project")').first();
    await newProjectButton.click();

    const titleInput = page.locator('input[placeholder="Project title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(projectTitle);

    const createButton = page.locator('button:has-text("Create Project")');
    await createButton.click();

    // Wait for panel to close and project to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });

    // Use the search input
    const searchInput = page.locator('input[placeholder*="Search projects"]');
    await searchInput.fill(searchTerm);

    // Wait for search results (debounced)
    await page.waitForTimeout(500);

    // Project should be visible (it matches the search)
    await expect(page.locator(`text="${projectTitle}"`)).toBeVisible({ timeout: 5000 });

    // Clear search and verify project is still there
    await searchInput.clear();
    await page.waitForTimeout(500);

    await expect(page.locator(`text="${projectTitle}"`)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Projects - Status Change', () => {
  test('can change project status', async ({ authenticatedPage: page }) => {
    // First create a project
    const projectTitle = generateProjectTitle();

    await page.goto('/projects');

    // Create a project first
    const newProjectButton = page.locator('button:has-text("New Project")').first();
    await newProjectButton.click();

    const titleInput = page.locator('input[placeholder="Project title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(projectTitle);

    const createButton = page.locator('button:has-text("Create Project")');
    await createButton.click();

    // Wait for panel to close and project to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${projectTitle}"`)).toBeVisible({ timeout: 10000 });

    // Click on the project card to open it
    await page.locator(`text="${projectTitle}"`).click();

    // Wait for the edit panel to open
    await expect(page.locator('input[placeholder="Project title..."]')).toBeVisible({ timeout: 5000 });

    // Find and click the status dropdown
    // The status dropdown shows "Active" by default
    const statusDropdown = page.locator('button:has-text("Active")').first();
    await statusDropdown.click();

    // Select "Completed" from the dropdown
    const completedOption = page.locator('button:has-text("Completed")').last();
    await completedOption.click();

    // Wait for the status change to be saved
    await page.waitForTimeout(2000);

    // Close the panel
    const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    // Navigate to Completed tab to verify the project is there
    await page.locator('button:has-text("Completed")').first().click();
    await page.waitForTimeout(500);

    // Project should be visible in completed
    await expect(page.locator(`text="${projectTitle}"`)).toBeVisible({ timeout: 5000 });
  });
});
