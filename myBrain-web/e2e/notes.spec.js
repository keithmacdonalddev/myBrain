/**
 * Notes E2E Tests
 *
 * Tests for note CRUD operations (Create, Read, Update, Delete).
 * These tests verify that users can manage their notes through the UI.
 *
 * Required flow: create_note (per qa-config.md)
 */
import { test, expect } from './fixtures.js';

// Generate unique identifiers for test data to avoid conflicts
const generateNoteTitle = () => `E2E Test Note ${Date.now()}`;

test.describe('Notes - Create', () => {
  test('can create a new note via slide panel', async ({ authenticatedPage: page }) => {
    const noteTitle = generateNoteTitle();
    const noteBody = 'This is the body content of the E2E test note.';

    // Navigate to notes page
    await page.goto('/notes');
    await expect(page).toHaveURL(/.*notes/);

    // Wait for page to load (no error message visible)
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();

    // Click the "New Note" button (desktop version)
    // The button has a Plus icon and "New Note" text
    const newNoteButton = page.locator('button:has-text("New Note")').first();
    await newNoteButton.click();

    // Wait for the slide panel to open
    // The panel has a title input with placeholder "Note title..."
    const titleInput = page.locator('input[placeholder="Note title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Fill in the note title
    await titleInput.fill(noteTitle);

    // Fill in the note body
    const bodyInput = page.locator('textarea[placeholder="Start writing..."]');
    await expect(bodyInput).toBeVisible();
    await bodyInput.fill(noteBody);

    // Click the "Create Note" button
    const createButton = page.locator('button:has-text("Create Note")');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // Wait for the panel to close
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });

    // Verify the note appears in the grid
    // Notes are displayed in NoteCard components with the title visible
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible({ timeout: 10000 });
  });

  test('can create a note with only a body (untitled)', async ({ authenticatedPage: page }) => {
    const noteBody = `Untitled note body ${Date.now()}`;

    await page.goto('/notes');

    // Click the "New Note" button
    const newNoteButton = page.locator('button:has-text("New Note")').first();
    await newNoteButton.click();

    // Wait for the slide panel to open
    const titleInput = page.locator('input[placeholder="Note title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Leave title empty, only fill body
    const bodyInput = page.locator('textarea[placeholder="Start writing..."]');
    await bodyInput.fill(noteBody);

    // Create Note button should be enabled (body is filled)
    const createButton = page.locator('button:has-text("Create Note")');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // Wait for the panel to close
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });

    // Note should appear with "Untitled" as the title
    // The body content should be visible as a preview
    await expect(page.locator(`text="${noteBody.substring(0, 50)}"`).first()).toBeVisible({ timeout: 10000 });
  });

  test('cannot create a note without title and body', async ({ authenticatedPage: page }) => {
    await page.goto('/notes');

    // Click the "New Note" button
    const newNoteButton = page.locator('button:has-text("New Note")').first();
    await newNoteButton.click();

    // Wait for the slide panel to open
    const titleInput = page.locator('input[placeholder="Note title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Leave both title and body empty
    // The "Create Note" button should be disabled
    const createButton = page.locator('button:has-text("Create Note")');
    await expect(createButton).toBeDisabled();
  });
});

test.describe('Notes - View/List', () => {
  test('displays notes list page correctly', async ({ authenticatedPage: page }) => {
    await page.goto('/notes');

    // Page should load without errors
    await expect(page).toHaveURL(/.*notes/);
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();

    // Should have the page title/header
    await expect(page.locator('h1:has-text("Notes")').or(page.locator('text="Notes"').first())).toBeVisible();

    // Should have the "New Note" button
    await expect(page.locator('button:has-text("New Note")')).toBeVisible();
  });

  test('can view note status tabs (All Notes, Archived, Trash)', async ({ authenticatedPage: page }) => {
    await page.goto('/notes');

    // Check for status tab navigation
    // Tabs are buttons with text "All Notes", "Archived", "Trash"
    await expect(page.locator('button:has-text("All Notes")')).toBeVisible();
    await expect(page.locator('button:has-text("Archived")')).toBeVisible();
    await expect(page.locator('button:has-text("Trash")')).toBeVisible();
  });

  test('can switch between note status tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/notes');

    // Click on Archived tab
    await page.locator('button:has-text("Archived")').click();

    // Wait for content to load
    await page.waitForTimeout(500);

    // Click on Trash tab
    await page.locator('button:has-text("Trash")').click();

    // Wait for content to load
    await page.waitForTimeout(500);

    // Go back to All Notes tab
    await page.locator('button:has-text("All Notes")').click();

    // Wait for content to load
    await page.waitForTimeout(500);
  });
});

