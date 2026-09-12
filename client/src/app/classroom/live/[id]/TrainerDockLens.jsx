'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './TrainerClassroomDock.module.css';

const CANVAS_PADDING = 12;

const VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec2 uResolution;
  uniform vec2 uDockSize;
  uniform vec2 uLensCenter;
  uniform vec2 uLensSize;
  uniform vec2 uLightPosition;
  uniform float uLightStrength;
  uniform float uDispersion;
  uniform float uHighlight;
  uniform float uDark;
  uniform float uLensVisible;
  varying vec2 vUv;

  float roundedBox(vec2 point, vec2 halfSize, float radius) {
    vec2 q = abs(point) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
  }

  void main() {
    vec2 fragmentPosition = vUv * uResolution;
    vec2 toLight = uLightPosition - fragmentPosition;
    float lightDistance = length(toLight);
    vec2 lightDirection = normalize(toLight + vec2(0.0001));
    float lightFalloff = 1.0 - smoothstep(12.0, 170.0, lightDistance);
    float lightCore = 1.0 - smoothstep(0.0, 82.0, lightDistance);

    vec2 dockPoint = (vUv - vec2(0.5)) * uResolution;
    vec2 dockHalfSize = uDockSize * 0.5;
    float dockDistance = roundedBox(dockPoint, dockHalfSize, min(dockHalfSize.y, 28.0));
    float dockMask = 1.0 - smoothstep(-0.7, 1.2, dockDistance);
    float dockEdge = 1.0 - smoothstep(0.4, 3.2, abs(dockDistance));

    vec2 point = (vUv - uLensCenter) * uResolution;
    vec2 halfSize = uLensSize * 0.5;
    float radius = min(halfSize.y, 36.0);
    float distanceToLens = roundedBox(point, halfSize, radius);
    float lensMask = (1.0 - smoothstep(-0.6, 1.2, distanceToLens)) * uLensVisible;

    if (max(dockMask, lensMask) <= 0.001) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec3 dockGlass = mix(vec3(0.60, 0.70, 0.75), vec3(0.018, 0.032, 0.045), uDark);
    vec3 dockEdgeTint = mix(vec3(0.42, 0.58, 0.68), vec3(0.15, 0.24, 0.30), uDark);
    vec2 dockNormal = normalize(dockPoint / max(dockHalfSize, vec2(1.0)) + vec2(0.0001));
    float dockFacing = pow(max(dot(dockNormal, lightDirection), 0.0), 2.0);
    float dockLight = uLightStrength * (lightCore * 0.58 + lightFalloff * dockFacing * dockEdge * 0.42);
    float dockVisibility = dockMask * (1.0 - lensMask);
    dockEdge *= 1.0 - lensMask;
    vec3 color = dockGlass + vec3(1.0) * dockLight * dockVisibility * 0.58;
    float alpha = dockVisibility * (mix(0.045, 0.12, uDark) + dockEdge * 0.10 + dockLight * 0.08);
    color = mix(color, dockEdgeTint, dockEdge * 0.36);

    vec2 normalizedPoint = point / max(halfSize, vec2(1.0));
    vec2 normal = normalize(normalizedPoint + vec2(0.0001));
    float edge = 1.0 - smoothstep(0.8, 7.0, abs(distanceToLens));
    float topLight = pow(max(dot(normal, normalize(vec2(-0.62, 0.78))), 0.0), 5.0);
    float bottomShade = pow(max(dot(normal, normalize(vec2(0.42, -0.9))), 0.0), 4.0);
    float split = edge * uDispersion * 0.006;
    float lensFacing = pow(max(dot(normal, lightDirection), 0.0), 2.4);
    float pointerLight = uLightStrength * (lightCore * 0.72 + lightFalloff * (0.16 + lensFacing * edge * 0.84));
    vec3 spectrum = vec3(split * 0.65, split * 0.12, -split * 0.45)
      + vec3(0.012, 0.002, -0.008) * lensFacing * lightFalloff * uLightStrength * uDispersion;
    vec3 lensGlass = mix(vec3(0.64, 0.76, 0.81), vec3(0.026, 0.046, 0.063), uDark);
    vec3 lensEdgeTint = mix(vec3(0.34, 0.52, 0.62), vec3(0.12, 0.22, 0.29), uDark);
    lensGlass = mix(lensGlass, lensEdgeTint, topLight * edge * uHighlight * 0.34);
    lensGlass -= vec3(0.018, 0.026, 0.034) * bottomShade * edge;
    lensGlass += spectrum;
    lensGlass += vec3(1.0) * pointerLight * 0.72;

    float lensAlpha = lensMask * (mix(0.075, 0.17, uDark) + edge * 0.17 + pointerLight * 0.10);
    float lensMix = lensMask * clamp(lensAlpha + 0.34, 0.0, 1.0);
    color = mix(color, lensGlass, lensMix);
    alpha = max(alpha, lensAlpha);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.58));
  }
