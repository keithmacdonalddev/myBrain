import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LifeAreasManager } from './LifeAreasManager';

// Mock the hooks
vi.mock('../hooks/useLifeAreas', () => ({
  useLifeAreas: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useCreateLifeArea: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdateLifeArea: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteLifeArea: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useSetDefaultLifeArea: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useReorderLifeAreas: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useArchiveLifeArea: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('../../../hooks/useToast', () => ({
  default: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock the LifeAreaModal component
vi.mock('./LifeAreaModal', () => ({
  LifeAreaModal: vi.fn(({ onClose }) => (
    <div data-testid="life-area-modal">
      <button onClick={onClose}>Close Modal</button>
    </div>
  )),
}));

import {
  useLifeAreas,
  useDeleteLifeArea,
  useSetDefaultLifeArea,
  useArchiveLifeArea,
} from '../hooks/useLifeAreas';
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

describe('LifeAreasManager', () => {
  const mockToast = { success: vi.fn(), error: vi.fn() };
  const mockSetDefaultMutate = vi.fn();
  const mockDeleteMutate = vi.fn();
  const mockArchiveMutate = vi.fn();

  const mockLifeAreas = [
    {
      _id: '1',
      name: 'Work',
      color: '#6366f1',
      description: 'Work related tasks',
      isDefault: true,
      isArchived: false,
    },
    {
      _id: '2',
      name: 'Personal',
      color: '#10b981',
      description: 'Personal matters',
      isDefault: false,
      isArchived: false,
    },
    {
      _id: '3',
      name: 'Old Project',
      color: '#ef4444',
      description: 'Archived project',
      isDefault: false,
      isArchived: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetDefaultMutate.mockResolvedValue({});
    mockDeleteMutate.mockResolvedValue({});
    mockArchiveMutate.mockResolvedValue({});

    useLifeAreas.mockReturnValue({
      data: mockLifeAreas,
      isLoading: false,
    });
    useSetDefaultLifeArea.mockReturnValue({
      mutateAsync: mockSetDefaultMutate,
      isPending: false,
    });
    useDeleteLifeArea.mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
    });
    useArchiveLifeArea.mockReturnValue({
      mutateAsync: mockArchiveMutate,
      isPending: false,
    });
    useToast.mockReturnValue(mockToast);
  });

  const Wrapper = createWrapper();

  describe('Basic Rendering', () => {
    it('renders header with title and description', () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(
        screen.getByText(/Organize your work into meaningful areas/i)
      ).toBeInTheDocument();
    });

    it('renders "New Category" button', () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      expect(
        screen.getByRole('button', { name: /new category/i })
      ).toBeInTheDocument();
    });

    it('renders active life areas', () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    it('does not show archived areas by default', () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      expect(screen.queryByText('Old Project')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when data is loading', () => {
      useLifeAreas.mockReturnValue({
        data: [],
        isLoading: true,
      });

      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      // Check for the loading spinner (Loader2 component)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no life areas exist', () => {
      useLifeAreas.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      expect(screen.getByText('No categories yet')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create your first category/i })
      ).toBeInTheDocument();
    });
  });

  describe('Life Area Row Display', () => {
    it('shows default badge for default life area', () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('shows description for life areas with descriptions', () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      expect(screen.getByText('Work related tasks')).toBeInTheDocument();
      expect(screen.getByText('Personal matters')).toBeInTheDocument();
    });

    it('shows color indicator for each life area', () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const colorIndicators = document.querySelectorAll(
        '[style*="background-color"]'
      );
      expect(colorIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Create Life Area', () => {
    it('opens modal when "New Category" button is clicked', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const newButton = screen.getByRole('button', { name: /new category/i });
      await userEvent.click(newButton);

      expect(screen.getByTestId('life-area-modal')).toBeInTheDocument();
    });

    it('opens modal when empty state button is clicked', async () => {
      useLifeAreas.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const createButton = screen.getByRole('button', {
        name: /create your first category/i,
      });
      await userEvent.click(createButton);

      expect(screen.getByTestId('life-area-modal')).toBeInTheDocument();
    });
  });

  describe('Edit Life Area', () => {
    it('opens modal with life area data when edit button is clicked', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const editButtons = screen.getAllByTitle('Edit');
      await userEvent.click(editButtons[0]);

      expect(screen.getByTestId('life-area-modal')).toBeInTheDocument();
    });
  });

  describe('Set Default Life Area', () => {
    it('calls setDefaultMutation when star button is clicked', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      // Find the "Set as default" button (only for non-default areas)
      const setDefaultButton = screen.getByTitle('Set as default');
      await userEvent.click(setDefaultButton);

      expect(mockSetDefaultMutate).toHaveBeenCalledWith('2');
    });

    it('shows success toast on successful default change', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const setDefaultButton = screen.getByTitle('Set as default');
      await userEvent.click(setDefaultButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Default category updated');
      });
    });

    it('shows error toast on failed default change', async () => {
      mockSetDefaultMutate.mockRejectedValueOnce(new Error('Failed'));

      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const setDefaultButton = screen.getByTitle('Set as default');
      await userEvent.click(setDefaultButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Archive Life Area', () => {
    it('calls archiveMutation when archive button is clicked', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const archiveButton = screen.getByTitle('Archive');
      await userEvent.click(archiveButton);

      expect(mockArchiveMutate).toHaveBeenCalledWith({ id: '2', archive: true });
    });

    it('shows success toast on successful archive', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const archiveButton = screen.getByTitle('Archive');
      await userEvent.click(archiveButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Category archived');
      });
    });

    it('shows error toast on failed archive', async () => {
      mockArchiveMutate.mockRejectedValueOnce(new Error('Archive failed'));

      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const archiveButton = screen.getByTitle('Archive');
      await userEvent.click(archiveButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Life Area', () => {
    it('opens delete confirmation modal when delete button is clicked', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const deleteButton = screen.getByTitle('Delete');
      await userEvent.click(deleteButton);

      expect(screen.getByText('Delete Category?')).toBeInTheDocument();
    });

    it('shows life area name in delete confirmation', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const deleteButton = screen.getByTitle('Delete');
      await userEvent.click(deleteButton);

      expect(screen.getByText(/Personal/)).toBeInTheDocument();
    });

    it('calls deleteMutation on confirm', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const deleteButton = screen.getByTitle('Delete');
      await userEvent.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await userEvent.click(confirmButton);

      expect(mockDeleteMutate).toHaveBeenCalledWith('2');
    });

    it('closes confirmation modal on cancel', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const deleteButton = screen.getByTitle('Delete');
      await userEvent.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(screen.queryByText('Delete Category?')).not.toBeInTheDocument();
    });

    it('shows success toast on successful delete', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const deleteButton = screen.getByTitle('Delete');
      await userEvent.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Category deleted');
      });
    });

    it('does not show delete button for default life area', () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      // There should only be one delete button (for the non-default area)
      const deleteButtons = screen.getAllByTitle('Delete');
      expect(deleteButtons).toHaveLength(1);
    });
  });

  describe('Archived Areas Section', () => {
    it('shows toggle button when there are archived areas', () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      expect(screen.getByText(/show archived/i)).toBeInTheDocument();
    });

    it('shows archived count in toggle button', () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      expect(screen.getByText(/\(1\)/)).toBeInTheDocument();
    });

    it('shows archived areas when toggle is clicked', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const toggleButton = screen.getByText(/show archived/i);
      await userEvent.click(toggleButton);

      expect(screen.getByText('Old Project')).toBeInTheDocument();
    });

    it('hides archived areas when toggle is clicked again', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const toggleButton = screen.getByText(/show archived/i);
      await userEvent.click(toggleButton);

      expect(screen.getByText('Old Project')).toBeInTheDocument();

      await userEvent.click(screen.getByText(/hide archived/i));

      expect(screen.queryByText('Old Project')).not.toBeInTheDocument();
    });

    it('shows restore button for archived areas', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const toggleButton = screen.getByText(/show archived/i);
      await userEvent.click(toggleButton);

      expect(screen.getByTitle('Restore')).toBeInTheDocument();
    });

    it('calls unarchive when restore button is clicked', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const toggleButton = screen.getByText(/show archived/i);
      await userEvent.click(toggleButton);

      const restoreButton = screen.getByTitle('Restore');
      await userEvent.click(restoreButton);

      expect(mockArchiveMutate).toHaveBeenCalledWith({ id: '3', archive: false });
    });

    it('shows success toast on successful restore', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const toggleButton = screen.getByText(/show archived/i);
      await userEvent.click(toggleButton);

      const restoreButton = screen.getByTitle('Restore');
      await userEvent.click(restoreButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Category restored');
      });
    });

    it('shows archived badge for archived areas', async () => {
      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      const toggleButton = screen.getByText(/show archived/i);
      await userEvent.click(toggleButton);

      expect(screen.getByText('archived')).toBeInTheDocument();
    });
  });

  describe('No Archived Areas', () => {
    it('does not show archived section when no archived areas exist', () => {
      useLifeAreas.mockReturnValue({
        data: mockLifeAreas.filter((la) => !la.isArchived),
        isLoading: false,
      });

      render(
        <Wrapper>
          <LifeAreasManager />
        </Wrapper>
      );

      expect(screen.queryByText(/show archived/i)).not.toBeInTheDocument();
    });
  });
});
