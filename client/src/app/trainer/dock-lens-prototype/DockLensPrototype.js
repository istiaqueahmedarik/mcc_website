'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Library,
  MoreHorizontal,
  Newspaper,
  Radio,
  SlidersHorizontal,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import * as THREE from 'three';
import styles from './DockLensPrototype.module.css';

const ITEMS = [
  { label: 'Updates', icon: 'updates', Icon: Newspaper },
  { label: 'Live', icon: 'live', Icon: Radio },
  { label: 'Topics', icon: 'topics', Icon: Library },
  { label: 'People', icon: 'people', Icon: Users },
  { label: 'Contests', icon: 'contests', Icon: Trophy },
  { label: 'More', icon: 'more', Icon: MoreHorizontal },
];

const VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uLensCenter;
  uniform vec2 uLensSize;
  uniform float uDepth;
  uniform float uDispersion;
  uniform float uHighlight;
  uniform float uDark;
  varying vec2 vUv;

  float roundedBox(vec2 point, vec2 halfSize, float radius) {
    vec2 q = abs(point) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
  }

  void main() {
    vec2 point = (vUv - uLensCenter) * uResolution;
    vec2 halfSize = uLensSize * 0.5;
    float radius = min(halfSize.y, 28.0);
    float distanceToLens = roundedBox(point, halfSize, radius);
    float lensMask = 1.0 - smoothstep(-1.0, 1.2, distanceToLens);

    vec4 base = texture2D(uTexture, vUv);
    if (lensMask <= 0.001) {
      gl_FragColor = base;
      return;
    }

    vec2 normalizedPoint = point / max(halfSize, vec2(1.0));
    vec2 normal = normalize(normalizedPoint + vec2(0.0001));
    float edgeDistance = clamp(1.0 - abs(distanceToLens) / max(halfSize.y, 1.0), 0.0, 1.0);
    float curvature = pow(edgeDistance, 2.15);
    vec2 bend = normal * curvature * uDepth / uResolution;
    vec2 colorSplit = normal * curvature * uDispersion / uResolution;

    vec4 refracted = texture2D(uTexture, vUv - bend);
    refracted.r = texture2D(uTexture, vUv - bend - colorSplit).r;
    refracted.b = texture2D(uTexture, vUv - bend + colorSplit).b;

    float innerRim = smoothstep(13.0, 0.5, abs(distanceToLens));
    float topLight = pow(max(dot(normal, normalize(vec2(-0.62, 0.78))), 0.0), 5.0);
    float bottomShade = pow(max(dot(normal, normalize(vec2(0.42, -0.9))), 0.0), 4.0);
    vec3 glassTint = mix(vec3(0.96, 0.985, 1.0), vec3(0.065, 0.09, 0.13), uDark);
    float materialAlpha = mix(0.18, 0.32, uDark) + innerRim * 0.08;
    vec3 material = glassTint * materialAlpha;
    vec3 lighting = vec3(1.0, 0.985, 0.94) * topLight * innerRim * uHighlight;
    lighting -= vec3(0.025, 0.04, 0.065) * bottomShade * innerRim;

    vec3 finalColor = refracted.rgb * refracted.a + material + lighting;
    float finalAlpha = max(refracted.a, materialAlpha + innerRim * 0.14) * lensMask;
    gl_FragColor = vec4(finalColor, clamp(finalAlpha, 0.0, 0.96));
  }
