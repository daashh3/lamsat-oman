import * as THREE from 'three';
import {palette,material,cylinder,ring,rod,lathe,sphere,star,rosette,tube,batchStatic} from '../utils/GeometryUtils.js';

export function createLantern(){
  const g=new THREE.Group();g.name='Omani celebration lantern';const m=palette(),d=new THREE.Group();g.add(d);
  for(const [y,rt,rb,h]of [[.025,.11,.14,.05],[.08,.145,.11,.05],[.46,.145,.145,.022],[.50,.095,.15,.065]]){const b=cylinder(d,rt,rb,h,m.gold,[0,y,0],6);b.rotation.y=Math.PI/6;}
  const panels=[];for(let i=0;i<6;i++){
    const a=i*Math.PI/3,postX=Math.sin(a)*.145,postZ=Math.cos(a)*.145;rod(d,[postX,.10,postZ],[postX,.45,postZ],.005,m.gold);
    const p=new THREE.Group();p.rotation.y=a+Math.PI/6;p.position.set(Math.sin(a+Math.PI/6)*.126,.105,Math.cos(a+Math.PI/6)*.126);g.add(p);panels.push(p);
    // Open lattice exposes the interior and uses physical 3D ribs.
    for(const y of [.045,.12,.195,.27]){
      const points=[[-.061,y,0],[0,y+.055,0],[.061,y,0],[0,y-.055,0],[-.061,y,0]];tube(p,points,.0023,m.gold,false,12);
      star(p,0,y,0,.024,m.goldDark);sphere(p,.004,m.turquoise,[0,y,.001],7);
    }
    for(const x of [-.061,.061])rod(p,[x,0,0],[x,.34,0],.0025,m.goldDark);
    batchStatic(p);
  }
  const crown=lathe(d,[[.088,0],[.076,.02],[.047,.045],[.033,.07],[.01,.088],[0,.095]],m.gold,32);crown.position.y=.531;
  ring(d,.020,.003,m.gold,[0,.648,0],[0,0,0]);
  for(const y of [.095,.468])ring(d,.14,.002,m.turquoise,[0,y,0]);
  const core=sphere(g,.068,material('#ffe4a3',0,.3,{emissive:'#ffbe58',emissiveIntensity:3,transparent:true,opacity:.9}),[0,.275,0],20);core.scale.y=2.0;
  const light=new THREE.PointLight('#ffd17e',1.8,1.6,2);light.position.set(0,.28,0);g.add(light);
  batchStatic(d);g.userData={core,light,panels};return g;
}
