import { describe, it, expect, beforeEach } from 'vitest'
import { useSelection } from './selection'

beforeEach(() => {
  useSelection.setState({ selected: [] })
})

describe('useSelection store', () => {
  it('état initial : aucun slug sélectionné', () => {
    expect(useSelection.getState().selected).toEqual([])
  })

  describe('toggle', () => {
    it('ajoute un slug absent', () => {
      useSelection.getState().toggle('hook-a')
      expect(useSelection.getState().selected).toContain('hook-a')
    })

    it('retire un slug déjà présent', () => {
      useSelection.setState({ selected: ['hook-a'] })
      useSelection.getState().toggle('hook-a')
      expect(useSelection.getState().selected).not.toContain('hook-a')
    })

    it('ne modifie pas les autres slugs lors du retrait', () => {
      useSelection.setState({ selected: ['hook-a', 'hook-b'] })
      useSelection.getState().toggle('hook-a')
      expect(useSelection.getState().selected).toContain('hook-b')
    })
  })

  describe('add', () => {
    it('ajoute un slug absent', () => {
      useSelection.getState().add('hook-x')
      expect(useSelection.getState().selected).toContain('hook-x')
    })

    it("est idempotent — n'ajoute pas en double", () => {
      useSelection.getState().add('hook-x')
      useSelection.getState().add('hook-x')
      expect(useSelection.getState().selected.filter((s) => s === 'hook-x')).toHaveLength(1)
    })
  })

  describe('remove', () => {
    it('retire le slug spécifié', () => {
      useSelection.setState({ selected: ['hook-a', 'hook-b'] })
      useSelection.getState().remove('hook-a')
      expect(useSelection.getState().selected).not.toContain('hook-a')
      expect(useSelection.getState().selected).toContain('hook-b')
    })

    it("ne lève pas d'erreur si le slug est absent", () => {
      expect(() => useSelection.getState().remove('inexistant')).not.toThrow()
    })
  })

  describe('clear', () => {
    it('vide la sélection', () => {
      useSelection.setState({ selected: ['hook-a', 'hook-b', 'hook-c'] })
      useSelection.getState().clear()
      expect(useSelection.getState().selected).toHaveLength(0)
    })
  })

  describe('has', () => {
    it('retourne true si le slug est sélectionné', () => {
      useSelection.setState({ selected: ['hook-a'] })
      expect(useSelection.getState().has('hook-a')).toBe(true)
    })

    it('retourne false si le slug est absent', () => {
      expect(useSelection.getState().has('hook-z')).toBe(false)
    })
  })
})
