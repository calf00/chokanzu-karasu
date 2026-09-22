/** Procedural, self-contained night city. The camera path stays clear of buildings. */
export function createCity(THREE, scene) {
  const root = new THREE.Group();
  root.name = 'crow-night-city';
  root.visible = false;
  scene.add(root);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const geometry = value => (geometries.add(value), value);
  const material = value => (materials.add(value), value);
  const boxGeometry = geometry(new THREE.BoxGeometry(1, 1, 1));
  const basic = (color, options = {}) => material(new THREE.MeshBasicMaterial({ color, ...options }));
  let seed = 923571;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const lerp = (a, b) => a + (b - a) * random();
  const curve = new THREE.CatmullRomCurve3([
    [0, 1.48, -6.5], [0, 2.2, -15], [0, 13, -38], [-8, 38, -80],
    [18, 61, -134], [30, 72, -198], [-24, 63, -252], [-34, 76, -302],
    [-10, 96, -350], [0, 95, -389], [0, 90.5, -415], [0, 89.65, -426],
  ].map(point => new THREE.Vector3(...point)), false, 'centripetal');
  const pathSamples = curve.getPoints(720);
  const transform = new THREE.Object3D();
  const setMatrix = (mesh, index, size, position) => {
    transform.position.set(...position); transform.scale.set(...size);
    transform.rotation.set(0, 0, 0); transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  };
  function box(name, size, position, surface) {
    const mesh = new THREE.Mesh(boxGeometry, surface);
    mesh.name = name; mesh.scale.set(...size); mesh.position.set(...position); root.add(mesh);
    return mesh;
  }

  // Side faces use a metre-based window grid, so tall towers do not stretch windows.
  const buildingGeometry = geometry(new THREE.BoxGeometry(1, 1, 1));
  const buildingMaterial = material(new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
    vertexShader: `
      attribute vec3 citySize;
      attribute float citySeed;
      varying vec3 vLocal, vFace, vSize;
      varying float vSeed;
      #include <fog_pars_vertex>
      void main() {
        vLocal = position + 0.5; vFace = normal; vSize = citySize; vSeed = citySeed;
        vec4 mvPosition = instanceMatrix * vec4(position, 1.0);
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      varying vec3 vLocal, vFace, vSize;
      varying float vSeed;
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main() {
        float side = abs(vFace.z);
        float facing = 0.70 + vFace.x * 0.13 + vFace.z * 0.17;
        vec3 color = mix(vec3(0.019,0.031,0.050), vec3(0.036,0.053,0.076), fract(vSeed*0.73)) * facing;
        if (abs(vFace.y) < 0.5) {
          vec2 metres = vec2(mix(vLocal.z*vSize.z,vLocal.x*vSize.x,side),vLocal.y*vSize.y);
          vec2 grid = metres / vec2(1.62,2.65);
          vec2 cell = floor(grid); vec2 f = fract(grid);
          float pane = smoothstep(0.16,0.21,f.x) * (1.0-smoothstep(0.77,0.82,f.x));
          pane *= smoothstep(0.25,0.30,f.y) * (1.0-smoothstep(0.69,0.75,f.y));
          float room = hash(cell+vSeed);
          float floorOn = step(0.22,hash(vec2(cell.y,vSeed+3.0)));
          float occupied = step(0.64,room) * floorOn;
          float warmth = step(0.63,hash(cell+vSeed+19.0));
          vec3 lightColor = mix(vec3(0.34,0.61,0.82),vec3(1.0,0.61,0.28),warmth);
          color += pane * (0.019 + occupied*(0.34+room*0.31)) * lightColor;
          float vertical = 1.0 - smoothstep(0.015,0.035,abs(fract(metres.x/6.48)-0.5));
          color += vertical * vec3(0.012,0.020,0.032);
          float edge = pow(abs(mix(vLocal.z,vLocal.x,side)-0.5)*2.0,50.0);
          color += edge * vec3(0.013,0.024,0.039);
        } else {
          color = vec3(0.030,0.047,0.063);
          float parapet = step(0.468,max(abs(vLocal.x-0.5),abs(vLocal.z-0.5)));
          color += parapet * vec3(0.055,0.075,0.092);
        }
        gl_FragColor = vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  }));
  const buildings = [];
  const clearForFlight = (x, z, w, d, h) => !pathSamples.some(p =>
    p.y < h - 12 + 8 && Math.abs(p.x - x) < w / 2 + 13 && Math.abs(p.z - z) < d / 2 + 13);
  for (let row = 0; row < 20; row++) {
    for (let col = -8; col <= 8; col++) {
      if (random() < 0.14) continue;
      const x = col * 33 + lerp(-3.5, 3.5), z = -25 - row * 31 + lerp(-3, 3);
      const w = lerp(10, 23), d = lerp(11, 23);
      let h = lerp(24, 98) + Math.pow(random(), 4) * 65;
      if (row < 2) h *= 0.58;
      if (Math.abs(x) < 32 && z > -47) continue;
      // The gallery has its own walls and ceiling. Preserve its entire footprint.
      if (Math.abs(x) < 37 && z < -390 && z > -478) continue;
      if (!clearForFlight(x, z, w, d, h)) continue;
      buildings.push({ x, z, w, d, h, seed: random() * 1000 });
    }
  }
  const sizes = [], seeds = [];
  for (const b of buildings) { sizes.push(b.w, b.h, b.d); seeds.push(b.seed); }
  buildingGeometry.setAttribute('citySize', new THREE.InstancedBufferAttribute(new Float32Array(sizes), 3));
  buildingGeometry.setAttribute('citySeed', new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1));
  const towers = new THREE.InstancedMesh(buildingGeometry, buildingMaterial, buildings.length);
  towers.name = 'windowed-city-towers';
  buildings.forEach((b, i) => setMatrix(towers, i, [b.w, b.h, b.d], [b.x, b.h / 2 - 12, b.z]));
  towers.computeBoundingSphere(); root.add(towers);

  // Rooftop crowns make silhouettes readable during banking and descending shots.
  const rooftopSurface = basic(0x1a2633), rooftopLight = basic(0xa4cee0);
  const roofs = new THREE.InstancedMesh(boxGeometry, rooftopSurface, buildings.length);
  const edges = [], edgeColors = [], beacons = [];
  function edge(a, b, color) { edges.push(...a, ...b); edgeColors.push(...color, ...color); }
  buildings.forEach((b, i) => {
    const y = b.h - 12;
    setMatrix(roofs, i, [b.w * 0.43, 1.4 + b.h * 0.018, b.d * 0.38], [b.x, y + 0.7, b.z]);
    if (i % 3 !== 0) return;
    const x0 = b.x-b.w/2, x1 = b.x+b.w/2, z0 = b.z-b.d/2, z1 = b.z+b.d/2;
    const tint = i % 4 ? [0.15,0.29,0.38] : [0.42,0.30,0.18];
    edge([x0,y+.12,z0],[x1,y+.12,z0],tint); edge([x1,y+.12,z0],[x1,y+.12,z1],tint);
    edge([x1,y+.12,z1],[x0,y+.12,z1],tint); edge([x0,y+.12,z1],[x0,y+.12,z0],tint);
    if (b.h > 80) { edge([b.x,y+1,b.z],[b.x,y+7,b.z],[0.06,0.09,0.12]); beacons.push(b.x,y+7,b.z); }
  });
  roofs.computeBoundingSphere(); root.add(roofs);
  const edgeGeometry = geometry(new THREE.BufferGeometry());
  edgeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(edges,3));
  edgeGeometry.setAttribute('color',new THREE.Float32BufferAttribute(edgeColors,3));
  root.add(new THREE.LineSegments(edgeGeometry,material(new THREE.LineBasicMaterial({vertexColors:true}))));
  const beaconGeometry = geometry(new THREE.BufferGeometry());
  beaconGeometry.setAttribute('position',new THREE.Float32BufferAttribute(beacons,3));
  const beaconMaterial = material(new THREE.PointsMaterial({ color:0xff684b, size:0.5, sizeAttenuation:true, transparent:true }));
  root.add(new THREE.Points(beaconGeometry,beaconMaterial));

  box('city-ground',[650,.3,735],[0,-12.2,-292],basic(0x090f18));
  box('lobby-foundation',[19,10,27],[0,-7,1],basic(0x101b29));
  const roadSurface = basic(0x111b28), laneSurface = basic(0x283e4b);
  const roadParts = [], laneParts = [];
  for(let col=-8;col<8;col++) {
    const x=col*33+16.5;
    roadParts.push([[7,.02,710],[x,-11.99,-287]]);
    laneParts.push([[.10,.025,710],[x,-11.96,-287]]);
  }
  for(let row=0;row<21;row++) {
    const z=-9.5-row*31;
    roadParts.push([[620,.02,6],[0,-11.99,z]]);
    laneParts.push([[620,.025,.10],[0,-11.96,z]]);
  }
  for(const [parts,surface] of [[roadParts,roadSurface],[laneParts,laneSurface]]) {
    const mesh = new THREE.InstancedMesh(boxGeometry,surface,parts.length);
    parts.forEach(([size,position],i)=>setMatrix(mesh,i,size,position));
    mesh.computeBoundingSphere(); root.add(mesh);
  }
  const traffic = [];
  const trafficMesh = new THREE.InstancedMesh(boxGeometry,basic(0xffffff,{toneMapped:false}),100);
  const cool = new THREE.Color(0x90cbdc), warm = new THREE.Color(0xdd8060);
  for(let i=0;i<100;i++) {
    const north = i%2===0, direction=i%4<2?1:-1;
    traffic.push({ north, direction, lane:Math.floor(lerp(-7,8))*33+16.5+direction*1.55,
      cross:-9.5-Math.floor(lerp(0,20))*31+direction*1.4, offset:lerp(0,620), speed:lerp(6,13) });
    trafficMesh.setColorAt(i,direction>0?cool:warm);
  }
  trafficMesh.name='moving-street-light-trails'; trafficMesh.frustumCulled=false;
  trafficMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(trafficMesh);

  // A restrained sky gradient keeps the city readable without an external HDRI.
  const skySurface = material(new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false,
    vertexShader:`varying vec3 vDirection; void main(){vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec3 vDirection; void main(){
      float y=normalize(vDirection).y;
      vec3 color=mix(vec3(.044,.067,.105),vec3(.006,.014,.038),smoothstep(-.08,.75,y));
      color+=vec3(.009,.010,.013)*exp(-abs(y)*12.0);
      gl_FragColor=vec4(color,1.0);
      #include <colorspace_fragment>
    }`,
  }));
  const sky = new THREE.Mesh(geometry(new THREE.SphereGeometry(760,32,16)),skySurface);
  sky.position.set(0,40,-180); sky.renderOrder=-100; root.add(sky);
  const moon = new THREE.Mesh(geometry(new THREE.SphereGeometry(8.5,24,16)),basic(0xbacbd7,{fog:false,toneMapped:false}));
  moon.position.set(-151,224,-616); root.add(moon);
  const haloPixels = new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
    const distance=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5), i=(y*64+x)*4;
    haloPixels[i]=101;haloPixels[i+1]=143;haloPixels[i+2]=184;
    haloPixels[i+3]=Math.round(Math.max(0,Math.exp(-distance*distance*6)-.0025)*37);
  }
  const haloTexture = new THREE.DataTexture(haloPixels,64,64);haloTexture.needsUpdate=true;textures.add(haloTexture);
  const halo = new THREE.Sprite(material(new THREE.SpriteMaterial({map:haloTexture,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending})));
  halo.position.copy(moon.position);halo.scale.set(118,118,1);root.add(halo);
  const stars=[];
  for(let i=0;i<150;i++) {
    const angle=random()*Math.PI*2, y=lerp(.25,.95), radius=Math.sqrt(1-y*y)*680;
    stars.push(Math.cos(angle)*radius,y*680+40,Math.sin(angle)*radius-180);
  }
  const starGeometry=geometry(new THREE.BufferGeometry());
  starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
  root.add(new THREE.Points(starGeometry,material(new THREE.PointsMaterial({color:0x8195b1,size:.65,fog:false,transparent:true,opacity:.5}))));

  // Only the base and exterior edge: the destination module owns every gallery wall.
  box('floating-gallery-platform',[42,.3,40],[0,87.8,-434],basic(0x12202b));
  box('gallery-leading-edge',[42,.06,.08],[0,87.98,-414],rooftopLight);
  for(const side of [-1,1]) box('gallery-side-edge',[.065,.06,40],[21*side,87.98,-434],rooftopLight);
  box('gallery-underlight',[33,.025,.04],[0,87.62,-414.02],basic(0x497c92));
  // A lit pavilion silhouette makes the destination legible from the air.
  const galleryOutline=basic(0x8ea9bc), doorwayGlow=basic(0xe0c299);
  box('gallery-roof-outline',[40.4,.035,.04],[0,96.66,-419.91],galleryOutline);
  for(const side of [-1,1]) {
    box('gallery-facade-edge',[.035,8.5,.04],[side*20.14,92.28,-419.91],galleryOutline);
    box('gallery-facade-slit',[12,.015,.035],[side*10.8,90.1,-419.91],galleryOutline);
    box('gallery-entry-beacon',[.035,3.65,.06],[side*1.92,89.83,-419.87],doorwayGlow);
  }
  box('gallery-entry-crown',[3.87,.035,.06],[0,91.66,-419.87],doorwayGlow);
  root.userData.buildingCount=buildings.length;
  root.userData.pathClearance=13;

  function update({time=0,reveal=1}={}) {
    root.visible=reveal>0.001;
    if(!root.visible)return;
    beaconMaterial.opacity=.65+.25*Math.sin(time*1.4);
    for(let i=0;i<traffic.length;i++) {
      const car=traffic[i], moving=((car.offset+time*car.speed*car.direction)%620+620)%620;
      const position=car.north?[car.lane,-11.86,25-moving]:[moving-310,-11.86,car.cross];
      setMatrix(trafficMesh,i,car.north?[.11,.07,2.2]:[2.2,.07,.11],position);
    }
    trafficMesh.instanceMatrix.needsUpdate=true;
  }
  function dispose() {
    scene.remove(root);
    root.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
    geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());textures.forEach(value=>value.dispose());
  }
  return {root,curve,update,dispose};
}
