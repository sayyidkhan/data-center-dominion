import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { GameScene } from './components/GameScene'
import { HUD } from './components/HUD'

export default function App() {
  return (
    <div className="w-full h-full bg-navy relative">
      <Canvas
        shadows
        camera={{ fov: 55, near: 0.1, far: 400, position: [0, 40, 110] }}
        gl={{ antialias: true }}
      >
        <GameScene />
        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.5}
            luminanceSmoothing={0.7}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
      <HUD />
    </div>
  )
}
