'use client'

/**
 * XrayOverlay — Builder/Admin "X-ray" of the live page.
 *
 * Reads the genome-generated provenance bundle (/screen-map-provenance.json:
 * per route → its UC, components, API→backend calls, and each test-id element's
 * rendering component) and, when enabled, lets a builder hover any element on
 * the running site to see what it is and what it calls. No runtime genome
 * dependency — the JSON is bundled at build time and refreshed by the genome
 * exporter (scripts/export-screen-provenance.js).
 *
 * Gate: Admin only — verified server-side via the admin_session cookie
 * (/api/admin/whoami). Invisible to everyone else. The pill defaults to off;
 * an admin clicks it to X-ray the page. Data is non-sensitive (component names).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

type El = { selector: string; component: string | null; source_file: string | null; uc: string | null }
type ApiCall = { api: string; route_file: string | null; backend: string[] }
type Route = { uc: string | null; uj: string | null; prd: string | null; components: string[]; api_calls: ApiCall[]; elements: El[] }
type Provenance = { generated_for: string; routes: Record<string, Route> }

const base = (p?: string | null) => (p ? p.split('/').pop() || p : '')

// Match a live pathname to a catalogued route key, allowing dynamic [id] segments.
function matchRoute(pathname: string, routes: Record<string, Route>): string | null {
  if (routes[pathname]) return pathname
  const segs = pathname.replace(/\/$/, '').split('/').filter(Boolean)
  for (const key of Object.keys(routes)) {
    const ks = key.replace(/\/$/, '').split('/').filter(Boolean)
    if (ks.length !== segs.length) continue
    if (ks.every((k, i) => k.startsWith('[') || k === segs[i])) return key
  }
  return null
}

export function XrayOverlay() {
  const pathname = usePathname()
  const [enabled, setEnabled] = useState(false)
  const [active, setActive] = useState(false)
  const [data, setData] = useState<Provenance | null>(null)
  const [hover, setHover] = useState<{ el: El | null; x: number; y: number } | null>(null)
  const styleRef = useRef<HTMLStyleElement | null>(null)

  // Gate: Admin only — verified server-side via the admin_session cookie.
  useEffect(() => {
    fetch('/api/admin/whoami', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { admin: false }))
      .then(d => setEnabled(!!d.admin))
      .catch(() => setEnabled(false))
  }, [])

  // Load the provenance bundle once enabled.
  useEffect(() => {
    if (!enabled || data) return
    fetch('/screen-map-provenance.json').then(r => r.ok ? r.json() : null).then(setData).catch(() => {})
  }, [enabled, data])

  const route = useMemo(() => {
    if (!data) return null
    const key = matchRoute(pathname || '/', data.routes)
    return key ? { key, ...data.routes[key] } : null
  }, [data, pathname])

  // selector → element record, for fast hover lookup.
  const bySelector = useMemo(() => {
    const m: Record<string, El> = {}
    for (const e of route?.elements || []) if (e.selector) m[e.selector] = e
    return m
  }, [route])

  // Outline every catalogued test-id element while active.
  useEffect(() => {
    if (!styleRef.current) {
      const s = document.createElement('style'); s.id = 'lf-xray-style'; document.head.appendChild(s); styleRef.current = s
    }
    styleRef.current.textContent = (enabled && active && route)
      ? '[data-testid]{outline:1px dashed rgba(197,168,255,.55)!important;outline-offset:-1px}'
      : ''
    return () => { if (styleRef.current) styleRef.current.textContent = '' }
  }, [enabled, active, route])

  // Hover any element on the page → resolve nearest [data-testid] → show its provenance.
  useEffect(() => {
    if (!enabled || !active || !route) return
    const onMove = (e: MouseEvent) => {
      const node = (e.target as Element | null)?.closest('[data-testid]') as HTMLElement | null
      const id = node?.getAttribute('data-testid') || ''
      const el = id ? bySelector[id] : null
      setHover(el ? { el, x: e.clientX, y: e.clientY } : null)
    }
    document.addEventListener('mousemove', onMove, true)
    return () => document.removeEventListener('mousemove', onMove, true)
  }, [enabled, active, route, bySelector])

  if (!enabled) return null

  const fixed: React.CSSProperties = { position: 'fixed', zIndex: 2147483600, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }

  return (
    <>
      {/* Toggle pill */}
      <button
        onClick={() => setActive(a => !a)}
        style={{ ...fixed, bottom: 16, right: 16, padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid #c5a8ff', background: active ? '#c5a8ff' : '#131a33', color: active ? '#0b1020' : '#c5a8ff' }}
        title="Toggle X-ray (Builder/Admin)"
      >
        🔍 X-ray {active ? 'on' : 'off'}
      </button>

      {active && route && (
        <div style={{ ...fixed, bottom: 56, right: 16, width: 300, maxHeight: '60vh', overflow: 'auto', background: '#0b1020ee', color: '#e8ecff', border: '1px solid #24305f', borderRadius: 10, padding: 12, fontSize: 11, lineHeight: 1.5, backdropFilter: 'blur(4px)' }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{route.key}</div>
          <div style={{ color: '#a8b3dd' }}>{route.uc ? `🎯 ${route.uc}` : 'untracked surface — no UC'}</div>
          <div style={{ margin: '6px 0', color: '#a8b3dd' }}>🧩 {route.elements.length} test-id region(s)</div>
          {route.api_calls.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ color: '#9ecbff', fontWeight: 600 }}>🔌 calls {route.api_calls.length} API(s):</div>
              {route.api_calls.map(a => (
                <div key={a.api} style={{ marginTop: 3 }}>
                  <span style={{ color: '#ffd166' }}>{a.api}</span>
                  {a.backend.length > 0 && <span style={{ color: '#6b7aa6' }}> → {a.backend.map(base).join(', ')}</span>}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 8, color: '#6b7aa6' }}>Hover any element to inspect it.</div>
        </div>
      )}

      {/* Hover tooltip */}
      {active && hover?.el && (
        <div style={{ ...fixed, left: Math.min(hover.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 280), top: hover.y + 14, width: 264, background: '#131a33f2', color: '#e8ecff', border: '1px solid #c5a8ff', borderRadius: 8, padding: '8px 10px', fontSize: 11, lineHeight: 1.5, pointerEvents: 'none' }}>
          <div style={{ fontWeight: 700 }}>{hover.el.selector}</div>
          <div style={{ color: '#c5a8ff' }}>🧩 {hover.el.component ? base(hover.el.component) : base(hover.el.source_file)}{hover.el.component && !hover.el.component.includes('/') ? ' (native)' : ''}</div>
          {hover.el.source_file && <div style={{ color: '#6b7aa6' }}>📄 {base(hover.el.source_file)}</div>}
          {hover.el.uc && <div style={{ color: '#9ecbff' }}>🎯 {hover.el.uc}</div>}
        </div>
      )}
    </>
  )
}
