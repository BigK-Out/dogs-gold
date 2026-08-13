# dogs-gold

Three worlds of dogs, navigated by the arrows at the bottom of the screen:
**luxury**, **middle class**, **stray**. Each is a react-three-fiber scene with
its own background, palette, instrument, and revealed document.

Desktop only — the interaction is pointer-driven and the page hides the cursor.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # node --test, recursive
npm run lint
npm run build
```

## How a world works

`src/worlds/registry.js` holds an ordered array. Array order is arrow order.
The shell in `src/App.jsx` never branches on which world is active — it reads
only the keys below.

| Key | Required | Meaning |
| --- | --- | --- |
| `id`, `label` | yes | identity, and the text between the arrows |
| `pageBackground` | yes | painted behind the canvas; visible mid-transition |
| `camera` | yes | `{ fov, near, far }`, applied on mount |
| `Scene` | yes | the in-canvas subtree |
| `instrument` | yes | `{ src, size, cx, cy, radius }` — art plus measured ratios |
| `selection` | yes | `{ radius, releaseMargin, dwellMs }` |
| `Card`, `cardStyle` | no | the reveal panel's content and container style |
| `Instrument` | no | replaces the shared pointer-following positioner |
| `Overlay` | no | extra DOM inside the shell wrapper |

`src/shared/` holds what every world reuses: the pointer singleton, the physics
loop, the dog mesh, the selection state machine, the instrument positioner, and
the card container. `src/shell/` holds the navigation reducer and the transition.

## Adding a world

1. Create `src/worlds/<id>/` with an `index.js` exporting the config above.
2. Add it to the array in `src/worlds/registry.js`.

No shell code changes.

## Instrument ratios

`cx`, `cy`, and `radius` are fractions of the image width, measured from the
art's alpha channel: where the instrument's *active point* sits within the
image. The luxury loupe's handle occupies the lower right, so its glass is up
and to the left of centre — centring the PNG on the pointer would put the handle
under the cursor. Re-measure these whenever the art is replaced.

## Deploying

Built by `.github/workflows/deploy.yml` and served from `/vscodemainrepo/` on
GitHub Pages, so `vite.config.js` sets `base` to match. **Every `public/` asset
must route through `import.meta.env.BASE_URL`** — a root-absolute path 404s
under the prefix and yields a scene with no dogs and no visible error.
