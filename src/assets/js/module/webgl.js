import * as THREE from 'three';
import { resizeWatch } from './resize-watch.js';
import { Controls } from './controls.js';
import { ColorTex } from './color-texture.js';

export class Webgl{
  constructor(){
    this.size = 32;

    this.vertShader = [
      "/assets/glsl/output.vert",
      "/assets/glsl/cube.vert"
    ];

    this.fragShader = [
      "/assets/glsl/output.frag",
      "/assets/glsl/simulation_def.frag",
      "/assets/glsl/simulation_vel.frag",
      "/assets/glsl/simulation_pos.frag",
      "/assets/glsl/cube.frag",
    ];

    this.loadShaders();
  }

  async loadShaders() {
    try {
      // Load vertex shaders
      const vertPromises = this.vertShader.map(async (path, i) => {
        const response = await fetch(path);
        const text = await response.text();
        this.vertShader[i] = text;
      });

      // Load fragment shaders
      const fragPromises = this.fragShader.map(async (path, i) => {
        const response = await fetch(path);
        const text = await response.text();
        this.fragShader[i] = text;
      });

      // Wait for all shaders to load
      await Promise.all([...vertPromises, ...fragPromises]);
      
      // Initialize after all shaders are loaded
      this.init();
    } catch (error) {
      console.error('Failed to load shaders:', error);
    }
  }

  init(){
    this.width = 2048;
    this.height = 2048;
    this.aspect = this.width / this.height;
    this.setProps();
    this.container = document.getElementById( "wrapper" );

    this.renderer = new THREE.WebGLRenderer( { 
      antialias: true,
      alpha: true,
    } );

    this.renderer.autoClear = false;
    // renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( resizeWatch.width, resizeWatch.height );
    this.renderer.setClearColor( 0xffffff, 0.0 );
    this.container.appendChild( this.renderer.domElement );

    // Modern browser detection
    const isPC = window.innerWidth > 768; // Simple PC/mobile detection
    var ratio = isPC ? 1.0 : 2.0;

    this.renderer.setPixelRatio(ratio);


    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(this.props.fov, this.props.aspect, this.props.near, this.props.far);
    var cameraZ = (this.props.height / 2) / Math.tan((this.props.fov * Math.PI / 180) / 2);
    this.camera.position.set(0, 0, cameraZ);
    this.camera.lookAt(this.scene.position);

    this.controls = new Controls(this);

    this.colorTex = new ColorTex(this);

    this.createPlane();

    this.controls.init();

    
    

    this.time = new THREE.Clock();
    this.render();

    resizeWatch.register(this);
  };

  createFallbackScene() {
    // Create a simple rotating cube as fallback
    const geometry = new THREE.BoxGeometry(100, 100, 100);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff6b9d,
      wireframe: true 
    });
    this.fallbackMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.fallbackMesh);
    
    this.time = new THREE.Clock();
    this.renderFallback();
  }

  renderFallback() {
    if (this.fallbackMesh) {
      this.fallbackMesh.rotation.x += 0.01;
      this.fallbackMesh.rotation.y += 0.01;
    }
    
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.renderFallback());
  }


  setProps(){
    var width = resizeWatch.width;
    var height = resizeWatch.height;
    var aspect = width / height;

    this.props = {
      width: width,
      height: height,
      aspect: aspect,
      fov: 45,
      left: -width / 2,
      right: width / 2,
      top: height / 2,
      bottom: -height / 2,
      near: 0.1,
      far: 10000,
      parent: document.getElementById("wrapper")
    };
  };


  createPlane(){
    var g = new THREE.PlaneGeometry(this.width, this.height);

    

    this.uniforms = {
      uTex_1: { value: this.colorTex.fbo.texture},
      uTick: { value: 0},
      uSize: { value: new THREE.Vector2(this.width, this.height)},
      // uEdgeColor: { value: new THREE.Color(this.edgeColor)},
      uBgColor: { value: new THREE.Color(this.controls.props.bgColor)},
    };

    var m = new THREE.ShaderMaterial({
      vertexShader: this.vertShader[0],
      fragmentShader: this.fragShader[0],
      uniforms: this.uniforms
    });



    var mesh = new THREE.Mesh(g, m);

    mesh.position.z = 10;
    this.scene.add(mesh);

    this.plane = mesh;

    console.log(this.plane);

    if(resizeWatch.aspect > this.aspect){
      var scale = resizeWatch.width / this.width;
    } else {
      var scale = resizeWatch.height / this.height;
    }

    this.plane.scale.x = scale;
    this.plane.scale.y = scale;
  };


  render(){
    var delta = this.time.getDelta() * 5;
    var time = this.time.elapsedTime;

    this.renderer.clear();
    
    this.colorTex.render(time, delta);
    this.uniforms.uTick.value = time;

    this.renderer.render( this.scene, this.camera );

    requestAnimationFrame(this.render.bind(this));
  };


  resizeUpdate(){
    this.setProps();
    this.renderer.setSize(this.props.width, this.props.height);

    this.camera.aspect = this.props.aspect;

    var cameraZ = (this.props.height / 2) / Math.tan((this.props.fov * Math.PI / 180) / 2);

    this.camera.position.set(0, 0, cameraZ);
    this.camera.lookAt(this.scene.position);

    this.camera.updateProjectionMatrix();

    if(resizeWatch.aspect > this.aspect){
      var scale = resizeWatch.width / this.width;
    } else {
      var scale = resizeWatch.height / this.height;
    }

    this.plane.scale.x = scale;
    this.plane.scale.y = scale;
  }

}