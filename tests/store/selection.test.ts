import { describe, it, expect, beforeEach } from 'vitest'
import { useSelection } from '@/store/selection'

beforeEach(() => {
  useSelection.getState().clear()
})

describe('useSelection — toggle', () => {
  it('ajoute un slug absent', () => {
    useSelection.getState().toggle('foo')
    expect(useSelection.getState().selected).toContain('foo')
  })

  it('retire un slug déjà présent', () => {
    useSelection.getState().toggle('foo')
    useSelection.getState().toggle('foo')
    expect(useSelection.getState().selected).not.toContain('foo')
  })
})

describe('useSelection — add', () => {
  it('ajoute un slug absent', () => {
    useSelection.getState().add('bar')
    expect(useSelection.getState().selected).toContain('bar')
  })

  it('ne duplique pas un slug déjà présent', () => {
    useSelection.getState().add('bar')
    useSelection.getState().add('bar')
    expect(useSelection.getState().selected.filter((s) => s === 'bar')).toHaveLength(1)
  })
})

describe('useSelection — remove', () => {
  it('retire le slug ciblé', () => {
    useSelection.getState().add('baz')
    useSelection.getState().remove('baz')
    expect(useSelection.getState().selected).not.toContain('baz')
  })

  it('ne plante pas si le slug est absent', () => {
    expect(() => useSelection.getState().remove('inexistant')).not.toThrow()
  })
})

describe('useSelection — clear', () => {
  it('vide la sélection et réinitialise mustInitialized + seenMustSlugs', () => {
    useSelection.getState().add('a')
    useSelection.getState().add('b')
    useSelection.getState().initMust(['a', 'b'])
    useSelection.getState().clear()
    const s = useSelection.getState()
    expect(s.selected).toHaveLength(0)
    expect(s.mustInitialized).toBe(false)
    expect(s.seenMustSlugs).toHaveLength(0)
  })
})

describe('useSelection — has', () => {
  it('renvoie true si le slug est sélectionné', () => {
    useSelection.getState().add('x')
    expect(useSelection.getState().has('x')).toBe(true)
  })

  it('renvoie false si le slug est absent', () => {
    expect(useSelection.getState().has('y')).toBe(false)
  })
})

describe('useSelection — initMust', () => {
  it('première visite : sélectionne tous les must-slugs', () => {
    useSelection.getState().initMust(['a', 'b', 'c'])
    const s = useSelection.getState()
    expect(s.selected).toEqual(expect.arrayContaining(['a', 'b', 'c']))
    expect(s.mustInitialized).toBe(true)
    expect(s.seenMustSlugs).toEqual(expect.arrayContaining(['a', 'b', 'c']))
  })

  it('deuxième visite : re-sélectionne les must-slugs décrochés (is_must = toujours présent)', () => {
    useSelection.getState().initMust(['a', 'b'])
    useSelection.getState().toggle('a') // l'utilisateur décoche 'a' en session
    useSelection.getState().initMust(['a', 'b']) // rechargement / nouvelle visite
    // is_must = "Essential" → re-sélectionné même après déselection manuelle
    expect(useSelection.getState().selected).toContain('a')
    expect(useSelection.getState().selected).toContain('b')
  })

  it('migration : ajoute les nouveaux must-slugs à un utilisateur déjà initialisé', () => {
    // Simule l'ancien état : initialisé avec 2 slugs, sans seenMustSlugs (migration localStorage)
    useSelection.setState({ selected: ['a', 'b'], mustInitialized: true, seenMustSlugs: [] })
    // Le registre ajoute 'c' comme nouveau must
    useSelection.getState().initMust(['a', 'b', 'c'])
    expect(useSelection.getState().selected).toContain('c')
    expect(useSelection.getState().selected).toContain('a')
    expect(useSelection.getState().selected).toContain('b')
  })

  it('ne duplique pas un must-slug déjà dans selected', () => {
    useSelection.getState().add('a')
    useSelection.getState().initMust(['a', 'b'])
    const occurrences = useSelection.getState().selected.filter((s) => s === 'a')
    expect(occurrences).toHaveLength(1)
  })
})
