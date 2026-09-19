'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './live-reports.module.css'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = `
  precision highp float;
  uniform vec2 uResolution;
  uniform vec2 uLensCenter;
  uniform vec2 uLensSize;
  uniform vec2 uLight;
  uniform float uLightStrength;
  uniform float uVisible;
  uniform float uDark;
  varying vec2 vUv;

  float roundedBox(vec2 point, vec2 halfSize, float radius) {
    vec2 q = abs(point) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
  }

  void main() {
    vec2 pixel = vUv * uResolution;
    vec2 point = (vUv - uLensCenter) * uResolution;
    vec2 halfSize = uLensSize * 0.5;
    float distanceToLens = roundedBox(point, halfSize, min(halfSize.y, 28.0));
    float mask = (1.0 - smoothstep(-1.0, 1.6, distanceToLens)) * uVisible;
    if (mask < 0.001) discard;

    vec2 normalPoint = point / max(halfSize, vec2(1.0));
    vec2 normal = normalize(normalPoint + vec2(0.0001));
    float edge = 1.0 - smoothstep(0.5, 9.0, abs(distanceToLens));
    float topReflection = pow(max(dot(normal, normalize(vec2(-0.55, 0.84))), 0.0), 4.0);
    float lightDistance = distance(pixel, uLight);
    float light = (1.0 - smoothstep(0.0, 170.0, lightDistance)) * uLightStrength;
    float facing = pow(max(dot(normal, normalize(uLight - pixel + vec2(0.001))), 0.0), 2.0);

    vec3 base = mix(vec3(0.56, 0.72, 0.80), vec3(0.02, 0.06, 0.10), uDark);
    vec3 edgeTint = mix(vec3(0.22, 0.67, 0.92), vec3(0.10, 0.35, 0.52), uDark);
    vec3 spectral = vec3(edge * 0.025, edge * 0.11, edge * 0.18) * (1.0 - uDark * 0.25);
    vec3 color = base + edgeTint * topReflection * 0.22 + spectral;
    color += vec3(1.0) * light * (0.14 + facing * edge * 0.58);
    float alpha = mask * (mix(0.12, 0.22, uDark) + edge * 0.23 + light * 0.1);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.72));
  }
