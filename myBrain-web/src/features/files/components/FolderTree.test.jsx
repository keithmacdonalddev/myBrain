import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FolderTree from './FolderTree';

// Mock folder tree data
const mockTree = [
  {
    _id: 'folder-1',
    name: 'Documents',
    color: '#3B82F6',
    stats: { fileCount: 15 },
    children: [
      {
        _id: 'folder-1-1',
        name: 'Work',
        stats: { fileCount: 5 },
        children: [
          {
            _id: 'folder-1-1-1',
            name: 'Projects',
            stats: { fileCount: 2 },
            children: [],
          },
        ],
      },
      {
        _id: 'folder-1-2',
        name: 'Personal',
        stats: { fileCount: 10 },
        children: [],
      },
    ],
  },
  {
    _id: 'folder-2',
    name: 'Images',
    color: '#10B981',
    stats: { fileCount: 42 },
    children: [],
  },
  {
    _id: 'folder-3',
    name: 'Empty Folder',
    children: [],
  },
];

describe('FolderTree', () => {
  const mockOnSelect = vi.fn();
  const mockOnCreateFolder = vi.fn();
  const mockOnCreateSubfolder = vi.fn();
  const mockOnRename = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders quick access section', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('All Files')).toBeInTheDocument();
      expect(screen.getByText('Favorites')).toBeInTheDocument();
      expect(screen.getByText('Recent')).toBeInTheDocument();
      expect(screen.getByText('Trash')).toBeInTheDocument();
    });

    it('renders folder list header with new folder button', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          onCreateFolder={mockOnCreateFolder}
        />
      );

      expect(screen.getByText('Folders')).toBeInTheDocument();
      expect(screen.getByTitle('New Folder')).toBeInTheDocument();
    });

    it('renders top-level folders', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Empty Folder')).toBeInTheDocument();
    });

    it('shows file count badges', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('15')).toBeInTheDocument(); // Documents
      expect(screen.getByText('42')).toBeInTheDocument(); // Images
    });

    it('shows loading state', () => {
      render(
        <FolderTree
          tree={[]}
          isLoading={true}
          onSelect={mockOnSelect}
        />
      );

      // Should show loading skeletons
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('shows empty state when no folders', () => {
      render(
        <FolderTree
          tree={[]}
          onSelect={mockOnSelect}
          onCreateFolder={mockOnCreateFolder}
        />
      );

      expect(screen.getByText('No folders yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first folder')).toBeInTheDocument();
    });
  });

  describe('quick access selection', () => {
    it('selects All Files by default', () => {
      render(
        <FolderTree
          tree={mockTree}
          selectedId={null}
          onSelect={mockOnSelect}
        />
      );

      const allFilesItem = screen.getByText('All Files').closest('button');
      expect(allFilesItem).toHaveClass('bg-primary/10');
    });

    it('calls onSelect with null when All Files is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          selectedId="folder-1"
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('All Files'));

      expect(mockOnSelect).toHaveBeenCalledWith(null);
    });

    it('calls onSelect with "favorites" when Favorites is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('Favorites'));

      expect(mockOnSelect).toHaveBeenCalledWith('favorites');
    });

    it('calls onSelect with "recent" when Recent is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('Recent'));

      expect(mockOnSelect).toHaveBeenCalledWith('recent');
    });

    it('calls onSelect with "trash" when Trash is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('Trash'));

      expect(mockOnSelect).toHaveBeenCalledWith('trash');
    });

    it('highlights selected quick access item', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          quickAccess={{ view: 'favorites' }}
        />
      );

      const favoritesItem = screen.getByText('Favorites').closest('button');
      expect(favoritesItem).toHaveClass('bg-primary/10');
    });

    it('shows favorites count when provided', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          quickAccess={{ favoritesCount: 5 }}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows trash count when provided', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          quickAccess={{ trashCount: 3 }}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('hides Favorites when showFavorites is false', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          quickAccess={{ showFavorites: false }}
        />
      );

      expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
    });

    it('hides Recent when showRecent is false', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          quickAccess={{ showRecent: false }}
        />
      );

      expect(screen.queryByText('Recent')).not.toBeInTheDocument();
    });

    it('hides Trash when showTrash is false', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          quickAccess={{ showTrash: false }}
        />
      );

      expect(screen.queryByText('Trash')).not.toBeInTheDocument();
    });
  });

  describe('folder selection', () => {
    it('calls onSelect when folder is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('Documents'));

      expect(mockOnSelect).toHaveBeenCalledWith('folder-1');
    });

    it('highlights selected folder', () => {
      render(
        <FolderTree
          tree={mockTree}
          selectedId="folder-1"
          onSelect={mockOnSelect}
        />
      );

      const documentsFolder = screen.getByText('Documents').closest('.group');
      expect(documentsFolder).toHaveClass('bg-primary/10');
    });

    it('selects nested folder after expanding parent', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      // First expand Documents folder
      const documentsRow = screen.getByText('Documents').closest('.group');
      const expandButton = documentsRow.querySelector('button');
      await user.click(expandButton);

      // Then click on Work subfolder
      await user.click(screen.getByText('Work'));

      expect(mockOnSelect).toHaveBeenCalledWith('folder-1-1');
    });
  });

  describe('folder expansion', () => {
    it('expands folder when expand button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      // Children should not be visible initially
      expect(screen.queryByText('Work')).not.toBeInTheDocument();

      // Click expand button
      const documentsRow = screen.getByText('Documents').closest('.group');
      const expandButton = documentsRow.querySelector('button');
      await user.click(expandButton);

      // Children should now be visible
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    it('collapses folder when collapse button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      const documentsRow = screen.getByText('Documents').closest('.group');
      const expandButton = documentsRow.querySelector('button');

      // Expand
      await user.click(expandButton);
      expect(screen.getByText('Work')).toBeInTheDocument();

      // Collapse
      await user.click(expandButton);
      expect(screen.queryByText('Work')).not.toBeInTheDocument();
    });

    it('hides expand button for folders without children', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      // Images folder has no children
      const imagesRow = screen.getByText('Images').closest('.group');
      const expandButton = imagesRow.querySelector('button');
      expect(expandButton).toHaveClass('invisible');
    });

    it('supports deep nesting', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      // Expand Documents
      const documentsRow = screen.getByText('Documents').closest('.group');
      await user.click(documentsRow.querySelector('button'));

      // Expand Work
      const workRow = screen.getByText('Work').closest('.group');
      await user.click(workRow.querySelector('button'));

      // Projects should be visible
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('auto-expands parent folders when child is selected', () => {
      render(
        <FolderTree
          tree={mockTree}
          selectedId="folder-1-1-1" // Projects folder
          onSelect={mockOnSelect}
        />
      );

      // Should auto-expand parent folders
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  describe('folder actions', () => {
    it('calls onCreateFolder when new folder button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          onCreateFolder={mockOnCreateFolder}
        />
      );

      await user.click(screen.getByTitle('New Folder'));

      expect(mockOnCreateFolder).toHaveBeenCalled();
    });

    it('calls onCreateFolder from empty state', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={[]}
          onSelect={mockOnSelect}
          onCreateFolder={mockOnCreateFolder}
        />
      );

      await user.click(screen.getByText('Create your first folder'));

      expect(mockOnCreateFolder).toHaveBeenCalled();
    });

    it('shows context menu on folder menu button click', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          onCreateSubfolder={mockOnCreateSubfolder}
          onRename={mockOnRename}
          onDelete={mockOnDelete}
        />
      );

      // Find the Documents folder row
      const documentsRow = screen.getByText('Documents').closest('.group');
      // Find the menu button (MoreHorizontal icon)
      const menuButton = documentsRow.querySelector('button:last-child button, .relative button');

      // The menu button is hidden by default and shown on hover
      // We need to trigger it differently
      const allButtons = documentsRow.querySelectorAll('button');
      // The last button should be the menu button
      const menuBtn = allButtons[allButtons.length - 1];

      await user.click(menuBtn);

      // Menu items should appear
      await waitFor(() => {
        expect(screen.getByText('New Subfolder')).toBeInTheDocument();
        expect(screen.getByText('Rename')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });

    it('calls onCreateSubfolder with folder id', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          onCreateSubfolder={mockOnCreateSubfolder}
          onRename={mockOnRename}
          onDelete={mockOnDelete}
        />
      );

      const documentsRow = screen.getByText('Documents').closest('.group');
      const allButtons = documentsRow.querySelectorAll('button');
      const menuBtn = allButtons[allButtons.length - 1];

      await user.click(menuBtn);
      await user.click(screen.getByText('New Subfolder'));

      expect(mockOnCreateSubfolder).toHaveBeenCalledWith('folder-1');
    });

    it('calls onRename with folder object', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          onCreateSubfolder={mockOnCreateSubfolder}
          onRename={mockOnRename}
          onDelete={mockOnDelete}
        />
      );

      const documentsRow = screen.getByText('Documents').closest('.group');
      const allButtons = documentsRow.querySelectorAll('button');
      const menuBtn = allButtons[allButtons.length - 1];

      await user.click(menuBtn);
      await user.click(screen.getByText('Rename'));

      expect(mockOnRename).toHaveBeenCalledWith(expect.objectContaining({
        _id: 'folder-1',
        name: 'Documents',
      }));
    });

    it('calls onDelete with folder object', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          onCreateSubfolder={mockOnCreateSubfolder}
          onRename={mockOnRename}
          onDelete={mockOnDelete}
        />
      );

      const documentsRow = screen.getByText('Documents').closest('.group');
      const allButtons = documentsRow.querySelectorAll('button');
      const menuBtn = allButtons[allButtons.length - 1];

      await user.click(menuBtn);
      await user.click(screen.getByText('Delete'));

      expect(mockOnDelete).toHaveBeenCalledWith(expect.objectContaining({
        _id: 'folder-1',
        name: 'Documents',
      }));
    });

    it('closes menu when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          onCreateSubfolder={mockOnCreateSubfolder}
          onRename={mockOnRename}
          onDelete={mockOnDelete}
        />
      );

      const documentsRow = screen.getByText('Documents').closest('.group');
      const allButtons = documentsRow.querySelectorAll('button');
      const menuBtn = allButtons[allButtons.length - 1];

      await user.click(menuBtn);
      expect(screen.getByText('New Subfolder')).toBeInTheDocument();

      // Click on the overlay that covers the screen when menu is open
      const overlay = document.querySelector('.fixed.inset-0.z-10');
      if (overlay) {
        await user.click(overlay);
      } else {
        // Fallback: click outside the menu on the tree container
        await user.click(screen.getByText('Folders'));
      }

      await waitFor(() => {
        expect(screen.queryByText('New Subfolder')).not.toBeInTheDocument();
      });
    });
  });

  describe('storage indicator', () => {
    it('shows storage usage when provided', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          quickAccess={{
            storageUsed: 536870912, // 512 MB
            storageLimit: 1073741824, // 1 GB
          }}
        />
      );

      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('512 MB / 1 GB')).toBeInTheDocument();
    });

    it('does not show storage when not provided', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByText('Storage')).not.toBeInTheDocument();
    });

    it('shows yellow bar when storage > 70%', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          quickAccess={{
            storageUsed: 805306368, // 768 MB (75%)
            storageLimit: 1073741824, // 1 GB
          }}
        />
      );

      const progressBar = document.querySelector('.bg-yellow-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('shows red bar when storage > 90%', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          quickAccess={{
            storageUsed: 1020054732, // ~95% of 1 GB
            storageLimit: 1073741824, // 1 GB
          }}
        />
      );

      const progressBar = document.querySelector('.bg-red-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('shows Unlimited for unlimited storage', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
          quickAccess={{
            storageUsed: 536870912,
            storageLimit: -1,
          }}
        />
      );

      expect(screen.getByText(/Unlimited/)).toBeInTheDocument();
    });
  });

  describe('folder colors', () => {
    it('applies custom color to folder icon', () => {
      render(
        <FolderTree
          tree={mockTree}
          onSelect={mockOnSelect}
        />
      );

      const documentsRow = screen.getByText('Documents').closest('.group');
      // The folder icon is the second svg (first is expand/collapse chevron)
      const folderIcons = documentsRow.querySelectorAll('svg');
      const folderIcon = folderIcons[1]; // Folder icon is after the chevron

      // Check that the color style is applied (either via style or computed)
      expect(folderIcon).toHaveAttribute('style');
      expect(folderIcon.style.color).toBe('rgb(59, 130, 246)'); // #3B82F6 in RGB
    });
  });
});
