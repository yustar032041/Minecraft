// 25 explicitly assigned family choreographies composed from nine hand-authored
// poses. Tiers share poses, but playback timing matches their scripted pulses.
// The resulting data is not 225 separately hand-animated moves and has not
// been validated in the Bedrock client. Use --write or --check.
import fs from 'node:fs';
import {catalogFamilyMove} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_families.js';
import {authoredMove} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_movesets.js';
const out='Hakkai_v7.1.0/ResourcePack/animations/action_families.animation.json';
const assignments={
 '剣:16':['lunge','sweep_r','cross'], '剣:12':['sweep_l','lunge','smash'],
 '剣:8':['lunge','sweep_l','double_thrust'], '剣:4':['lunge','sweep_r','spin'], '剣:0':['lunge','sweep_l','spin'],
 '斧:1':['smash','sweep_r','spin'], '斧:17':['smash','cross','ring'], '斧:13':['smash','sweep_l','smash'],
 '斧:9':['sweep_l','lunge','ring'], '斧:5':['vault','sweep_r','ring'],
 '槍:5':['lunge','sweep_l','lunge'], '槍:1':['lunge','sweep_r','sweep_l'],
 '槍:17':['lunge','double_thrust','double_thrust'], '槍:13':['lunge','sweep_l','ring'], '槍:9':['lunge','sweep_r','cross'],
 'ハンマー:16':['smash','sweep_r','ring'], 'ハンマー:12':['smash','sweep_l','spin'],
 'ハンマー:8':['smash','lunge','lunge'], 'ハンマー:4':['smash','sweep_r','spin'], 'ハンマー:0':['sweep_l','lunge','spin'],
 '扇:7':['sweep_l','sweep_r','ring'], '扇:3':['sweep_l','cross','sweep_r'], '扇:19':['sweep_l','sweep_r','cross'],
 '扇:15':['vault','sweep_r','spin'], '扇:11':['lunge','sweep_l','sweep_r']
};
// Each pose supplies windup and impact rotations. rightitem deliberately moves
// as well as rightarm because first-person item rendering can use that bone.
const poses={
 lunge:{body:[[-14,-15,0],[18,12,0]],rightarm:[[-100,20,30],[-150,-5,-8]],leftarm:[[-35,-15,-30],[-60,10,-15]],rightitem:[[15,0,20],[-25,0,-10]],rightleg:[[28,0,0],[-35,0,0]],leftleg:[[-25,0,0],[35,0,0]]},
 double_thrust:{body:[[-18,-12,0],[23,10,0]],rightarm:[[-80,12,28],[-160,-5,-5]],leftarm:[[-40,-15,-25],[-75,10,-12]],rightitem:[[20,0,15],[-30,0,-8]],rightleg:[[35,0,0],[-38,0,0]],leftleg:[[-28,0,0],[38,0,0]]},
 sweep_l:{body:[[0,-35,-8],[12,35,8]],rightarm:[[-110,32,65],[-65,-35,-70]],leftarm:[[-35,-20,-30],[-55,15,20]],rightitem:[[5,20,30],[-15,-20,-35]],rightleg:[[15,0,8],[-20,0,-8]],leftleg:[[-15,0,8],[20,0,-8]]},
 sweep_r:{body:[[0,35,8],[12,-35,-8]],rightarm:[[-85,-35,-65],[-110,30,70]],leftarm:[[-45,20,25],[-65,-20,-30]],rightitem:[[5,-20,-30],[-18,20,35]],rightleg:[[-15,0,-8],[20,0,8]],leftleg:[[15,0,-8],[-20,0,8]]},
 smash:{body:[[-30,-18,0],[40,18,0]],rightarm:[[-170,12,25],[-25,-8,-30]],leftarm:[[-135,-20,-25],[-35,10,12]],rightitem:[[25,0,12],[-35,0,-12]],rightleg:[[25,0,0],[-28,0,0]],leftleg:[[-25,0,0],[28,0,0]]},
 cross:{body:[[0,-35,-10],[8,35,10]],rightarm:[[-100,38,70],[-110,-38,-70]],leftarm:[[-55,-25,-35],[-55,25,35]],rightitem:[[8,20,35],[-15,-20,-35]],rightleg:[[12,0,10],[-12,0,-10]],leftleg:[[-12,0,10],[12,0,-10]]},
 spin:{root:[[0,0,0],[0,180,0]],body:[[-12,-25,0],[20,30,0]],rightarm:[[-125,20,65],[-70,-30,-75]],leftarm:[[-60,-25,-45],[-65,25,40]],rightitem:[[10,15,30],[-20,-15,-35]],rightleg:[[30,0,0],[-30,0,0]],leftleg:[[-30,0,0],[30,0,0]]},
 ring:{root:[[0,-20,0],[0,160,0]],body:[[-20,-25,0],[25,25,0]],rightarm:[[-150,20,65],[-50,-25,-75]],leftarm:[[-120,-20,-65],[-55,25,60]],rightitem:[[20,10,25],[-30,-10,-30]],rightleg:[[32,0,0],[-32,0,0]],leftleg:[[-32,0,0],[32,0,0]]},
 vault:{body:[[-20,-12,0],[28,12,0]],rightarm:[[-125,20,35],[-150,-8,-20]],leftarm:[[-65,-25,-30],[-90,15,10]],rightitem:[[18,0,20],[-25,0,-15]],rightleg:[[48,0,0],[-42,0,0]],leftleg:[[-38,0,0],[48,0,0]]}
};
const specialPoses={
 warden_blade_0:['vault','sweep_r'],warden_blade_1:['sweep_l','sweep_r'],
 warden_blade_2:['smash','sweep_l'],warden_blade_3:['lunge','sweep_r'],
 warden_blade_4:['vault','lunge'],warden_blade_5:['lunge','sweep_l'],
 warden_blade_6:['vault','sweep_r'],warden_blade_7:['sweep_l','lunge'],
 ult_sword:['vault','cross'],ult_axe:['smash','sweep_r']
};
const base={'剣':[4,11],'斧':[6,15],'槍':[5,13],'ハンマー':[7,17],'扇':[4,12]};
const t=n=>String(Number((n/20).toFixed(3)));
function build(){
 const animations={};
 for(const [family,stages] of Object.entries(assignments)){
  const [kind,attr]=family.split(':'),a=Number(attr);
  for(let rank=1;rank<=3;rank++)for(let stage=1;stage<=3;stage++){
   const move=catalogFamilyMove({id:'gear_000',kind,a,rank},stage),pose=poses[stages[stage-1]];
   if(!move||!pose)throw Error(`Missing family move or choreography ${family} ${stage}`);
   const windup=move.windup??base[kind][0],pulses=move.pulses??[0],recovery=Math.max(move.recovery??(base[kind][1]+(stage===3?5:0)),windup+Math.max(...pulses)+1);
   const bones={};
   for(const [bone,[wind,impact]] of Object.entries(pose)){
    const frames={'0.0':[0,0,0]};frames[t(Math.max(1,Math.floor(windup/2)))]=wind;frames[t(windup)]=impact;
    if(pulses.length>1){const second=windup+pulses[1],recoil=windup+Math.max(1,Math.floor(pulses[1]/2));
     if(recoil<second)frames[t(recoil)]=wind;
     frames[t(second)]=stages[stage-1]==='cross'?impact.map((v,i)=>i===0?v:-v):impact;
    }
    frames[t(recovery)]=bone==='root'&&['spin','ring'].includes(stages[stage-1])?[0,360,0]:[0,0,0];bones[bone]={rotation:frames};
   }
   animations[`animation.hakkai.${move.familyAnimation}`]={animation_length:recovery/20,bones};
  }
 }
 // First and second stages of the ten special weapons: reuse the pose
 // vocabulary but derive exact windup, second pulse and recovery from movesets.
 for(const id of Object.keys(specialPoses))for(let stage=1;stage<=2;stage++){
  const g={id,kind:id==='ult_axe'?'斧':'剣'};
  const move=authoredMove(g,stage),name=specialPoses[g.id]?.[stage-1],pose=poses[name];
  if(!pose||!move?.specialAnimation)throw Error(`Missing special stage ${g.id}:${stage}`);
  const windup=move.windup??base[g.kind][0],pulses=move.pulses??[0];
  const recovery=Math.max(move.recovery??base[g.kind][1],windup+Math.max(...pulses)+1),bones={};
  for(const [bone,[wind,impact]] of Object.entries(pose)){
   const frames={'0.0':[0,0,0]};frames[t(Math.max(1,Math.floor(windup/2)))]=wind;frames[t(windup)]=impact;
   if(pulses.length>1){const second=windup+pulses[1],recoil=windup+Math.max(1,Math.floor(pulses[1]/2));
    if(recoil<second)frames[t(recoil)]=wind;
    frames[t(second)]=name==='cross'?impact.map((v,i)=>i===0?v:-v):impact;
   }
   frames[t(recovery)]=[0,0,0];bones[bone]={rotation:frames};
  }
  animations[`animation.hakkai.${move.specialAnimation}`]={animation_length:recovery/20,bones};
 }
 return JSON.stringify({format_version:'1.8.0',animations},null,2)+'\n';
}
const result=build();
if(process.argv[2]==='--write')fs.writeFileSync(out,result);
else if(process.argv[2]==='--check'){if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==result)throw Error('Family animation output stale');}
else throw Error('Pass --write or --check');
console.log(`${Object.keys(assignments).length} families and 10 special weapons, 245 timing variants; client rendering unverified`);
