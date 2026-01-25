import { describe, it, expect } from 'vitest';
import lifeAreasReducer, {
  clearLifeAreas,
  selectLifeArea,
  clearSelectedLifeArea,
  updateLifeAreaInStore,
  addLifeAreaToStore,
  removeLifeAreaFromStore,
  reorderLifeAreasInStore,
  fetchLifeAreas,
  selectLifeAreas,
  selectActiveLifeAreas,
  selectArchivedLifeAreas,
  selectDefaultLifeArea,
  selectSelectedLifeAreaId,
  selectSelectedLifeArea,
  selectLifeAreasLoading,
  selectLifeAreaById,
} from './lifeAreasSlice';

describe('lifeAreasSlice', () => {
  const initialState = {
    items: [],
    selectedId: null,
    isLoading: false,
    error: null,
    lastFetched: null,
  };

  // Sample life area data for testing
  const sampleLifeAreas = [
    { _id: '1', name: 'Work', color: '#3b82f6', isArchived: false, isDefault: false },
    { _id: '2', name: 'Personal', color: '#10b981', isArchived: false, isDefault: true },
    { _id: '3', name: 'Archive', color: '#ef4444', isArchived: true, isDefault: false },
  ];

  describe('reducers', () => {
    it('should return initial state', () => {
      expect(lifeAreasReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    describe('clearLifeAreas', () => {
      it('should clear all life areas and selection', () => {
        const stateWithItems = {
          items: sampleLifeAreas,
          selectedId: '1',
          isLoading: false,
          error: null,
          lastFetched: Date.now(),
        };

        const state = lifeAreasReducer(stateWithItems, clearLifeAreas());

        expect(state.items).toEqual([]);
        expect(state.selectedId).toBe(null);
        expect(state.lastFetched).toBe(null);
      });
    });

    describe('selectLifeArea', () => {
      it('should set selectedId to the payload', () => {
        const state = lifeAreasReducer(initialState, selectLifeArea('1'));

        expect(state.selectedId).toBe('1');
      });

      it('should update selectedId when changing selection', () => {
        const stateWithSelection = {
          ...initialState,
          selectedId: '1',
        };

        const state = lifeAreasReducer(stateWithSelection, selectLifeArea('2'));

        expect(state.selectedId).toBe('2');
      });
    });

    describe('clearSelectedLifeArea', () => {
      it('should clear selectedId', () => {
        const stateWithSelection = {
          ...initialState,
          selectedId: '1',
        };

        const state = lifeAreasReducer(stateWithSelection, clearSelectedLifeArea());

        expect(state.selectedId).toBe(null);
      });

      it('should handle clearing when nothing is selected', () => {
        const state = lifeAreasReducer(initialState, clearSelectedLifeArea());

        expect(state.selectedId).toBe(null);
      });
    });

    describe('updateLifeAreaInStore', () => {
      it('should update an existing life area', () => {
        const stateWithItems = {
          ...initialState,
          items: sampleLifeAreas,
        };

        const updatedArea = { _id: '1', name: 'Updated Work', color: '#ff0000', isArchived: false, isDefault: false };
        const state = lifeAreasReducer(stateWithItems, updateLifeAreaInStore(updatedArea));

        expect(state.items[0].name).toBe('Updated Work');
        expect(state.items[0].color).toBe('#ff0000');
      });

      it('should not modify state if life area not found', () => {
        const stateWithItems = {
          ...initialState,
          items: sampleLifeAreas,
        };

        const nonExistentArea = { _id: '999', name: 'Not Found', color: '#000' };
        const state = lifeAreasReducer(stateWithItems, updateLifeAreaInStore(nonExistentArea));

        expect(state.items).toEqual(sampleLifeAreas);
      });
    });

    describe('addLifeAreaToStore', () => {
      it('should add a new life area to items', () => {
        const newArea = { _id: '4', name: 'Health', color: '#22c55e', isArchived: false, isDefault: false };
        const state = lifeAreasReducer(initialState, addLifeAreaToStore(newArea));

        expect(state.items).toHaveLength(1);
        expect(state.items[0]).toEqual(newArea);
      });

      it('should append to existing items', () => {
        const stateWithItems = {
          ...initialState,
          items: [sampleLifeAreas[0]],
        };

        const newArea = { _id: '4', name: 'Health', color: '#22c55e', isArchived: false, isDefault: false };
        const state = lifeAreasReducer(stateWithItems, addLifeAreaToStore(newArea));

        expect(state.items).toHaveLength(2);
        expect(state.items[1]).toEqual(newArea);
      });
    });

    describe('removeLifeAreaFromStore', () => {
      it('should remove a life area by id', () => {
        const stateWithItems = {
          ...initialState,
          items: sampleLifeAreas,
        };

        const state = lifeAreasReducer(stateWithItems, removeLifeAreaFromStore('1'));

        expect(state.items).toHaveLength(2);
        expect(state.items.find(la => la._id === '1')).toBeUndefined();
      });

      it('should clear selectedId if removed life area was selected', () => {
        const stateWithSelection = {
          ...initialState,
          items: sampleLifeAreas,
          selectedId: '1',
        };

        const state = lifeAreasReducer(stateWithSelection, removeLifeAreaFromStore('1'));

        expect(state.selectedId).toBe(null);
      });

      it('should not clear selectedId if different life area was removed', () => {
        const stateWithSelection = {
          ...initialState,
          items: sampleLifeAreas,
          selectedId: '1',
        };

        const state = lifeAreasReducer(stateWithSelection, removeLifeAreaFromStore('2'));

        expect(state.selectedId).toBe('1');
      });

      it('should handle removing non-existent id', () => {
        const stateWithItems = {
          ...initialState,
          items: sampleLifeAreas,
        };

        const state = lifeAreasReducer(stateWithItems, removeLifeAreaFromStore('999'));

        expect(state.items).toHaveLength(3);
      });
    });

    describe('reorderLifeAreasInStore', () => {
      it('should replace items with reordered array', () => {
        const stateWithItems = {
          ...initialState,
          items: sampleLifeAreas,
        };

        const reordered = [sampleLifeAreas[2], sampleLifeAreas[0], sampleLifeAreas[1]];
        const state = lifeAreasReducer(stateWithItems, reorderLifeAreasInStore(reordered));

        expect(state.items).toEqual(reordered);
        expect(state.items[0]._id).toBe('3');
        expect(state.items[1]._id).toBe('1');
        expect(state.items[2]._id).toBe('2');
      });

      it('should handle empty array', () => {
        const stateWithItems = {
          ...initialState,
          items: sampleLifeAreas,
        };

        const state = lifeAreasReducer(stateWithItems, reorderLifeAreasInStore([]));

        expect(state.items).toEqual([]);
      });
    });
  });

  describe('async thunks', () => {
    describe('fetchLifeAreas', () => {
      it('should handle pending state', () => {
        const state = lifeAreasReducer(initialState, { type: fetchLifeAreas.pending.type });

        expect(state.isLoading).toBe(true);
        expect(state.error).toBe(null);
      });

      it('should handle fulfilled state', () => {
        const state = lifeAreasReducer(initialState, {
          type: fetchLifeAreas.fulfilled.type,
          payload: sampleLifeAreas,
        });

        expect(state.isLoading).toBe(false);
        expect(state.items).toEqual(sampleLifeAreas);
        expect(state.lastFetched).not.toBe(null);
      });

      it('should handle rejected state', () => {
        const state = lifeAreasReducer(initialState, {
          type: fetchLifeAreas.rejected.type,
          payload: 'Network error',
        });

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Network error');
      });

      it('should clear previous error on pending', () => {
        const stateWithError = {
          ...initialState,
          error: 'Previous error',
        };

        const state = lifeAreasReducer(stateWithError, { type: fetchLifeAreas.pending.type });

        expect(state.error).toBe(null);
      });
    });
  });

  describe('selectors', () => {
    const stateWithData = {
      lifeAreas: {
        items: sampleLifeAreas,
        selectedId: '1',
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
      },
    };

    it('selectLifeAreas should return all items', () => {
      const result = selectLifeAreas(stateWithData);

      expect(result).toEqual(sampleLifeAreas);
    });

    it('selectActiveLifeAreas should return non-archived items', () => {
      const result = selectActiveLifeAreas(stateWithData);

      expect(result).toHaveLength(2);
      expect(result.every(la => !la.isArchived)).toBe(true);
    });

    it('selectArchivedLifeAreas should return archived items', () => {
      const result = selectArchivedLifeAreas(stateWithData);

      expect(result).toHaveLength(1);
      expect(result[0].isArchived).toBe(true);
    });

    it('selectDefaultLifeArea should return the default life area', () => {
      const result = selectDefaultLifeArea(stateWithData);

      expect(result._id).toBe('2');
      expect(result.isDefault).toBe(true);
    });

    it('selectDefaultLifeArea should return undefined if no default', () => {
      const stateNoDefault = {
        lifeAreas: {
          items: [
            { _id: '1', name: 'Work', isDefault: false },
          ],
          selectedId: null,
          isLoading: false,
          error: null,
          lastFetched: null,
        },
      };

      const result = selectDefaultLifeArea(stateNoDefault);

      expect(result).toBeUndefined();
    });

    it('selectSelectedLifeAreaId should return selectedId', () => {
      const result = selectSelectedLifeAreaId(stateWithData);

      expect(result).toBe('1');
    });

    it('selectSelectedLifeArea should return the selected life area object', () => {
      const result = selectSelectedLifeArea(stateWithData);

      expect(result._id).toBe('1');
      expect(result.name).toBe('Work');
    });

    it('selectSelectedLifeArea should return undefined if nothing selected', () => {
      const stateNoSelection = {
        lifeAreas: {
          ...stateWithData.lifeAreas,
          selectedId: null,
        },
      };

      const result = selectSelectedLifeArea(stateNoSelection);

      expect(result).toBeUndefined();
    });

    it('selectLifeAreasLoading should return isLoading state', () => {
      const result = selectLifeAreasLoading(stateWithData);

      expect(result).toBe(false);
    });

    it('selectLifeAreaById should return life area by id', () => {
      const selector = selectLifeAreaById('2');
      const result = selector(stateWithData);

      expect(result._id).toBe('2');
      expect(result.name).toBe('Personal');
    });

    it('selectLifeAreaById should return undefined for non-existent id', () => {
      const selector = selectLifeAreaById('999');
      const result = selector(stateWithData);

      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty items array', () => {
      const emptyState = {
        lifeAreas: {
          items: [],
          selectedId: null,
          isLoading: false,
          error: null,
          lastFetched: null,
        },
      };

      expect(selectActiveLifeAreas(emptyState)).toEqual([]);
      expect(selectArchivedLifeAreas(emptyState)).toEqual([]);
      expect(selectDefaultLifeArea(emptyState)).toBeUndefined();
    });

    it('should handle null selectedId with selectSelectedLifeArea', () => {
      const stateWithNullSelection = {
        lifeAreas: {
          items: sampleLifeAreas,
          selectedId: null,
          isLoading: false,
          error: null,
          lastFetched: null,
        },
      };

      expect(selectSelectedLifeArea(stateWithNullSelection)).toBeUndefined();
    });
  });
});
