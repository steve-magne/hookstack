import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    // Les worktrees de session (.claude/worktrees/*) sont des copies isolées :
    // leurs tests résoudraient l'alias '@' vers le src/ de ce checkout et
    // planteraient. On les exclut pour que `pnpm test` ne collecte que les
    // tests du checkout courant.
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
  },
})
