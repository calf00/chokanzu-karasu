/** The original lobby, opened to the night. No elevator geometry. */
export function createWorld(THREE, scene) {
  const root = new THREE.Group();
  root.name = 'architecture';
  scene.add(root);


  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const stagedMaterials = [];
  const stagedLights = [];
  const boxGeometry = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
  const planeGeometry = keepGeometry(new THREE.PlaneGeometry(1, 1));
  const clamp = (n, low = 0, high = 1) => Math.min(high, Math.max(low, n));
  const smooth = (n) => { const t = clamp(n); return t * t * (3 - 2 * t); };

  function keepGeometry(geometry) { geometries.add(geometry); return geometry; }
  function keepMaterial(material) { materials.add(material); return material; }
  function keepTexture(texture) { textures.add(texture); return texture; }

  function noiseTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const pixels = ctx.createImageData(256, 256);
    let seed = 43927;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const value = 130 + ((seed >>> 25) - 64) * 0.22;
      pixels.data[i] = value;
      pixels.data[i + 1] = value + 1;
      pixels.data[i + 2] = value + 3;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    const texture = keepTexture(new THREE.CanvasTexture(canvas));
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const concreteTexture = noiseTexture();
  const mat = (color, roughness = 0.85, metalness = 0) => keepMaterial(
    new THREE.MeshStandardMaterial({ color, roughness, metalness }),
  );
  const floorMaterial = mat(0x626775, 0.61, 0.16);
  floorMaterial.map = concreteTexture;
  const wallMaterial = mat(0x74787d, 0.94);
  wallMaterial.map = concreteTexture;
  const ceilingMaterial = mat(0x30343b, 0.98);
  const seamMaterial = mat(0x0c1119, 0.9);
  const metalMaterial = mat(0x3b434e, 0.4, 0.65);
  const darkMetalMaterial = mat(0x131920, 0.63, 0.35);
  const cabinFloorMaterial = mat(0x29313d, 0.29, 0.52);
  const bronzeMaterial = mat(0x937653, 0.47, 0.57);

  function luminous(color, intensity, threshold, span = 0.26) {
    const material = keepMaterial(new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0, roughness: 0.4,
    }));
    stagedMaterials.push({ material, intensity, threshold, span });
    return material;
  }

  function box(parent, name, size, position, material) {
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.name = name;
    mesh.scale.set(...size);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }

  function plane(parent, name, size, position, rotation, material) {
    const mesh = new THREE.Mesh(planeGeometry, material);
    mesh.name = name;
    mesh.scale.set(size[0], size[1], 1);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  }

  function sign(parent, text, subtitle, width, height, position, facing = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#101720';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#c9d4dd';
    ctx.font = '500 112px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 512, 138);
    ctx.fillStyle = '#899aa8';
    ctx.font = '25px sans-serif';
    ctx.fillText(subtitle, 512, 198);
    const texture = keepTexture(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = keepMaterial(new THREE.MeshBasicMaterial({ map: texture, color: 0x000000 }));
    stagedMaterials.push({ material, intensity: 0.8, threshold: 0.5, span: 0.3, basic: true });
    return plane(parent, `sign-${text}`, [width, height], position, [0, facing, 0], material);
  }

  // A broad, quiet lobby: the portal is the only warm focal point.
  box(root, 'lobby-floor', [14.4, 0.28, 21.4], [0, -0.14, 2.5], floorMaterial);
  box(root, 'lobby-ceiling', [14.4, 0.28, 21.4], [0, 5.94, 2.5], ceilingMaterial);
  box(root, 'left-wall', [0.32, 5.8, 21.4], [-7.16, 2.9, 2.5], wallMaterial);
  box(root, 'right-wall', [0.32, 5.8, 21.4], [7.16, 2.9, 2.5], wallMaterial);
  box(root, 'entrance-back-wall', [14.4, 5.8, 0.3], [0, 2.9, 13.15], wallMaterial);
  box(root, 'portal-left-wall', [5.1, 5.8, 0.32], [-4.45, 2.9, -8.16], wallMaterial);
  box(root, 'portal-right-wall', [5.1, 5.8, 0.32], [4.45, 2.9, -8.16], wallMaterial);
  box(root, 'portal-header', [3.8, 2.2, 0.32], [0, 4.7, -8.16], wallMaterial);

  for (const side of [-1, 1]) {
    box(root, 'wall-base', [0.1, 0.13, 21], [side * 6.97, 0.08, 2.5], darkMetalMaterial);
    box(root, 'wall-top-reveal', [0.13, 0.12, 21], [side * 6.94, 5.65, 2.5], seamMaterial);
    for (let i = 0; i < 6; i++) {
      const z = 10.8 - i * 3.45;
      box(root, 'wall-pilaster', [0.3, 5.55, 0.38], [side * 6.87, 2.77, z], wallMaterial);
      box(root, 'pilaster-shadow', [0.015, 5.4, 0.055], [side * 6.708, 2.78, z - 0.18], seamMaterial);
      box(root, 'wall-seam', [0.012, 5.25, 0.022], [side * 6.994, 2.79, z - 1.6], seamMaterial);
    }
  }

  for (let i = 0; i < 7; i++) {
    const z = 10.2 - i * 3;
    const lightMaterial = luminous(0xdbe9ff, 2.1, 0.06 + i * 0.075, 0.22);
    box(root, 'ceiling-light-recess', [10.6, 0.085, 0.42], [0, 5.742, z], seamMaterial);
    box(root, 'ceiling-light-diffuser', [9.85, 0.014, 0.11], [0, 5.692, z], lightMaterial);
    for (const side of [-1, 1]) {
      box(root, 'floor-guide-trough', [0.064, 0.014, 2.28], [side * 1.64, 0.008, z], seamMaterial);
      box(root, 'floor-guide-light', [0.023, 0.008, 2.1], [side * 1.64, 0.019, z], lightMaterial);
    }
  }

  for (let x = -6; x <= 6; x += 2) {
    box(root, 'floor-longitudinal-joint', [0.013, 0.004, 21], [x, 0.003, 2.5], seamMaterial);
  }
  for (let z = -7; z <= 13; z += 2.5) {
    box(root, 'floor-transverse-joint', [14, 0.004, 0.012], [0, 0.003, z], seamMaterial);
  }

  const amberMaterial = luminous(0xffcf88, 1.25, 0.5, 0.4);
  for (const side of [-1,1]) {
    box(root, 'open-portal-light', [0.025,3.5,0.03], [side*1.89,1.77,-7.94], amberMaterial);
  }
  box(root, 'open-portal-top', [3.8,0.025,0.03], [0,3.54,-7.94], amberMaterial);
  box(root, 'crow-plinth', [1.24,.64,1.24], [0,.32,-6.5], darkMetalMaterial);
  box(root, 'plinth-rim', [1.28,.025,1.28], [0,.65,-6.5], metalMaterial);
  box(root, 'plinth-light', [.56,.009,.018], [0,.39,-5.873], amberMaterial);
  sign(root, 'NOCTURNE', 'FOLLOW THE OTHER EYE', 2.1,.525,[0,4.32,-7.98]);
  const hemisphere = new THREE.HemisphereLight(0xb6c9e6,0x18202e,0);
  root.add(hemisphere);
  const lights = [[0,5.12,7.1,39,.04],[0,5.08,-.1,36,.25],[0,3.75,-5.9,28,.47]].map(([x,y,z,intensity,threshold])=>{
    const light = new THREE.PointLight(z < -5 ? 0xffd8a3 : 0xd7e5ff,0,22,1.65);
    light.position.set(x,y,z);root.add(light);return {light,intensity,threshold};
  });
  const rim = new THREE.PointLight(0x93c5fa,0,5,1.5);
  rim.position.set(0,2.5,-7.45);root.add(rim);
  function update({lightProgress=0,visible=true}={}) {
    root.visible=visible;
    const light=clamp(lightProgress);
    for(const stage of stagedMaterials){
      const amount=smooth((light-stage.threshold)/stage.span)*stage.intensity;
      if(stage.basic)stage.material.color.setScalar(amount);else stage.material.emissiveIntensity=amount;
    }
    hemisphere.intensity=.85*smooth(light);
    for(const item of lights)item.light.intensity=item.intensity*smooth((light-item.threshold)/.45);
    rim.intensity=12*smooth((light-.5)/.4);
  }
  function dispose(){scene.remove(root);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}
  return {root,update,dispose};
}