test.describe('Notes - Edit', () => {
  test('can open and edit an existing note', async ({ authenticatedPage: page }) => {
    // First create a note to edit
    const originalTitle = generateNoteTitle();
    const updatedTitle = `Updated ${originalTitle}`;
    const originalBody = 'Original body content';
    const updatedBody = 'Updated body content';

    await page.goto('/notes');

    // Create a note first
    const newNoteButton = page.locator('button:has-text("New Note")').first();
    await newNoteButton.click();

    const titleInput = page.locator('input[placeholder="Note title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(originalTitle);

    const bodyInput = page.locator('textarea[placeholder="Start writing..."]');
    await bodyInput.fill(originalBody);

    const createButton = page.locator('button:has-text("Create Note")');
    await createButton.click();

    // Wait for panel to close and note to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${originalTitle}"`)).toBeVisible({ timeout: 10000 });

    // Click on the note card to open it
    await page.locator(`text="${originalTitle}"`).click();

    // Wait for the edit panel to open
    const editTitleInput = page.locator('input[placeholder="Note title..."]');
    await expect(editTitleInput).toBeVisible({ timeout: 5000 });

    // Clear and update the title
    await editTitleInput.clear();
    await editTitleInput.fill(updatedTitle);

    // Update the body
    const editBodyInput = page.locator('textarea[placeholder="Start writing..."]');
    await editBodyInput.clear();
    await editBodyInput.fill(updatedBody);

    // The note should auto-save, but we can also click the Save button if visible
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

    // Verify the updated title appears in the grid
    await expect(page.locator(`text="${updatedTitle}"`)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Notes - Delete', () => {
  test('can move a note to trash', async ({ authenticatedPage: page }) => {
    // First create a note to delete
    const noteTitle = generateNoteTitle();
    const noteBody = 'Note to be trashed';

    await page.goto('/notes');

    // Create a note first
    const newNoteButton = page.locator('button:has-text("New Note")').first();
    await newNoteButton.click();

    const titleInput = page.locator('input[placeholder="Note title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(noteTitle);

    const bodyInput = page.locator('textarea[placeholder="Start writing..."]');
    await bodyInput.fill(noteBody);

    const createButton = page.locator('button:has-text("Create Note")');
    await createButton.click();

    // Wait for panel to close and note to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible({ timeout: 10000 });

    // Click on the note card to open it
    await page.locator(`text="${noteTitle}"`).click();

    // Wait for the edit panel to open
    await expect(page.locator('input[placeholder="Note title..."]')).toBeVisible({ timeout: 5000 });

    // Click the trash button (Move to Trash tooltip)
    // Look for the Trash2 icon button in the header
    const trashButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
    await trashButton.click();

    // Wait for panel to close
    await page.waitForTimeout(1000);

    // Note should no longer be visible in All Notes tab
    await expect(page.locator(`text="${noteTitle}"`)).not.toBeVisible();

    // Navigate to Trash tab to verify the note is there
    await page.locator('button:has-text("Trash")').click();
    await page.waitForTimeout(500);

    // Note should be visible in trash
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Notes - Archive', () => {
  test('can archive a note', async ({ authenticatedPage: page }) => {
    // First create a note to archive
    const noteTitle = generateNoteTitle();
    const noteBody = 'Note to be archived';

    await page.goto('/notes');

    // Create a note first
    const newNoteButton = page.locator('button:has-text("New Note")').first();
    await newNoteButton.click();

    const titleInput = page.locator('input[placeholder="Note title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(noteTitle);

    const bodyInput = page.locator('textarea[placeholder="Start writing..."]');
    await bodyInput.fill(noteBody);

    const createButton = page.locator('button:has-text("Create Note")');
    await createButton.click();

    // Wait for panel to close and note to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible({ timeout: 10000 });

    // Click on the note card to open it
    await page.locator(`text="${noteTitle}"`).click();

    // Wait for the edit panel to open
    await expect(page.locator('input[placeholder="Note title..."]')).toBeVisible({ timeout: 5000 });

    // Click the archive button
    // Look for the Archive icon button in the header
    const archiveButton = page.locator('button').filter({ has: page.locator('svg.lucide-archive') }).first();
    await archiveButton.click();

    // Wait for panel to close
    await page.waitForTimeout(1000);

    // Note should no longer be visible in All Notes tab
    await expect(page.locator(`text="${noteTitle}"`)).not.toBeVisible();

    // Navigate to Archived tab to verify the note is there
    await page.locator('button:has-text("Archived")').click();
    await page.waitForTimeout(500);

    // Note should be visible in archived
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Notes - Pin', () => {
  test('can pin a note', async ({ authenticatedPage: page }) => {
    // First create a note to pin
    const noteTitle = generateNoteTitle();
    const noteBody = 'Note to be pinned';

    await page.goto('/notes');

    // Create a note first
    const newNoteButton = page.locator('button:has-text("New Note")').first();
    await newNoteButton.click();

    const titleInput = page.locator('input[placeholder="Note title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(noteTitle);

    const bodyInput = page.locator('textarea[placeholder="Start writing..."]');
    await bodyInput.fill(noteBody);

    const createButton = page.locator('button:has-text("Create Note")');
    await createButton.click();

    // Wait for panel to close and note to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible({ timeout: 10000 });

    // Click on the note card to open it
    await page.locator(`text="${noteTitle}"`).click();

    // Wait for the edit panel to open
    await expect(page.locator('input[placeholder="Note title..."]')).toBeVisible({ timeout: 5000 });

    // Click the pin button
    // Look for the Pin icon button in the header
    const pinButton = page.locator('button').filter({ has: page.locator('svg.lucide-pin') }).first();
    await pinButton.click();

    // Wait for the action to complete
    await page.waitForTimeout(1000);

    // Close the panel
    const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    // The note should now be in the Pinned section
    // Look for the "Pinned" section header
    await expect(page.locator('text="Pinned"')).toBeVisible({ timeout: 5000 });

    // Note should still be visible
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible();
  });
});

test.describe('Notes - Search', () => {
  test('can search for notes', async ({ authenticatedPage: page }) => {
    // First create a note with a unique search term
    const searchTerm = `SearchTest${Date.now()}`;
    const noteTitle = `${searchTerm} Note`;
    const noteBody = `This note contains the search term ${searchTerm}`;

    await page.goto('/notes');

    // Create a note first
    const newNoteButton = page.locator('button:has-text("New Note")').first();
    await newNoteButton.click();

    const titleInput = page.locator('input[placeholder="Note title..."]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(noteTitle);

    const bodyInput = page.locator('textarea[placeholder="Start writing..."]');
    await bodyInput.fill(noteBody);

    const createButton = page.locator('button:has-text("Create Note")');
    await createButton.click();

    // Wait for panel to close and note to appear
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });

    // Use the search input
    const searchInput = page.locator('input[placeholder*="Search notes"]');
    await searchInput.fill(searchTerm);

    // Wait for search results (debounced)
    await page.waitForTimeout(500);

    // Note should be visible (it matches the search)
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible({ timeout: 5000 });

    // Clear search and verify note is still there
    await searchInput.clear();
    await page.waitForTimeout(500);

    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible({ timeout: 5000 });
  });
});
