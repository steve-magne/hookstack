import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SelectionState {
  selected: string[]
  mustInitialized: boolean
  seenMustSlugs: string[]
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
      seenMustSlugs: [],
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
      clear: () => set({ selected: [], mustInitialized: false, seenMustSlugs: [] }),
      has: (slug) => get().selected.includes(slug),
      initMust: (slugs) =>
        set((s) => {
          // Slugs jamais vus = ajouts au registre depuis la dernière visite
          const newSlugs = slugs.filter((sl) => !s.seenMustSlugs.includes(sl))
          const toAdd = newSlugs.filter((sl) => !s.selected.includes(sl))
          if (newSlugs.length === 0 && s.mustInitialized) return s
          return {
            mustInitialized: true,
            seenMustSlugs: slugs,
            selected: [...s.selected, ...toAdd],
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
