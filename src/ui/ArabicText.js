import * as THREE from 'three';

export function textPanel(width = 0.8, height = 0.25) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round((1024 * height) / width);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.FrontSide,
    }),
  );
  mesh.renderOrder = 2;
  Object.assign(mesh.userData, {
    canvas,
    texture,
    panelWidth: width,
    panelHeight: height,
  });
  return mesh;
}

/** Wrap Arabic words instead of squeezing an entire sentence into a tiny line. */
export function drawPanel(
  mesh,
  lines,
  { background = '#102a2c', color = '#f0d19a', fontSize = 58 } = {},
) {
  const canvas = mesh.userData.canvas;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = background;
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, 24);
  context.fill();
  context.strokeStyle = '#bda265';
  context.lineWidth = 3;
  context.stroke();
  context.direction = 'rtl';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.font = `${fontSize}px Lamsat, Tahoma, sans-serif`;

  const wrap = () => {
    const result = [];
    for (const line of lines) {
      let current = '';
      for (const word of String(line).split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word;
        if (
          current &&
          context.measureText(candidate).width > canvas.width - 64
        ) {
          result.push(current);
          current = word;
        } else current = candidate;
      }
      result.push(current);
    }
    return result;
  };
  // Rewrap at the fitted font size so long Arabic instructions retain legibility.
  let fittedSize = fontSize,
    wrapped;
  for (let attempt = 0; attempt < 12; attempt++) {
    context.font = `${fittedSize}px Lamsat, Tahoma, sans-serif`;
    wrapped = wrap();
    const widest = Math.max(
      1,
      ...wrapped.map((line) => context.measureText(line).width),
    );
    const fit = Math.min(
      1,
      (canvas.height - 40) / (wrapped.length * fittedSize * 1.3),
      (canvas.width - 64) / widest,
    );
    if (fit >= 0.999) break;
    fittedSize *= Math.max(0.5, fit * 0.98);
  }
  context.font = `${fittedSize}px Lamsat, Tahoma, sans-serif`;
  const lineHeight = fittedSize * 1.3;
  const firstY = canvas.height / 2 - ((wrapped.length - 1) * lineHeight) / 2;
  wrapped.forEach((line, index) =>
    context.fillText(line, canvas.width / 2, firstY + index * lineHeight),
  );
  mesh.userData.texture.needsUpdate = true;
  mesh.userData.textLayout = {
    fontSize: fittedSize,
    lineCount: wrapped.length,
    height: wrapped.length * lineHeight,
    widths: wrapped.map((line) => context.measureText(line).width),
  };
}
