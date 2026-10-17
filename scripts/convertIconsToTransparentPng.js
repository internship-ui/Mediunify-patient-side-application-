const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

async function removeWhiteBackground(inputPath, outputPath) {
  const image = await Jimp.read(inputPath);
  const { width, height, data } = image.bitmap;
  
  const visited = new Uint8Array(width * height);
  const queue = [];
  const getIdx = (x, y) => (y * width + x) * 4;
  
  // A pixel is background if it is light and low-saturation (white/light-grey)
  function isBackgroundCandidate(x, y) {
    const idx = getIdx(x, y);
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    
    const minC = Math.min(r, g, b);
    const maxC = Math.max(r, g, b);
    const diff = maxC - minC;
    
    // Background is white or light grey floor shadow
    if (minC >= 215 && diff <= 16) return true;
    if (minC >= 240) return true;
    
    return false;
  }
  
  // Seed with all borders
  for (let x = 0; x < width; x++) {
    for (const y of [0, 1, 2, height - 3, height - 2, height - 1]) {
      const pos = y * width + x;
      if (!visited[pos] && isBackgroundCandidate(x, y)) {
        visited[pos] = 1;
        queue.push(pos);
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, 1, 2, width - 3, width - 2, width - 1]) {
      const pos = y * width + x;
      if (!visited[pos] && isBackgroundCandidate(x, y)) {
        visited[pos] = 1;
        queue.push(pos);
      }
    }
  }
  
  // BFS
  let head = 0;
  while (head < queue.length) {
    const pos = queue[head++];
    const cx = pos % width;
    const cy = Math.floor(pos / width);
    
    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];
    
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const npos = ny * width + nx;
        if (!visited[npos] && isBackgroundCandidate(nx, ny)) {
          visited[npos] = 1;
          queue.push(npos);
        }
      }
    }
  }
  
  // Clear background pixels cleanly
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      if (visited[pos]) {
        const idx = getIdx(x, y);
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (r + g + b) / 3;
        
        if (brightness >= 230) {
          // Clean transparent
          data[idx + 3] = 0;
        } else if (brightness >= 210) {
          // Feathered edge for anti-aliasing against the subject
          const alphaFactor = (230 - brightness) / 20; // 0 at 230, 1 at 210
          data[idx + 3] = Math.round(alphaFactor * 160);
        } else {
          data[idx + 3] = 0;
        }
      }
    }
  }
  
  // Anti-aliasing pass: any unvisited pixel next to a fully transparent pixel gets softened if it has a white fringe
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pos = y * width + x;
      if (!visited[pos]) {
        const idx = getIdx(x, y);
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const minC = Math.min(r, g, b);
        const maxC = Math.max(r, g, b);
        
        // If it's a near-white fringe pixel bordering a transparent pixel
        if (minC >= 235 && (maxC - minC) <= 15) {
          const hasTransparentNeighbor =
            data[getIdx(x + 1, y) + 3] === 0 ||
            data[getIdx(x - 1, y) + 3] === 0 ||
            data[getIdx(x, y + 1) + 3] === 0 ||
            data[getIdx(x, y - 1) + 3] === 0;
            
          if (hasTransparentNeighbor) {
            data[idx + 3] = 0; // Remove halo fringe
          }
        }
      }
    }
  }
  
  await image.write(outputPath);
}

async function run() {
  const assetsDir = path.resolve(__dirname, '../assets/radiology');
  const files = [
    'rad_cardio',
    'rad_ct',
    'rad_dexa',
    'rad_doppler',
    'rad_ecg',
    'rad_echo',
    'rad_mammo',
    'rad_mri',
    'rad_other',
    'rad_pet',
    'rad_usg',
    'rad_xray'
  ];
  
  for (const name of files) {
    const inputPath = path.join(assetsDir, `${name}.jpg`);
    const outputPath = path.join(assetsDir, `${name}.png`);
    if (fs.existsSync(inputPath)) {
      console.log(`Processing ${name}.jpg -> ${name}.png...`);
      await removeWhiteBackground(inputPath, outputPath);
    }
  }
  console.log('All 12 icons converted to clean transparent PNG!');
}

run().catch(console.error);
