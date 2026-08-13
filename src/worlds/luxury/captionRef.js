// Shared between Caption (DOM) and TextColorSampler (inside the <Canvas>),
// which cannot receive a ref from Caption through React. Same module-scoped
// ref idiom as `pointer` in shared/usePointer.js. Lives in its own plain .js
// module — not inside Caption.jsx — so this non-component export never
// touches the react-refresh/only-export-components rule, which only scans
// .jsx/.tsx files.
export const captionRef = { current: null }
