import { Component, Suspense, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Grid,
  Line,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";
import { useStudio } from "../stores/studio";
import type { World, Point, Mission } from "../types";
const worldPos = (p: Point, h = 0.05): [number, number, number] => [
  p[0] - 9.5,
  h,
  p[1] - 7.5,
];

class SceneBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-fallback">
        3D rendering unavailable. Use a WebGL2-capable browser; mission controls
        and telemetry remain available.
      </div>
    ) : (
      this.props.children
    );
  }
}
// Canvas-text sprites stay inside the WebGL scene, with explicit texture cleanup.
// This avoids asynchronous DOM portal teardown when switching workspaces.
function Label({
  text,
  position,
  color = "#8dacb8",
  background = "",
  height = 0.65,
}: {
  text: string;
  position: [number, number, number];
  color?: string;
  background?: string;
  height?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = "32px monospace";
    canvas.width = Math.ceil(ctx.measureText(text).width) + 28;
    canvas.height = 56;
    ctx.font = "32px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (background) {
      ctx.fillStyle = background;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, canvas.height, 7);
      ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color, background]);
  useEffect(() => () => texture.dispose(), [texture]);
  const ratio = texture.image.width / texture.image.height;
  return (
    <sprite
      position={position}
      scale={[height * ratio, height, 1]}
      renderOrder={5}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  );
}
function Shelves() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo(() => {
    const a: {
      pos: [number, number, number];
      scale: [number, number, number];
      color: string;
    }[] = [];
    for (const x of [5, 12])
      for (const y of [3, 9]) {
        for (const px of [-0.48, 2.48])
          for (const pz of [-0.48, 2.48])
            a.push({
              pos: [x + px - 9.5, 1.35, y + pz - 7.5],
              scale: [0.09, 2.7, 0.09],
              color: "#57666d",
            });
        for (const h of [0.15, 1.25, 2.4]) {
          a.push({
            pos: [x + 1 - 9.5, h, y + 1 - 7.5],
            scale: [3, 0.12, 3],
            color: "#38505b",
          });
          if (h < 2)
            for (let i = 0; i < 3; i++)
              for (let j = 0; j < 2; j++)
                a.push({
                  pos: [x + i - 9.5, h + 0.4, y + j * 1.3 + 0.2 - 7.5],
                  scale: [0.76, 0.65, 0.87],
                  color: (i + j) % 2 ? "#b48c65" : "#85705c",
                });
        }
      }
    return a;
  }, []);
  useEffect(() => {
    const o = new THREE.Object3D();
    parts.forEach((p, i) => {
      o.position.set(...p.pos);
      o.scale.set(...p.scale);
      o.updateMatrix();
      mesh.current!.setMatrixAt(i, o.matrix);
      mesh.current!.setColorAt(i, new THREE.Color(p.color));
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
    if (mesh.current!.instanceColor)
      mesh.current!.instanceColor.needsUpdate = true;
  }, [parts]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, parts.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry />
      <meshStandardMaterial roughness={0.7} />
    </instancedMesh>
  );
}
function Robot({ mission }: { mission: Mission | null }) {
  const root = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group>(null);
  const target = useRef(mission);
  target.current = mission;
  useFrame((_, delta) => {
    const m = target.current;
    if (!root.current) return;
    const p = m?.position ?? [2, 12];
    const amount = 1 - Math.exp(-18 * delta);
    root.current.position.lerp(new THREE.Vector3(...worldPos(p, 0)), amount);
    const heading = m?.heading ?? 0;
    const diff = Math.atan2(
      Math.sin(heading - root.current.rotation.y),
      Math.cos(heading - root.current.rotation.y),
    );
    root.current.rotation.y += diff * amount;
    if (wheels.current)
      wheels.current.children.forEach(
        (w) => (w.rotation.x += (m?.velocity ?? 0) * delta * 5),
      );
  });
  return (
    <group ref={root} position={worldPos(mission?.position ?? [2, 12], 0)}>
      <RoundedBox
        args={[0.88, 0.3, 1.08]}
        radius={0.1}
        position={[0, 0.38, 0]}
        castShadow
      >
        <meshStandardMaterial
          color="#c9d6d9"
          metalness={0.55}
          roughness={0.3}
        />
      </RoundedBox>
      <RoundedBox
        args={[0.91, 0.09, 1.09]}
        radius={0.04}
        position={[0, 0.26, 0]}
      >
        <meshStandardMaterial color="#19262d" />
      </RoundedBox>
      <RoundedBox
        args={[0.72, 0.06, 0.75]}
        radius={0.04}
        position={[0, 0.56, -0.08]}
      >
        <meshStandardMaterial color="#3e525a" />
      </RoundedBox>
      <group ref={wheels}>
        {[-0.47, 0.47].flatMap((x) =>
          [-0.33, 0.33].map((z) => (
            <mesh
              key={`${x},${z}`}
              position={[x, 0.2, z]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.19, 0.19, 0.12, 20]} />
              <meshStandardMaterial color="#111a20" roughness={0.9} />
            </mesh>
          )),
        )}
      </group>
      <mesh position={[0, 0.68, 0.35]}>
        <cylinderGeometry args={[0.15, 0.17, 0.17, 24]} />
        <meshStandardMaterial color="#17262d" />
      </mesh>
      <mesh position={[0, 0.78, 0.35]}>
        <cylinderGeometry args={[0.14, 0.14, 0.025, 24]} />
        <meshStandardMaterial
          color="#5ae9d2"
          emissive="#3ac9b3"
          emissiveIntensity={0.7}
        />
      </mesh>
      <mesh position={[0, 0.36, 0.55]}>
        <boxGeometry args={[0.55, 0.055, 0.025]} />
        <meshStandardMaterial
          color="#77efe1"
          emissive="#42b9b0"
          emissiveIntensity={1}
        />
      </mesh>
      {(mission?.cargo ?? 0) > 0 && (
        <RoundedBox
          args={[0.53, 0.4, 0.49]}
          radius={0.02}
          position={[0, 0.8, -0.15]}
          castShadow
        >
          <meshStandardMaterial color="#c49969" />
        </RoundedBox>
      )}
      {(mission?.cargo ?? 0) > 1 && (
        <RoundedBox
          args={[0.45, 0.3, 0.4]}
          radius={0.02}
          position={[0, 1.15, -0.15]}
          castShadow
        >
          <meshStandardMaterial color="#b4895d" />
        </RoundedBox>
      )}
      <Label
        position={[0, 1.4, 0]}
        text={
          "PR–01 / " + (mission?.status === "running" ? "ACTIVE" : "STANDBY")
        }
        color="#bceee5"
        background="#10202a"
        height={0.68}
      />
    </group>
  );
}
function CameraRig({ mission }: { mission: Mission | null }) {
  const mode = useStudio((s) => s.camera);
  const { camera } = useThree();
  const elapsed = useRef(0);
  const adapted = useRef(false);
  const frames = useRef({ n: 0, t: 0 });
  const reduced = useMemo(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useFrame((_, dt) => {
    elapsed.current += dt;
    if (
      elapsed.current > 5 &&
      !adapted.current &&
      useStudio.getState().fps > 0 &&
      useStudio.getState().fps < 25
    ) {
      useStudio.getState().setQuality(false);
      adapted.current = true;
    }
    frames.current.n++;
    frames.current.t += dt;
    if (frames.current.t >= 1) {
      useStudio
        .getState()
        .setFps(Math.round(frames.current.n / frames.current.t));
      frames.current = { n: 0, t: 0 };
    }
    if (mode === "Free") return;
    const p = worldPos(mission?.position ?? [2, 12], 0);
    let pos = new THREE.Vector3(19, 22, 24),
      look = new THREE.Vector3(0, 0, 0);
    if (mode === "Top down") pos.set(0, 30, 0.01);
    if (mode === "Follow") {
      pos.set(p[0] + 5, 7, p[2] + 7);
      look.set(p[0], 0.2, p[2]);
    }
    if (mode === "Inspect") {
      pos.set(p[0] + 2.5, 2.4, p[2] + 3);
      look.set(p[0], 0.5, p[2]);
    }
    if (mode === "Presentation") pos.set(22, 14, 18);
    camera.position.lerp(pos, reduced ? 1 : 1 - Math.exp(-4 * dt));
    camera.lookAt(look);
  });
  return (
    <OrbitControls
      makeDefault
      enabled={mode === "Free"}
      maxPolarAngle={Math.PI / 2.1}
      minDistance={4}
      maxDistance={45}
      target={[0, 0, 0]}
    />
  );
}
function Content({
  world,
  mission,
}: {
  world: World;
  mission: Mission | null;
}) {
  const quality = useStudio((s) => s.quality);
  const goal = mission?.task.actions[mission.action_index]?.station;
  return (
    <>
      <color attach="background" args={["#141e26"]} />
      <fog attach="fog" args={["#141e26", 36, 75]} />
      <ambientLight intensity={1.3} />
      <hemisphereLight args={["#bddde6", "#182631", 1.3]} />
      <directionalLight
        position={[8, 18, 4]}
        intensity={2.5}
        castShadow={quality}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.07, 0]}
        receiveShadow
      >
        <planeGeometry args={[23, 19]} />
        <meshStandardMaterial color="#26343b" roughness={0.9} />
      </mesh>
      <Grid
        position={[0, -0.035, 0]}
        args={[20, 16]}
        cellSize={1}
        cellThickness={0.45}
        cellColor="#47565c"
        sectionSize={5}
        sectionColor="#576b72"
        sectionThickness={0.65}
        fadeDistance={50}
        infiniteGrid={false}
      />
      <Shelves />
      {world.restricted.map((p) => (
        <mesh
          key={p.join()}
          position={worldPos(p, 0.005)}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.95, 0.95]} />
          <meshBasicMaterial color="#a36b26" transparent opacity={0.3} />
        </mesh>
      ))}
      <Label
        position={worldPos([9.5, 2], 0.2)}
        text="RESTRICTED"
        color="#d1b079"
        height={0.6}
      />
      {Object.entries(world.stations).map(([name, p], i) => (
        <group key={name} position={worldPos(p, 0)}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
            <ringGeometry args={[0.56, 0.66, 32]} />
            <meshBasicMaterial
              color={
                goal === name ? "#64edd6" : i === 0 ? "#6fc0df" : "#678b9b"
              }
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[0.56, 32]} />
            <meshBasicMaterial color="#478999" transparent opacity={0.12} />
          </mesh>
          <Label
            position={[0, 0.15, 1.1]}
            text={(name.length === 1 ? "STATION " : "") + name.toUpperCase()}
            color={goal === name ? "#6df2d7" : "#8dacb8"}
            height={0.64}
          />
          {name === "A" && (
            <group position={[-1, 0.2, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.65, 0.4, 0.65]} />
                <meshStandardMaterial color="#b99368" />
              </mesh>
              <mesh position={[0, 0.205, 0]}>
                <boxGeometry args={[0.1, 0.01, 0.66]} />
                <meshStandardMaterial color="#ded2b0" />
              </mesh>
            </group>
          )}
        </group>
      ))}
      {[-8, 8].map((z) => (
        <mesh key={z} position={[0, 0.12, z]}>
          <boxGeometry args={[21, 0.24, 0.15]} />
          <meshStandardMaterial color="#5d7179" />
        </mesh>
      ))}
      {[-10, 10].map((x) => (
        <mesh key={x} position={[x, 0.12, 0]}>
          <boxGeometry args={[0.15, 0.24, 16]} />
          <meshStandardMaterial color="#5d7179" />
        </mesh>
      ))}
      {[-6, -2, 2, 6].map((z) => (
        <mesh
          key={z}
          position={[10.5, 0.02, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.7, 1.9]} />
          <meshBasicMaterial color="#d2a653" />
        </mesh>
      ))}
      <Label
        position={[10.8, 0.2, 0]}
        text="LOADING BAYS"
        color="#a8b9bb"
        height={0.6}
      />
      {(mission?.obstacles ?? []).map((p) => (
        <group key={p.join()} position={worldPos(p, 0)}>
          <RoundedBox
            args={[0.8, 0.7, 0.8]}
            radius={0.05}
            position={[0, 0.35, 0]}
            castShadow
          >
            <meshStandardMaterial color="#bd704a" />
          </RoundedBox>
          <mesh position={[0, 0.72, 0]}>
            <boxGeometry args={[0.82, 0.05, 0.15]} />
            <meshStandardMaterial color="#e9bd6a" />
          </mesh>
          <Label
            position={[0, 1.1, 0]}
            text="BLOCKED"
            color="#efc190"
            background="#31241f"
            height={0.64}
          />
        </group>
      ))}
      {mission && mission.path.length > 0 && (
        <Line
          points={[
            worldPos(mission.position, 0.07),
            ...mission.path.map((p) => worldPos(p, 0.07)),
          ]}
          color="#64e9d4"
          lineWidth={3}
          dashed
          dashSize={0.22}
          gapSize={0.13}
        />
      )}
      {mission && mission.executed.length > 1 && (
        <Line
          points={mission.executed.map((p) => worldPos(p, 0.045))}
          color="#5882aa"
          lineWidth={2}
        />
      )}
      <Robot mission={mission} />
      <CameraRig mission={mission} />
      {quality && (
        <ContactShadows
          position={[0, -0.02, 0]}
          opacity={0.3}
          scale={32}
          blur={2}
          far={4}
          resolution={256}
          frames={1}
        />
      )}
    </>
  );
}
export default function WarehouseScene({
  world,
  mission,
}: {
  world: World;
  mission: Mission | null;
}) {
  const quality = useStudio((s) => s.quality);
  return (
    <SceneBoundary>
      <Suspense
        fallback={
          <div className="scene-fallback">Initializing warehouse renderer…</div>
        }
      >
        <Canvas
          shadows={quality}
          dpr={quality ? [1, 1.5] : 1}
          camera={{ position: [19, 22, 24], fov: 43, near: 0.1, far: 100 }}
          gl={{ antialias: quality, powerPreference: "high-performance" }}
        >
          <Content world={world} mission={mission} />
        </Canvas>
      </Suspense>
    </SceneBoundary>
  );
}