`;

function readThemeColor(token, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!value) return fallback;
  const probe = document.createElement('canvas').getContext('2d');
  probe.fillStyle = fallback;
  probe.fillStyle = `hsl(${value})`;
  return probe.fillStyle;
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawIcon(context, name, x, y, color, scale = 1) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 1.9;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  if (name === 'updates') {
    roundedRect(context, -8, -8, 16, 16, 4);
    context.stroke();
    context.beginPath();
    context.moveTo(-4, -3);
    context.lineTo(4, -3);
    context.moveTo(-4, 1);
    context.lineTo(2, 1);
    context.moveTo(-4, 5);
    context.lineTo(4, 5);
    context.stroke();
  } else if (name === 'live') {
    context.beginPath();
    context.arc(0, 0, 2.6, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(0, 0, 7, -0.88, 0.88);
    context.moveTo(4.45, -5.4);
    context.arc(0, 0, 7, Math.PI - 0.88, Math.PI + 0.88);
    context.stroke();
  } else if (name === 'topics') {
    context.beginPath();
    context.moveTo(-8, -6);
    context.quadraticCurveTo(-2, -9, 0, -5);
    context.quadraticCurveTo(2, -9, 8, -6);
    context.lineTo(8, 7);
    context.quadraticCurveTo(2, 4, 0, 8);
    context.quadraticCurveTo(-2, 4, -8, 7);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(0, -5);
    context.lineTo(0, 8);
    context.stroke();
  } else if (name === 'people') {
    context.beginPath();
    context.arc(-3.5, -3, 3.1, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(4.5, -2, 2.5, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(-3.5, 7, 6.2, Math.PI + 0.35, Math.PI * 2 - 0.35);
    context.moveTo(2, 4.5);
    context.arc(4.5, 6.5, 4.8, Math.PI + 0.55, Math.PI * 2 - 0.5);
    context.stroke();
  } else if (name === 'contests') {
    context.beginPath();
    context.moveTo(-6, -8);
    context.lineTo(6, -8);
    context.lineTo(5, -1);
    context.quadraticCurveTo(4, 5, 0, 6);
    context.quadraticCurveTo(-4, 5, -5, -1);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(-6, -5);
    context.lineTo(-10, -5);
    context.quadraticCurveTo(-10, 1, -5, 1);
    context.moveTo(6, -5);
    context.lineTo(10, -5);
    context.quadraticCurveTo(10, 1, 5, 1);
    context.moveTo(0, 6);
    context.lineTo(0, 10);
    context.moveTo(-4, 10);
    context.lineTo(4, 10);
    context.stroke();
  } else {
    [-6, 0, 6].forEach((offset) => {
      context.beginPath();
      context.arc(offset, 0, 1.75, 0, Math.PI * 2);
      context.fill();
    });
  }
  context.restore();
}

function paintDockTexture(canvas, width, height, pixelRatio, selectedIndex, lensX) {
  const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
  const pixelHeight = Math.max(1, Math.round(height * pixelRatio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext('2d');
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const foreground = readThemeColor('--foreground', '#172033');
  const primary = readThemeColor('--primary', '#245b9b');
  const itemWidth = width / ITEMS.length;

  ITEMS.forEach((item, index) => {
    const color = index === selectedIndex ? primary : foreground;
    const centerX = itemWidth * (index + 0.5);
    const distanceFromLens = Math.abs(lensX - centerX);
    const proximity = Math.max(0, Math.min(1, 1 - distanceFromLens / (itemWidth * 0.72)));
    const lensFocus = proximity * proximity * (3 - 2 * proximity);
    const iconY = 21 + lensFocus * 9;
    const iconScale = 1 + lensFocus * 0.12;

    drawIcon(context, item.icon, centerX, iconY, color, iconScale);
    context.save();
    context.globalAlpha = Math.max(0, 1 - lensFocus * 1.35);
    context.fillStyle = color;
    context.font = `${index === selectedIndex ? 650 : 540} 11px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(item.label, centerX, 43);
    context.restore();
  });
}

