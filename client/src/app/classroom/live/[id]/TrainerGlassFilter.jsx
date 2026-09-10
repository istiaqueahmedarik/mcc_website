// Neutral in the center; the edge ramps bend the live backdrop like a lens.
const displacementImage = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="544" height="60" viewBox="0 0 544 60">
  <defs>
    <linearGradient id="x">
      <stop offset="0" stop-color="#000080"/>
      <stop offset=".12" stop-color="#800080"/>
      <stop offset=".88" stop-color="#800080"/>
      <stop offset="1" stop-color="#ff0080"/>
    </linearGradient>
    <linearGradient id="y" x2="0" y2="1">
      <stop offset="0" stop-color="#000000"/>
      <stop offset=".28" stop-color="#008000"/>
      <stop offset=".72" stop-color="#008000"/>
      <stop offset="1" stop-color="#00ff00"/>
    </linearGradient>
  </defs>
  <rect width="544" height="60" fill="url(#x)"/>
  <rect width="544" height="60" fill="url(#y)" style="mix-blend-mode:screen"/>
</svg>`)}`;

export default function TrainerGlassFilter({ id }) {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
      <defs>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={displacementImage} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="lens" />
          <feDisplacementMap in="SourceGraphic" in2="lens" scale="32" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
