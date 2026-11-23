import {Vector3} from 'three';
export class WaterEffect {
  constructor(particles){this.particles=particles;this.time=0;this.clock=0;this.active=false;this.position=new Vector3();}
  update(dt,reduced=false){this.time+=dt;if(!this.active||reduced)return;this.clock+=dt;if(this.clock>.1){this.clock=0;this.position.set(Math.sin(this.time)*.4,.025,.10);this.particles.emit(this.position,'water',3);}}
}
