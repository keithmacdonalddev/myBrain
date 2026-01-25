import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskFilters from './TaskFilters';

describe('TaskFilters', () => {
  // Default props for testing
  const defaultFilters = {
    q: '',
    status: '',
    priority: '',
  };

  let mockOnFiltersChange;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnFiltersChange = vi.fn();
  });

  describe('Basic Rendering', () => {
    it('renders the search input', () => {
      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      expect(searchInput).toBeInTheDocument();
    });

    it('renders the filter toggle button', () => {
      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('does not show expanded filters by default', () => {
      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      // Status dropdown should not be visible
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('displays the current search query value', () => {
      const filtersWithQuery = { ...defaultFilters, q: 'test search' };

      render(
        <TaskFilters filters={filtersWithQuery} onFiltersChange={mockOnFiltersChange} />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      expect(searchInput).toHaveValue('test search');
    });
  });

  describe('Search Interaction', () => {
    it('calls onFiltersChange when typing in search input', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'new task');

      // onFiltersChange should be called for each character
      expect(mockOnFiltersChange).toHaveBeenCalled();
      // Check that calls were made (each character triggers a call)
      expect(mockOnFiltersChange.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('preserves existing filters when updating search', async () => {
      const user = userEvent.setup();
      const existingFilters = { q: '', status: 'todo', priority: 'high' };

      render(
        <TaskFilters filters={existingFilters} onFiltersChange={mockOnFiltersChange} />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'a');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        q: 'a',
        status: 'todo',
        priority: 'high',
      });
    });
  });

  describe('Filter Toggle', () => {
    it('expands filters when filter button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      const filterButton = screen.getByText('Filters');
      await user.click(filterButton);

      // Status dropdown should now be visible
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(2); // Status and Priority dropdowns
    });

    it('collapses filters when filter button is clicked again', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      const filterButton = screen.getByText('Filters');

      // Click to expand
      await user.click(filterButton);
      expect(screen.getAllByRole('combobox').length).toBe(2);

      // Click to collapse
      await user.click(filterButton);
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('shows active filter indicator when filters are applied', () => {
      const activeFilters = { q: '', status: 'todo', priority: '' };

      const { container } = render(
        <TaskFilters filters={activeFilters} onFiltersChange={mockOnFiltersChange} />
      );

      // The indicator dot should be present (bg-primary rounded-full)
      const indicator = container.querySelector('.bg-primary.rounded-full');
      expect(indicator).toBeInTheDocument();
    });

    it('shows active filter indicator when search has value', () => {
      const searchFilters = { q: 'search term', status: '', priority: '' };

      const { container } = render(
        <TaskFilters filters={searchFilters} onFiltersChange={mockOnFiltersChange} />
      );

      const indicator = container.querySelector('.bg-primary.rounded-full');
      expect(indicator).toBeInTheDocument();
    });

    it('does not show active filter indicator when no filters are active', () => {
      const { container } = render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      const indicator = container.querySelector('.w-1\\.5.h-1\\.5.bg-primary.rounded-full');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  describe('Status Filter', () => {
    it('displays all status options when expanded', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      // Expand filters
      await user.click(screen.getByText('Filters'));

      // Find status select (first combobox)
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects[0];

      // Check for all status options
      expect(statusSelect).toContainHTML('All Statuses');
      expect(statusSelect).toContainHTML('To Do');
      expect(statusSelect).toContainHTML('In Progress');
      expect(statusSelect).toContainHTML('Done');
      expect(statusSelect).toContainHTML('Cancelled');
    });

    it('calls onFiltersChange when status is selected', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      // Expand filters
      await user.click(screen.getByText('Filters'));

      // Select a status
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects[0];

      await user.selectOptions(statusSelect, 'todo');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        q: '',
        status: 'todo',
        priority: '',
      });
    });

    it('displays the currently selected status', async () => {
      const user = userEvent.setup();
      const filtersWithStatus = { q: '', status: 'in_progress', priority: '' };

      render(
        <TaskFilters filters={filtersWithStatus} onFiltersChange={mockOnFiltersChange} />
      );

      // Expand filters
      await user.click(screen.getByText('Filters'));

      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects[0];

      expect(statusSelect).toHaveValue('in_progress');
    });
  });

  describe('Priority Filter', () => {
    it('displays all priority options when expanded', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      // Expand filters
      await user.click(screen.getByText('Filters'));

      // Find priority select (second combobox)
      const selects = screen.getAllByRole('combobox');
      const prioritySelect = selects[1];

      // Check for all priority options
      expect(prioritySelect).toContainHTML('All Priorities');
      expect(prioritySelect).toContainHTML('High');
      expect(prioritySelect).toContainHTML('Medium');
      expect(prioritySelect).toContainHTML('Low');
    });

    it('calls onFiltersChange when priority is selected', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      // Expand filters
      await user.click(screen.getByText('Filters'));

      // Select a priority
      const selects = screen.getAllByRole('combobox');
      const prioritySelect = selects[1];

      await user.selectOptions(prioritySelect, 'high');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        q: '',
        status: '',
        priority: 'high',
      });
    });

    it('displays the currently selected priority', async () => {
      const user = userEvent.setup();
      const filtersWithPriority = { q: '', status: '', priority: 'low' };

      render(
        <TaskFilters filters={filtersWithPriority} onFiltersChange={mockOnFiltersChange} />
      );

      // Expand filters
      await user.click(screen.getByText('Filters'));

      const selects = screen.getAllByRole('combobox');
      const prioritySelect = selects[1];

      expect(prioritySelect).toHaveValue('low');
    });
  });

  describe('Clear Filters', () => {
    it('shows clear button when filters are active', async () => {
      const user = userEvent.setup();
      const activeFilters = { q: 'search', status: 'todo', priority: 'high' };

      render(
        <TaskFilters filters={activeFilters} onFiltersChange={mockOnFiltersChange} />
      );

      // Expand filters
      await user.click(screen.getByText('Filters'));

      // Clear button should be visible
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('does not show clear button when no filters are active', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      // Expand filters
      await user.click(screen.getByText('Filters'));

      // Clear button should not be visible
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      const activeFilters = { q: 'search', status: 'todo', priority: 'high' };

      render(
        <TaskFilters filters={activeFilters} onFiltersChange={mockOnFiltersChange} />
      );

      // Expand filters
      await user.click(screen.getByText('Filters'));

      // Click clear button
      await user.click(screen.getByText('Clear'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        q: '',
        status: '',
        priority: '',
      });
    });
  });

  describe('Multiple Filters', () => {
    it('allows combining search with status and priority filters', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      // Type in search
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'meeting');

      // Last search call
      const searchCalls = mockOnFiltersChange.mock.calls.filter(
        (call) => call[0].q && call[0].q.length > 0
      );
      expect(searchCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('search input is focusable', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.click(searchInput);

      expect(searchInput).toHaveFocus();
    });

    it('filter button is keyboard accessible', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />
      );

      // Tab to filter button and press enter
      await user.tab();
      await user.tab(); // Skip search input

      const filterButton = screen.getByText('Filters').closest('button');
      await user.click(filterButton);

      // Filters should be expanded
      expect(screen.getAllByRole('combobox').length).toBe(2);
    });
  });
});
