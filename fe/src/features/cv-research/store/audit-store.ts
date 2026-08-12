import { create } from 'zustand'

interface AuditStore {
  selectedFeedbackId: string | null
  setSelectedFeedbackId: (feedbackId: string | null) => void
  openFeedbackPopover: (feedbackId: string) => void
  closeFeedbackPopover: (feedbackId?: string) => void
}

export const useAuditStore = create<AuditStore>((set) => ({
  selectedFeedbackId: null,
  setSelectedFeedbackId: (selectedFeedbackId) => set({ selectedFeedbackId }),
  openFeedbackPopover: (selectedFeedbackId) => set({ selectedFeedbackId }),
  closeFeedbackPopover: (feedbackId) =>
    set((state) => {
      if (feedbackId && state.selectedFeedbackId !== feedbackId) {
        return state
      }

      return { selectedFeedbackId: null }
    }),
}))
