'use client';

import dynamic from 'next/dynamic';
import { useEffect, useId, useRef, useState } from 'react';
import { useTrainerVisuals } from '@/components/TrainerVisualContext';
import { cn } from '@/lib/utils';
import TrainerGlassFilter from './TrainerGlassFilter';
import dock from './TrainerClassroomDock.module.css';
import styles from './TrainerActionGroup.module.css';

const Lens = dynamic(() => import('./TrainerDockLens'), { ssr: false });
const ITEMS = 'button, a[href]';

export default function TrainerActionGroup({ children, className, ...props }) {
  const enabled = useTrainerVisuals();
  const id = useId().replaceAll(':', '');
  const [refractive, setRefractive] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [focused, setFocused] = useState(null);
  const [mounted, setMounted] = useState(false);
  const root = useRef(null);
  const timer = useRef(null);
  useEffect(() => {
    setRefractive(/(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent));
    return () => clearTimeout(timer.current);
  }, []);
  const active = hovered !== null || focused !== null;
  useEffect(() => {
    clearTimeout(timer.current);
    if (active) setMounted(true);
    else timer.current = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(timer.current);
  }, [active]);

  if (!enabled) return <div className={className} {...props}>{children}</div>;
  const indexOf = (target) => {
    const button = target.closest?.(ITEMS);
    if (!button || button.matches(':disabled, [aria-disabled="true"]')) return null;
    const index = Array.from(root.current.querySelectorAll(ITEMS)).indexOf(button);
    return index < 0 ? null : index;
  };

  return (
    <div
      {...props}
      ref={root}
      role={props.role || 'group'}
      className={cn(className, dock.dock, styles.group)}
      data-webgl={mounted ? 'loading' : 'fallback'}
      style={refractive ? { '--dock-refraction': `url("#${id}-shell")`, '--lens-refraction': `url("#${id}-lens")` } : undefined}
      onPointerOver={(event) => { if (event.pointerType !== 'touch') setHovered(indexOf(event.target)); }}
      onPointerLeave={() => setHovered(null)}
      onFocusCapture={(event) => {
        if (event.target.matches(':focus-visible')) setHovered(null);
        setFocused(indexOf(event.target));
      }}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null); }}
    >
      {refractive && <TrainerGlassFilter id={`${id}-shell`} scale={17} />}
      {refractive && <TrainerGlassFilter id={`${id}-lens`} scale={18} />}
      {mounted && <Lens itemSelector={ITEMS} targetIndex={hovered ?? focused ?? 0} visible={active} immediate={hovered === null} expanded={hovered !== null} />}
      {children}
    </div>
  );
}
