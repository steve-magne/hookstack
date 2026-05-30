import '@testing-library/jest-dom'

// localStorage mock pour les middlewares Zustand persist dans Node/vitest
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value
  },
  removeItem: (key: string) => {
    delete storage[key]
  },
  clear: () => {
    for (const key of Object.keys(storage)) delete storage[key]
  },
  length: 0,
  key: (_index: number) => null,
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})
