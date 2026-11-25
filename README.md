# Boxing game

A realistic boxing game with full career progression. Currently: a 3D sparring prototype.

## Layout
- `blender/build_boxer.py`: builds, rigs and exports the boxer with headless Blender (`pip install bpy`), writes `assets/boxer.glb`
- `game/index.template.html`: the game (three.js); the model is injected at build time
- `tools/build_page.py`: builds `dist/index.html`, the single-file page that gets published
- `tests/`: headless-browser tests (Playwright): full playthrough, punch-range table, phone layout

## Build and run
    python3 blender/build_boxer.py -- assets --norender   # only when the model changes
    npm install && npm run build && npm run serve
    # open http://127.0.0.1:8765/test.html

## Controls
J jab · K cross · U lead hook · I rear uppercut · Shift+punch to the body · Space block · Q/E slip · WASD move · C camera
