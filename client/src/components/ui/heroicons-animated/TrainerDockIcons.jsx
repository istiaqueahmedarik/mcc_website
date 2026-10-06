'use client';

// Icon paths and motion studies adapted from heroicons-animated.com (MIT).
// See LICENSE in this directory for the upstream copyright notice.
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

function createAnimatedIcon(displayName, renderIcon) {
  const Icon = forwardRef(function AnimatedIcon(
    { onMouseEnter, onMouseLeave, className = '', size = 28, ...props },
    ref,
  ) {
    const controls = useAnimation();
    const reducedMotion = useReducedMotion();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => reducedMotion ? controls.set('normal') : controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback((event) => {
      if (isControlledRef.current) onMouseEnter?.(event);
      else controls.start('animate');
    }, [controls, onMouseEnter]);

    const handleMouseLeave = useCallback((event) => {
      if (isControlledRef.current) onMouseLeave?.(event);
      else controls.start('normal');
    }, [controls, onMouseLeave]);

    return (
      <div
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {renderIcon(controls, size)}
      </div>
    );
  });

  Icon.displayName = displayName;
  return Icon;
}

const svgProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 1.5,
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
};

const InboxIcon = createAnimatedIcon('InboxIcon', (controls, size) => (
  <svg {...svgProps} width={size} height={size}>
    <motion.path
      animate={controls}
      initial="normal"
      variants={{
        normal: { opacity: 1, pathLength: 1, transition: { duration: 0.3, opacity: { duration: 0.1 } } },
        animate: { opacity: [0, 1], pathLength: [0, 1], transition: { duration: 0.4, opacity: { duration: 0.1 } } },
      }}
      d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
    />
  </svg>
));

const AcademicCapIcon = createAnimatedIcon('AcademicCapIcon', (controls, size) => (
  <svg {...svgProps} width={size} height={size}>
    <motion.g
      animate={controls}
      initial="normal"
      style={{ transformOrigin: 'center center' }}
      variants={{
        normal: { y: 0, rotate: 0 },
        animate: { y: [0, -3, 0], rotate: [0, -5, 5, 0], transition: { duration: 0.5, ease: 'easeInOut' } },
      }}
    >
      <path d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
    </motion.g>
    <motion.g
      animate={controls}
      initial="normal"
      style={{ transformOrigin: '6.75px 14.25px' }}
      variants={{
        normal: { rotate: 0 },
        animate: { rotate: [0, 10, -10, 5, 0], transition: { duration: 0.6, ease: 'easeInOut' } },
      }}
    >
      <path d="M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </motion.g>
  </svg>
));

const RectangleStackIcon = createAnimatedIcon('RectangleStackIcon', (controls, size) => (
  <motion.svg
    {...svgProps}
    width={size}
    height={size}
    animate={controls}
    initial="normal"
    variants={{
      normal: { scaleY: 1 },
      animate: { scaleY: [1, 1.08, 1], transition: { duration: 0.4, ease: 'easeInOut' } },
    }}
  >
    <path d="M6 6.87803V6C6 4.75736 7.00736 3.75 8.25 3.75H15.75C16.9926 3.75 18 4.75736 18 6V6.87803M6 6.87803C6.23458 6.79512 6.48702 6.75 6.75 6.75H17.25C17.513 6.75 17.7654 6.79512 18 6.87803M6 6.87803C5.12611 7.18691 4.5 8.02034 4.5 9V9.87803M18 6.87803C18.8739 7.18691 19.5 8.02034 19.5 9V9.87803M19.5 9.87803C19.2654 9.79512 19.013 9.75 18.75 9.75H5.25C4.98702 9.75 4.73458 9.79512 4.5 9.87803M19.5 9.87803C20.3739 10.1869 21 11.0203 21 12V18C21 19.2426 19.9926 20.25 18.75 20.25H5.25C4.00736 20.25 3 19.2426 3 18V12C3 11.0203 3.62611 10.1869 4.5 9.87803" />
  </motion.svg>
));

const UsersIcon = createAnimatedIcon('UsersIcon', (controls, size) => (
  <svg {...svgProps} width={size} height={size}>
    <path d="M15 19.1276V19.125C15 18.0121 14.7148 16.9658 14.2136 16.0552M15 19.1276C15 19.1632 14.9997 19.1988 14.9991 19.2343C13.1374 20.3552 10.9565 21 8.625 21C6.29353 21 4.11264 20.3552 2.25092 19.2343C2.25031 19.198 2.25 19.1615 2.25 19.125C2.25 15.6042 5.10418 12.75 8.625 12.75C11.0329 12.75 13.129 14.085 14.2136 16.0552M12 6.375C12 8.23896 10.489 9.75 8.625 9.75C6.76104 9.75 5.25 8.23896 5.25 6.375C5.25 4.51104 6.76104 3 8.625 3C10.489 3 12 4.51104 12 6.375Z" />
    <motion.path
      animate={controls}
      initial="normal"
      variants={{
        normal: { translateX: 0, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 13 } },
        animate: {
          translateX: [-6, 0],
          opacity: [0, 0, 1],
          transition: {
            delay: 0.1,
            translateX: { type: 'spring', stiffness: 200, damping: 13 },
            opacity: { duration: 0.4, times: [0, 0.3, 1], ease: 'easeOut' },
          },
        },
      }}
      d="M15 19.1276C15.8329 19.37 16.7138 19.5 17.625 19.5C19.1037 19.5 20.5025 19.1576 21.7464 18.5478C21.7488 18.4905 21.75 18.4329 21.75 18.375C21.75 16.0968 19.9031 14.25 17.625 14.25C16.2069 14.25 14.956 14.9655 14.2136 16.0552M20.25 8.625C20.25 10.0747 19.0747 11.25 17.625 11.25C16.1753 11.25 15 10.0747 15 8.625C15 7.17525 16.1753 6 17.625 6C19.0747 6 20.25 7.17525 20.25 8.625Z"
    />
  </svg>
));

const SquaresPlusIcon = createAnimatedIcon('SquaresPlusIcon', (controls, size) => (
  <svg {...svgProps} width={size} height={size}>
    <path d="M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z" />
    <motion.path
      animate={controls}
      initial="normal"
      variants={{ normal: { opacity: 1 }, animate: { opacity: [0, 1], pathLength: [0, 1], transition: { delay: 0.3, duration: 0.2, opacity: { duration: 0.1, delay: 0.3 } } } }}
      d="M16.875 13.5v6.75"
    />
    <motion.path
      animate={controls}
      initial="normal"
      variants={{ normal: { opacity: 1 }, animate: { opacity: [0, 1], pathLength: [0, 1], transition: { delay: 0.6, duration: 0.2, opacity: { duration: 0.1, delay: 0.6 } } } }}
      d="M13.5 16.875h6.75"
    />
  </svg>
));

const TrophyIcon = createAnimatedIcon('TrophyIcon', (controls, size) => (
  <motion.svg
    {...svgProps}
    width={size}
    height={size}
    animate={controls}
    initial="normal"
    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    variants={{
      normal: { scale: 1 },
      animate: { scale: [1, 0.9, 1.2, 1], transition: { duration: 0.6, ease: 'easeInOut' } },
    }}
  >
    <path d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
  </motion.svg>
));

export {
  AcademicCapIcon,
  InboxIcon,
  RectangleStackIcon,
  SquaresPlusIcon,
  TrophyIcon,
  UsersIcon,
};
