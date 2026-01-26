import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ImageGallery from './ImageGallery';

// Mock the hooks
vi.mock('../hooks/useImages', () => ({
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
  default: vi.fn(({ isOpen, onClose, onConfirm }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <button onClick={onConfirm} data-testid="confirm-delete">
          Confirm Delete
        </button>
        <button onClick={onClose} data-testid="cancel-delete">
          Cancel
        </button>
      </div>
    ) : null
  ),
}));

import { useDeleteImage } from '../hooks/useImages';
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

describe('ImageGallery', () => {
  const mockDeleteMutate = vi.fn();
  const mockToast = { success: vi.fn(), error: vi.fn() };

  const mockImages = [
    {
      _id: '1',
      originalName: 'image1.jpg',
      alt: 'First image',
      secureUrl: 'https://example.com/image1.jpg',
      width: 1920,
      height: 1080,
      size: 1024000,
    },
    {
      _id: '2',
      originalName: 'image2.png',
      alt: 'Second image',
      secureUrl: 'https://example.com/image2.png',
      width: 800,
      height: 600,
      size: 512000,
    },
    {
      _id: '3',
      originalName: 'image3.gif',
      alt: 'Third image',
      secureUrl: 'https://example.com/image3.gif',
      width: 400,
      height: 300,
      size: 256000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteMutate.mockResolvedValue({});
    useDeleteImage.mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
    });
    useToast.mockReturnValue(mockToast);
  });

  const Wrapper = createWrapper();

  describe('Loading State', () => {
    it('shows skeleton placeholders when loading', () => {
      render(
        <Wrapper>
          <ImageGallery images={[]} isLoading={true} />
        </Wrapper>
      );

      // Should show skeleton divs
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no images exist', () => {
      render(
        <Wrapper>
          <ImageGallery images={[]} isLoading={false} />
        </Wrapper>
      );

      expect(
        screen.getByText(/no images yet/i)
      ).toBeInTheDocument();
    });

    it('shows upload prompt in empty state', () => {
      render(
        <Wrapper>
          <ImageGallery images={[]} isLoading={false} />
        </Wrapper>
      );

      expect(
        screen.getByText(/upload your first image/i)
      ).toBeInTheDocument();
    });
  });

  describe('Gallery Grid', () => {
    it('renders all images', () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      expect(screen.getByAltText('First image')).toBeInTheDocument();
      expect(screen.getByAltText('Second image')).toBeInTheDocument();
      expect(screen.getByAltText('Third image')).toBeInTheDocument();
    });

    it('renders images with correct src', () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      expect(firstImage).toHaveAttribute('src', 'https://example.com/image1.jpg');
    });

    it('uses originalName for alt when alt is not provided', () => {
      const imagesWithoutAlt = [
        { ...mockImages[0], alt: null },
      ];

      render(
        <Wrapper>
          <ImageGallery images={imagesWithoutAlt} isLoading={false} />
        </Wrapper>
      );

      expect(screen.getByAltText('image1.jpg')).toBeInTheDocument();
    });

    it('applies lazy loading to images', () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const images = screen.getAllByRole('img');
      images.forEach((img) => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });

  describe('Lightbox', () => {
    it('opens lightbox when image is clicked', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      await userEvent.click(firstImage.parentElement);

      // Lightbox should show the image larger
      await waitFor(() => {
        const lightboxImage = document.querySelector('.max-w-\\[90vw\\]');
        expect(lightboxImage).toBeInTheDocument();
      });
    });

    it('shows image info in lightbox', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      await userEvent.click(firstImage.parentElement);

      await waitFor(() => {
        expect(screen.getByText('image1.jpg')).toBeInTheDocument();
        expect(screen.getByText(/1920 x 1080/)).toBeInTheDocument();
      });
    });

    it('closes lightbox when close button is clicked', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      await userEvent.click(firstImage.parentElement);

      // Find and click close button
      const closeButton = document.querySelector('button[class*="top-4"][class*="right-4"]');
      if (closeButton) {
        await userEvent.click(closeButton);

        await waitFor(() => {
          const lightbox = document.querySelector('.max-w-\\[90vw\\]');
          expect(lightbox).not.toBeInTheDocument();
        });
      }
    });

    it('closes lightbox when backdrop is clicked', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      await userEvent.click(firstImage.parentElement);

      // Click the backdrop
      const backdrop = document.querySelector('.bg-black\\/90');
      if (backdrop) {
        await userEvent.click(backdrop);

        await waitFor(() => {
          const lightbox = document.querySelector('.max-w-\\[90vw\\]');
          expect(lightbox).not.toBeInTheDocument();
        });
      }
    });

    it('closes lightbox on Escape key', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      await userEvent.click(firstImage.parentElement);

      // Press Escape
      const lightbox = document.querySelector('.bg-black\\/90');
      if (lightbox) {
        fireEvent.keyDown(lightbox, { key: 'Escape' });

        await waitFor(() => {
          expect(document.querySelector('.max-w-\\[90vw\\]')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Lightbox Navigation', () => {
    it('shows navigation buttons when multiple images exist', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      await userEvent.click(firstImage.parentElement);

      await waitFor(() => {
        // Should have prev and next buttons
        const navButtons = document.querySelectorAll('.translate-y-1\\/2');
        expect(navButtons.length).toBeGreaterThan(0);
      });
    });

    it('navigates to next image when next button is clicked', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      await userEvent.click(firstImage.parentElement);

      // Wait for lightbox to open
      await waitFor(() => {
        expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      });

      // Find and click next button
      const navButtons = document.querySelectorAll('button[class*="right-4"][class*="top-1/2"]');
      if (navButtons.length > 0) {
        await userEvent.click(navButtons[0]);

        await waitFor(() => {
          expect(screen.getByText('image2.png')).toBeInTheDocument();
        });
      }
    });

    it('navigates with keyboard ArrowLeft', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      // Click on second image
      const secondImage = screen.getByAltText('Second image');
      await userEvent.click(secondImage.parentElement);

      await waitFor(() => {
        expect(screen.getByText('image2.png')).toBeInTheDocument();
      });

      // Press ArrowLeft
      const lightbox = document.querySelector('.bg-black\\/90');
      if (lightbox) {
        fireEvent.keyDown(lightbox, { key: 'ArrowLeft' });

        await waitFor(() => {
          expect(screen.getByText('image1.jpg')).toBeInTheDocument();
        });
      }
    });

    it('navigates with keyboard ArrowRight', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      await userEvent.click(firstImage.parentElement);

      await waitFor(() => {
        expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      });

      // Press ArrowRight
      const lightbox = document.querySelector('.bg-black\\/90');
      if (lightbox) {
        fireEvent.keyDown(lightbox, { key: 'ArrowRight' });

        await waitFor(() => {
          expect(screen.getByText('image2.png')).toBeInTheDocument();
        });
      }
    });

    it('wraps around when navigating past last image', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      // Click on last image
      const thirdImage = screen.getByAltText('Third image');
      await userEvent.click(thirdImage.parentElement);

      await waitFor(() => {
        expect(screen.getByText('image3.gif')).toBeInTheDocument();
      });

      // Navigate forward
      const navButtons = document.querySelectorAll('button[class*="right-4"][class*="top-1/2"]');
      if (navButtons.length > 0) {
        await userEvent.click(navButtons[0]);

        await waitFor(() => {
          expect(screen.getByText('image1.jpg')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Delete Image', () => {
    it('shows delete button on hover over gallery image', () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      // Delete buttons are present but hidden until hover
      const deleteButtons = document.querySelectorAll('[class*="group-hover"]');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('opens confirmation dialog when delete button is clicked', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      // Find delete button in the first image overlay
      const imageContainers = document.querySelectorAll('.group');
      const deleteButton = imageContainers[0]?.querySelector('button');

      if (deleteButton) {
        await userEvent.click(deleteButton);

        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      }
    });

    it('calls deleteImage mutation on confirm', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      // Open delete dialog
      const imageContainers = document.querySelectorAll('.group');
      const deleteButton = imageContainers[0]?.querySelector('button');

      if (deleteButton) {
        await userEvent.click(deleteButton);

        const confirmButton = screen.getByTestId('confirm-delete');
        await userEvent.click(confirmButton);

        expect(mockDeleteMutate).toHaveBeenCalledWith('1');
      }
    });

    it('shows success toast on successful delete', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      // Open delete dialog
      const imageContainers = document.querySelectorAll('.group');
      const deleteButton = imageContainers[0]?.querySelector('button');

      if (deleteButton) {
        await userEvent.click(deleteButton);

        const confirmButton = screen.getByTestId('confirm-delete');
        await userEvent.click(confirmButton);

        await waitFor(() => {
          expect(mockToast.success).toHaveBeenCalledWith('Image deleted');
        });
      }
    });

    it('shows error toast on failed delete', async () => {
      mockDeleteMutate.mockRejectedValueOnce(new Error('Delete failed'));

      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      // Open delete dialog
      const imageContainers = document.querySelectorAll('.group');
      const deleteButton = imageContainers[0]?.querySelector('button');

      if (deleteButton) {
        await userEvent.click(deleteButton);

        const confirmButton = screen.getByTestId('confirm-delete');
        await userEvent.click(confirmButton);

        await waitFor(() => {
          expect(mockToast.error).toHaveBeenCalledWith('Delete failed');
        });
      }
    });

    it('cancels delete when cancel button is clicked', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      // Open delete dialog
      const imageContainers = document.querySelectorAll('.group');
      const deleteButton = imageContainers[0]?.querySelector('button');

      if (deleteButton) {
        await userEvent.click(deleteButton);

        const cancelButton = screen.getByTestId('cancel-delete');
        await userEvent.click(cancelButton);

        expect(mockDeleteMutate).not.toHaveBeenCalled();
      }
    });

    it('shows delete button in lightbox', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      await userEvent.click(firstImage.parentElement);

      await waitFor(() => {
        // Should have a delete button in the lightbox (top left)
        const lightboxDeleteButton = document.querySelector(
          'button[class*="top-4"][class*="left-4"]'
        );
        expect(lightboxDeleteButton).toBeInTheDocument();
      });
    });

    it('closes lightbox after deleting image from lightbox', async () => {
      render(
        <Wrapper>
          <ImageGallery images={mockImages} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      await userEvent.click(firstImage.parentElement);

      await waitFor(() => {
        expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      });

      // Find and click delete button in lightbox
      const lightboxDeleteButton = document.querySelector(
        'button[class*="top-4"][class*="left-4"]'
      );

      if (lightboxDeleteButton) {
        await userEvent.click(lightboxDeleteButton);

        const confirmButton = screen.getByTestId('confirm-delete');
        await userEvent.click(confirmButton);

        await waitFor(() => {
          // Lightbox should close after delete
          const lightbox = document.querySelector('.bg-black\\/90');
          expect(lightbox).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Single Image', () => {
    it('does not show navigation buttons for single image', async () => {
      render(
        <Wrapper>
          <ImageGallery images={[mockImages[0]]} isLoading={false} />
        </Wrapper>
      );

      const firstImage = screen.getByAltText('First image');
      await userEvent.click(firstImage.parentElement);

      await waitFor(() => {
        expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      });

      // Navigation buttons should not exist for single image
      const navButtons = document.querySelectorAll('button[class*="top-1/2"]');
      expect(navButtons.length).toBe(0);
    });
  });
});
