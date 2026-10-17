// 墨が紙から剥がれたような「かすれ」を 5 段階の SVG フィルターで表現する。
// 横方向に伸びた粒状ノイズ（筆の向き）でしきい値を切り、その部分を透明にする。
const LEVELS = [
  { id: 1, threshold: 0.34 },
  { id: 2, threshold: 0.39 },
  { id: 3, threshold: 0.44 },
  { id: 4, threshold: 0.49 },
];

export function KasureFilters() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
      <defs>
        {LEVELS.map(({ id, threshold }) => (
          <filter key={id} id={`kasure-${id}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.9" numOctaves="2" seed={id * 7} result="noise" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  14 0 0 0 ${-14 * threshold}`}
              result="mask"
            />
            <feComponentTransfer in="mask" result="hard">
              <feFuncA type="discrete" tableValues="0 1" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="hard" operator="in" />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
