import * as THREE from 'three';
import { GPUComputationRenderer } from '../lib/GPUComputationRenderer.js';

export class Simulation{
  constructor(basic, size){
    this.basic = basic;
    this.renderer = this.basic.renderer;
    this.size = size;
    this.init();
  }

  init(){
    try {
      this.gpuCompute = new GPUComputationRenderer( this.size, this.size, this.renderer );

      this.dataPos = this.gpuCompute.createTexture();
      this.dataVel = this.gpuCompute.createTexture();
      this.dataDef = this.gpuCompute.createTexture();

      if (!this.dataPos || !this.dataVel || !this.dataDef) {
        console.warn('GPU textures failed, falling back to CPU simulation');
        this.initCPUFallback();
        return;
      }

      var posArray = this.dataPos.image.data;
      var velArray = this.dataVel.image.data;
      var defArray = this.dataDef.image.data;

      // Initialize GPU compute data
      for ( var i = 0, il = posArray.length; i < il; i += 4 ) {
        var phi = Math.random() * 2 * Math.PI;
        var theta = Math.random() * Math.PI;
        var r = (1.2 + Math.random() * 2) * 1.2;

        defArray[ i + 0 ] = posArray[ i + 0 ] = r * Math.sin( theta) * Math.cos( phi );
        defArray[ i + 1 ] = posArray[ i + 1 ] = r * Math.sin( theta) * Math.sin( phi ) * 1.4;
        defArray[ i + 2 ] = posArray[ i + 2 ] = r * Math.cos( theta );
        defArray[ i + 3 ] = posArray[ i + 3 ] = Math.random() * 0.5;

        velArray[ i + 3 ] = Math.random() * 100; // frames life
      }

      this.def = this.gpuCompute.addVariable( "defTex", this.basic.fragShader[1], this.dataDef );
      this.vel = this.gpuCompute.addVariable( "velTex", this.basic.fragShader[2], this.dataVel );
      this.pos = this.gpuCompute.addVariable( "posTex", this.basic.fragShader[3], this.dataPos );

      this.gpuCompute.setVariableDependencies( this.def, [ this.pos, this.vel, this.def ] );
      this.gpuCompute.setVariableDependencies( this.vel, [ this.pos, this.vel, this.def ] );
      this.gpuCompute.setVariableDependencies( this.pos, [ this.pos, this.vel, this.def ] );

      this.velUniforms = this.vel.material.uniforms;
      this.velUniforms.timer = { value: 0.0 };
      this.velUniforms.delta = { value: 0.0 };
      this.velUniforms.speed = { value: 0.3 };
      this.velUniforms.factor = { value: 0.5 };
      this.velUniforms.evolution = { value: 0.5 };
      this.velUniforms.radius = { value: 2.0 };

      var error = this.gpuCompute.init();
      if ( error !== null ) {
          console.warn('GPU compute initialization failed:', error);
          this.initCPUFallback();
          return;
      }
      
      this.useGPU = true;
    } catch (error) {
      console.warn('GPU simulation failed, using CPU fallback:', error);
      this.initCPUFallback();
    }
  }

  initCPUFallback() {
    // Create fallback properties that ColorTex expects
    this.useGPU = false;
    
    // Create simple data textures for CPU simulation
    const size = this.size;
    this.fallbackPosData = new Float32Array(size * size * 4);
    this.fallbackVelData = new Float32Array(size * size * 4);
    
    // Initialize with random positions in a sphere
    for (let i = 0; i < this.fallbackPosData.length; i += 4) {
      const phi = Math.random() * 2 * Math.PI;
      const theta = Math.random() * Math.PI;
      const r = (1.2 + Math.random() * 2) * 1.2;

      this.fallbackPosData[i + 0] = r * Math.sin(theta) * Math.cos(phi);
      this.fallbackPosData[i + 1] = r * Math.sin(theta) * Math.sin(phi) * 1.4;
      this.fallbackPosData[i + 2] = r * Math.cos(theta);
      this.fallbackPosData[i + 3] = Math.random() * 0.5;
      
      this.fallbackVelData[i + 3] = Math.random() * 100;
    }
    
    // Create basic data textures
    this.fallbackPosTexture = new THREE.DataTexture(
      this.fallbackPosData, size, size, THREE.RGBAFormat, THREE.FloatType
    );
    this.fallbackPosTexture.needsUpdate = true;
    
    this.fallbackVelTexture = new THREE.DataTexture(
      this.fallbackVelData, size, size, THREE.RGBAFormat, THREE.FloatType
    );
    this.fallbackVelTexture.needsUpdate = true;
    
    // Create mock objects that ColorTex can use
    this.pos = { 
      material: { 
        uniforms: {
          timer: { value: 0.0 },
          delta: { value: 0.0 }
        }
      }
    };
    this.vel = { 
      material: { 
        uniforms: {
          timer: { value: 0.0 },
          delta: { value: 0.0 },
          speed: { value: 0.3 },
          factor: { value: 0.5 },
          evolution: { value: 0.5 },
          radius: { value: 2.0 }
        }
      }
    };
    
    this.velUniforms = this.vel.material.uniforms;
    
    // Mock gpuCompute with fallback textures
    this.gpuCompute = {
      getCurrentRenderTarget: (variable) => {
        if (variable === this.pos) {
          return { texture: this.fallbackPosTexture };
        } else if (variable === this.vel) {
          return { texture: this.fallbackVelTexture };
        }
        return { texture: this.fallbackPosTexture };
      },
      compute: () => {
        // Simple animation for CPU fallback
        const time = Date.now() * 0.001;
        for (let i = 0; i < this.fallbackPosData.length; i += 4) {
          // Simple rotation animation
          const angle = time * 0.5 + (i / 4) * 0.1;
          const radius = 1.5 + Math.sin(time + (i / 4) * 0.5) * 0.5;
          
          this.fallbackPosData[i + 0] = radius * Math.cos(angle);
          this.fallbackPosData[i + 2] = radius * Math.sin(angle);
        }
        this.fallbackPosTexture.needsUpdate = true;
      }
    };
  }
  
}