// Shared between Caption (DOM) and TextColorSampler (inside the <Canvas>). See
// luxury/captionRef.js for why this is a module-scoped ref in a plain .js file.
export const captionRef = { current: null }
