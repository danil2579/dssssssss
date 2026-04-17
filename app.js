import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('scene');
const loaderEl = document.getElementById('loader');
const hintEl = document.getElementById('hint');
const sheet = document.getElementById('sheet');
const sheetHandle = document.getElementById('sheet-handle');
const fileOutfit = document.getElementById('file-outfit');
const fileAvatar = document.getElementById('file-avatar');
const filePhotoFront = document.getElementById('file-photo-front');
const filePhotoSide = document.getElementById('file-photo-side');
const filePhotoBack = document.getElementById('file-photo-back');
const lblFront = document.getElementById('lbl-front');
const lblSide = document.getElementById('lbl-side');
const lblBack = document.getElementById('lbl-back');
const btnClearAvatar = document.getElementById('btn-clear-avatar');
const btnClearOutfit = document.getElementById('btn-clear-outfit');
const btnReset = document.getElementById('btn-reset');
const outfitControls = document.getElementById('outfit-controls');
const sY = document.getElementById('s-y');
const sScale = document.getElementById('s-scale');
const sCurve = document.getElementById('s-curve');
const sKey = document.getElementById('s-key');

// ---------- renderer + scene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x07070c, 6, 14);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 1.35, 3.2);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.4;
controls.maxDistance = 5.5;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = Math.PI - 0.25;
controls.target.set(0, 1.1, 0);
controls.enablePan = false;

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0xbfcaff, 0x1a1a24, 0.55));

