// src/components/PlaneViewer.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import "../index.css";

export default function PlaneViewer({
  modelPath = "/models/boeing787.glb",
  envPath = "/models/env.hdr",
  height = "520px",
  autoRotateSpeed = 0.25,
  syncRotation = true,
  rotationMultiplier = 1.0,
}) {
  const mountRef = useRef(null);
  const modelGroupRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let mounted = true;
    let model = null;
    let modelGroup = null;

    // ---------- Configuración básica de Three.js ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f7fb);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    });
    
    // Reducir calidad para mejor rendimiento
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    renderer.shadowMap.enabled = false; // Deshabilitar sombras para carga más rápida

    const w0 = container.clientWidth || 800;
    const h0 = container.clientHeight || 480;
    renderer.setSize(w0, h0);
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(35, w0 / h0, 0.1, 100); // Reducir distancia far
    camera.position.set(0, 2.4, 6);

    // ---------- Luces simplificadas ----------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemi);
    
    const dir = new THREE.DirectionalLight(0xffffff, 2.0);
    dir.position.set(6, 10, 6);
    scene.add(dir);

    // ---------- Suelo básico ----------
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0xf6f8fa, 
      roughness: 1.0, 
      metalness: 0.0 
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), groundMat); // Geometría más pequeña
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.25;
    scene.add(ground);

    // ---------- Controles ----------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.5, 0);
    controls.minDistance = 1.2;
    controls.maxDistance = 20;

    // ---------- Cargador GLTF optimizado ----------
    const loader = new GLTFLoader();
    
    // Configurar DRACO loader para modelos comprimidos
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    // Precargar shaders
    renderer.compile(scene, camera);

    // ---------- Carga del modelo ----------
    setLoading(true);
    
    // Intentar cargar ambiente primero, pero no bloquear carga del modelo
    let envLoadAttempted = false;
    
    const loadModel = () => {
      loader.load(
        modelPath,
        (gltf) => {
          if (!mounted) return;

          model = gltf.scene || gltf.scenes[0];
          modelGroup = new THREE.Group();
          modelGroupRef.current = modelGroup;

          // Escalado y centrado optimizado
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3.2 / (maxDim || 1);
          model.scale.setScalar(scale);
          
          // Posicionar
          model.position.x = -center.x * scale;
          model.position.y = -box.min.y * scale;

          // Materiales optimizados - solo aplicar cambios esenciales
          model.traverse((node) => {
            if (node.isMesh) {
              const mat = node.material;
              
              if (mat) {
                // Solo modificar si es necesario
                if (mat.isMeshBasicMaterial) {
                  node.material = new THREE.MeshStandardMaterial({
                    map: mat.map,
                    color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
                    metalness: 0.05,
                    roughness: 0.6,
                  });
                } else if (mat.isMeshStandardMaterial) {
                  mat.metalness = 0.05;
                  mat.roughness = 0.6;
                }
                
                node.castShadow = false;
                node.receiveShadow = false;
              }
            }
          });

          modelGroup.add(model);
          scene.add(modelGroup);

          setLoading(false);
          setError(null);
        },
        (progress) => {
          // Opcional: mostrar progreso de carga
          console.log(`Cargando modelo: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (err) => {
          console.error("Error cargando GLB:", err);
          setError(`Error cargando modelo 3D: ${err.message}`);
          setLoading(false);
        }
      );
    };

    // Cargar ambiente en segundo plano sin bloquear el modelo
    if (envPath) {
      import("three/examples/jsm/loaders/RGBELoader.js")
        .then(({ RGBELoader }) => {
          const pmremGenerator = new THREE.PMREMGenerator(renderer);
          pmremGenerator.compileEquirectangularShader();
          
          new RGBELoader()
            .setDataType(THREE.UnsignedByteType)
            .load(envPath, 
              (texture) => {
                if (mounted && texture) {
                  try {
                    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                    scene.environment = envMap;
                    texture.dispose();
                    
                    // Actualizar materiales existentes con environment map
                    if (modelGroup) {
                      modelGroup.traverse((node) => {
                        if (node.isMesh && node.material) {
                          node.material.envMap = envMap;
                          node.material.envMapIntensity = 1.0;
                          node.material.needsUpdate = true;
                        }
                      });
                    }
                  } catch (e) {
                    console.warn("Error procesando environment map:", e);
                  }
                  pmremGenerator.dispose();
                }
              },
              undefined,
              (err) => {
                console.warn("No se pudo cargar environment map:", err);
              }
            );
        })
        .catch(() => {
          console.warn("RGBELoader no disponible, continuando sin environment map");
        });
    }

    // Iniciar carga del modelo inmediatamente
    loadModel();

    // ---------- Lógica de arrastre ----------
    let dragging = false;
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const planeXZ = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    function getPointer(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onPointerDown(e) {
      if (!modelGroup) return;
      getPointer(e);
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(modelGroup, true);
      if (intersects.length > 0) {
        dragging = true;
        controls.enabled = false;
      }
    }

    function onPointerMove(e) {
      if (!dragging || !modelGroup) return;
      getPointer(e);
      raycaster.setFromCamera(pointer, camera);
      const intersectPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(planeXZ, intersectPoint)) {
        modelGroup.position.x = intersectPoint.x;
        modelGroup.position.z = intersectPoint.z;
      }
    }

    function onPointerUp() {
      dragging = false;
      controls.enabled = true;
    }

    // Event listeners
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // ---------- Animación ----------
    const clock = new THREE.Clock();
    function animate() {
      if (!mounted) return;
      requestAnimationFrame(animate);

      const delta = clock.getDelta();

      if (syncRotation && modelGroup && !dragging) {
        modelGroup.rotation.y += delta * autoRotateSpeed * rotationMultiplier;
      }

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // ---------- Resize ----------
    function handleResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ---------- Cleanup ----------
    return () => {
      mounted = false;
      resizeObserver.disconnect();
      
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      controls.dispose();
      renderer.dispose();
      
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelPath, envPath, autoRotateSpeed, syncRotation, rotationMultiplier]);

  return (
    <div className="plane-viewer-wrapper" style={{ width: "100%", height }}>
      {loading && (
        <div className="plane-loader">
          Cargando Boeing 787...
          <div style={{marginTop: '10px', fontSize: '12px'}}>Esto puede tomar unos segundos</div>
        </div>
      )}
      {error && (
        <div className="plane-error">
          {error}
          <button 
            onClick={() => window.location.reload()} 
            style={{marginLeft: '10px', padding: '5px 10px'}}
          >
            Reintentar
          </button>
        </div>
      )}
      <div 
        ref={mountRef} 
        style={{ 
          width: "100%", 
          height: "100%", 
          position: "relative",
          cursor: "grab" 
        }} 
      />
      <div style={{ 
        position: "absolute", 
        right: 12, 
        bottom: 12, 
        zIndex: 12, 
        fontSize: 12, 
        color: "#222",
        background: "rgba(255,255,255,0.7)",
        padding: "4px 8px",
        borderRadius: "4px"
      }}>
        Arrastra el avión para moverlo • Rueda para zoom • Arrastra para rotar cámara
      </div>
    </div>
  );
}