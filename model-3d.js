import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HOUSE_SOLAR_GLB_B64 } from './models-data.js';

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

const container = document.getElementById('model3d');
if (container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(3.4, 2.3, 3.6);
  const cameraDir = camera.position.clone().normalize();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const sunLight = new THREE.DirectionalLight(0xfff2d1, 2.6);
  sunLight.position.set(4, 6, 3);
  scene.add(sunLight);
  const fillLight = new THREE.DirectionalLight(0xcfe8ff, 0.55);
  fillLight.position.set(-4, 2, -3);
  scene.add(fillLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.5, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 2.6;
  controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1;

  const group = new THREE.Group();
  scene.add(group);

  const loader = new GLTFLoader();
  loader.parse(base64ToArrayBuffer(HOUSE_SOLAR_GLB_B64), '', (gltf) => {
    const house = gltf.scene;
    const box = new THREE.Box3().setFromObject(house);
    const size = box.getSize(new THREE.Vector3());
    const scale = 2.4 / Math.max(size.x, size.y, size.z);
    house.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(house);
    const center = scaledBox.getCenter(new THREE.Vector3());
    house.position.set(-center.x, -scaledBox.min.y, -center.z);
    group.add(house);

    const sphere = scaledBox.translate(house.position).getBoundingSphere(new THREE.Sphere());
    const fitDistance = (sphere.radius / Math.sin((camera.fov * Math.PI / 180) / 2)) * 1.25;
    camera.position.copy(cameraDir.clone().multiplyScalar(fitDistance));
    controls.target.copy(sphere.center);
    controls.minDistance = fitDistance * 0.55;
    controls.maxDistance = fitDistance * 1.8;
    controls.update();
  }, (err) => console.error('No se pudo cargar la maqueta 3D', err));

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    if (!container.clientWidth) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}