`;

export default function TrainerDockLens({ targetIndex, immediate = false, expanded = false, itemSelector, visible = true }) {
  const canvasRef = useRef(null);
  const backdropRef = useRef(null);
  const runtimeRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const backdrop = backdropRef.current;
    const root = canvas?.parentElement;
    if (!canvas || !backdrop || !root) return undefined;

    let disposed = false;
    let renderer;
    let material;
    let geometry;
    let observer;
    let frame = 0;
    let lastTime = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const highContrast = window.matchMedia('(prefers-contrast: more)');
    const forcedColors = window.matchMedia('(forced-colors: active)');

    const runtime = {
      active: false,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      targetY: 0,
      yVelocity: 0,
      targetX: 0,
      lensWidth: 64,
      targetLensWidth: 64,
      lensHeight: 52,
      targetLensHeight: 52,
      velocity: 0,
      widthVelocity: 0,
      heightVelocity: 0,
      expanded: false,
      lightX: 0,
      lightY: 0,
      targetLightX: 0,
      targetLightY: 0,
      lightStrength: 0,
      targetLightStrength: 0,
      targetIndex: 0,
      moveTo: () => {},
      requestRender: () => {},
    };
    runtimeRef.current = runtime;

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const readTarget = () => {
      const item = itemSelector
        ? root.querySelectorAll(itemSelector)[runtime.targetIndex]
        : root.querySelector(`[data-dock-index="${runtime.targetIndex}"]`);
      if (!item) return;
      const rootRect = root.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      runtime.targetY = itemRect.top - rootRect.top + itemRect.height / 2;
      runtime.targetX = itemRect.left - rootRect.left + itemRect.width / 2;
      runtime.targetLensWidth = Math.max(54, itemRect.width + (runtime.expanded ? 20 : 4));
      runtime.targetLensHeight = Math.max(44, itemSelector ? itemRect.height + (runtime.expanded ? 8 : 0) : runtime.height + (runtime.expanded ? 12 : -8));
    };

    const positionBackdrop = () => {
      backdrop.style.width = `${runtime.lensWidth}px`;
      backdrop.style.height = `${runtime.lensHeight}px`;
      backdrop.style.top = `${runtime.y - runtime.lensHeight / 2}px`;
      backdrop.style.transform = `translate3d(${runtime.x - runtime.lensWidth / 2}px, 0, 0)`;
    };

    const draw = () => {
      const now = performance.now();
      frame = 0;
      if (disposed || !runtime.active || !renderer || !material) return;
      const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.034));
      lastTime = now;

      if (reducedMotion.matches || runtime.immediate) {
        runtime.x = runtime.targetX;
        runtime.y = runtime.targetY;
        runtime.yVelocity = 0;
        runtime.lensWidth = runtime.targetLensWidth;
        runtime.lensHeight = runtime.targetLensHeight;
        runtime.velocity = 0;
        runtime.widthVelocity = 0;
        runtime.heightVelocity = 0;
        runtime.immediate = false;
      } else {
        const yAcceleration = (runtime.targetY - runtime.y) * 205;
        runtime.yVelocity = (runtime.yVelocity + yAcceleration * dt) * Math.exp(-23 * dt);
        runtime.y += runtime.yVelocity * dt;
        const acceleration = (runtime.targetX - runtime.x) * 205;
        runtime.velocity = (runtime.velocity + acceleration * dt) * Math.exp(-23 * dt);
        runtime.x += runtime.velocity * dt;
        const widthAcceleration = (runtime.targetLensWidth - runtime.lensWidth) * 205;
        runtime.widthVelocity = (runtime.widthVelocity + widthAcceleration * dt) * Math.exp(-23 * dt);
        runtime.lensWidth += runtime.widthVelocity * dt;
        const heightAcceleration = (runtime.targetLensHeight - runtime.lensHeight) * 205;
        runtime.heightVelocity = (runtime.heightVelocity + heightAcceleration * dt) * Math.exp(-23 * dt);
        runtime.lensHeight += runtime.heightVelocity * dt;
      }

      const lightEase = reducedMotion.matches ? 1 : 1 - Math.exp(-18 * dt);
      const strengthEase = reducedMotion.matches ? 1 : 1 - Math.exp(-12 * dt);
      runtime.lightX += (runtime.targetLightX - runtime.lightX) * lightEase;
      runtime.lightY += (runtime.targetLightY - runtime.lightY) * lightEase;
      runtime.lightStrength += (runtime.targetLightStrength - runtime.lightStrength) * strengthEase;

      const renderWidth = runtime.width + CANVAS_PADDING * 2;
      material.uniforms.uLensCenter.value.x = (runtime.x + CANVAS_PADDING) / Math.max(renderWidth, 1);
      material.uniforms.uLensCenter.value.y = 1 - (runtime.y + CANVAS_PADDING) / Math.max(runtime.height + CANVAS_PADDING * 2, 1);
      material.uniforms.uLensVisible.value = runtime.visible === false ? 0 : 1;
      material.uniforms.uLensSize.value.set(runtime.lensWidth, runtime.lensHeight);
      material.uniforms.uLightPosition.value.set(runtime.lightX, runtime.lightY);
      material.uniforms.uLightStrength.value = runtime.lightStrength;
      positionBackdrop();
      renderer.render(runtime.scene, runtime.camera);

      const moving = Math.abs(runtime.targetY - runtime.y) > 0.08
        || Math.abs(runtime.yVelocity) > 0.08
        || Math.abs(runtime.targetX - runtime.x) > 0.08
        || Math.abs(runtime.velocity) > 0.08
        || Math.abs(runtime.targetLensWidth - runtime.lensWidth) > 0.08
        || Math.abs(runtime.widthVelocity) > 0.08
        || Math.abs(runtime.targetLensHeight - runtime.lensHeight) > 0.08
        || Math.abs(runtime.heightVelocity) > 0.08
        || Math.abs(runtime.targetLightX - runtime.lightX) > 0.08
        || Math.abs(runtime.targetLightY - runtime.lightY) > 0.08
        || Math.abs(runtime.targetLightStrength - runtime.lightStrength) > 0.006;
      if (moving) frame = requestAnimationFrame(draw);
    };

    runtime.requestRender = () => {
      if (!frame && runtime.active) {
        lastTime = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    runtime.moveTo = (index, moveImmediately = false, shouldExpand = false) => {
      runtime.targetIndex = index;
      runtime.immediate = moveImmediately;
      runtime.expanded = shouldExpand;
      readTarget();
      if (!runtime.active) {
        runtime.x = runtime.targetX;
        runtime.y = runtime.targetY;
        runtime.yVelocity = 0;
        runtime.lensWidth = runtime.targetLensWidth;
        runtime.lensHeight = runtime.targetLensHeight;
        positionBackdrop();
      }
      runtime.requestRender();
    };

    const resize = () => {
      if (!renderer || !material) return;
      const rect = root.getBoundingClientRect();
      runtime.width = rect.width;
      runtime.height = rect.height;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      const renderWidth = rect.width + CANVAS_PADDING * 2;
      const renderHeight = rect.height + CANVAS_PADDING * 2;
      renderer.setSize(renderWidth, renderHeight, false);
      material.uniforms.uResolution.value.set(renderWidth, renderHeight);
      material.uniforms.uDockSize.value.set(rect.width, rect.height);
      readTarget();
      if (!runtime.x) {
        runtime.x = runtime.targetX;
        runtime.y = runtime.targetY;
        runtime.yVelocity = 0;
        runtime.lensWidth = runtime.targetLensWidth;
        runtime.lensHeight = runtime.targetLensHeight;
      }
      if (!runtime.lightX && !runtime.lightY) {
        runtime.lightX = renderWidth * 0.5;
        runtime.lightY = renderHeight * 0.5;
        runtime.targetLightX = runtime.lightX;
        runtime.targetLightY = runtime.lightY;
      }
      positionBackdrop();
      runtime.requestRender();
    };

    const disableWebGL = () => {
      stop();
      runtime.active = false;
      root.dataset.webgl = 'fallback';
    };

    const enableWebGL = () => {
      if (reducedTransparency.matches || highContrast.matches || forcedColors.matches) {
        disableWebGL();
        return;
      }
      runtime.active = true;
      root.dataset.webgl = 'active';
      runtime.requestRender();
    };

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      material = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uResolution: { value: new THREE.Vector2(1, 1) },
          uDockSize: { value: new THREE.Vector2(1, 1) },
          uLensCenter: { value: new THREE.Vector2(0.5, 0.5) },
          uLensSize: { value: new THREE.Vector2(64, 52) },
          uLightPosition: { value: new THREE.Vector2(0.5, 0.5) },
          uLightStrength: { value: 0 },
          uDispersion: { value: 2.4 },
          uHighlight: { value: 0.65 },
          uLensVisible: { value: 1 },
          uDark: { value: document.documentElement.classList.contains('dark') ? 1 : 0 },
        },
      });
      geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, material);
      const scene = new THREE.Scene();
      const camera = new THREE.Camera();
      scene.add(mesh);
      runtime.scene = scene;
      runtime.camera = camera;

      const handleContextLost = (event) => {
        event.preventDefault();
        disableWebGL();
      };
      runtime.handleContextLost = handleContextLost;
      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', enableWebGL);
      observer = new ResizeObserver(resize);
      observer.observe(root);
      resize();
      enableWebGL();
    } catch {
      disableWebGL();
    }

    const preferenceChanged = () => enableWebGL();
    reducedTransparency.addEventListener('change', preferenceChanged);
    highContrast.addEventListener('change', preferenceChanged);
    forcedColors.addEventListener('change', preferenceChanged);

    const handlePointerMove = (event) => {
      if (event.pointerType === 'touch') return;
      const rect = root.getBoundingClientRect();
      runtime.targetLightX = event.clientX - rect.left + CANVAS_PADDING;
      runtime.targetLightY = rect.height - (event.clientY - rect.top) + CANVAS_PADDING;
      runtime.targetLightStrength = 1;
      runtime.requestRender();
    };

    const handlePointerLeave = () => {
      runtime.targetLightStrength = 0;
      runtime.requestRender();
    };

    root.addEventListener('pointermove', handlePointerMove);
    root.addEventListener('pointerover', handlePointerMove);
    root.addEventListener('pointerleave', handlePointerLeave);
    root.addEventListener('mousemove', handlePointerMove);
    root.addEventListener('mouseenter', handlePointerMove);
    root.addEventListener('mouseleave', handlePointerLeave);

    const themeObserver = new MutationObserver(() => {
      if (!material) return;
      material.uniforms.uDark.value = document.documentElement.classList.contains('dark') ? 1 : 0;
      runtime.requestRender();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      disposed = true;
      stop();
      observer?.disconnect();
      themeObserver.disconnect();
      reducedTransparency.removeEventListener('change', preferenceChanged);
      highContrast.removeEventListener('change', preferenceChanged);
      forcedColors.removeEventListener('change', preferenceChanged);
      root.removeEventListener('pointermove', handlePointerMove);
      root.removeEventListener('pointerover', handlePointerMove);
      root.removeEventListener('pointerleave', handlePointerLeave);
      root.removeEventListener('mousemove', handlePointerMove);
      root.removeEventListener('mouseenter', handlePointerMove);
      root.removeEventListener('mouseleave', handlePointerLeave);
      if (runtime.handleContextLost) canvas.removeEventListener('webglcontextlost', runtime.handleContextLost);
      canvas.removeEventListener('webglcontextrestored', enableWebGL);
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
      runtimeRef.current = null;
    };
  }, [itemSelector]);

  useEffect(() => {
    if (runtimeRef.current) runtimeRef.current.visible = visible;
    if (backdropRef.current) backdropRef.current.style.visibility = visible ? "visible" : "hidden";
    runtimeRef.current?.moveTo(targetIndex, immediate, expanded);
  }, [expanded, immediate, targetIndex, visible]);

  return (
    <>
      <span className={styles.dockBackdrop} aria-hidden="true" />
      <span ref={backdropRef} className={styles.lensBackdrop} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.webglCanvas} aria-hidden="true" />
    </>
  );
}
