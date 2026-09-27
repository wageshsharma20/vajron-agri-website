# VAJRON 30 L Spraying Drone

Product website for the VAJRON 30-litre heavy-payload agricultural spraying drone
(6-rotor foldable carbon hexacopter), built for iPad presentation at exhibitions.

- Content comes only from the VAJRON technical specification for the system.
  Commercial terms and pricing are not published on the site.
- The hero and overview images are photographs of the aircraft.
- The film, loops, stills and drawings are rendered from a procedural 3D model
  of the aircraft (`js/agri.js`, three.js). The same model runs live in the
  "Explore the aircraft" viewer. Radar beams are schematic.

## Re-rendering media
1. Serve the folder: `python3 -m http.server 4193`
2. Frames and stills: `node tools/capture.mjs <jobs.json>` (headless Chrome over CDP, no npm packages)
3. Shots and camera paths live in `tools/render.html`.
4. Layout check at iPad sizes: `node tools/audit.mjs http://127.0.0.1:4193/`

`tools/` is excluded from deployment (`.vercelignore`).
