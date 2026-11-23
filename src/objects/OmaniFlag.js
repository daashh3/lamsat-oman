import * as THREE from 'three';
import {palette,rod,sphere} from '../utils/GeometryUtils.js';

// Published for download by Oman's Foreign Ministry. See docs/MODELING.md.
export function createFlag(width=.3){
  const g=new THREE.Group();g.name='Omani national flag';const m=palette();const h=width*1143/2000;
  rod(g,[0,0,0],[0,h+.10,0],.0028,m.gold);sphere(g,.006,m.gold,[0,h+.102,0]);
  const geometry=new THREE.PlaneGeometry(width,h,24,8);geometry.translate(width/2,h/2+.09,0);
  const texture=typeof document!=='undefined'?new THREE.TextureLoader().load(`${import.meta.env?.BASE_URL||'/'}assets/textures/oman-flag-official.jpg`):null;if(texture)texture.colorSpace=THREE.SRGBColorSpace;
  const cloth=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,color:'#ffffff',roughness:.9,side:THREE.DoubleSide}));cloth.name='Deformable flag cloth';g.add(cloth);
  g.userData={cloth,width,height:h};return g;
}
export function updateFlag(group,time,reducedMotion=false){
  const {cloth,width}=group.userData;if(!cloth)return;const p=cloth.geometry.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,reducedMotion?0:Math.sin(x*26-time*2.2+y*5)*.015*(x/width));}p.needsUpdate=true;cloth.geometry.computeVertexNormals();
}
