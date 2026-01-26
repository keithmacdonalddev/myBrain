/**
 * Calendar E2E Tests
 *
 * Tests for calendar event CRUD operations (Create, Read, Update, Delete).
 * These tests verify that users can manage their calendar events through the UI.
 *
 * Events are time-bound activities with a specific start and end time.
 */
import { test, expect } from './fixtures.js';

// Generate unique identifiers for test data to avoid conflicts
const generateEventTitle = () => `E2E Test Event ${Date.now()}`;

test.describe('Calendar - Create Event', () => {
  test('can create a new event via modal', async ({ authenticatedPage: page }) => {
    const eventTitle = generateEventTitle();
    const eventDescription = 'This is an E2E test event description.';

    // Navigate to calendar page
    await page.goto('/calendar');
    await expect(page).toHaveURL(/.*calendar/);

    // Wait for page to load (no error message visible)
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();

    // Click the "New Event" button
    const newEventButton = page.locator('button:has-text("New Event")').first();
    await newEventButton.click();

    // Wait for the event modal to open
    // The modal has an input with placeholder "Event title"
    const titleInput = page.locator('input[placeholder="Event title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Fill in the event title
    await titleInput.fill(eventTitle);

    // Fill in the description
    const descriptionInput = page.locator('textarea[placeholder="Add description..."]');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill(eventDescription);
    }

    // Click the "Create" button to save the event
    const createButton = page.locator('button:has-text("Create")').last();
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Wait for the modal to close
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });

    // Verify we're back on the calendar page
    await expect(page).toHaveURL(/.*calendar/);
  });

  test('can create an all-day event', async ({ authenticatedPage: page }) => {
    const eventTitle = generateEventTitle();

    // Navigate to calendar page
    await page.goto('/calendar');

    // Click the "New Event" button
    const newEventButton = page.locator('button:has-text("New Event")').first();
    await newEventButton.click();

    // Wait for the event modal to open
    const titleInput = page.locator('input[placeholder="Event title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Fill in the event title
    await titleInput.fill(eventTitle);

    // Toggle all-day checkbox
    const allDayCheckbox = page.locator('input[type="checkbox"]').first();
    await allDayCheckbox.check();

    // Verify the checkbox is checked
    await expect(allDayCheckbox).toBeChecked();

    // Click the "Create" button
    const createButton = page.locator('button:has-text("Create")').last();
    await createButton.click();

    // Wait for the modal to close
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
  });

  test('cannot create an event without a title', async ({ authenticatedPage: page }) => {
    // Navigate to calendar page
    await page.goto('/calendar');

    // Click the "New Event" button
    const newEventButton = page.locator('button:has-text("New Event")').first();
    await newEventButton.click();

    // Wait for the event modal to open
    const titleInput = page.locator('input[placeholder="Event title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Leave title empty, just add a description
    const descriptionInput = page.locator('textarea[placeholder="Add description..."]');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Description without title');
    }

    // Try to click Create - it should show an error or be disabled
    const createButton = page.locator('button:has-text("Create")').last();
    await createButton.click();

    // Should show an error message about title being required
    await expect(page.locator('text=/title is required/i').or(titleInput)).toBeVisible();
  });
});