function WebGLDock({ settings, onRenderingChange }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const moveLens = useCallback((index, immediate = false) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.targetIndex = index;
    const width = runtime.width / ITEMS.length;
    runtime.targetX = width * (index + 0.5);
    if (immediate) {
      runtime.x = runtime.targetX;
      runtime.velocity = 0;
    }
    runtime.requestRender();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return undefined;

    let disposed = false;
    let renderer;
    let frame = 0;
    let observer;
    let material;
    let texture;
    let geometry;
    let lastTime = performance.now();
    const source = document.createElement('canvas');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const highContrast = window.matchMedia('(prefers-contrast: more)');

    const runtime = {
      width: 0,
      height: 0,
      x: 0,
      targetX: 0,
      velocity: 0,
      selectedIndex: 0,
      targetIndex: 0,
      active: false,
      requestRender: () => {},
    };
    runtimeRef.current = runtime;

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const render = (now = performance.now()) => {
      frame = 0;
      if (disposed || !renderer || !material || !runtime.active) return;
      const dt = Math.min((now - lastTime) / 1000, 0.034);
      lastTime = now;

      if (reducedMotion.matches) {
        runtime.x = runtime.targetX;
        runtime.velocity = 0;
      } else {
        const acceleration = (runtime.targetX - runtime.x) * 205;
        runtime.velocity = (runtime.velocity + acceleration * dt) * Math.exp(-23 * dt);
        runtime.x += runtime.velocity * dt;
      }

      material.uniforms.uLensCenter.value.x = runtime.x / Math.max(runtime.width, 1);
      updateArtwork();
      renderer.render(runtime.scene, runtime.camera);

      if (Math.abs(runtime.targetX - runtime.x) > 0.08 || Math.abs(runtime.velocity) > 0.08) {
        frame = requestAnimationFrame(render);
      }
    };

    runtime.requestRender = () => {
      if (!frame && runtime.active) {
        lastTime = performance.now();
        frame = requestAnimationFrame(render);
      }
    };

    const updateArtwork = () => {
      if (!texture || !runtime.width || !runtime.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      paintDockTexture(source, runtime.width, runtime.height, ratio, runtime.selectedIndex, runtime.x);
      texture.needsUpdate = true;
    };

    const resize = () => {
      if (!renderer || !material) return;
      const rect = root.getBoundingClientRect();
      runtime.width = rect.width;
      runtime.height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(ratio);
      renderer.setSize(rect.width, rect.height, false);
      material.uniforms.uResolution.value.set(rect.width, rect.height);
      material.uniforms.uLensSize.value.set(Math.max(52, rect.width / ITEMS.length + 8), Math.max(50, rect.height - 8));
      runtime.targetX = (rect.width / ITEMS.length) * (runtime.targetIndex + 0.5);
      if (!runtime.x) runtime.x = runtime.targetX;
      updateArtwork();
      runtime.requestRender();
    };

    const disableWebGL = () => {
      stop();
      runtime.active = false;
      root.dataset.webgl = 'fallback';
      onRenderingChange('fallback');
    };

    const enableWebGL = () => {
      if (reducedTransparency.matches || highContrast.matches) {
        disableWebGL();
        return;
      }
      runtime.active = true;
      root.dataset.webgl = 'active';
      onRenderingChange('active');
      updateArtwork();
      runtime.requestRender();
    };

    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      texture = new THREE.CanvasTexture(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      material = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uTexture: { value: texture },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uLensCenter: { value: new THREE.Vector2(0.5, 0.5) },
          uLensSize: { value: new THREE.Vector2(60, 52) },
          uDepth: { value: 9 },
          uDispersion: { value: 2.4 },
          uHighlight: { value: 0.65 },
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

      canvas.addEventListener('webglcontextlost', disableWebGL);
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

    const themeObserver = new MutationObserver(() => {
      if (!material) return;
      material.uniforms.uDark.value = document.documentElement.classList.contains('dark') ? 1 : 0;
      updateArtwork();
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
      canvas.removeEventListener('webglcontextlost', disableWebGL);
      canvas.removeEventListener('webglcontextrestored', enableWebGL);
      geometry?.dispose();
      material?.dispose();
      texture?.dispose();
      renderer?.dispose();
      runtimeRef.current = null;
    };
  }, [onRenderingChange]);

  useEffect(() => {
    const material = runtimeRef.current?.scene?.children?.[0]?.material;
    if (!material?.uniforms) return;
    material.uniforms.uDepth.value = settings.depth;
    material.uniforms.uDispersion.value = settings.dispersion;
    material.uniforms.uHighlight.value = settings.highlight;
    runtimeRef.current.requestRender();
  }, [settings]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime?.active || !runtimeRef.current) return;
    runtime.selectedIndex = selectedIndex;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const source = runtime.scene?.children?.[0]?.material?.uniforms?.uTexture?.value?.image;
    if (source) {
      paintDockTexture(source, runtime.width, runtime.height, ratio, selectedIndex, runtime.x);
      runtime.scene.children[0].material.uniforms.uTexture.value.needsUpdate = true;
    }
    runtime.requestRender();
  }, [selectedIndex]);

  const selectItem = (index, event) => {
    if (runtimeRef.current) runtimeRef.current.selectedIndex = index;
    setSelectedIndex(index);
    moveLens(index, event.detail === 0);
  };

  return (
    <nav ref={rootRef} className={styles.dock} aria-label="Trainer classroom prototype navigation" data-webgl="loading">
      <canvas ref={canvasRef} className={styles.webglCanvas} aria-hidden="true" />
      <div className={styles.items}>
        {ITEMS.map((item, index) => {
          const Icon = item.Icon;
          return (
            <button
              key={item.label}
              type="button"
              className={styles.item}
              aria-current={selectedIndex === index ? 'page' : undefined}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'touch') moveLens(index);
              }}
              onPointerLeave={() => moveLens(runtimeRef.current?.selectedIndex ?? selectedIndex)}
              onFocus={() => moveLens(index, true)}
              onBlur={() => moveLens(selectedIndex, true)}
              onClick={(event) => selectItem(index, event)}
            >
              <span className={styles.fallbackArtwork} aria-hidden="true">
                <Icon />
                <span>{item.label}</span>
              </span>
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Control({ label, value, min, max, step, onChange }) {
  const precision = String(step).split('.')[1]?.length ?? 0;
  return (
    <label className={styles.control}>
      <span>
        <span>{label}</span>
        <output>{value.toFixed(precision)}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function DockLensPrototype() {
  const [rendering, setRendering] = useState('loading');
  const [settings, setSettings] = useState({ depth: 9, dispersion: 2.4, highlight: 0.65 });
  const updateSetting = (key) => (value) => setSettings((current) => ({ ...current, [key]: value }));
  const handleRenderingChange = useCallback((value) => setRendering(value), []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/trainer/dashboard" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" />
          Trainer dashboard
        </Link>
        <div className={styles.status} data-state={rendering} aria-live="polite">
          <span aria-hidden="true" />
          {rendering === 'active' ? 'WebGL active' : rendering === 'fallback' ? 'CSS fallback' : 'Starting renderer'}
        </div>
      </header>

      <section className={styles.intro} aria-labelledby="prototype-title">
        <p className={styles.eyebrow}>Interaction study · isolated route</p>
        <h1 id="prototype-title">A lens that feels attached to the dock.</h1>
        <p>
          Move across the destinations and click to set the resting position. The shader bends a synchronized copy of the dock artwork while the real HTML controls remain in place.
        </p>
      </section>

      <section className={styles.stage} aria-label="Interactive WebGL dock prototype">
        <div className={styles.stageChrome}>
          <div>
            <span className={styles.classCode}>CSE 221</span>
            <h2>Competitive Programming Lab</h2>
          </div>
          <div className={styles.avatarStack} aria-hidden="true">
            <span>RA</span><span>NS</span><span>+8</span>
          </div>
        </div>

        <div className={styles.mockGrid} aria-hidden="true">
          <article className={styles.heroCard}>
            <span>Live session</span>
            <strong>Graph traversal clinic</strong>
            <small>12 students active · 4 need review</small>
          </article>
          <article className={styles.progressCard}>
            <span>Today</span>
            <strong>68%</strong>
            <div><i style={{ width: '68%' }} /></div>
          </article>
          <article className={styles.listCard}>
            <span>Needs attention</span>
            <p><i className={styles.amber} /> 3 pending submissions</p>
            <p><i className={styles.blue} /> 2 contest reports</p>
          </article>
        </div>

        <div className={styles.dockPosition}>
          <WebGLDock settings={settings} onRenderingChange={handleRenderingChange} />
        </div>
      </section>

      <section className={styles.tuning} aria-labelledby="tuning-title">
        <div className={styles.tuningHeading}>
          <span><SlidersHorizontal aria-hidden="true" /></span>
          <div>
            <h2 id="tuning-title">Tune the material</h2>
            <p>These values update the shader directly.</p>
          </div>
        </div>
        <div className={styles.controls}>
          <Control label="Refraction" value={settings.depth} min={2} max={18} step={1} onChange={updateSetting('depth')} />
          <Control label="Dispersion" value={settings.dispersion} min={0} max={6} step={0.2} onChange={updateSetting('dispersion')} />
          <Control label="Highlight" value={settings.highlight} min={0} max={1.2} step={0.05} onChange={updateSetting('highlight')} />
        </div>
        <div className={styles.notes}>
          <p><Check aria-hidden="true" /> Real buttons retain focus and pointer behavior</p>
          <p><Check aria-hidden="true" /> Renderer sleeps when the lens settles</p>
          <p><Check aria-hidden="true" /> Reduced transparency uses the CSS fallback</p>
        </div>
      </section>
    </main>
  );
}
