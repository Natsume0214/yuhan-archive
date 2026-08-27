"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type PoleKey = "left" | "right";

type SignSpec = {
  id: number;
  pole: PoleKey;
  position: [number, number, number];
  width: number;
  height: number;
  angle: number;
  supportY?: number;
  hideClamp?: boolean;
  frontAsset?: string;
};

type SignAssemblyTarget = {
  assembly: THREE.Group;
  bar: THREE.Mesh;
  sign: THREE.Group;
  spec: SignSpec;
};

const degrees = THREE.MathUtils.degToRad;

const SIGN_SPECS: SignSpec[] = [
  { id: 1, pole: "left", position: [-2.68, 1.78, 0.28], width: 2.18, height: 1.42, angle: -35, supportY: 0.42 },
  { id: 2, pole: "left", position: [-2.53, 0.48, 0.25], width: 1.28, height: 1.28, angle: -26 },
  { id: 3, pole: "left", position: [-2.74, -0.95, 0.28], width: 1.58, height: 0.71, angle: -44 },
  { id: 4, pole: "left", position: [-0.80, -0.87, 0.37], width: 1.57, height: 1.57, angle: -6, supportY: 0.28 },
  {
    id: 5,
    pole: "left",
    position: [-0.91, 0.75, 0.34],
    width: 1.997,
    height: 0.525,
    angle: -48,
    frontAsset: "/showcase/ainow/version-a/signs/sign-5-updated.svg",
  },
  { id: 6, pole: "left", position: [-0.59, -2.18, 0.35], width: 1.83, height: 1.01, angle: 16, supportY: 0.27, hideClamp: true },
  { id: 7, pole: "right", position: [1.88, -0.60, 0.28], width: 1.36, height: 1.245, angle: 29, supportY: 0.28 },
  { id: 8, pole: "right", position: [3.70, -0.27, 0.34], width: 1.25, height: 1.25, angle: 37, supportY: 0.13 },
  { id: 9, pole: "right", position: [3.78, -1.96, 0.39], width: 1.82, height: 1.225, angle: -7, supportY: 0.3 },
];

const POLES: Record<PoleKey, { x: number; y: number; height: number }> = {
  // Keep the lower end fixed while shortening only the exposed top section
  // above the highest clamp by one quarter.
  left: { x: -1.57, y: -0.375, height: 7.72 },
  right: { x: 2.78, y: -1.12, height: 5.75 },
};

const EXTRA_CLAMPS: Record<PoleKey, number[]> = {
  left: [-1.73, -2.74],
  right: [0.42, -2.58],
};

const easeInOut = (value: number) => value * value * (3 - 2 * value);
const CLICK_ROTATION = THREE.MathUtils.degToRad(20);
const SUPPORT_START_Z = 0.055;
const SUPPORT_BACK_OFFSET = 0.035;
const SUPPORT_OVERLAP = 0.13;
const SUPPORT_AXIS = new THREE.Vector3(0, 1, 0);
const SIGN_OUTLINE_WIDTH = 0.028;
const FIXED_PERSPECTIVE = {
  elevation: 2,
  strength: 37,
  horizontal: 0,
} as const;

const applySignAssemblyAngle = (target: SignAssemblyTarget, angle: number) => {
  const { assembly, bar, sign, spec } = target;
  const poleX = POLES[spec.pole].x;
  const yaw = degrees(angle);
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  const safeCosine = Math.abs(cosine) < 0.16 ? Math.sign(cosine || 1) * 0.16 : cosine;
  const localSignX = (spec.position[0] - poleX - spec.position[2] * sine) / safeCosine;
  const side = spec.position[0] < poleX ? 1 : -1;
  const signEdgeX = localSignX + side * (spec.width * 0.485 - SUPPORT_OVERLAP);
  const poleEdgeX = -side * 0.19;
  const poleAttachment = new THREE.Vector3(poleEdgeX, 0, SUPPORT_START_Z);
  const signAttachment = new THREE.Vector3(
    signEdgeX,
    0,
    spec.position[2] - SUPPORT_BACK_OFFSET,
  );
  const supportDirection = signAttachment.clone().sub(poleAttachment);
  const length = supportDirection.length();

  assembly.rotation.y = yaw;
  sign.position.x = localSignX;
  sign.rotation.y = 0;
  bar.position.addVectors(poleAttachment, signAttachment).multiplyScalar(0.5);
  bar.quaternion.setFromUnitVectors(SUPPORT_AXIS, supportDirection.normalize());
  bar.scale.set(1, length, 1);
};

function WayfindingDesktopScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(max-width: 700px)").matches) return;

    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let visible = true;
    const disposables: Array<{ dispose: () => void }> = [];
    const textureLoader = new THREE.TextureLoader();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(FIXED_PERSPECTIVE.strength, 1, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setClearColor(0xffffff, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.12, -0.22, 0);
    controls.enabled = false;
    controls.enableRotate = false;
    controls.enablePan = false;
    controls.enableZoom = false;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9dde2, 2.25));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(-4, 7, 9);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xdde7ff, 1.8);
    rimLight.position.set(6, 2, -5);
    scene.add(rimLight);

    const installation = new THREE.Group();
    scene.add(installation);

    const poleGroups = {} as Record<PoleKey, THREE.Group>;
    (Object.keys(POLES) as PoleKey[]).forEach((key) => {
      const group = new THREE.Group();
      group.position.x = POLES[key].x;
      poleGroups[key] = group;
      installation.add(group);
    });

    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.42, metalness: 0.42 });
    const clampBandMaterial = new THREE.MeshStandardMaterial({ color: 0xd5d7da, roughness: 0.5, metalness: 0.24 });
    const clampPlateMaterial = new THREE.MeshStandardMaterial({ color: 0xe7e9eb, roughness: 0.56, metalness: 0.14 });
    const clampFastenerMaterial = new THREE.MeshStandardMaterial({ color: 0x45484c, roughness: 0.38, metalness: 0.5 });
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xd3d6d9, roughness: 0.27, metalness: 0.78, transparent: true, alphaTest: 0.42, side: THREE.DoubleSide });
    const backMaterial = new THREE.MeshStandardMaterial({ color: 0xc6c9cd, roughness: 0.34, metalness: 0.72, transparent: true, alphaTest: 0.42, side: THREE.DoubleSide });
    disposables.push(poleMaterial, clampBandMaterial, clampPlateMaterial, clampFastenerMaterial, edgeMaterial, backMaterial);

    const poleGeometry = new THREE.CylinderGeometry(0.225, 0.225, 1, 40, 1, false);
    const clampGeometry = new THREE.CylinderGeometry(0.252, 0.252, 0.085, 40, 1, false);
    const clampPlateGeometry = new THREE.BoxGeometry(0.145, 0.15, 0.065);
    const clampFastenerGeometry = new THREE.CylinderGeometry(0.024, 0.024, 0.026, 18, 1, false);
    const supportGeometry = new THREE.CylinderGeometry(0.048, 0.048, 1, 18, 1, false);
    disposables.push(poleGeometry, clampGeometry, clampPlateGeometry, clampFastenerGeometry, supportGeometry);

    (Object.keys(POLES) as PoleKey[]).forEach((key) => {
      const pole = POLES[key];
      const mesh = new THREE.Mesh(poleGeometry, poleMaterial);
      mesh.position.set(0, pole.y, 0);
      mesh.scale.y = pole.height;
      poleGroups[key].add(mesh);
    });

    const addClampHardware = (group: THREE.Group, y: number, z = 0) => {
      const plate = new THREE.Mesh(clampPlateGeometry, clampPlateMaterial);
      plate.position.set(0, y, 0.276 + z);
      group.add(plate);

      const fastener = new THREE.Mesh(clampFastenerGeometry, clampFastenerMaterial);
      fastener.rotation.x = Math.PI / 2;
      fastener.position.set(0, y, 0.322 + z);
      group.add(fastener);
    };

    const addFixedClamp = (poleKey: PoleKey, y: number, z = 0) => {
      const sleeve = new THREE.Mesh(clampGeometry, clampBandMaterial);
      sleeve.position.set(0, y, z);
      poleGroups[poleKey].add(sleeve);
      addClampHardware(poleGroups[poleKey], y, z);
    };

    const addSleeve = (poleKey: PoleKey, y: number) => {
      const sleeve = new THREE.Mesh(clampGeometry, clampBandMaterial);
      sleeve.position.set(0, y, 0.01);
      poleGroups[poleKey].add(sleeve);
    };

    EXTRA_CLAMPS.left.forEach((y) => addFixedClamp("left", y, -0.01));
    EXTRA_CLAMPS.right.forEach((y) => addFixedClamp("right", y, -0.01));

    const clickableMeshes: THREE.Object3D[] = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const installationTweens = new Map<THREE.Group, { start: number; from: number; delta: number }>();
    let activeDrag: {
      installationGroup: THREE.Group;
      pointerId: number;
      startX: number;
      startY: number;
      startRotation: number;
      moved: boolean;
      verticalGesture: boolean;
    } | null = null;

    const createAssembly = (spec: SignSpec) => {
      const y = spec.position[1] + (spec.supportY ?? 0);
      const assembly = new THREE.Group();
      assembly.position.set(0, y, 0);
      poleGroups[spec.pole].add(assembly);

      const bar = new THREE.Mesh(supportGeometry, clampBandMaterial);
      bar.scale.y = 0.16;
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, 0, SUPPORT_START_Z);
      assembly.add(bar);

      if (!spec.hideClamp) {
        addClampHardware(assembly, 0, 0.01);
        addSleeve(spec.pole, y);
      }
      return { assembly, bar, pivotY: y };
    };

    const loadScene = async () => {
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      await Promise.all(SIGN_SPECS.map(async (spec) => {
        const base = `/showcase/ainow/version-a/signs/sign-${spec.id}`;
        const customBase = spec.frontAsset?.replace(/\.svg$/, "");
        const [frontTexture, maskTexture, frameTexture] = await Promise.all([
          textureLoader.loadAsync(spec.frontAsset ?? `${base}.png`),
          textureLoader.loadAsync(customBase ? `${customBase}-mask.svg` : `${base}-mask.png`),
          textureLoader.loadAsync(customBase ? `${customBase}-frame.svg` : `${base}-frame.png`),
        ]);
        if (disposed) {
          frontTexture.dispose();
          maskTexture.dispose();
          frameTexture.dispose();
          return;
        }
        frontTexture.colorSpace = THREE.SRGBColorSpace;
        frontTexture.anisotropy = Math.min(8, maxAnisotropy);
        maskTexture.colorSpace = THREE.NoColorSpace;
        frameTexture.colorSpace = THREE.NoColorSpace;
        disposables.push(frontTexture, maskTexture, frameTexture);

        const { assembly, bar, pivotY } = createAssembly(spec);
        const sign = new THREE.Group();
        sign.position.set(0, spec.position[1] - pivotY, spec.position[2]);
        assembly.add(sign);

        const assemblyTarget = { assembly, bar, sign, spec };
        applySignAssemblyAngle(assemblyTarget, spec.angle);

        const geometry = new THREE.PlaneGeometry(spec.width, spec.height);
        disposables.push(geometry);
        const outlineScaleX = 1 + (SIGN_OUTLINE_WIDTH * 2) / spec.width;
        const outlineScaleY = 1 + (SIGN_OUTLINE_WIDTH * 2) / spec.height;

        const signFrameMaterial = edgeMaterial.clone();
        signFrameMaterial.alphaMap = frameTexture;
        signFrameMaterial.color.setHex(0xe1e4e7);
        signFrameMaterial.roughness = 0.46;
        signFrameMaterial.metalness = 0.2;
        signFrameMaterial.needsUpdate = true;
        const signSideMaterial = backMaterial.clone();
        signSideMaterial.alphaMap = maskTexture;
        signSideMaterial.color.setHex(0xbfc3c7);
        signSideMaterial.needsUpdate = true;
        const signBackMaterial = backMaterial.clone();
        signBackMaterial.alphaMap = maskTexture;
        signBackMaterial.needsUpdate = true;
        const frontMaterial = new THREE.MeshBasicMaterial({
          map: frontTexture,
          alphaMap: maskTexture,
          transparent: true,
          alphaTest: 0.08,
          side: THREE.FrontSide,
          toneMapped: false,
        });
        disposables.push(signFrameMaterial, signSideMaterial, signBackMaterial, frontMaterial);

        for (let layer = 0; layer < 3; layer += 1) {
          const side = new THREE.Mesh(geometry, signSideMaterial);
          side.position.z = -0.026 + layer * 0.018;
          side.scale.set(outlineScaleX, outlineScaleY, 1);
          side.userData.sign = sign;
          side.userData.installationGroup = poleGroups[spec.pole];
          sign.add(side);
          clickableMeshes.push(side);
        }

        const back = new THREE.Mesh(geometry, signBackMaterial);
        back.position.z = -0.044;
        back.scale.set(outlineScaleX, outlineScaleY, 1);
        // Keep the back plane's UV orientation aligned with the face. The
        // double-sided material already makes it visible from behind; rotating
        // the geometry by 180 degrees mirrors asymmetric alpha masks and lets
        // the grey backing protrude beyond the artwork silhouette.
        back.userData.sign = sign;
        back.userData.installationGroup = poleGroups[spec.pole];
        sign.add(back);
        clickableMeshes.push(back);

        const frame = new THREE.Mesh(geometry, signFrameMaterial);
        frame.position.z = 0.034;
        frame.scale.set(outlineScaleX, outlineScaleY, 1);
        frame.userData.sign = sign;
        frame.userData.installationGroup = poleGroups[spec.pole];
        sign.add(frame);
        clickableMeshes.push(frame);

        const face = new THREE.Mesh(geometry, frontMaterial);
        face.position.z = 0.046;
        face.userData.sign = sign;
        face.userData.installationGroup = poleGroups[spec.pole];
        sign.add(face);
        clickableMeshes.push(face);
      }));

      if (!disposed) setReady(true);
    };

    loadScene().catch(() => {
      if (!disposed) setFailed(true);
    });

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const aspect = width / height;
      const sceneWidth = 11.45;
      const sceneHeight = 8.15;
      const target = new THREE.Vector3(0.12, -0.22, 0);
      camera.aspect = aspect;
      camera.fov = FIXED_PERSPECTIVE.strength;
      const verticalFov = degrees(FIXED_PERSPECTIVE.strength);
      const fitHeightDistance = (sceneHeight * 0.52) / Math.tan(verticalFov / 2);
      const fitWidthDistance = (sceneWidth * 0.52) / (Math.tan(verticalFov / 2) * aspect);
      const distance = Math.max(fitHeightDistance, fitWidthDistance);
      const elevation = degrees(FIXED_PERSPECTIVE.elevation);
      const horizontal = degrees(FIXED_PERSPECTIVE.horizontal);
      camera.position.set(
        target.x + Math.sin(horizontal) * Math.cos(elevation) * distance,
        target.y - Math.sin(elevation) * distance,
        Math.cos(horizontal) * Math.cos(elevation) * distance,
      );
      controls.target.copy(target);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      controls.update();
      renderer.setSize(width, height, false);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }, { rootMargin: "180px" });
    visibilityObserver.observe(host);

    const hitTest = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(clickableMeshes, false)[0]?.object;
    };

    const handlePointerDown = (event: PointerEvent) => {
      const hit = hitTest(event);
      const installationGroup = hit?.userData.installationGroup as THREE.Group | undefined;
      if (!installationGroup) return;
      installationTweens.delete(installationGroup);
      activeDrag = {
        installationGroup,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startRotation: installationGroup.rotation.y,
        moved: false,
        verticalGesture: false,
      };
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
        renderer.domElement.style.cursor = hitTest(event) ? "grab" : "default";
        return;
      }
      const deltaX = event.clientX - activeDrag.startX;
      const deltaY = event.clientY - activeDrag.startY;
      if (!activeDrag.moved && !activeDrag.verticalGesture) {
        if (Math.abs(deltaY) > 4 && Math.abs(deltaY) > Math.abs(deltaX)) {
          activeDrag.verticalGesture = true;
        } else if (Math.abs(deltaX) > 4) {
          activeDrag.moved = true;
        }
      }
      if (activeDrag.verticalGesture || !activeDrag.moved) return;
      event.preventDefault();
      activeDrag.installationGroup.rotation.y = activeDrag.startRotation + deltaX * 0.0095;
    };

    const finishPointer = (event: PointerEvent) => {
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
      const drag = activeDrag;
      activeDrag = null;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grab";

      if (drag.moved || drag.verticalGesture) return;
      installationTweens.set(drag.installationGroup, {
        start: performance.now(),
        from: drag.installationGroup.rotation.y,
        delta: CLICK_ROTATION,
      });
    };

    const cancelPointer = (event: PointerEvent) => {
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
      activeDrag = null;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "default";
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", finishPointer);
    renderer.domElement.addEventListener("pointercancel", cancelPointer);

    const animate = (now: number) => {
      if (disposed) return;
      frame = window.requestAnimationFrame(animate);
      if (!visible) return;

      installationTweens.forEach((tween, installationGroup) => {
        const progress = Math.min(1, (now - tween.start) / 420);
        installationGroup.rotation.y = tween.from + tween.delta * easeInOut(progress);
        if (progress >= 1) installationTweens.delete(installationGroup);
      });
      renderer.render(scene, camera);
    };
    frame = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", finishPointer);
      renderer.domElement.removeEventListener("pointercancel", cancelPointer);
      controls.dispose();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <>
      <img
        className={`wayfinding-fallback${ready && !failed ? " is-hidden" : ""}`}
        src="/showcase/ainow/version-a/04-373.png"
        alt="AI NOW 路标装置"
      />
      <div ref={hostRef} className="wayfinding-canvas" />
      <span className="sr-only">水平拖动任一路牌可旋转所属柱体装置。</span>
    </>
  );
}

export default function WayfindingScene() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 700px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return (
    <section className="wayfinding-scene" aria-label="AI NOW 路标装置">
      <img
        className="wayfinding-mobile-static"
        src="/showcase/ainow/version-a/wayfinding-mobile.png"
        alt="AI NOW 路标装置静态图"
      />
      {!isMobile ? <WayfindingDesktopScene /> : null}
    </section>
  );
}