`

function formatCount(value) {
  return new Intl.NumberFormat().format(value)
}

export default function LiveReportsGallery({ items }) {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const runtimeRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(null)

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    gsap.registerPlugin(ScrollTrigger)
    const root = rootRef.current
    const grid = root?.querySelector(`.${styles.reportGrid}`)
    if (!root || !grid) return undefined
    const context = gsap.context(() => {
      gsap.fromTo(grid.querySelectorAll(`.${styles.reportCard}`),
        { opacity: 0, y: 18, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.72,
          stagger: 0.055,
          ease: 'power3.out',
          scrollTrigger: { trigger: grid, start: 'top 88%', once: true },
        },
      )
    }, root)
    return () => context.revert()
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const reducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)')
    const highContrast = window.matchMedia('(prefers-contrast: more)')
    const forcedColors = window.matchMedia('(forced-colors: active)')
    let renderer
    let material
    let geometry
    let observer
    let frame = 0
    let disposed = false
    let lastTime = performance.now()

    const runtime = {
      enabled: false,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      widthLens: 0,
      heightLens: 0,
      targetWidth: 0,
      targetHeight: 0,
      lightX: 0,
      lightY: 0,
      targetLightX: 0,
      targetLightY: 0,
      lightStrength: 0,
      targetLightStrength: 0,
      requestRender: () => {},
    }
    runtimeRef.current = runtime

    const stop = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }

    const findTarget = () => {
      const index = Number(root.dataset.activeIndex)
      const target = root.querySelector(`[data-report-index="${index}"]`)
      if (!target) return
      const rootRect = root.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      runtime.targetX = targetRect.left - rootRect.left + targetRect.width / 2
      runtime.targetY = targetRect.top - rootRect.top + targetRect.height / 2
      runtime.targetWidth = targetRect.width + 10
      runtime.targetHeight = targetRect.height + 10
    }

    const draw = () => {
      frame = 0
      if (disposed || !runtime.enabled || !renderer || !material) return
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.034)
      lastTime = now
      const ease = reducedMotion.matches ? 1 : 1 - Math.exp(-18 * dt)
      runtime.x += (runtime.targetX - runtime.x) * ease
      runtime.y += (runtime.targetY - runtime.y) * ease
      runtime.widthLens += (runtime.targetWidth - runtime.widthLens) * ease
      runtime.heightLens += (runtime.targetHeight - runtime.heightLens) * ease
      runtime.lightX += (runtime.targetLightX - runtime.lightX) * (1 - Math.exp(-16 * dt))
      runtime.lightY += (runtime.targetLightY - runtime.lightY) * (1 - Math.exp(-16 * dt))
      runtime.lightStrength += (runtime.targetLightStrength - runtime.lightStrength) * (1 - Math.exp(-10 * dt))

      material.uniforms.uLensCenter.value.set(runtime.x / runtime.width, 1 - runtime.y / runtime.height)
      material.uniforms.uLensSize.value.set(runtime.widthLens, runtime.heightLens)
      material.uniforms.uLight.value.set(runtime.lightX, runtime.lightY)
      material.uniforms.uLightStrength.value = runtime.lightStrength
      material.uniforms.uVisible.value = runtime.targetLightStrength > 0.01 ? 1 : 0
      renderer.render(runtime.scene, runtime.camera)

      const moving = Math.abs(runtime.targetX - runtime.x) > 0.08
        || Math.abs(runtime.targetY - runtime.y) > 0.08
        || Math.abs(runtime.targetWidth - runtime.widthLens) > 0.08
        || Math.abs(runtime.targetHeight - runtime.heightLens) > 0.08
        || Math.abs(runtime.lightStrength - runtime.targetLightStrength) > 0.01
      if (moving) frame = requestAnimationFrame(draw)
    }

    const render = () => {
      if (!frame && runtime.enabled) {
        lastTime = performance.now()
        frame = requestAnimationFrame(draw)
      }
    }
    runtime.requestRender = render

    const resize = () => {
      if (!renderer || !material) return
      const rect = root.getBoundingClientRect()
      runtime.width = rect.width
      runtime.height = rect.height
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(rect.width, rect.height, false)
      material.uniforms.uResolution.value.set(rect.width, rect.height)
      findTarget()
      if (!runtime.x) {
        runtime.x = runtime.targetX
        runtime.y = runtime.targetY
        runtime.widthLens = runtime.targetWidth
        runtime.heightLens = runtime.targetHeight
        runtime.lightX = runtime.targetX
        runtime.lightY = runtime.targetY
      }
      render()
    }

    const disable = () => {
      stop()
      runtime.enabled = false
      root.dataset.webgl = 'fallback'
    }

    const enable = () => {
      if (reducedTransparency.matches || highContrast.matches || forcedColors.matches) {
        disable()
        return
      }
      runtime.enabled = true
      root.dataset.webgl = 'active'
      findTarget()
      render()
    }

    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      geometry = new THREE.PlaneGeometry(2, 2)
      material = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        vertexShader,
        fragmentShader,
        uniforms: {
          uResolution: { value: new THREE.Vector2(1, 1) },
          uLensCenter: { value: new THREE.Vector2(0.5, 0.5) },
          uLensSize: { value: new THREE.Vector2(100, 70) },
          uLight: { value: new THREE.Vector2(0, 0) },
          uLightStrength: { value: 0 },
          uVisible: { value: 0 },
          uDark: { value: document.documentElement.classList.contains('dark') ? 1 : 0 },
        },
      })
      const scene = new THREE.Scene()
      const camera = new THREE.Camera()
      scene.add(new THREE.Mesh(geometry, material))
      runtime.scene = scene
      runtime.camera = camera
      canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); disable() })
      observer = new ResizeObserver(resize)
      observer.observe(root)
      resize()
      enable()
    } catch {
      disable()
    }

    const preferenceChanged = () => enable()
    reducedTransparency.addEventListener('change', preferenceChanged)
    highContrast.addEventListener('change', preferenceChanged)
    forcedColors.addEventListener('change', preferenceChanged)

    return () => {
      disposed = true
      stop()
      observer?.disconnect()
      reducedTransparency.removeEventListener('change', preferenceChanged)
      highContrast.removeEventListener('change', preferenceChanged)
      forcedColors.removeEventListener('change', preferenceChanged)
      geometry?.dispose()
      material?.dispose()
      renderer?.dispose()
      runtimeRef.current = null
    }
  }, [])

  useEffect(() => {
    if (activeIndex === null || !rootRef.current) return
    rootRef.current.dataset.activeIndex = String(activeIndex)
    rootRef.current.querySelector(`[data-report-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    const runtime = runtimeRef.current
    if (runtime) {
      const target = rootRef.current.querySelector(`[data-report-index="${activeIndex}"]`)
      if (target && runtime.width && runtime.height) {
        const rootRect = rootRef.current.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        runtime.targetX = targetRect.left - rootRect.left + targetRect.width / 2
        runtime.targetY = targetRect.top - rootRect.top + targetRect.height / 2
        runtime.targetWidth = targetRect.width + 10
        runtime.targetHeight = targetRect.height + 10
        runtime.targetLightX = runtime.targetX
        runtime.targetLightY = runtime.targetY
        runtime.targetLightStrength = 1
        runtime.requestRender?.()
      }
    }
  }, [activeIndex])

  const handleLeave = (event) => {
    if (event.relatedTarget && rootRef.current?.contains(event.relatedTarget)) return
    setActiveIndex(null)
    if (rootRef.current) rootRef.current.removeAttribute('data-active-index')
    const runtime = runtimeRef.current
    if (runtime) {
      runtime.targetLightStrength = 0
      runtime.requestRender?.()
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      {items.length === 0 ? (
        <section className={styles.emptyState} aria-live="polite">
          <p>No shared reports are available yet.</p>
          <span>When a contest room is published, it will appear here.</span>
        </section>
      ) : (
        <section
          ref={rootRef}
          className={styles.workspace}
          data-active-index="0"
          data-webgl="fallback"
          onPointerLeave={handleLeave}
          onFocusCapture={(event) => {
            const index = event.target.closest?.('[data-report-index]')?.dataset.reportIndex
            if (index !== undefined) setActiveIndex(Number(index))
          }}
          onPointerMove={(event) => {
            const index = event.target.closest?.('[data-report-index]')?.dataset.reportIndex
            if (index !== undefined) setActiveIndex(Number(index))
          }}
        >
          <canvas ref={canvasRef} className={styles.shader} aria-hidden="true" />
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionKicker}>Shared report index</p>
              <h2>Find the room you want to follow.</h2>
            </div>
            <span className={styles.sectionCount}>{formatCount(items.length)} rooms</span>
          </div>

          <div className={styles.reportGrid}>
            {items.map((item, index) => (
              <article key={item.id} className={styles.reportCard} data-report-index={index}>
                <Link
                  className={styles.reportLink}
                  href={`/contests_report/live/${encodeURIComponent(item.id)}`}
                  onFocus={() => setActiveIndex(index)}
                  onPointerEnter={() => setActiveIndex(index)}
                >
                  <span className={styles.cardIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles.reportName}>{item.name}</span>
                  <span className={styles.reportMeta}>
                    <span>{item.contests} contests</span>
                    <span>{item.participants} participants</span>
                  </span>
                  <span className={styles.reportUpdated}>Updated {item.updated}</span>
                  <span className={styles.reportCta}>View live report <span aria-hidden="true">↗</span></span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
