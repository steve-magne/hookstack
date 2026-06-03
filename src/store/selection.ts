import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SelectionState {
  selected: string[]
  mustInitialized: boolean
  seenMustSlugs: string[]
  // Non-persisté — repart à false à chaque nouvelle session
  sessionTouched: boolean
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
      sessionTouched: false,
      toggle: (slug) =>
        set((s) => ({
          sessionTouched: true,
          selected: s.selected.includes(slug)
            ? s.selected.filter((x) => x !== slug)
            : [...s.selected, slug],
        })),
      add: (slug) =>
        set((s) => ({
          sessionTouched: true,
          selected: s.selected.includes(slug) ? s.selected : [...s.selected, slug],
        })),
      remove: (slug) =>
        set((s) => ({
          sessionTouched: true,
          selected: s.selected.filter((x) => x !== slug),
        })),
      clear: () => set({ selected: [], mustInitialized: false, seenMustSlugs: [], sessionTouched: false }),
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
            // sessionTouched inchangé — initMust n'est pas une action utilisateur
          }
        }),
    }),
    {
      name: 'claudehooks-selection',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      // sessionTouched exclu de la persistance → repart toujours à false au chargement
      partialize: (state) => ({
        selected: state.selected,
        mustInitialized: state.mustInitialized,
        seenMustSlugs: state.seenMustSlugs,
      }),
    }
  )
)
