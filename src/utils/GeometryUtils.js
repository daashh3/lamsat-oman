import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
export function material(color, metalness=0, roughness=.65, extra={}) { return new THREE.MeshStandardMaterial({color,metalness,roughness,...extra}); }
export function surfaceTexture(kind='wood') {
  const size=64, bytes=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const hash = Math.sin(x*127.1+y*311.7)*43758.5453;
    const noise=hash-Math.floor(hash);
    const stripe=kind==='wood' ? Math.sin(y*.75+Math.sin(x*.12)*1.8)*.10 : 0;
    const value=Math.max(0,Math.min(255,Math.round(220+noise*13+stripe*90)));
    const at=(y*size+x)*4; bytes[at]=bytes[at+1]=bytes[at+2]=value; bytes[at+3]=255;
  }
  const t=new THREE.DataTexture(bytes,size,size); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.magFilter=THREE.LinearFilter; t.minFilter=THREE.LinearMipmapLinearFilter; t.generateMipmaps=true; t.repeat.set(kind==='wood'?2:3,kind==='wood'?5:3); t.needsUpdate=true; t.colorSpace=THREE.SRGBColorSpace; return t;
}
export function palette() {
  const woodTexture=surfaceTexture('wood'), stoneTexture=surfaceTexture('stone');
  return {
    wood:material('#59301c',0,.64,{map:woodTexture}), woodLight:material('#97603a',0,.6,{map:woodTexture}),
    woodDark:material('#28170f',0,.72,{map:woodTexture}), gold:material('#e4b85e',.82,.27), goldDark:material('#9c6b29',.72,.38),
    clay:material('#b6663f',0,.9,{map:stoneTexture}), sand:material('#cfa478',0,.92,{map:stoneTexture}),
    ivory:material('#eee0bd',0,.9,{map:stoneTexture}), charcoal:material('#211c18',0,.95),
    turquoise:material('#52d9c9',.35,.28,{emissive:'#21b9ad',emissiveIntensity:1.3}),
    glow:material('#ffd994',.2,.45,{emissive:'#ff9b2f',emissiveIntensity:1.6}),
    dark:material('#19302d',.3,.6), copper:material('#bd6f36',.7,.32)
  };
}
export function mesh(parent,geometry,mat,position=[0,0,0],rotation=[0,0,0]) {
  const m=new THREE.Mesh(geometry,mat); m.position.set(...position); m.rotation.set(...rotation); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
export function box(parent,w,h,d,mat,position=[0,0,0],rotation=[0,0,0]) {return mesh(parent,new THREE.BoxGeometry(w,h,d),mat,position,rotation);}
export function cylinder(parent,rt,rb,h,mat,position=[0,0,0],segments=32,open=false) {return mesh(parent,new THREE.CylinderGeometry(rt,rb,h,segments,1,open),mat,position);}
export function sphere(parent,r,mat,position=[0,0,0],segments=12) {return mesh(parent,new THREE.SphereGeometry(r,segments,8),mat,position);}
export function ring(parent,r,t,mat,position=[0,0,0],rotation=[Math.PI/2,0,0]) {return mesh(parent,new THREE.TorusGeometry(r,t,6,40),mat,position,rotation);}
export function tube(parent,points,r,mat,closed=false,steps=32) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:V(...p)),closed,'centripetal');
  return mesh(parent,new THREE.TubeGeometry(curve,steps,r,5,closed),mat);
}
export function rod(parent,a,b,r,mat,segments=8) {
  const start=Array.isArray(a)?V(...a):a,end=Array.isArray(b)?V(...b):b,dir=end.clone().sub(start);
  const m=mesh(parent,new THREE.CylinderGeometry(r,r,dir.length(),segments),mat);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,1,0),dir.normalize());return m;
}
export function lathe(parent,profile,mat,segments=40) {return mesh(parent,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),segments),mat);}
export function pointedShape(w,h) {
  const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,h*.58);s.quadraticCurveTo(-w*.4,h*.82,0,h);s.quadraticCurveTo(w*.4,h*.82,w/2,h*.58);s.lineTo(w/2,0);s.closePath();return s;
}
export function arch(parent,w,h,depth,mat,position=[0,0,0]) {return mesh(parent,new THREE.ExtrudeGeometry(pointedShape(w,h),{depth,bevelEnabled:false,curveSegments:12}),mat,position);}
export function star(parent,x,y,z,r,mat,points=8) {
  const p=[];for(let i=0;i<=points*2;i++){const a=i*Math.PI/points,rad=i%2?r*.44:r;p.push([x+Math.sin(a)*rad,y+Math.cos(a)*rad,z]);} return tube(parent,p,.0018,mat,false,points*4);
}
export function rosette(parent,x,y,z,r,mat) {
  star(parent,x,y,z,r,mat);ring(parent,r*.42,.0015,mat,[x,y,z],[0,0,0]);
  for(let j=0;j<4;j++){const a=j*Math.PI/2; const p=[];for(let i=0;i<=12;i++){const t=i/12*Math.PI*2;const u=Math.sin(t)*r*.17,v=Math.cos(t)*r*.30+r*.35;p.push([x+u*Math.cos(a)-v*Math.sin(a),y+u*Math.sin(a)+v*Math.cos(a),z]);}tube(parent,p,.0012,mat,true,18);}
}
export function frame(parent,w,h,depth,thickness,mat,c=[0,0,0]) {
  box(parent,w,thickness,depth,mat,[c[0],c[1]-h/2,c[2]]);box(parent,w,thickness,depth,mat,[c[0],c[1]+h/2,c[2]]);
  box(parent,thickness,h,depth,mat,[c[0]-w/2,c[1],c[2]]);box(parent,thickness,h,depth,mat,[c[0]+w/2,c[1],c[2]]);
}
export function instance(parent,geometry,mat,transforms) {
  const m=new THREE.InstancedMesh(geometry,mat,transforms.length),o=new THREE.Object3D();
  transforms.forEach((t,i)=>{o.position.set(...(t.position||[0,0,0]));o.rotation.set(...(t.rotation||[0,0,0]));o.scale.set(...(t.scale||[1,1,1]));o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.instanceMatrix.needsUpdate=true;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
// Merge only direct static mesh children; animated subgroups remain independently addressable.
export function batchStatic(group) {
  group.updateMatrixWorld(true);const byMaterial=new Map();
  for(const c of [...group.children]) if(c.isMesh&&!c.isInstancedMesh&&!c.userData.dynamic&& !Array.isArray(c.material)) {
    let list=byMaterial.get(c.material);if(!list)byMaterial.set(c.material,list=[]);list.push(c);
  }
  for(const [mat,list] of byMaterial){if(list.length<2)continue;const geometries=list.map(m=>{const g=m.geometry.clone().applyMatrix4(m.matrix);return g.index?g.toNonIndexed():g;});const joined=mergeGeometries(geometries,false);if(joined){const m=new THREE.Mesh(joined,mat);m.castShadow=m.receiveShadow=true;group.add(m);for(const old of list){group.remove(old);old.geometry.dispose();}}for(const g of geometries)g.dispose();}
  return group;
}