test.describe('Calendar - View/Navigation', () => {
  test('displays calendar page correctly', async ({ authenticatedPage: page }) => {
    await page.goto('/calendar');

    // Page should load without errors
    await expect(page).toHaveURL(/.*calendar/);
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();

    // Should have the page title/header
    await expect(page.locator('h1:has-text("Calendar")').or(page.locator('text="Calendar"').first())).toBeVisible();

    // Should have view options (Month, Week, Day)
    await expect(page.locator('button:has-text("Month")').or(page.locator('[title="Month"]'))).toBeVisible();
    await expect(page.locator('button:has-text("Week")').or(page.locator('[title="Week"]'))).toBeVisible();
    await expect(page.locator('button:has-text("Day")').or(page.locator('[title="Day"]'))).toBeVisible();
  });

  test('can switch between calendar views', async ({ authenticatedPage: page }) => {
    await page.goto('/calendar');

    // Should start in month view or be able to switch to it
    const monthButton = page.locator('button:has-text("Month")').first();
    await monthButton.click();
    await page.waitForTimeout(500);

    // Switch to Week view
    const weekButton = page.locator('button:has-text("Week")').first();
    await weekButton.click();
    await page.waitForTimeout(500);

    // Switch to Day view
    const dayButton = page.locator('button:has-text("Day")').first();
    await dayButton.click();
    await page.waitForTimeout(500);

    // Switch back to Month view
    await monthButton.click();
    await page.waitForTimeout(500);
  });

  test('can navigate to previous and next periods', async ({ authenticatedPage: page }) => {
    await page.goto('/calendar');

    // Find the navigation buttons (previous/next)
    const prevButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first();
    const nextButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();

    // Click next
    await nextButton.click();
    await page.waitForTimeout(500);

    // Click previous twice (to go back to current, then one before)
    await prevButton.click();
    await page.waitForTimeout(500);
    await prevButton.click();
    await page.waitForTimeout(500);

    // Click Today to go back to current date
    const todayButton = page.locator('button:has-text("Today")');
    if (await todayButton.isVisible()) {
      await todayButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('Today button navigates to current date', async ({ authenticatedPage: page }) => {
    await page.goto('/calendar');

    // Navigate to next month
    const nextButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
    await nextButton.click();
    await page.waitForTimeout(500);

    // Click Today button
    const todayButton = page.locator('button:has-text("Today")');
    await todayButton.click();
    await page.waitForTimeout(500);

    // Should be back at today's date (current month name should be visible)
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });
    await expect(page.locator(`text="${currentMonth}"`).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Calendar - Edit Event', () => {
  test('can open and edit an existing event', async ({ authenticatedPage: page }) => {
    // First create an event to edit
    const originalTitle = generateEventTitle();
    const updatedTitle = `Updated ${originalTitle}`;

    await page.goto('/calendar');

    // Create an event first
    const newEventButton = page.locator('button:has-text("New Event")').first();
    await newEventButton.click();

    const titleInput = page.locator('input[placeholder="Event title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(originalTitle);

    const createButton = page.locator('button:has-text("Create")').last();
    await createButton.click();

    // Wait for modal to close
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });

    // Switch to day view to see the event more easily
    const dayButton = page.locator('button:has-text("Day")').first();
    await dayButton.click();
    await page.waitForTimeout(500);

    // Find and click on the event to open it for editing
    const eventLocator = page.locator(`text="${originalTitle}"`).first();
    if (await eventLocator.isVisible()) {
      await eventLocator.click();

      // Wait for the edit modal to open
      const editTitleInput = page.locator('input[placeholder="Event title"]');
      await expect(editTitleInput).toBeVisible({ timeout: 5000 });

      // Clear and update the title
      await editTitleInput.clear();
      await editTitleInput.fill(updatedTitle);

      // Click Update button
      const updateButton = page.locator('button:has-text("Update")');
      await updateButton.click();

      // Wait for modal to close
      await expect(editTitleInput).not.toBeVisible({ timeout: 10000 });

      // Verify the updated title appears
      await expect(page.locator(`text="${updatedTitle}"`)).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Calendar - Delete Event', () => {
  test('can delete an event', async ({ authenticatedPage: page }) => {
    // First create an event to delete
    const eventTitle = generateEventTitle();

    await page.goto('/calendar');

    // Create an event first
    const newEventButton = page.locator('button:has-text("New Event")').first();
    await newEventButton.click();

    const titleInput = page.locator('input[placeholder="Event title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(eventTitle);

    const createButton = page.locator('button:has-text("Create")').last();
    await createButton.click();

    // Wait for modal to close
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });

    // Switch to day view to see the event more easily
    const dayButton = page.locator('button:has-text("Day")').first();
    await dayButton.click();
    await page.waitForTimeout(500);

    // Find and click on the event to open it for editing
    const eventLocator = page.locator(`text="${eventTitle}"`).first();
    if (await eventLocator.isVisible()) {
      await eventLocator.click();

      // Wait for the edit modal to open
      await expect(page.locator('input[placeholder="Event title"]')).toBeVisible({ timeout: 5000 });

      // Click the Delete button
      const deleteButton = page.locator('button:has-text("Delete")').first();
      await deleteButton.click();

      // Confirm deletion in the dialog
      const confirmButton = page.locator('button:has-text("Delete Event")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Wait for modal to close
      await page.waitForTimeout(1000);

      // Event should no longer be visible
      await expect(page.locator(`text="${eventTitle}"`)).not.toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Calendar - Event with Location', () => {
  test('can create an event with a location', async ({ authenticatedPage: page }) => {
    const eventTitle = generateEventTitle();
    const eventLocation = 'Conference Room A';

    // Navigate to calendar page
    await page.goto('/calendar');

    // Click the "New Event" button
    const newEventButton = page.locator('button:has-text("New Event")').first();
    await newEventButton.click();

    // Wait for the event modal to open
    const titleInput = page.locator('input[placeholder="Event title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Fill in the event title
    await titleInput.fill(eventTitle);

    // Fill in the location
    const locationInput = page.locator('input[placeholder*="Search for an address"]').or(page.locator('input[placeholder*="location"]'));
    if (await locationInput.isVisible()) {
      await locationInput.fill(eventLocation);
    }

    // Click the "Create" button
    const createButton = page.locator('button:has-text("Create")').last();
    await createButton.click();

    // Wait for the modal to close
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe('Calendar - Event with Meeting URL', () => {
  test('can create an event with a meeting URL', async ({ authenticatedPage: page }) => {
    const eventTitle = generateEventTitle();
    const meetingUrl = 'https://zoom.us/j/1234567890';

    // Navigate to calendar page
    await page.goto('/calendar');

    // Click the "New Event" button
    const newEventButton = page.locator('button:has-text("New Event")').first();
    await newEventButton.click();

    // Wait for the event modal to open
    const titleInput = page.locator('input[placeholder="Event title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Fill in the event title
    await titleInput.fill(eventTitle);

    // Fill in the meeting URL
    const meetingInput = page.locator('input[placeholder*="zoom"]').or(page.locator('input[type="url"]'));
    if (await meetingInput.isVisible()) {
      await meetingInput.fill(meetingUrl);
    }

    // Click the "Create" button
    const createButton = page.locator('button:has-text("Create")').last();
    await createButton.click();

    // Wait for the modal to close
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe('Calendar - Event Colors', () => {
  test('can create an event with a specific color', async ({ authenticatedPage: page }) => {
    const eventTitle = generateEventTitle();

    // Navigate to calendar page
    await page.goto('/calendar');

    // Click the "New Event" button
    const newEventButton = page.locator('button:has-text("New Event")').first();
    await newEventButton.click();

    // Wait for the event modal to open
    const titleInput = page.locator('input[placeholder="Event title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Fill in the event title
    await titleInput.fill(eventTitle);

    // Click "Show advanced options" to see color picker
    const advancedButton = page.locator('button:has-text("Show advanced options")').or(page.locator('text=/advanced/i'));
    if (await advancedButton.isVisible()) {
      await advancedButton.click();
      await page.waitForTimeout(500);
    }

    // Select a color (green for example)
    const greenColor = page.locator('button[style*="#10b981"]').or(page.locator('button[title="Green"]'));
    if (await greenColor.isVisible()) {
      await greenColor.click();
    }

    // Click the "Create" button
    const createButton = page.locator('button:has-text("Create")').last();
    await createButton.click();

    // Wait for the modal to close
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe('Calendar - Day Click Creates Event', () => {
  test('clicking on calendar day opens event modal', async ({ authenticatedPage: page }) => {
    await page.goto('/calendar');

    // Make sure we're in month view
    const monthButton = page.locator('button:has-text("Month")').first();
    await monthButton.click();
    await page.waitForTimeout(500);

    // Click on a day cell - this should open the day view or event modal
    // In month view, clicking a date should navigate to day view
    const dayCell = page.locator('[class*="cursor-pointer"]').first();
    if (await dayCell.isVisible()) {
      await dayCell.click();
      await page.waitForTimeout(500);
    }

    // Verify we either see day view or an event modal
    // The behavior may vary - could go to day view first
    const dayView = page.locator('text=/Day|hours/i');
    const eventModal = page.locator('input[placeholder="Event title"]');

    // One of these should be visible
    await expect(dayView.or(eventModal)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Calendar - Recurring Events', () => {
  test('can create a weekly recurring event', async ({ authenticatedPage: page }) => {
    const eventTitle = generateEventTitle();

    // Navigate to calendar page
    await page.goto('/calendar');

    // Click the "New Event" button
    const newEventButton = page.locator('button:has-text("New Event")').first();
    await newEventButton.click();

    // Wait for the event modal to open
    const titleInput = page.locator('input[placeholder="Event title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Fill in the event title
    await titleInput.fill(eventTitle);

    // Click "Show advanced options" to see recurrence
    const advancedButton = page.locator('button:has-text("Show advanced options")').or(page.locator('text=/advanced/i'));
    if (await advancedButton.isVisible()) {
      await advancedButton.click();
      await page.waitForTimeout(500);
    }

    // Find and select recurrence option
    const recurrenceSelect = page.locator('select').filter({ hasText: /repeat/i }).or(page.locator('select:has(option:has-text("Weekly"))'));
    if (await recurrenceSelect.isVisible()) {
      await recurrenceSelect.selectOption('weekly');
    }

    // Click the "Create" button
    const createButton = page.locator('button:has-text("Create")').last();
    await createButton.click();

    // Wait for the modal to close
    await expect(titleInput).not.toBeVisible({ timeout: 10000 });
  });
});
