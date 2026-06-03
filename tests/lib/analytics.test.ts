import { describe, it, expect, vi, afterEach } from 'vitest'
import { track } from '@/lib/analytics'

describe('track', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('forwards the event and params to window.gtag', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })

    track('copy_install_command', { source: 'sticky_banner', hook_count: 3, is_default: false })

    expect(gtag).toHaveBeenCalledTimes(1)
    expect(gtag).toHaveBeenCalledWith('event', 'copy_install_command', {
      source: 'sticky_banner',
      hook_count: 3,
      is_default: false,
    })
  })

  it('defaults params to an empty object', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })

    track('toggle_grouping')

    expect(gtag).toHaveBeenCalledWith('event', 'toggle_grouping', {})
  })

  it('is a silent no-op when gtag is not a function (not yet loaded / blocked)', () => {
    vi.stubGlobal('window', {})
    expect(() => track('select_hook', { hook_slug: 'x' })).not.toThrow()
  })

  it('is a silent no-op when window is undefined (SSR)', () => {
    vi.stubGlobal('window', undefined)
    expect(() => track('view_hook_detail', { hook_slug: 'x' })).not.toThrow()
  })
})
