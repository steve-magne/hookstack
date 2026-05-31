import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SelectionState {
  selected: string[]
  mustInitialized: boolean
  toggle: (slug: string) => void
  add: (slug: string) => void
  remove: (slug: string) => void
  clear: () => void
  has: (slug: string) => boolean
  initMust: (slugs: string[]) => void
}

export const useSelection = create<SelectionState>()(
  persist(
    (set, get) => ({
      selected: [],
      mustInitialized: false,
      toggle: (slug) =>
        set((s) => ({
          selected: s.selected.includes(slug)
            ? s.selected.filter((x) => x !== slug)
            : [...s.selected, slug],
        })),
      add: (slug) =>
        set((s) => ({
          selected: s.selected.includes(slug) ? s.selected : [...s.selected, slug],
        })),
      remove: (slug) => set((s) => ({ selected: s.selected.filter((x) => x !== slug) })),
      clear: () => set({ selected: [], mustInitialized: false }),
      has: (slug) => get().selected.includes(slug),
      initMust: (slugs) =>
        set((s) => {
          if (s.mustInitialized && s.selected.length > 0) return s
          const added = slugs.filter((sl) => !s.selected.includes(sl))
          return {
            mustInitialized: true,
            selected: [...s.selected, ...added],
          }
        }),
    }),
    {
      name: 'claudehooks-selection',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
)
