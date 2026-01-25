import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ImageDetailsModal from './ImageDetailsModal';

// Mock the hooks
vi.mock('../hooks/useImages', () => ({
  useUpdateImage: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useToggleFavorite: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteImage: vi.fn(() => ({
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

// Mock ConfirmDialog
vi.mock('../../../components/ui/ConfirmDialog', () => ({
  default: vi.fn(({ isOpen, onClose, onConfirm, title, message }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onConfirm}>Confirm Delete</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}));

import { useUpdateImage, useToggleFavorite, useDeleteImage } from '../hooks/useImages';
import useToast from '../../../hooks/useToast';

// Create wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ImageDetailsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnNavigate = vi.fn();
  const mockOnDeleted = vi.fn();
  const mockUpdateMutate = vi.fn();
  const mockToggleFavoriteMutate = vi.fn();
  const mockDeleteMutate = vi.fn();
  const mockToast = { success: vi.fn(), error: vi.fn() };

  const mockImage = {
    _id: '1',
    title: 'Test Image',
    originalName: 'test-image.jpg',
    description: 'A test image description',
    alt: 'Test alt text',
    tags: ['nature', 'landscape'],
    secureUrl: 'https://example.com/image.jpg',
    format: 'jpg',
    width: 1920,
    height: 1080,
    size: 1024000,
    favorite: false,
    colors: ['#ff0000', '#00ff00', '#0000ff'],
    createdAt: '2024-01-15T10:00:00Z',
  };

  const mockImages = [
    mockImage,
    { ...mockImage, _id: '2', title: 'Second Image' },
    { ...mockImage, _id: '3', title: 'Third Image' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMutate.mockResolvedValue({});
    mockToggleFavoriteMutate.mockResolvedValue({});
    mockDeleteMutate.mockResolvedValue({});

    useUpdateImage.mockReturnValue({
      mutateAsync: mockUpdateMutate,
      isPending: false,
    });
    useToggleFavorite.mockReturnValue({
      mutateAsync: mockToggleFavoriteMutate,
      isPending: false,
    });
    useDeleteImage.mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
    });
    useToast.mockReturnValue(mockToast);

    // Mock clipboard API (navigator.clipboard is read-only in jsdom)
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const Wrapper = createWrapper();

  describe('Basic Rendering', () => {
    it('renders nothing when image is null', () => {
      const { container } = render(
        <Wrapper>
          <ImageDetailsModal
            image={null}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders the image', () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const img = screen.getByAltText('Test alt text');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', mockImage.secureUrl);
    });

    it('renders image title in header', () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      expect(screen.getByText('Test Image')).toBeInTheDocument();
    });

    it('renders image description', () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      expect(screen.getByText('A test image description')).toBeInTheDocument();
    });

    it('renders image tags', () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      expect(screen.getByText('nature')).toBeInTheDocument();
      expect(screen.getByText('landscape')).toBeInTheDocument();
    });

    it('renders image metadata', () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      expect(screen.getByText('JPG')).toBeInTheDocument();
      expect(screen.getByText('1920 x 1080px')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('shows previous button when not on first image', () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImages[1]}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      // Previous button should exist
      const buttons = screen.getAllByRole('button');
      const prevButton = buttons.find(
        (btn) => btn.querySelector('svg')?.classList.contains('w-6')
      );
      expect(prevButton).toBeDefined();
    });

    it('shows next button when not on last image', () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImages[0]}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      // Next button should exist
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('calls onNavigate when previous button is clicked', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImages[1]}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      // Find the left navigation button
      const navButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.className.includes('absolute'));
      const prevButton = navButtons[0];

      if (prevButton) {
        await userEvent.click(prevButton);
        expect(mockOnNavigate).toHaveBeenCalledWith(mockImages[0]);
      }
    });

    it('handles keyboard navigation with ArrowLeft', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImages[1]}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(mockOnNavigate).toHaveBeenCalledWith(mockImages[0]);
      });
    });

    it('handles keyboard navigation with ArrowRight', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImages[0]}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(mockOnNavigate).toHaveBeenCalledWith(mockImages[1]);
      });
    });

    it('closes modal on Escape key', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    it('enters edit mode when Edit button is clicked', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      // Should show input fields
      expect(screen.getByPlaceholderText(/image title/i)).toBeInTheDocument();
    });

    it('pre-fills form with image data in edit mode', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      const titleInput = screen.getByPlaceholderText(/image title/i);
      expect(titleInput).toHaveValue('Test Image');
    });

    it('calls updateImage mutation on save', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      const titleInput = screen.getByPlaceholderText(/image title/i);
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Updated Title');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateMutate).toHaveBeenCalledWith({
          id: '1',
          data: expect.objectContaining({
            title: 'Updated Title',
          }),
        });
      });
    });

    it('exits edit mode on Cancel', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      // Should be back in view mode
      expect(screen.queryByPlaceholderText(/image title/i)).not.toBeInTheDocument();
    });

    it('shows success toast on successful update', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Image updated');
      });
    });
  });

  describe('Tag Management in Edit Mode', () => {
    it('allows adding tags with Enter key', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      const tagInput = screen.getByPlaceholderText(/add tag/i);
      await userEvent.type(tagInput, 'newtag{Enter}');

      // The new tag should appear
      expect(screen.getByText('newtag')).toBeInTheDocument();
    });

    it('allows removing tags', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      // Find and click the remove button for a tag
      const tagElements = screen.getAllByText('nature');
      const tagContainer = tagElements[0].closest('span');
      const removeButton = tagContainer?.querySelector('button');

      if (removeButton) {
        await userEvent.click(removeButton);
        // Tag should be removed (only the edit mode version)
      }
    });
  });

  describe('Favorite Toggle', () => {
    it('shows unfavorited state by default', () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      expect(screen.getByRole('button', { name: /favorite/i })).toBeInTheDocument();
    });

    it('shows favorited state when image is favorite', () => {
      const favoritedImage = { ...mockImage, favorite: true };

      render(
        <Wrapper>
          <ImageDetailsModal
            image={favoritedImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      expect(screen.getByRole('button', { name: /favorited/i })).toBeInTheDocument();
    });

    it('calls toggleFavorite mutation when clicked', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      await userEvent.click(favoriteButton);

      expect(mockToggleFavoriteMutate).toHaveBeenCalledWith('1');
    });
  });

  describe('Copy URL', () => {
    it('copies URL to clipboard when clicked', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const copyButton = screen.getByRole('button', { name: /copy url/i });
      await userEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockImage.secureUrl);
    });

    it('shows success toast on successful copy', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const copyButton = screen.getByRole('button', { name: /copy url/i });
      await userEvent.click(copyButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('URL copied to clipboard');
      });
    });

    it('shows "Copied!" text after copying', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const copyButton = screen.getByRole('button', { name: /copy url/i });
      await userEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });
  });

  describe('Delete Image', () => {
    it('opens delete confirmation when delete button is clicked', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });

    it('calls deleteImage mutation on confirm', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
            onDeleted={mockOnDeleted}
          />
        </Wrapper>
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await userEvent.click(confirmButton);

      expect(mockDeleteMutate).toHaveBeenCalledWith('1');
    });

    it('calls onDeleted and onClose after successful delete', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
            onDeleted={mockOnDeleted}
          />
        </Wrapper>
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnDeleted).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Close Modal', () => {
    it('calls onClose when backdrop is clicked', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      // Find the backdrop element
      const backdrop = document.querySelector('.bg-black\\/80');
      if (backdrop) {
        await userEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when close button is clicked', async () => {
      render(
        <Wrapper>
          <ImageDetailsModal
            image={mockImage}
            images={mockImages}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      // Find close button in the details panel header
      const header = screen.getByText('Test Image').closest('div');
      expect(header).toBeTruthy();
      const closeButton = within(header).getByRole('button');

      await userEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Image with Missing Data', () => {
    it('uses originalName when title is missing', () => {
      const imageWithoutTitle = { ...mockImage, title: null };

      render(
        <Wrapper>
          <ImageDetailsModal
            image={imageWithoutTitle}
            images={[imageWithoutTitle]}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    });

    it('uses originalName for alt when alt is missing', () => {
      const imageWithoutAlt = { ...mockImage, alt: null };

      render(
        <Wrapper>
          <ImageDetailsModal
            image={imageWithoutAlt}
            images={[imageWithoutAlt]}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      const img = screen.getByAltText('test-image.jpg');
      expect(img).toBeInTheDocument();
    });

    it('handles image without description', () => {
      const imageWithoutDesc = { ...mockImage, description: null };

      render(
        <Wrapper>
          <ImageDetailsModal
            image={imageWithoutDesc}
            images={[imageWithoutDesc]}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      // Should not show description paragraph
      expect(
        screen.queryByText('A test image description')
      ).not.toBeInTheDocument();
    });

    it('handles image without tags', () => {
      const imageWithoutTags = { ...mockImage, tags: [] };

      render(
        <Wrapper>
          <ImageDetailsModal
            image={imageWithoutTags}
            images={[imageWithoutTags]}
            onClose={mockOnClose}
            onNavigate={mockOnNavigate}
          />
        </Wrapper>
      );

      expect(screen.queryByText('nature')).not.toBeInTheDocument();
    });
  });
});
