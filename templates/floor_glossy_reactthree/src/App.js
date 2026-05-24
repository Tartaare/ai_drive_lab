import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useScroll, ScrollControls, Environment, Merged, Text, MeshReflectorMaterial } from '@react-three/drei'

const FLOOR_DEFAULTS = {
  height: -0.52,
  reflection: 12,
  blur: 360,
  roughness: 0.86,
  tone: '#151515'
}

const FLOOR_LIMITS = {
  height: { min: -1.2, max: 0.2, step: 0.02 },
  reflection: { min: 0, max: 20, step: 0.5 },
  blur: { min: 0, max: 800, step: 20 },
  roughness: { min: 0.1, max: 1, step: 0.01 }
}

function Train() {
  const ref = useRef()
  const scroll = useScroll()
  const [cabin, seat] = useGLTF(['/cabin-transformed.glb', '/seat-transformed.glb'])
  const meshes = useMemo(() => ({ Cabin: cabin.nodes.cabin_1, Seat: seat.nodes.seat }), [cabin, seat])
  useFrame(() => (ref.current.position.z = scroll.offset * 120))
  // Merged creates THREE.InstancedMeshes out of the meshes you feed it
  // All in all we end up with just 5 draw-calls for the entire scene
  return (
    <Merged castShadow receiveShadow meshes={meshes}>
      {(models) => (
        <group ref={ref}>
          <Cabin models={models} color="#252525" seatColor="sandybrown" name="1A" position={[0, 0, -6]} />
          <Cabin models={models} color="#454545" seatColor="gray" name="2B" position={[0, 0, -32]} />
          <Cabin models={models} color="#252525" seatColor="lightskyblue" name="3A" position={[0, 0, -58]} />
          <Cabin models={models} color="#454545" seatColor="gray" name="4B" position={[0, 0, -84]} />
          <Cabin models={models} color="#252525" seatColor="sandybrown" name="5B" position={[0, 0, -110]} />
        </group>
      )}
    </Merged>
  )
}

const Quarter = ({ models, color, ...props }) => (
  <group {...props}>
    <models.Seat color={color} position={[-0.35, 0, 0.7]} />
    <models.Seat color={color} position={[0.35, 0, 0.7]} />
    <models.Seat color={color} position={[-0.35, 0, -0.7]} rotation={[0, Math.PI, 0]} />
    <models.Seat color={color} position={[0.35, 0, -0.7]} rotation={[0, Math.PI, 0]} />
  </group>
)

const Row = ({ models, color, ...props }) => (
  <group {...props}>
    <Quarter models={models} color={color} position={[-1.2, -0.45, 9.75]} />
    <Quarter models={models} color={color} position={[1.2, -0.45, 9.75]} />
  </group>
)

const Cabin = ({ models, color = 'white', seatColor = 'white', name, ...props }) => (
  <group {...props}>
    <Text fontSize={4} color="#101020" position={[0, 6, 4]} rotation={[-Math.PI / 2, 0, 0]}>
      {name}
    </Text>
    <models.Cabin color={color} />
    <Row models={models} color={seatColor} />
    <Row models={models} color={seatColor} position={[0, 0, -1.9]} />
    <Row models={models} color={seatColor} position={[0, 0, -6.6]} />
    <Row models={models} color={seatColor} position={[0, 0, -8.5]} />
    <Row models={models} color={seatColor} position={[0, 0, -11]} />
    <Row models={models} color={seatColor} position={[0, 0, -12.9]} />
    <Row models={models} color={seatColor} position={[0, 0, -17.6]} />
    <Row models={models} color={seatColor} position={[0, 0, -19.5]} />
  </group>
)

function FloorControls({ isOpen, settings, onChange, onReset, onToggle }) {
  const updateSetting = (key) => (event) => {
    onChange((current) => ({ ...current, [key]: Number(event.target.value) }))
  }

  return (
    <aside className={`floor-panel ${isOpen ? 'is-open' : ''}`} aria-label="Réglages du sol">
      <button className="floor-panel__toggle" type="button" onClick={onToggle} aria-expanded={isOpen}>
        F3 Sol
      </button>
      <div className="floor-panel__body" aria-hidden={!isOpen}>
        <header className="floor-panel__header">
          <span>Surface</span>
          <button type="button" onClick={onReset}>
            Réinitialiser
          </button>
        </header>
        <label>
          <span>Hauteur</span>
          <output>{settings.height.toFixed(2)}</output>
          <input type="range" value={settings.height} onChange={updateSetting('height')} {...FLOOR_LIMITS.height} />
        </label>
        <label>
          <span>Réflexion</span>
          <output>{settings.reflection.toFixed(1)}</output>
          <input type="range" value={settings.reflection} onChange={updateSetting('reflection')} {...FLOOR_LIMITS.reflection} />
        </label>
        <label>
          <span>Flou</span>
          <output>{settings.blur}</output>
          <input type="range" value={settings.blur} onChange={updateSetting('blur')} {...FLOOR_LIMITS.blur} />
        </label>
        <label>
          <span>Rugosité</span>
          <output>{settings.roughness.toFixed(2)}</output>
          <input type="range" value={settings.roughness} onChange={updateSetting('roughness')} {...FLOOR_LIMITS.roughness} />
        </label>
      </div>
    </aside>
  )
}

export default function App() {
  const [floorSettings, setFloorSettings] = useState(FLOOR_DEFAULTS)
  const [isFloorPanelOpen, setIsFloorPanelOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'F3') {
        event.preventDefault()
        setIsFloorPanelOpen((current) => !current)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <FloorControls
        isOpen={isFloorPanelOpen}
        settings={floorSettings}
        onChange={setFloorSettings}
        onReset={() => setFloorSettings(FLOOR_DEFAULTS)}
        onToggle={() => setIsFloorPanelOpen((current) => !current)}
      />
      <Canvas dpr={[1, 1.5]} shadows camera={{ position: [-15, 15, 18], fov: 35 }} gl={{ alpha: false }}>
        <fog attach="fog" args={['#17171b', 30, 40]} />
        <color attach="background" args={['#17171b']} />
        <ambientLight intensity={0.25} />
        <directionalLight castShadow intensity={2} position={[10, 6, 6]} shadow-mapSize={[1024, 1024]}>
          <orthographicCamera attach="shadow-camera" left={-20} right={20} top={20} bottom={-20} />
        </directionalLight>
        <Suspense fallback={null}>
          <ScrollControls pages={3}>
            <Train />
          </ScrollControls>
          <mesh position={[0, floorSettings.height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[50, 50]} />
            <MeshReflectorMaterial
              blur={[floorSettings.blur, 100]}
              resolution={1024}
              mixBlur={1}
              mixStrength={floorSettings.reflection}
              depthScale={1}
              minDepthThreshold={0.85}
              color={floorSettings.tone}
              metalness={0.6}
              roughness={floorSettings.roughness}
            />
          </mesh>
          <Environment preset="dawn" />
        </Suspense>
      </Canvas>
    </>
  )
}
