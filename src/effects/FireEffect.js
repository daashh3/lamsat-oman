export class FireEffect {
  constructor(group){this.group=group;this.time=0;}
  update(dt,reduced=false){this.time+=dt;this.group.children.forEach((flame,i)=>{if(flame.isMesh)flame.scale.y=reduced?1:.8+Math.sin(this.time*7+i)*.2;});}
}
