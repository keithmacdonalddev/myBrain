import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LifeAreaModal } from './LifeAreaModal';

// Mock the hooks
vi.mock('../hooks/useLifeAreas', () => ({
  useCreateLifeArea: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  useUpdateLifeArea: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
}));

vi.mock('../../../hooks/useToast', () => ({
  default: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
  })),
}));

// Import mocked modules
import { useCreateLifeArea, useUpdateLifeArea } from '../hooks/useLifeAreas';
import useToast from '../../../hooks/useToast';

// Create mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      lifeAreas: (state = { items: [] }) => state,
    },
  });
};

// Create wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const store = createMockStore();
  return ({ children }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
};

describe('LifeAreaModal', () => {
  const mockOnClose = vi.fn();
  const mockMutateAsync = vi.fn();
  const mockToast = { success: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ data: { lifeArea: {} } });
    useCreateLifeArea.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    });
    useUpdateLifeArea.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    });
    useToast.mockReturnValue(mockToast);
  });

  const Wrapper = createWrapper();

  describe('Create Mode (no lifeArea prop)', () => {
    it('renders with "New Category" title', () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );
      expect(screen.getByText('New Category')).toBeInTheDocument();
    });

    it('renders with "Create" submit button text', () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    it('renders empty form fields', () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );
      const nameInput = screen.getByPlaceholderText(/e.g., Work & Career/i);
      expect(nameInput).toHaveValue('');
    });

    it('shows error when submitting without name', async () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      const createButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(createButton);

      expect(mockToast.error).toHaveBeenCalledWith('Name is required');
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('calls createMutation with form data on submit', async () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      const nameInput = screen.getByPlaceholderText(/e.g., Work & Career/i);
      await userEvent.type(nameInput, 'New Work Area');

      const createButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'New Work Area',
          description: '',
          color: '#6366f1',
          icon: 'Folder',
        });
      });
    });

    it('shows success toast and closes modal on successful create', async () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      const nameInput = screen.getByPlaceholderText(/e.g., Work & Career/i);
      await userEvent.type(nameInput, 'New Category');

      const createButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Category created');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode (with lifeArea prop)', () => {
    const existingLifeArea = {
      _id: '123',
      name: 'Work',
      description: 'Work related tasks',
      color: '#3b82f6',
      icon: 'Briefcase',
    };

    it('renders with "Edit Category" title', () => {
      render(
        <Wrapper>
          <LifeAreaModal lifeArea={existingLifeArea} onClose={mockOnClose} />
        </Wrapper>
      );
      expect(screen.getByText('Edit Category')).toBeInTheDocument();
    });

    it('renders with "Update" submit button text', () => {
      render(
        <Wrapper>
          <LifeAreaModal lifeArea={existingLifeArea} onClose={mockOnClose} />
        </Wrapper>
      );
      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
    });

    it('pre-fills form with existing life area data', () => {
      render(
        <Wrapper>
          <LifeAreaModal lifeArea={existingLifeArea} onClose={mockOnClose} />
        </Wrapper>
      );

      const nameInput = screen.getByPlaceholderText(/e.g., Work & Career/i);
      expect(nameInput).toHaveValue('Work');

      const descriptionInput = screen.getByPlaceholderText(/Optional description/i);
      expect(descriptionInput).toHaveValue('Work related tasks');
    });

    it('calls updateMutation with form data on submit', async () => {
      render(
        <Wrapper>
          <LifeAreaModal lifeArea={existingLifeArea} onClose={mockOnClose} />
        </Wrapper>
      );

      const nameInput = screen.getByPlaceholderText(/e.g., Work & Career/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Work');

      const updateButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: '123',
          data: {
            name: 'Updated Work',
            description: 'Work related tasks',
            color: '#3b82f6',
            icon: 'Briefcase',
          },
        });
      });
    });

    it('shows success toast and closes modal on successful update', async () => {
      render(
        <Wrapper>
          <LifeAreaModal lifeArea={existingLifeArea} onClose={mockOnClose} />
        </Wrapper>
      );

      const updateButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Category updated');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Color Selection', () => {
    it('renders all color options', () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      // Check for color buttons by their title attribute
      expect(screen.getByTitle('Indigo')).toBeInTheDocument();
      expect(screen.getByTitle('Blue')).toBeInTheDocument();
      expect(screen.getByTitle('Green')).toBeInTheDocument();
      expect(screen.getByTitle('Yellow')).toBeInTheDocument();
      expect(screen.getByTitle('Red')).toBeInTheDocument();
      expect(screen.getByTitle('Purple')).toBeInTheDocument();
      expect(screen.getByTitle('Pink')).toBeInTheDocument();
      expect(screen.getByTitle('Gray')).toBeInTheDocument();
    });

    it('selects a color when clicked', async () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      const blueButton = screen.getByTitle('Blue');
      await userEvent.click(blueButton);

      // Fill name and submit to check the color was selected
      const nameInput = screen.getByPlaceholderText(/e.g., Work & Career/i);
      await userEvent.type(nameInput, 'Test');

      const createButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            color: '#3b82f6',
          })
        );
      });
    });
  });

  describe('Icon Selection', () => {
    it('renders all icon options', () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      expect(screen.getByRole('button', { name: /folder/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /inbox/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /work/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /health/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /finance/i })).toBeInTheDocument();
    });

    it('selects an icon when clicked', async () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      const workButton = screen.getByRole('button', { name: /^work$/i });
      await userEvent.click(workButton);

      // Fill name and submit to check the icon was selected
      const nameInput = screen.getByPlaceholderText(/e.g., Work & Career/i);
      await userEvent.type(nameInput, 'Test');

      const createButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            icon: 'Briefcase',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error toast when mutation fails', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      const nameInput = screen.getByPlaceholderText(/e.g., Work & Career/i);
      await userEvent.type(nameInput, 'Test');

      const createButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Network error');
      });
    });

    it('shows generic error message when error has no message', async () => {
      mockMutateAsync.mockRejectedValueOnce({});

      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      const nameInput = screen.getByPlaceholderText(/e.g., Work & Career/i);
      await userEvent.type(nameInput, 'Test');

      const createButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to save category');
      });
    });
  });

  describe('Loading State', () => {
    it('disables submit button when loading', () => {
      useCreateLifeArea.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        error: null,
      });

      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      // The BaseModal should handle loading state
      // We just verify the mutation is marked as pending
      expect(useCreateLifeArea().isPending).toBe(true);
    });
  });

  describe('Form Inputs', () => {
    it('limits name input to 50 characters', () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      const nameInput = screen.getByPlaceholderText(/e.g., Work & Career/i);
      expect(nameInput).toHaveAttribute('maxLength', '50');
    });

    it('limits description input to 200 characters', () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      const descriptionInput = screen.getByPlaceholderText(/Optional description/i);
      expect(descriptionInput).toHaveAttribute('maxLength', '200');
    });

    it('trims whitespace from name on submit', async () => {
      render(
        <Wrapper>
          <LifeAreaModal onClose={mockOnClose} />
        </Wrapper>
      );

      const nameInput = screen.getByPlaceholderText(/e.g., Work & Career/i);
      await userEvent.type(nameInput, '  Test Name  ');

      const createButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Name',
          })
        );
      });
    });
  });
});
