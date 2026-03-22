import { create } from 'zustand';

export const useUiStore = create((set) => ({
  // State
  selectedProduct: null,
  selectedVersion: null,
  currentEco: null,
  sidebarCollapsed: false,

  // Actions
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setSelectedVersion: (version) => set({ selectedVersion: version }),
  setCurrentEco: (eco) => set({ currentEco: eco }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