const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(2.2, 3.0, 2.4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 10;
key.shadow.camera.left = -2;
key.shadow.camera.right = 2;
key.shadow.camera.top = 3;
key.shadow.camera.bottom = -1;
key.shadow.bias = -0.0004;
scene.add(key);

const rim = new THREE.DirectionalLight(0x7c5cff, 1.2);
rim.position.set(-2.5, 2.0, -2.0);
scene.add(rim);

const fill = new THREE.DirectionalLight(0x23d4b0, 0.4);
fill.position.set(-1.0, 1.0, 2.5);
scene.add(fill);

// ---------- ground ----------
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(3.2, 64),
  new THREE.ShadowMaterial({ opacity: 0.45 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

const glowRing = new THREE.Mesh(
  new THREE.RingGeometry(0.55, 1.25, 64),
  new THREE.MeshBasicMaterial({
    color: 0x7c5cff, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
  })
);
glowRing.rotation.x = -Math.PI / 2;
glowRing.position.y = 0.001;
scene.add(glowRing);

// ---------- mannequin placeholder ----------
const avatarGroup = new THREE.Group();
scene.add(avatarGroup);

const skinMat = new THREE.MeshStandardMaterial({
  color: 0xd7d7de, roughness: 0.55, metalness: 0.05,
});

function limb(geom, x, y, z) {
  const m = new THREE.Mesh(geom, skinMat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function buildMannequin() {
  const g = new THREE.Group();
  g.name = 'mannequin';

  // head + neck
  g.add(limb(new THREE.SphereGeometry(0.12, 32, 32), 0, 1.66, 0));
  g.add(limb(new THREE.CylinderGeometry(0.05, 0.055, 0.09, 24), 0, 1.53, 0));

  // torso — slight taper using lathe for smoother silhouette
  const torsoPts = [];
  const torsoProfile = [
    [0.00, 0.00], [0.19, 0.02], [0.21, 0.12], [0.22, 0.32],
    [0.19, 0.55], [0.17, 0.78], [0.12, 0.95], [0.00, 1.00],
  ];
  for (const [r, y] of torsoProfile) torsoPts.push(new THREE.Vector2(r, y));
  const torsoGeo = new THREE.LatheGeometry(torsoPts, 48);
  const torso = new THREE.Mesh(torsoGeo, skinMat);
  torso.scale.set(1.0, 0.86, 0.62);
  torso.position.set(0, 0.82, 0);
  torso.castShadow = true; torso.receiveShadow = true;
  g.add(torso);

  // hips
  const hips = limb(new THREE.CylinderGeometry(0.17, 0.16, 0.18, 32), 0, 0.78, 0);
  hips.scale.z = 0.7;
  g.add(hips);

  // arms
  const shoulderY = 1.42;
  for (const side of [-1, 1]) {
    const shoulder = limb(new THREE.SphereGeometry(0.07, 24, 24), side * 0.21, shoulderY, 0);
    g.add(shoulder);
    const upper = limb(new THREE.CylinderGeometry(0.055, 0.05, 0.32, 24), side * 0.27, shoulderY - 0.18, 0);
    upper.rotation.z = side * 0.15;
    g.add(upper);
    const elbow = limb(new THREE.SphereGeometry(0.05, 20, 20), side * 0.30, shoulderY - 0.36, 0);
    g.add(elbow);
    const fore = limb(new THREE.CylinderGeometry(0.045, 0.04, 0.30, 24), side * 0.33, shoulderY - 0.52, 0);
    fore.rotation.z = side * 0.08;
    g.add(fore);
    const hand = limb(new THREE.SphereGeometry(0.06, 20, 20), side * 0.35, shoulderY - 0.70, 0);
    hand.scale.set(0.75, 1.05, 0.5);
    g.add(hand);
  }

  // legs
  for (const side of [-1, 1]) {
    const thigh = limb(new THREE.CylinderGeometry(0.1, 0.08, 0.42, 24), side * 0.09, 0.52, 0);
    g.add(thigh);
    const knee = limb(new THREE.SphereGeometry(0.08, 20, 20), side * 0.09, 0.31, 0);
    g.add(knee);
    const shin = limb(new THREE.CylinderGeometry(0.075, 0.06, 0.4, 24), side * 0.09, 0.12, 0);
    g.add(shin);
    const foot = limb(new THREE.BoxGeometry(0.1, 0.06, 0.22), side * 0.09, -0.06, 0.04);
    g.add(foot);
  }

  return g;
}

let mannequin = buildMannequin();
avatarGroup.add(mannequin);

// ---------- photo-billboard avatar ----------
// One plane that always faces the camera; its texture swaps based on camera yaw
// around the avatar (front / side / back). Side is mirrored when camera is on
// the opposite side. This avoids the "cross of planes" intersection artifact.
const photoAvatarGroup = new THREE.Group();
scene.add(photoAvatarGroup);

const photoImages = { front: null, side: null, back: null };
let billboardMesh = null;

function buildPhotoTexture(image) {
  const tex = new THREE.Texture(image);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  const [br, bg, bb] = sampleBackgroundColor(image);
  const keyColor = new THREE.Color(br, bg, bb).convertSRGBToLinear();
  return { texture: tex, keyColor, aspect: image.naturalWidth / image.naturalHeight };
}

function rebuildBillboard() {
  if (billboardMesh) {
    billboardMesh.geometry.dispose();
    billboardMesh.material.dispose();
    photoAvatarGroup.remove(billboardMesh);
    billboardMesh = null;
  }

  const anyImage = photoImages.front || photoImages.side || photoImages.back;
  if (!anyImage) { refreshAvatarMode(); return; }

  const slots = {};
  for (const slot of ['front', 'side', 'back']) {
    if (photoImages[slot]) slots[slot] = buildPhotoTexture(photoImages[slot]);
  }

  // Use the largest aspect of available slots so the plane fits all textures.
  const refAspect = Math.max(...Object.values(slots).map(s => s.aspect));
  const heightM = 1.78;
  const widthM = heightM * refAspect;

  const first = slots.front || slots.side || slots.back;
  const material = new THREE.ShaderMaterial({
    vertexShader: outfitVertex,
    fragmentShader: photoAvatarFragment,
    uniforms: {
      map: { value: first.texture },
      keyColor: { value: first.keyColor },
      keyThreshold: { value: 0.18 },
      keySoftness: { value: 0.10 },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  billboardMesh = new THREE.Mesh(new THREE.PlaneGeometry(widthM, heightM), material);
  billboardMesh.position.y = heightM / 2;
  billboardMesh.userData.slots = slots;
  photoAvatarGroup.add(billboardMesh);
  refreshAvatarMode();
}

function updateBillboard() {
  if (!billboardMesh) return;

  // Yaw to camera, measured around Y axis (0 = camera directly in front of avatar).
  const dx = camera.position.x - billboardMesh.position.x;
  const dz = camera.position.z - billboardMesh.position.z;
  const yaw = Math.atan2(dx, dz);
  billboardMesh.rotation.set(0, yaw, 0);

  // Pick slot by angle with hysteresis-free hard swap at ±45° / ±135°.
  const slots = billboardMesh.userData.slots;
  const abs = Math.abs(yaw);
  let pick, mirror = false;
  if (abs < Math.PI / 4)           pick = 'front';
  else if (abs > 3 * Math.PI / 4)  pick = 'back';
  else { pick = 'side'; mirror = yaw < 0; }

  // Fallback to whichever slot is actually loaded.
  if (!slots[pick]) pick = slots.front ? 'front' : slots.side ? 'side' : 'back';

  const s = slots[pick];
  const mat = billboardMesh.material;
  if (mat.uniforms.map.value !== s.texture) {
    mat.uniforms.map.value = s.texture;
    mat.uniforms.keyColor.value = s.keyColor;
  }
  billboardMesh.scale.x = mirror ? -1 : 1;
}

function setPhotoSlot(slotName, image) {
  photoImages[slotName] = image;
  rebuildBillboard();
}

function refreshAvatarMode() {
  const anyPhoto = !!(photoImages.front || photoImages.side || photoImages.back);
  mannequin.visible = !anyPhoto;
  if (anyPhoto) {
    outfitGroup.position.set(0, 0, 0.05);
    if (outfitMesh) outfitMesh.position.y = parseFloat(sY.value) + 1.1;
  } else {
    outfitGroup.position.set(0, 1.1, 0);
    if (outfitMesh) outfitMesh.position.y = parseFloat(sY.value);
  }
}

function clearAvatarPhotos() {
  photoImages.front = photoImages.side = photoImages.back = null;
  for (const lbl of [lblFront, lblSide, lblBack]) lbl.dataset.state = 'empty';
  filePhotoFront.value = ''; filePhotoSide.value = ''; filePhotoBack.value = '';
  rebuildBillboard();
}

function wirePhotoSlot(input, label, slotName) {
  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loaderEl.classList.remove('hidden');
    const img = new Image();
    img.onload = () => {
      setPhotoSlot(slotName, img);
      label.dataset.state = 'filled';
      hintEl.classList.add('hidden');
      loaderEl.classList.add('hidden');
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      loaderEl.classList.add('hidden');
      alert('Не удалось загрузить фото');
    };
    img.src = URL.createObjectURL(file);
  });
}

// ---------- outfit mesh (curved cloth overlay) ----------
const outfitGroup = new THREE.Group();
outfitGroup.position.set(0, 1.1, 0);
avatarGroup.add(outfitGroup);

let outfitMesh = null;

function buildOutfitGeometry({ width = 1.0, height = 1.3, curve = 0.55, cols = 40, rows = 32 } = {}) {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array((cols + 1) * (rows + 1) * 3);
  const uvs = new Float32Array((cols + 1) * (rows + 1) * 2);
  const indices = [];
  const depth = width * 0.35 * curve;

  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const v = j / rows;
      const x = (u - 0.5) * width;
      const y = (0.5 - v) * height;
      const t = 2 * u - 1;
      // forward bulge (parabola) + subtle side wrap for realism
      const z = depth * (1 - t * t);
      const idx = (j * (cols + 1) + i) * 3;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
      const uv = (j * (cols + 1) + i) * 2;
      uvs[uv] = u;
      uvs[uv + 1] = 1 - v;
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const c = a + (cols + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

const outfitVertex = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const outfitFragment = /* glsl */`
  uniform sampler2D map;
  uniform vec3 keyColor;
  uniform float keyThreshold;
  uniform float keySoftness;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec4 tex = texture2D(map, vUv);
    float d = distance(tex.rgb, keyColor);
    float alpha = smoothstep(keyThreshold, keyThreshold + keySoftness, d);
    if (alpha < 0.015) discard;

    // soft shading from normal (fakes light without full PBR)
    float shade = 0.65 + 0.35 * clamp(dot(vNormal, normalize(vec3(0.4, 0.6, 0.8))), 0.0, 1.0);
    vec3 color = tex.rgb * shade;

    gl_FragColor = vec4(color, alpha);
  }
`;

// Same chroma-key as outfit, but no fake shading — photos already have real light baked in.
const photoAvatarFragment = /* glsl */`
  uniform sampler2D map;
  uniform vec3 keyColor;
  uniform float keyThreshold;
  uniform float keySoftness;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(map, vUv);
    float d = distance(tex.rgb, keyColor);
    float alpha = smoothstep(keyThreshold, keyThreshold + keySoftness, d);
    if (alpha < 0.015) discard;
    gl_FragColor = vec4(tex.rgb, alpha);
  }
`;

function sampleBackgroundColor(image) {
  const c = document.createElement('canvas');
  const w = 32, h = 32;
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  const samples = [
    ctx.getImageData(0, 0, 1, 1).data,
    ctx.getImageData(w - 1, 0, 1, 1).data,
    ctx.getImageData(0, h - 1, 1, 1).data,
    ctx.getImageData(w - 1, h - 1, 1, 1).data,
    ctx.getImageData(Math.floor(w / 2), 0, 1, 1).data,
  ];
  let r = 0, g = 0, b = 0;
  for (const s of samples) { r += s[0]; g += s[1]; b += s[2]; }
  r /= samples.length; g /= samples.length; b /= samples.length;
  return [r / 255, g / 255, b / 255];
}

function applyOutfitImage(image) {
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;

  const [br, bg, bb] = sampleBackgroundColor(image);
  const keyColor = new THREE.Color(br, bg, bb).convertSRGBToLinear();

  const aspect = image.naturalWidth / image.naturalHeight;
  const targetHeight = 1.35;
  const targetWidth = targetHeight * aspect;

  const material = new THREE.ShaderMaterial({
    vertexShader: outfitVertex,
    fragmentShader: outfitFragment,
    uniforms: {
      map: { value: texture },
      keyColor: { value: keyColor },
      keyThreshold: { value: parseFloat(sKey.value) },
      keySoftness: { value: 0.18 },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  removeOutfit();

  const geom = buildOutfitGeometry({
    width: targetWidth * parseFloat(sScale.value),
    height: targetHeight * parseFloat(sScale.value),
    curve: parseFloat(sCurve.value),
  });
  outfitMesh = new THREE.Mesh(geom, material);
  outfitMesh.userData.baseWidth = targetWidth;
  outfitMesh.userData.baseHeight = targetHeight;
  outfitMesh.position.y = parseFloat(sY.value);
  outfitGroup.add(outfitMesh);

  outfitControls.hidden = false;
  hintEl.classList.add('hidden');
  refreshAvatarMode();
}

function removeOutfit() {
  if (outfitMesh) {
    outfitMesh.geometry.dispose();
    outfitMesh.material.uniforms.map.value?.dispose();
    outfitMesh.material.dispose();
    outfitGroup.remove(outfitMesh);
    outfitMesh = null;
  }
  outfitControls.hidden = true;
}

function rebuildOutfitGeometry() {
  if (!outfitMesh) return;
  const { baseWidth, baseHeight } = outfitMesh.userData;
  const scale = parseFloat(sScale.value);
  const curve = parseFloat(sCurve.value);
  outfitMesh.geometry.dispose();
  outfitMesh.geometry = buildOutfitGeometry({
    width: baseWidth * scale,
    height: baseHeight * scale,
    curve,
  });
}

// ---------- file handlers ----------
fileOutfit.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  loaderEl.classList.remove('hidden');
  const img = new Image();
  img.onload = () => {
    applyOutfitImage(img);
    loaderEl.classList.add('hidden');
  };
  img.onerror = () => {
    loaderEl.classList.add('hidden');
    alert('Не удалось загрузить изображение');
  };
  img.src = URL.createObjectURL(file);
});

btnClearOutfit.addEventListener('click', () => {
  removeOutfit();
  hintEl.classList.remove('hidden');
  fileOutfit.value = '';
});

wirePhotoSlot(filePhotoFront, lblFront, 'front');
wirePhotoSlot(filePhotoSide, lblSide, 'side');
wirePhotoSlot(filePhotoBack, lblBack, 'back');
btnClearAvatar.addEventListener('click', clearAvatarPhotos);

fileAvatar.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  loaderEl.classList.remove('hidden');
  try {
    const url = URL.createObjectURL(file);
    const gltf = await new GLTFLoader().loadAsync(url);
    URL.revokeObjectURL(url);
    replaceAvatar(gltf.scene);
  } catch (err) {
    console.error(err);
    alert('Не удалось загрузить .glb');
  } finally {
    loaderEl.classList.add('hidden');
  }
});

function replaceAvatar(object) {
  avatarGroup.remove(mannequin);
  mannequin.traverse(o => {
    if (o.isMesh) { o.geometry?.dispose(); o.material?.dispose?.(); }
  });

  // normalize size: fit to 1.7m height
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = 1.7 / Math.max(size.y, 0.001);
  object.scale.setScalar(scale);

  // re-center feet at y=0
  const box2 = new THREE.Box3().setFromObject(object);
  object.position.y -= box2.min.y;
  object.position.x -= (box2.min.x + box2.max.x) / 2 * scale;
  object.position.z -= (box2.min.z + box2.max.z) / 2 * scale;

  object.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  mannequin = object;
  avatarGroup.add(mannequin);
}

// ---------- control wiring ----------
sY.addEventListener('input', () => {
  if (!outfitMesh) return;
  const usingPhoto = !!(photoMeshes.front || photoMeshes.side || photoMeshes.back);
  outfitMesh.position.y = parseFloat(sY.value) + (usingPhoto ? 1.1 : 0);
});
sScale.addEventListener('input', rebuildOutfitGeometry);
sCurve.addEventListener('input', rebuildOutfitGeometry);
sKey.addEventListener('input', () => {
  if (outfitMesh) outfitMesh.material.uniforms.keyThreshold.value = parseFloat(sKey.value);
});

btnReset.addEventListener('click', () => {
  controls.target.set(0, 1.1, 0);
  camera.position.set(0, 1.35, 3.2);
});

// ---------- bottom sheet drag ----------
let sheetOpen = false;
function toggleSheet(open) {
  sheetOpen = open ?? !sheetOpen;
  sheet.classList.toggle('open', sheetOpen);
}
sheetHandle.addEventListener('click', () => toggleSheet());

let startY = null;
sheet.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
sheet.addEventListener('touchend', (e) => {
  if (startY == null) return;
  const dy = e.changedTouches[0].clientY - startY;
  if (dy < -40) toggleSheet(true);
  else if (dy > 40) toggleSheet(false);
  startY = null;
});

// ---------- resize + render loop ----------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function tick() {
  controls.update();
  updateBillboard();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

// Prevent iOS double-tap zoom on controls
document.addEventListener('gesturestart', (e) => e.preventDefault());
