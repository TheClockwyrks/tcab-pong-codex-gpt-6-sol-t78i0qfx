# Carom

Carom is a browser paddle duel built on the Simple 2D engine. Curve the ball by moving your paddle at contact, ricochet around two fixed obstacles, and be the first to reach 11 points with a two point lead. Play against the AI or share a keyboard in local Versus mode.

## Run

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. For a static release, run `npm run build`; serve the resulting `dist/` directory from any static web server. `npm run preview` serves that build locally.

## Controls

| Action | Keys |
| --- | --- |
| Left paddle | W / S |
| Right paddle in Versus | ↑ / ↓ |
| Left paddle in Solo | W / S or ↑ / ↓ |
| Select / confirm | Enter or Space |
| Pause / resume | P or Escape |
| Mute | M |

Menus also respond to mouse and touch. Touch controls appear automatically on touch screens. Move a paddle as it strikes to add spin; the ball's curved path opens up bank shots around the gold obstacles.

## Development checks

`npm run typecheck`, `npm run lint`, `npm run format`, and `npm test` check the TypeScript, style, formatting, and simulation tests.
