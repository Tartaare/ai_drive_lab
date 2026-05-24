import { useEffect, useState } from 'react'
import { Sketch } from './sketch'
import './index.css'

type Screen = 'loading' | 'menu' | 'playing'
type SketchMap = 'default' | 'infinite' | 'circuit'

function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [selectedMap, setSelectedMap] = useState<SketchMap>('default')
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setScreen('menu')
    }, 2000)

    return () => clearTimeout(timeoutId)
  }, [])

  if (screen === 'loading') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ fontSize: '1.5rem' }}>Chargement en cours...</div>
      </div>
    )
  }

  if (screen === 'menu') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <h1 style={{ margin: 0 }}>Deep Learning Car</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => setSelectedMap('default')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              borderRadius: '999px',
              border: '1px solid #f97316',
              cursor: 'pointer',
              background: selectedMap === 'default' ? '#f97316' : 'transparent',
              color: '#fff',
            }}
          >
            Circuit d'entraînement
          </button>
          <button
            type="button"
            onClick={() => setSelectedMap('infinite')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              borderRadius: '999px',
              border: '1px solid #f97316',
              cursor: 'pointer',
              background: selectedMap === 'infinite' ? '#f97316' : 'transparent',
              color: '#fff',
            }}
          >
            Sol infini
          </button>
          <button
            type="button"
            onClick={() => setSelectedMap('circuit')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              borderRadius: '999px',
              border: '1px solid #f97316',
              cursor: 'pointer',
              background: selectedMap === 'circuit' ? '#f97316' : 'transparent',
              color: '#fff',
            }}
          >
            Circuit généré
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setPaused(false)
            setScreen('playing')
          }}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            background: '#f97316',
            color: '#fff',
          }}
        >
          Lancer une partie
        </button>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Sketch map={selectedMap} paused={paused} onPauseChange={setPaused} />

      {paused && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '1rem',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <h2 style={{ margin: 0 }}>Pause</h2>
          <button
            type="button"
            onClick={() => setPaused(false)}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              background: '#f97316',
              color: '#fff',
            }}
          >
            Reprendre la partie
          </button>
          <button
            type="button"
            onClick={() => {
              setPaused(false)
              setScreen('menu')
            }}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.95rem',
              borderRadius: '999px',
              border: '1px solid #f97316',
              cursor: 'pointer',
              background: 'transparent',
              color: '#fff',
            }}
          >
            Retour au menu principal
          </button>
        </div>
      )}
    </div>
  )
}

export default App
