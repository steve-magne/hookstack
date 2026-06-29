"use client";

import { useAnimationFrame, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type SceneRuntime = {
	renderer: import("three").WebGLRenderer;
	scene: import("three").Scene;
	camera: import("three").PerspectiveCamera;
	rig: import("three").Group;
	nodes: import("three").Mesh[];
	packet: import("three").Mesh;
	severedLine: import("three").Line;
};

export function NotFoundScene3D() {
	const mountRef = useRef<HTMLDivElement | null>(null);
	const runtimeRef = useRef<SceneRuntime | null>(null);
	const reduceMotion = useReducedMotion();

	useEffect(() => {
		let disposed = false;
		let resizeObserver: ResizeObserver | null = null;

		async function boot() {
			const THREE = await import("three");
			if (disposed || !mountRef.current) return;

			const mount = mountRef.current;
			const scene = new THREE.Scene();
			const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
			camera.position.set(0, 1.4, 9);

			const renderer = new THREE.WebGLRenderer({
				antialias: true,
				alpha: true,
				preserveDrawingBuffer: true,
			});
			renderer.setClearColor(0x000000, 0);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.outputColorSpace = THREE.SRGBColorSpace;
			mount.appendChild(renderer.domElement);

			const rig = new THREE.Group();
			rig.rotation.x = -0.14;
			scene.add(rig);

			const ambient = new THREE.AmbientLight(0xffffff, 1.2);
			scene.add(ambient);
			const key = new THREE.PointLight(0x8b5cf6, 58, 18);
			key.position.set(3.5, 3.2, 5);
			scene.add(key);
			const rim = new THREE.PointLight(0x60a5fa, 26, 14);
			rim.position.set(-4, -1.5, 4);
			scene.add(rim);

			const nodeMaterial = new THREE.MeshStandardMaterial({
				color: 0x18181b,
				metalness: 0.68,
				roughness: 0.28,
				emissive: 0x312e81,
				emissiveIntensity: 0.18,
			});
			const hotMaterial = new THREE.MeshStandardMaterial({
				color: 0x8b5cf6,
				metalness: 0.35,
				roughness: 0.2,
				emissive: 0x4f46e5,
				emissiveIntensity: 0.75,
			});
			const packetMaterial = new THREE.MeshStandardMaterial({
				color: 0xf8fafc,
				metalness: 0.12,
				roughness: 0.18,
				emissive: 0x8b5cf6,
				emissiveIntensity: 0.55,
			});
			const lineMaterial = new THREE.LineBasicMaterial({
				color: 0x6d6d78,
				transparent: true,
				opacity: 0.48,
			});
			const brokenLineMaterial = new THREE.LineBasicMaterial({
				color: 0xa78bfa,
				transparent: true,
				opacity: 0.72,
			});

			const positions = [
				new THREE.Vector3(-3.45, -1.05, 0),
				new THREE.Vector3(-1.35, 0.92, -0.35),
				new THREE.Vector3(0.55, -0.62, 0.45),
				new THREE.Vector3(2.62, 0.95, -0.2),
			];

			for (let i = 0; i < positions.length - 1; i += 1) {
				const material = i === 2 ? brokenLineMaterial : lineMaterial;
				const geometry = new THREE.BufferGeometry().setFromPoints([
					positions[i],
					positions[i + 1],
				]);
				const line = new THREE.Line(geometry, material);
				rig.add(line);
			}

			const nodeGeometry = new THREE.IcosahedronGeometry(0.42, 2);
			const nodes = positions.map((position, index) => {
				const node = new THREE.Mesh(
					nodeGeometry,
					index === 3 ? hotMaterial : nodeMaterial,
				);
				node.position.copy(position);
				node.name = `pipeline-node-${index + 1}`;
				rig.add(node);
				return node;
			});

			const ringGeometry = new THREE.TorusGeometry(1.35, 0.012, 8, 96);
			const ringMaterial = new THREE.MeshBasicMaterial({
				color: 0x4f46e5,
				transparent: true,
				opacity: 0.28,
			});
			const ring = new THREE.Mesh(ringGeometry, ringMaterial);
			ring.position.set(0.54, -0.62, 0.45);
			ring.rotation.x = Math.PI / 2;
			rig.add(ring);

			const packet = new THREE.Mesh(
				new THREE.OctahedronGeometry(0.24, 1),
				packetMaterial,
			);
			packet.position.copy(positions[2]);
			rig.add(packet);

			const severedLine = new THREE.Line(
				new THREE.BufferGeometry().setFromPoints([
					new THREE.Vector3(1.35, -0.15, 0.36),
					new THREE.Vector3(1.72, 0.17, 0.12),
					new THREE.Vector3(1.96, 0.02, 0.34),
				]),
				brokenLineMaterial,
			);
			severedLine.name = "Command rejected";
			rig.add(severedLine);

			const resize = () => {
				const rect = mount.getBoundingClientRect();
				const width = Math.max(320, rect.width);
				const height = Math.max(300, rect.height);
				camera.aspect = width / height;
				camera.updateProjectionMatrix();
				renderer.setSize(width, height, true);
			};

			resize();
			resizeObserver = new ResizeObserver(resize);
			resizeObserver.observe(mount);

			runtimeRef.current = {
				renderer,
				scene,
				camera,
				rig,
				nodes,
				packet,
				severedLine,
			};
			renderer.render(scene, camera);
		}

		boot();

		return () => {
			disposed = true;
			resizeObserver?.disconnect();
			const runtime = runtimeRef.current;
			if (!runtime) return;

			runtime.scene.traverse((object) => {
				const renderable = object as {
					geometry?: { dispose: () => void };
					material?: { dispose: () => void } | Array<{ dispose: () => void }>;
				};

				renderable.geometry?.dispose();
				if (renderable.material) {
					const materials = Array.isArray(renderable.material)
						? renderable.material
						: [renderable.material];
					for (const material of materials) material.dispose();
				}
			});
			runtime.renderer.dispose();
			runtime.renderer.domElement.remove();
			runtimeRef.current = null;
		};
	}, []);

	useAnimationFrame((time) => {
		const runtime = runtimeRef.current;
		if (!runtime) return;

		const t = time / 1000;
		const pace = reduceMotion ? 0 : t;
		runtime.rig.rotation.y = Math.sin(pace * 0.28) * 0.22;
		runtime.packet.rotation.x = pace * 1.9;
		runtime.packet.rotation.y = pace * 1.25;

		const orbit = reduceMotion ? 0 : Math.sin(t * 1.6) * 0.24;
		runtime.packet.position.set(
			0.55 + orbit,
			-0.62 + Math.cos(t * 1.2) * 0.08,
			0.45,
		);

		runtime.nodes.forEach((node, index) => {
			const pulse = reduceMotion
				? 1
				: 1 + Math.sin(t * 2.4 + index * 0.85) * 0.055;
			node.scale.setScalar(pulse);
			node.rotation.y = pace * 0.35 + index;
		});

		const lineMaterial = runtime.severedLine.material;
		if ("opacity" in lineMaterial)
			lineMaterial.opacity = reduceMotion
				? 0.58
				: 0.5 + Math.sin(t * 3.2) * 0.22;

		runtime.renderer.render(runtime.scene, runtime.camera);
	});

	return (
		<div
			data-component="NotFoundScene3D"
			className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c12] shadow-2xl shadow-black/50"
		>
			<div ref={mountRef} className="absolute inset-0" aria-hidden />
			<div className="pointer-events-none absolute inset-x-4 top-4 flex items-center justify-between gap-3">
				<span className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 font-mono text-[11px] text-zinc-300">
					pipeline-node / route-miss
				</span>
				<span className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 font-mono text-[11px] text-zinc-400">
					Command rejected
				</span>
			</div>
			<div className="pointer-events-none absolute inset-x-4 bottom-4 grid grid-cols-4 gap-1.5">
				{["PreToolUse", "Guard", "Matcher", "404"].map((label, index) => (
					<span
						key={label}
						className={`truncate rounded-md border px-2 py-1 text-center font-mono text-[10px] ${
							index === 3
								? "border-white/20 bg-white/[0.06] text-zinc-200"
								: "border-white/10 bg-white/[0.03] text-zinc-400"
						}`}
					>
						{label}
					</span>
				))}
			</div>
		</div>
	);
}
