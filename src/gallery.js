/** A dark, floating photo gallery above a constellation floor.
 * Photo textures can be added to the supplied array after construction.
 * The caller owns the supplied image textures; this module owns its meshes.
 */
export function createGallery(THREE, scene, { floorTexture, photoTextures = [] } = {}) {
  let seed=7919;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const root = new THREE.Group();
  root.name = 'upper-sky-gallery';
  root.visible = false;
  scene.add(root);

  const geometries = new Set();
  const materials = new Set();
  const ownGeometry = value => { geometries.add(value); return value; };
  const ownMaterial = value => { materials.add(value); return value; };
  const boxGeometry = ownGeometry(new THREE.BoxGeometry(1, 1, 1));
  const planeGeometry = ownGeometry(new THREE.PlaneGeometry(1, 1));
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const basic = (color, extras = {}) => ownMaterial(new THREE.MeshBasicMaterial({
    color, toneMapped: false, ...extras,
  }));
  const metal = ownMaterial(new THREE.MeshStandardMaterial({
    color: 0x1c232c, roughness: 0.55, metalness: 0.45,
  }));
  const wallMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x26303c, roughness: 0.94 }));
  const ceilingMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x11171e, roughness: 1 }));
  const recessMaterial = basic(0x010308);
  // Keep the image ratio and a room-scale pattern so constellations read underfoot.
  if (floorTexture?.image) {
    const imageAspect = floorTexture.image.width / floorTexture.image.height;
    const tileWidth = 16, tileDepth = tileWidth / imageAspect;
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(40 / tileWidth, 34 / tileDepth);
    floorTexture.offset.set(0, 0);
  }
  const floorMaterial = ownMaterial(new THREE.MeshStandardMaterial({
    color: 0x8b8b8b, map: floorTexture, emissive: 0xffffff,
    emissiveMap: floorTexture, emissiveIntensity: 0.95, roughness: 0.82, metalness: 0.04, toneMapped: false,
  }));
  const floorLineMaterial = basic(0x9fb7c5, { transparent: true, opacity: 0.018, depthWrite: false });
  const warmLightMaterial = basic(0xe7c49a);
  const coolLightMaterial = basic(0x9ac8d8);

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

  // The supplied constellation pattern at a consistent physical scale.
  plane(root, 'constellation-image-floor', [40, 34], [0, 0.005, -29.4], [-Math.PI / 2, 0, 0], floorMaterial);
  box(root, 'gallery-floor-underlay', [40, 0.16, 34], [0, -0.08, -29.4], recessMaterial);
  box(root, 'gallery-ceiling', [40.3, 0.16, 34.3], [0, 8.58, -29.4], ceilingMaterial);
  box(root, 'gallery-far-wall', [40.3, 8.5, 0.2], [0, 4.25, -46.5], wallMaterial);
  for (const side of [-1, 1]) {
    box(root, 'gallery-side-wall', [0.2, 8.5, 34.3], [side * 20.1, 4.25, -29.4], wallMaterial);
    box(root, 'gallery-entry-wall', [18.1, 8.5, 0.16], [side * 10.95, 4.25, -12.4], wallMaterial);
    box(root, 'gallery-wall-skirting', [0.07, 0.16, 33.8], [side * 19.97, 0.08, -29.4], recessMaterial);
    box(root, 'gallery-entry-jamb', [0.13, 3.74, 0.15], [side * 1.96, 1.87, -12.47], metal);
    box(root, 'gallery-entry-light', [0.019, 3.5, 0.022], [side * 1.88, 1.77, -12.57], warmLightMaterial);
  }
  box(root, 'gallery-entry-header', [3.8, 4.9, 0.16], [0, 6.05, -12.4], wallMaterial);
  box(root, 'gallery-entry-upper-light', [3.78, 0.024, 0.026], [0, 3.58, -12.57], warmLightMaterial);
  box(root, 'gallery-rear-cove', [39.8, 0.13, 0.15], [0, 8.36, -46.28], recessMaterial);
  box(root, 'gallery-rear-cove-source', [38.6, 0.015, 0.023], [0, 8.415, -46.30], warmLightMaterial);

  // Sparse seams keep the photograph feeling like a luminous architectural floor.
  for (const x of [-12, -4, 4, 12]) {
    box(root, 'gallery-floor-seam', [0.014, 0.002, 34], [x, 0.009, -29.4], floorLineMaterial);
  }
  for (const z of [-20.9, -29.4, -37.9]) {
    box(root, 'gallery-cross-seam', [40, 0.002, 0.014], [0, 0.009, z], floorLineMaterial);
  }

  const pillars = [];
  for (const side of [-1, 1]) {
    for (const z of [-19.2, -29.4, -40.3]) {
      const x = side * 17.8;
      pillars.push({ x, z });
      box(root, 'gallery-dark-pillar', [0.72, 8.5, 0.72], [x, 4.25, z], metal);
      box(root, 'gallery-pillar-base', [0.93, 0.12, 0.93], [x, 0.06, z], recessMaterial);
      box(root, 'gallery-ceiling-recess', [4.2, 0.035, 0.2], [side * 11, 8.475, z], recessMaterial);
      box(root, 'gallery-ceiling-glint', [1.25, 0.012, 0.025], [side * 11, 8.45, z], warmLightMaterial);
    }
  }
  for (const x of [-14, -7, 0, 7, 14]) {
    box(root, 'gallery-rear-ceiling-glint', [0.18, 0.015, 0.18], [x, 8.44, -44], warmLightMaterial);
  }

  const coolLight = new THREE.PointLight(0xcdd8e0, 0, 30, 1.8);
  coolLight.position.set(0, 7.2, -22);
  root.add(coolLight);
  const warmLight = new THREE.PointLight(0xffe5cb, 0, 28, 1.8);
  warmLight.position.set(0, 7.2, -39);
  root.add(warmLight);

  // Recessed, warm-white museum fixtures: soft pools instead of luminous outlines.
  const accentLights = [];
  const fixtureGeometry = ownGeometry(new THREE.CylinderGeometry(0.14, 0.18, 0.24, 16));
  const lensGeometry = ownGeometry(new THREE.CircleGeometry(0.115, 16));
  for (const side of [-1, 1]) {
    for (const [z, targetZ, targetY] of [[-19.5, -23, 0.2], [-30, -33.5, 0.2], [-41.5, -46.3, 2.2]]) {
      const spot = new THREE.SpotLight(0xffebd8, 0, 22, 0.56, 0.9, 2);
      spot.position.set(side * (targetY > 1 ? 4.8 : 10.5), 8.13, z);
      spot.target.position.set(side * (targetY > 1 ? 4.2 : 10), targetY, targetZ);
      root.add(spot, spot.target);
      accentLights.push({ light: spot, intensity: targetY > 1 ? 220 : 185 });
      const fixture = new THREE.Mesh(fixtureGeometry, recessMaterial);
      fixture.position.copy(spot.position);root.add(fixture);
      const lens = new THREE.Mesh(lensGeometry, warmLightMaterial);
      lens.rotation.x = Math.PI / 2;lens.position.copy(spot.position);lens.position.y -= 0.126;root.add(lens);
    }
    const bounce = new THREE.PointLight(0xffdfb4, 0, 13, 1.8);
    bounce.position.set(side * 12, 7.6, -44.9);root.add(bounce);
    accentLights.push({ light: bounce, intensity: 24 });
  }

  // Fixed safe locations with a little position jitter on each visit. The first
  // 12 m of the central aisle remains completely clear for the arrival sequence.
  const anchors = [
    { x: -7.7, z: -21.6, yaw: 0.29, height: 4.4 },
    { x: 7.7, z: -21.6, yaw: -0.29, height: 4.1 },
    { x: -13.0, z: -29.0, yaw: 0.35, height: 4.7 },
    { x: 13.0, z: -29.0, yaw: -0.35, height: 4.5 },
    { x: -5.8, z: -31.7, yaw: 0.1, height: 4.15 },
    { x: 5.8, z: -31.7, yaw: -0.1, height: 4.6 },
    { x: -12.6, z: -40.8, yaw: 0.17, height: 4.2 },
    { x: 12.6, z: -40.8, yaw: -0.17, height: 4.55 },
    { x: -4.2, z: -42.6, yaw: 0.05, height: 4.7 },
    { x: 4.2, z: -42.6, yaw: -0.05, height: 4.2 },
  ];

  const photos = anchors.map((anchor, index) => {
    const group = new THREE.Group();
    group.name = `floating-photograph-${String(index + 1).padStart(2, '0')}`;
    group.rotation.y = anchor.yaw;
    root.add(group);
    const frameMaterial = basic(0x101820, { transparent: true, opacity: 0 });
    const imageMaterial = basic(0xffffff, {
      transparent: true, opacity: 0, side: THREE.DoubleSide,
    });
    const trimMaterial = basic(0xd8d1c5, {
      transparent: true, opacity: 0, depthWrite: false,
    });
    const backing = box(group, 'photo-dark-edge', [1, 1, 0.07], [0, 0, -0.015], frameMaterial);
    const photo = plane(group, 'replaceable-photo', [1, 1], [0, 0, 0.025], [0, 0, 0], imageMaterial);
    const edges = [
      box(group, 'photo-frame-left', [0.014, 1, 0.018], [0, 0, 0.034], trimMaterial),
      box(group, 'photo-frame-right', [0.014, 1, 0.018], [0, 0, 0.034], trimMaterial),
      box(group, 'photo-frame-top', [1, 0.014, 0.018], [0, 0, 0.034], trimMaterial),
      box(group, 'photo-frame-bottom', [1, 0.014, 0.018], [0, 0, 0.034], trimMaterial),
    ];

    // A faint, vertically reversed image stretches onto the city floor. It is
    // simply one translucent plane, so no extra scene render is required.
    const reflectionMaterial = ownMaterial(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      uniforms: { uMap: { value: null }, uOpacity: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          vec4 photo = texture2D(uMap, vec2(vUv.x, 1.0 - vUv.y));
          float edge = smoothstep(0.0, 0.055, vUv.x) * smoothstep(0.0, 0.055, 1.0 - vUv.x);
          float fade = pow(vUv.y, 1.8) * edge;
          gl_FragColor = vec4(photo.rgb * vec3(0.62, 0.76, 0.87), fade * uOpacity);
          #include <colorspace_fragment>
        }
      `,
    }));
    const reflection = plane(root, 'photo-floor-reflection', [1, 1], [0, 0.016 + index * 0.0001, 0], [-Math.PI / 2, 0, 0], reflectionMaterial);
    // Apply rotation around world Y after putting the reflection onto the floor.
    reflection.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, anchor.yaw, 0, 'YXZ'));
    const entry = { anchor, group, frameMaterial, imageMaterial, trimMaterial, backing, photo, edges, reflection, reflectionMaterial, texture: null, width: 3.1, height: anchor.height, delay: 0 };
    setPhotoSize(entry, 0.72);
    return entry;
  });

  function setPhotoSize(entry, aspect) {
    // Photographs retain their original aspect ratio, including landscape work.
    const width = Math.min(4.9, entry.anchor.height * aspect);
    const height = width / aspect;
    entry.width = width;
    entry.height = height;
    entry.photo.scale.set(width, height, 1);
    entry.backing.scale.set(width + 0.09, height + 0.09, 0.07);
    entry.edges[0].position.x = -width / 2 - 0.018;
    entry.edges[1].position.x = width / 2 + 0.018;
    entry.edges[0].scale.y = entry.edges[1].scale.y = height + 0.045;
    entry.edges[2].position.y = height / 2 + 0.018;
    entry.edges[3].position.y = -height / 2 - 0.018;
    entry.edges[2].scale.x = entry.edges[3].scale.x = width + 0.045;
    entry.reflection.scale.set(width, height * 0.88, 1);
  }

  function reset() {
    seed=7919;
    root.visible = false;
    const order = photos.map((_, index) => index);
    for (let index = order.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [order[index], order[other]] = [order[other], order[index]];
    }
    for (let index = 0; index < photos.length; index++) {
      const entry = photos[index];
      entry.delay = 0.15 + order[index] * 0.48;
      entry.group.position.set(entry.anchor.x + (random() - 0.5) * 0.4, 0, entry.anchor.z + (random() - 0.5) * 0.4);
      entry.group.visible = false;
      entry.reflection.visible = false;
    }
  }

  function update({ time = 0, reveal = 0, elapsed = -1 } = {}) {
    const roomAmount = smooth(reveal);
    root.visible = roomAmount > 0.001;
    if (!root.visible) return;
    floorMaterial.color.setScalar(0.25 * roomAmount);
    floorMaterial.emissiveIntensity = 0.95 * roomAmount;
    warmLightMaterial.color.setRGB(0.30, 0.24, 0.17).multiplyScalar(roomAmount);
    coolLightMaterial.color.setRGB(0.18, 0.20, 0.22).multiplyScalar(roomAmount);
    coolLight.intensity = 9 * roomAmount;
    warmLight.intensity = 13 * roomAmount;
    for (const accent of accentLights) accent.light.intensity = accent.intensity * roomAmount;

    for (let index = 0; index < photos.length; index++) {
      const entry = photos[index];
      const texture = photoTextures[index];
      const image = texture?.image;
      if (texture && image && image.width && texture !== entry.texture) {
        entry.texture = texture;
        entry.imageMaterial.map = texture;
        entry.imageMaterial.needsUpdate = true;
        entry.reflectionMaterial.uniforms.uMap.value = texture;
        setPhotoSize(entry, image.width / image.height);
      }
      const amount = elapsed < 0 ? 0 : smooth((elapsed - entry.delay) / 1.7) * roomAmount;
      entry.group.visible = Boolean(entry.texture) && amount > 0.001;
      entry.reflection.visible = entry.group.visible;
      entry.imageMaterial.opacity = amount;
      entry.frameMaterial.opacity = amount * 0.94;
      entry.trimMaterial.opacity = amount * 0.28;
      entry.group.position.y = 0.69 + entry.height / 2 - (1 - amount) * 0.28 + Math.sin(time * 0.48 + index * 1.3) * 0.025;
      const reflectionLength = entry.height * 0.88;
      const forward = reflectionLength / 2 + 0.07;
      entry.reflection.position.x = entry.group.position.x + Math.sin(entry.anchor.yaw) * forward;
      entry.reflection.position.z = entry.group.position.z + Math.cos(entry.anchor.yaw) * forward;
      entry.reflectionMaterial.uniforms.uOpacity.value = amount * 0.065;
    }
  }

  function canStand(x, z) {
    const radius = 0.33;
    // Once the flight arrives, exploration stays on the gallery floor.
    if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 20 - radius || z < -46.4 + radius || z > -12.75) return false;
    for (const pillar of pillars) {
      if (Math.abs(x - pillar.x) < 0.465 + radius && Math.abs(z - pillar.z) < 0.465 + radius) return false;
    }
    for (const entry of photos) {
      const dx = x - entry.group.position.x;
      const dz = z - entry.group.position.z;
      const cos = Math.cos(entry.anchor.yaw), sin = Math.sin(entry.anchor.yaw);
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;
      if (Math.abs(localX) < entry.width / 2 + 0.06 + radius && Math.abs(localZ) < 0.2 + radius) return false;
    }
    return true;
  }

  // Reflections and decorative light strips never intercept a photograph tap.
  const viewObstacles = root.children.filter(mesh => mesh.isMesh && /^(gallery-(far-wall|side-wall|entry-wall|entry-header|entry-jamb|dark-pillar|pillar-base))$/.test(mesh.name));

  function pickPhoto(raycaster) {
    if (!root.visible) return null;
    root.updateWorldMatrix(true, true);
    const selectable = photos.filter(entry => entry.group.visible && entry.photo.visible && entry.imageMaterial.opacity > 0.4);
    const hit = raycaster.intersectObjects(selectable.map(entry => entry.photo), false)[0];
    if (!hit) return null;
    const obstruction = raycaster.intersectObjects(viewObstacles, false)[0];
    if (obstruction && obstruction.distance < hit.distance - 0.01) return null;
    return photos.findIndex(entry => entry.photo === hit.object);
  }

  function getPhotoView(index, camera) {
    const entry = photos[index];
    if (!entry || !root.visible || !entry.group.visible || entry.imageMaterial.opacity <= 0.4) return null;
    root.updateWorldMatrix(true, true);
    const target = entry.photo.getWorldPosition(new THREE.Vector3());
    const rotation = entry.group.getWorldQuaternion(new THREE.Quaternion());
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation);
    const eyeY = root.getWorldPosition(new THREE.Vector3()).y + 1.65;
    const verticalTangent = Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV?.() ?? camera.fov) / 2);
    const horizontalTangent = verticalTangent * camera.aspect;
    if (!(verticalTangent > 0 && horizontalTangent > 0)) return null;
    const positionAt = distance => target.clone().addScaledVector(normal, distance).setY(eyeY);
    // Account for looking up from standing height as well as the photo's ratio.
    const fits = position => {
      const forward = target.clone().sub(position).normalize();
      const up = right.clone().cross(forward).normalize();
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          const corner = target.clone().addScaledVector(right, sx * entry.width / 2);
          corner.y += sy * entry.height / 2;
          corner.sub(position);
          const depth = corner.dot(forward);
          if (depth <= 0 || Math.abs(corner.dot(right)) * 1.15 > depth * horizontalTangent || Math.abs(corner.dot(up)) * 1.15 > depth * verticalTangent) return false;
        }
      }
      return true;
    };
    let distance = Math.max(entry.height / (2 * verticalTangent), entry.width / (2 * horizontalTangent)) * 1.15;
    for (let attempt = 0; attempt < 24 && !fits(positionAt(distance)); attempt++) distance *= 1.07;
    const sightRay = new THREE.Raycaster();
    const otherPhotos = photos.filter(other => other !== entry && other.group.visible && other.imageMaterial.opacity > 0.4).map(other => other.photo);
    const safeView = candidateDistance => {
      const position = positionAt(candidateDistance);
      const local = root.worldToLocal(position.clone());
      if (!canStand(local.x, local.z)) return null;
      const direction = target.clone().sub(position);
      sightRay.set(position, direction.clone().normalize());
      sightRay.far = Math.max(0, direction.length() - 0.08);
      if (sightRay.intersectObjects([...viewObstacles, ...otherPhotos], false).length) return null;
      return { position, target, index };
    };
    // A close safe view is preferable to standing outside or behind another work.
    for (; distance >= 0.65; distance -= 0.25) {
      const result = safeView(distance);
      if (result) return result;
    }
    return null;
  }

  function segmentClear(from, to) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.1));
    for (let step = 0; step <= steps; step++) {
      const amount = step / steps;
      if (!canStand(from.x + (to.x - from.x) * amount, from.z + (to.z - from.z) * amount)) return false;
    }
    return true;
  }

  function findPath(fromWorld, toWorld) {
    root.updateWorldMatrix(true, false);
    const from = root.worldToLocal(fromWorld.clone());
    const to = root.worldToLocal(toWorld.clone());
    if (!canStand(from.x, from.z) || !canStand(to.x, to.z)) return null;
    const worldPoint = point => root.localToWorld(new THREE.Vector3(point.x, 1.65, point.z));
    if (segmentClear(from, to)) return [worldPoint(from), worldPoint(to)];

    const spacing = 0.5, minX = -19.5, minZ = -46, columns = 79, rows = 67;
    const count = columns * rows;
    const walkable = new Int8Array(count).fill(-1);
    const point = id => ({ x: minX + (id % columns) * spacing, z: minZ + Math.floor(id / columns) * spacing });
    const isWalkable = id => {
      if (walkable[id] < 0) { const p = point(id); walkable[id] = canStand(p.x, p.z) ? 1 : 0; }
      return walkable[id] === 1;
    };
    const nearestNode = position => {
      const cx = Math.round((position.x - minX) / spacing), cz = Math.round((position.z - minZ) / spacing);
      let nearest = -1, distance = Infinity;
      for (let z = Math.max(0, cz - 3); z <= Math.min(rows - 1, cz + 3); z++) {
        for (let x = Math.max(0, cx - 3); x <= Math.min(columns - 1, cx + 3); x++) {
          const id = z * columns + x, p = point(id), d = Math.hypot(p.x - position.x, p.z - position.z);
          if (d < distance && isWalkable(id) && segmentClear(position, p)) { nearest = id; distance = d; }
        }
      }
      return nearest;
    };
    const start = nearestNode(from), goal = nearestNode(to);
    if (start < 0 || goal < 0) return null;
    const costs = new Float64Array(count).fill(Infinity);
    const previous = new Int32Array(count).fill(-1);
    const closed = new Uint8Array(count);
    const goalPoint = point(goal);
    const heuristic = id => { const p = point(id); return Math.hypot(p.x - goalPoint.x, p.z - goalPoint.z); };
    // A binary heap keeps long routes quick even on a phone.
    const heap = [];
    const push = item => {
      let index = heap.length;
      heap.push(item);
      while (index > 0) {
        const parent = (index - 1) >> 1;
        if (heap[parent].score <= item.score) break;
        heap[index] = heap[parent]; index = parent;
      }
      heap[index] = item;
    };
    const pop = () => {
      const first = heap[0], last = heap.pop();
      if (heap.length) {
        let index = 0;
        while (index * 2 + 1 < heap.length) {
          let child = index * 2 + 1;
          if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++;
          if (heap[child].score >= last.score) break;
          heap[index] = heap[child]; index = child;
        }
        heap[index] = last;
      }
      return first.id;
    };
    costs[start] = 0;
    push({ id: start, score: heuristic(start) });
    while (heap.length) {
      const current = pop();
      if (closed[current]) continue;
      if (current === goal) {
        const route = [to];
        for (let id = goal; id !== -1; id = previous[id]) route.push(point(id));
        route.push(from); route.reverse();
        const smoothed = [route[0]];
        for (let index = 0; index < route.length - 1;) {
          let next = route.length - 1;
          while (next > index + 1 && !segmentClear(route[index], route[next])) next--;
          smoothed.push(route[next]); index = next;
        }
        return smoothed.map(worldPoint);
      }
      closed[current] = 1;
      const x = current % columns, z = Math.floor(current / columns);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dz) || x + dx < 0 || x + dx >= columns || z + dz < 0 || z + dz >= rows) continue;
          const next = (z + dz) * columns + x + dx;
          if (closed[next] || !isWalkable(next)) continue;
          if (dx && dz && (!isWalkable(z * columns + x + dx) || !isWalkable((z + dz) * columns + x))) continue;
          const nextCost = costs[current] + Math.hypot(dx, dz) * spacing;
          if (nextCost >= costs[next] || !segmentClear(point(current), point(next))) continue;
          costs[next] = nextCost; previous[next] = current;
          push({ id: next, score: nextCost + heuristic(next) });
        }
      }
    }
    return null;
  }

  function dispose() {
    scene.remove(root);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }

  reset();
  return { root, update, reset, canStand, pickPhoto, getPhotoView, findPath, dispose };
}
