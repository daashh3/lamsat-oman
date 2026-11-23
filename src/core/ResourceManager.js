import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
/** Tracks geometry/material ownership; procedural scenes need no external models. */
export class ResourceManager {
  constructor(){this.loader=new GLTFLoader();}
  loadModel(url){return this.loader.loadAsync(url).then(gltf=>gltf.scene);}
  dispose(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.removeFromParent();root.clear();}
}
