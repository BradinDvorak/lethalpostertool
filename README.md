An HTML-based tool for creating textures for posters and paintings for *Lethal Company*.

Use the tool online at https://bradindvorak.github.io/lethalpostertool/

## Features
- Generate posters, tips, and painting textures
- Create textures of up to 4x native resolution (if you dare)
- Automatic aspect ratio correction
- Image alignment, fit, and scaling options
- Images are processed locally (they don't get uploaded to a server)
- Works with local and remote images (with some exceptions)

**Note:** The hosted version requires remote images to support HTTPS.

**Note:** Because of CORS policies, a "download" button can't be added. A right click and a "Save image as..." or equivalent is required to download the resulting texture.

## TODOs
- Improve image cropping (entering in precise values would be nice)
- Improve UI (file names, overflow issues, etc.)
- Improve the help dialog and general &lt;dialog&gt; behavior
- Add warnings
  - ~~If an image fails to load (currently it just vanishes with no explanation)~~
  - if an image is being scaled larger than its native resolution
- Make the code less ugly?
