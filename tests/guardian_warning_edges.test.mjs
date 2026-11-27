// Simulated controller and scheduler; no claim about Bedrock client physics.
import assert from 'node:assert/strict';
import {Difficulty} from '@minecraft/server';
import {fixture} from './guardian_wave_fixture.mjs';
for(let realm=0;realm<8;realm++)for(const special of [false,true]){
 const f=fixture({realm,special});
 // Every shape includes the guardian's own center, allowing a stable check
 // of each animation/cooldown without changing the selected attack direction.
 f.primary.location.x=0;f.advance(265);
 assert.equal(f.hits.length,3,`guardian ${realm}: three independent attacks`);
 assert.equal(f.particles.filter(([,id])=>id==='hakkai:warning_marker').length,0);
 assert.deepEqual(f.animations.map(([,id])=>id),['brace','lunge','cast'].flatMap(a=>['windup','strike'].map(p=>`animation.hakkai.guardian_${realm}_${a}_${p}`)));
 const broken=fixture({realm,special}),spawn=broken.d.spawnParticle;
 broken.d.spawnParticle=(id,pos)=>{if(id.startsWith('hakkai:tell_'))throw Error('unavailable');spawn(id,pos);};
 broken.primary.location.x=0;broken.advance(75);assert.equal(broken.hits.length,1,'cosmetics cannot change damage');
}
{
 const f=fixture();f.advance(30);f.tick(71);f.advance(85);assert.equal(f.hits.length,0,'late resolution is not replayed');
}
for(const options of [{evade:()=>true},{parry:()=>true},{reject:true}]){
 const f=fixture(options);f.primary.location.x=0;f.advance(75);assert.equal(f.effects.length,0);
 assert.equal(f.hits.length,options.reject?1:0);
}
{
 const f=fixture();f.advance(30);f.world.difficulty=Difficulty.Peaceful;f.advance(85);assert.equal(f.hits.length,0);
}
console.log('Guardian wave animations, exact timing, current targets and failure handling (mocked)');
