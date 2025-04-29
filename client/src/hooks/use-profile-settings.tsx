import { create } from 'zustand';

interface ProfileSettingsState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useProfileSettings = create<ProfileSettingsState>((set) => ({
  activeTab: 'general',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));