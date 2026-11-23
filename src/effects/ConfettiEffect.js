import {Vector3} from 'three';
export class ConfettiEffect {
  constructor(particles){this.particles=particles;this.clock=0;this.position=new Vector3();}
  update(dt,reduced=false){if(reduced)return;this.clock+=dt;if(this.clock>.07){this.clock=0;this.position.set((Math.random()-.5)*.9,.95,(Math.random()-.5)*.4);this.particles.emit(this.position,'confetti',3);}}
}
