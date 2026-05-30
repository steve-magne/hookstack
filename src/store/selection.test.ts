import { describe, it, expect, beforeEach } from 'vitest'
import { useSelection } from './selection'

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
  it('vide la sélection', () => {
    useSelection.getState().add('a')
    useSelection.getState().add('b')
    useSelection.getState().clear()
    expect(useSelection.getState().selected).toHaveLength(0)
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
