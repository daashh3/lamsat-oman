import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Group,Vector3} from 'three';
import {createGate} from '../objects/OmaniGate.js';
import {createMabkhara} from '../objects/OmaniMabkhara.js';
import {createTree} from '../objects/FrankincenseTree.js';
import {createDhow,setSailProgress} from '../objects/OmaniDhow.js';
import {createFort} from '../objects/NizwaFort.js';
import {createPotteryWheel} from '../objects/PotteryWheel.js';
import {createVase,updateVase} from '../objects/OmaniVase.js';
import {createHalwaSet} from '../objects/HalwaCookingSet.js';
import {createCoffeeSet} from '../objects/OmaniCoffeeSet.js';
import {createLantern} from '../objects/OmaniLantern.js';
import {ResourceManager} from '../core/ResourceManager.js';
import {ParticleSystem} from '../effects/ParticleSystem.js';

test('all ten procedural exhibit factories produce finite, volumetric museum-sized geometry without external meshes',()=>{
  const resources=new ResourceManager();
  for(const factory of [createGate,createMabkhara,createTree,createDhow,createFort,createPotteryWheel,createVase,createHalwaSet,createCoffeeSet,createLantern]){
    const model=factory();let meshes=0;
    model.traverse(o=>{if(o.isMesh){meshes++;for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value),factory.name);}});
    assert.ok(meshes>0,factory.name);const size=new Box3().setFromObject(model).getSize(new Vector3());
    assert.ok(size.x>.1&&size.y>.1&&size.z>.025,`${factory.name} has volume`);assert.ok(Math.max(size.x,size.y,size.z)<1.5,`${factory.name} fits a compact diorama`);resources.dispose(model);
  }
});
test('door leaves rotate about separate edge hinges and expose a real opening',()=>{
  const gate=createGate(),{leftDoor,rightDoor}=gate.userData;gate.updateMatrixWorld(true);
  const edgeBefore=leftDoor.localToWorld(new Vector3(.20,.25,0));leftDoor.rotation.y=-1.4;rightDoor.rotation.y=1.4;gate.updateMatrixWorld(true);
  const edgeAfter=leftDoor.localToWorld(new Vector3(.20,.25,0));assert.ok(edgeAfter.distanceTo(edgeBefore)>.20);assert.ok(leftDoor.position.x<0&&rightDoor.position.x>0);assert.equal(leftDoor.position.y,rightDoor.position.y);
});
test('sail deployment changes cloth vertices without replacing the ship or uniformly scaling it',()=>{
  const ship=createDhow(),sail=ship.userData.sail;setSailProgress(ship,0);const initial=Array.from(sail.geometry.attributes.position.array);setSailProgress(ship,1);assert.notDeepEqual(Array.from(sail.geometry.attributes.position.array),initial);assert.deepEqual(ship.scale.toArray(),[1,1,1]);assert.ok(sail.geometry.attributes.position.count>20);
});
test('pottery sculpting deforms radial profile vertices while keeping the model transform unchanged',()=>{
  const vase=createVase(.14,.27),positions=vase.userData.body.geometry.attributes.position;const before=Array.from(positions.array);updateVase(vase,.30,.196);assert.notDeepEqual(Array.from(positions.array),before);assert.deepEqual(vase.scale.toArray(),[1,1,1]);const size=new Box3().setFromObject(vase.userData.body).getSize(new Vector3());assert.ok(Math.abs(size.y-.30)<.01);assert.ok(size.x>.15&&size.x<.23);
});
test('coffee spout is attached to the pot and can be tilted above the correct cup',()=>{
  const set=createCoffeeSet(),{dallah,spout}=set.userData;dallah.rotation.z=-Math.PI/3;dallah.position.copy(new Vector3(.25,.24,.08).sub(spout.position.clone().applyQuaternion(dallah.quaternion)));set.updateMatrixWorld(true);assert.ok(spout.getWorldPosition(new Vector3()).distanceTo(new Vector3(.25,.24,.08))<1e-8);assert.equal(spout.parent,dallah);
});
test('particle capacity stays bounded under repeated emissions and reset clears every live particle',()=>{
  const particles=new ParticleSystem(new Group(),20);for(let i=0;i<100;i++)particles.emit(new Vector3(),'smoke',10);assert.equal(particles.pool.length,20);particles.update(.1);assert.ok(particles.pool.some(p=>p.life>0));particles.clear();assert.equal(particles.pool.filter(p=>p.life>0).length,0);assert.ok(particles.sizes.every(s=>s===0));particles.dispose();
});

