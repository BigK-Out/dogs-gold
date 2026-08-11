import * as THREE from "three";
import brush from "./burash01.png";

const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D uDisplacement;
uniform vec4 resolution;
varying vec2 vUv;

float PI = 3.141592653589793238;

void main() {
    vec4 displacement = texture2D(uDisplacement, vUv);
    float magnitude = displacement.r;
    float theta = magnitude * 2.0 * PI;
    vec2 dir = vec2(sin(theta), cos(theta));
    vec2 uv = vUv + dir * magnitude * 0.2;
    vec4 ripple = texture2D(uDisplacement, uv);

    vec3 color = mix(vec3(0.4, 0.8, 1.0), vec3(1.0), ripple.r);
    float alpha = ripple.r * 0.8;

    gl_FragColor = vec4(color, alpha);
}
`;

export default class RippleEffect {
  constructor(container) {
    this.container = container;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.top = "0";
    this.renderer.domElement.style.left = "0";
    this.container.appendChild(this.renderer.domElement);

    this.baseTexture = new THREE.WebGLRenderTarget(this.width, this.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    this.brushScene = new THREE.Scene();
    this.scene = new THREE.Scene();

    const frustumSize = this.height;
    const aspect = this.width / this.height;
    this.camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      1,
      1000
    );
    this.camera.position.set(0, 0, 2);

    this.mouse = new THREE.Vector2(0, 0);
    this.prevMouse = new THREE.Vector2(0, 0);
    this.currentWave = 0;
    this.isPlaying = true;

    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uDisplacement: { value: null },
        resolution: { value: new THREE.Vector4(this.width, this.height, 1, 1) },
      },
      vertexShader,
      fragmentShader,
    });

    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.height),
      this.material
    );
    this.scene.add(this.quad);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(brush, (texture) => {
      this.brushTexture = texture;
      this.addObjects();
      this.mouseEvents();
      this.setupResize();
      this.resize();
      this.render();
    });
  }

  setupResize() {
    this._onResize = this.resize.bind(this);
    window.addEventListener("resize", this._onResize);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height);
    this.baseTexture.setSize(this.width, this.height);

    const frustumSize = this.height;
    const aspect = this.width / this.height;
    this.camera.left = (frustumSize * aspect) / -2;
    this.camera.right = (frustumSize * aspect) / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = frustumSize / -2;
    this.camera.updateProjectionMatrix();

    this.material.uniforms.resolution.value.set(this.width, this.height, 1, 1);
    this.quad.geometry.dispose();
    this.quad.geometry = new THREE.PlaneGeometry(this.width, this.height);
  }

  mouseEvents() {
    this._onMouseMove = (e) => {
      this.mouse.x = e.clientX - this.width / 2;
      this.mouse.y = this.height / 2 - e.clientY;
    };
    window.addEventListener("mousemove", this._onMouseMove);
  }

  setNewWave(x, y, index) {
    const mesh = this.meshes[index];
    mesh.visible = true;
    mesh.position.x = x;
    mesh.position.y = y;
    mesh.rotation.z = Math.random() * 2 * Math.PI;
    mesh.scale.x = mesh.scale.y = 1;
    mesh.material.opacity = 1;
  }

  trackMousePos() {
    if (
      Math.abs(this.mouse.x - this.prevMouse.x) > 4 ||
      Math.abs(this.mouse.y - this.prevMouse.y) > 4
    ) {
      this.setNewWave(this.mouse.x, this.mouse.y, this.currentWave);
      this.currentWave = (this.currentWave + 1) % this.max;
    }
    this.prevMouse.x = this.mouse.x;
    this.prevMouse.y = this.mouse.y;
  }

  addObjects() {
    this.max = 50;
    this.geometry = new THREE.PlaneGeometry(80, 80, 1, 1);
    this.meshes = [];

    for (let i = 0; i < this.max; i++) {
      const m = new THREE.MeshBasicMaterial({
        map: this.brushTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.geometry, m);
      mesh.visible = false;
      mesh.rotation.z = 2 * Math.PI * Math.random();
      this.brushScene.add(mesh);
      this.meshes.push(mesh);
    }
  }

  render = () => {
    if (!this.isPlaying) return;
    this.trackMousePos();

    this.renderer.setRenderTarget(this.baseTexture);
    this.renderer.render(this.brushScene, this.camera);
    this.renderer.setRenderTarget(null);

    this.material.uniforms.uDisplacement.value = this.baseTexture.texture;
    this.renderer.render(this.scene, this.camera);

    this.meshes.forEach((mesh) => {
      if (mesh.visible) {
        mesh.rotation.z += 0.02;
        mesh.material.opacity *= 0.96;
        mesh.scale.x = 0.98 * mesh.scale.x + 0.1;
        mesh.scale.y = mesh.scale.x;
        if (mesh.material.opacity < 0.02) mesh.visible = false;
      }
    });

    requestAnimationFrame(this.render);
  };

  destroy() {
    this.isPlaying = false;
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("mousemove", this._onMouseMove);
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
