import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PlaneViewer from '../../components/PlaneViewer';

const threeMock = vi.hoisted(() => {
  const createCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = vi.fn();
    canvas.addEventListener = vi.fn();
    canvas.removeEventListener = vi.fn();
    return canvas;
  };

  class WebGLRenderer {
    constructor() {
      this.domElement = createCanvas();
      this.shadowMap = {};
    }
    setPixelRatio() {}
    setSize() {}
    dispose() {}
    compile() {}
    render() {}
  }

  class PerspectiveCamera {
    constructor() {
      this.position = { set: vi.fn() };
      this.updateProjectionMatrix = vi.fn();
      this.aspect = 1;
    }
  }

  class Scene {
    constructor() {
      this.background = null;
      this.environment = null;
    }
    add() {}
    remove() {}
  }

  class Mesh {
    constructor() {
      this.rotation = { x: 0 };
      this.position = { y: 0 };
      this.castShadow = false;
      this.receiveShadow = false;
    }
  }

  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0 };
      this.rotation = { y: 0 };
    }
    add(child) {
      this.children.push(child);
    }
    traverse() {}
  }

  class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  class Box3 {
    constructor() {
      this.min = { y: 0 };
    }
    setFromObject() {
      return this;
    }
    getCenter(target) {
      target.x = 0;
      target.y = 0;
      target.z = 0;
      return target;
    }
    getSize(target) {
      target.x = 1;
      target.y = 1;
      target.z = 1;
      return target;
    }
  }

  class Raycaster {
    constructor() {
      this.ray = {
        intersectPlane: vi.fn(() => false),
      };
    }
    setFromCamera() {}
    intersectObject() {
      return [];
    }
  }

  class Plane {
    constructor() {}
  }

  class Clock {
    getDelta() {
      return 0.016;
    }
  }

  class Vector2 {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
  }

  class PMREMGenerator {
    constructor() {}
    compileEquirectangularShader() {}
    fromEquirectangular() {
      return { texture: {} };
    }
    dispose() {}
  }

  return {
    __esModule: true,
    Scene,
    Color: class {},
    WebGLRenderer,
    PerspectiveCamera,
    HemisphereLight: class { constructor() { this.position = { set: vi.fn() }; } },
    DirectionalLight: class { constructor() { this.position = { set: vi.fn() }; } },
    MeshStandardMaterial: class {},
    Mesh,
    PlaneGeometry: class {},
    Group,
    Vector3,
    Box3,
    Vector2,
    Raycaster,
    Plane,
    Clock,
    UnsignedByteType: 'UnsignedByteType',
    PMREMGenerator,
    sRGBEncoding: 'sRGB',
    ACESFilmicToneMapping: 'ACES',
  };
});

vi.mock('three', () => ({
  ...threeMock,
  default: threeMock,
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    constructor() {
      this.target = { set: vi.fn() };
      this.enableDamping = false;
      this.dampingFactor = 0;
      this.minDistance = 0;
      this.maxDistance = 0;
    }
    update() {}
    dispose() {}
  },
}));

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setDRACOLoader() {}
    load(path, onLoad) {
      const model = {
        scale: { setScalar: vi.fn() },
        position: { x: 0, y: 0, z: 0 },
        traverse: (cb) => cb({ isMesh: true, material: { isMeshBasicMaterial: true } }),
      };
      Promise.resolve().then(() => onLoad({ scene: model }));
    }
  },
}));

vi.mock('three/examples/jsm/loaders/DRACOLoader.js', () => ({
  DRACOLoader: class {
    setDecoderPath() {}
  },
}));

vi.mock('three/examples/jsm/loaders/RGBELoader.js', () => ({
  RGBELoader: class {
    setDataType() {
      return this;
    }
    load(path, onLoad) {
      onLoad({ dispose() {} });
    }
  },
}));

const originalRAF = globalThis.requestAnimationFrame;
const originalCAF = globalThis.cancelAnimationFrame;

describe('PlaneViewer component', () => {
  beforeAll(() => {
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  });

  afterAll(() => {
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
  });

  it('hides the loading message once the model loads', async () => {
    render(<PlaneViewer />);

    expect(screen.getByText(/Cargando Boeing 787/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Cargando Boeing 787/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Arrastra el avión/i)).toBeInTheDocument();
  });
});
