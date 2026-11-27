// Deterministic stress scenarios, NOT Bedrock combat or a win-rate predictor.
// Reuse audited live HP, catalog attack and damage constants. Timings, armor
// reduction and avoidance are explicit hypotheses, not observed outcomes.
import {execFileSync} from 'node:child_process';
import {WARDEN_HEAL_PER_SECOND} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {WARDEN_MODE_DAMAGE} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_modes.js';
import {WARDEN_BLADE_DAMAGE} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_swords.js';
const audit=JSON.parse(execFileSync(process.execPath,['--no-warnings','--experimental-default-type=module','--experimental-loader','./tests/minecraft_stub_loader.mjs','tools/audit_battle_balance.mjs','--json'],{encoding:'utf8'}));
// health points, not hearts. Factor .20 is a hypothetical 80% reduction,
// not a claim about the engine's armor cap or any scripted damage cause.
export function model({bossHp,playerHp,attack,attackInterval,regen=0,bossHealEvery=0,bossHealAmount=0,parryEvery=0,events,reduction=.2,recoveryEvery=0,recoveryAmount=0,coalesce=false,limit=1200}){
 let hp=bossHp,player=playerHp,stop=0,peak=0,received=0,attacks=0;
 for(let t=1;t<=limit*20;t++){
  if(t%20===0&&t>stop)hp=Math.min(bossHp,hp+regen);
  if(bossHealEvery&&t%(bossHealEvery*20)===0)hp=Math.min(bossHp,hp+bossHealAmount);
  if(parryEvery&&t%(parryEvery*20)===0)stop=t+200;
  if(t%attackInterval===0){hp-=attack;attacks++;if(hp<=0)return {result:'win',seconds:t/20,playerHp:+player.toFixed(2),attacks,peakConcurrentRaw:peak,rawReceived:received};}
  if(recoveryEvery&&t%(recoveryEvery*20)===0)player=Math.min(playerHp,player+recoveryAmount);
  const strikes=events.filter(e=>(!e.pauseOnParry||t>=stop)&&t>=e.start&&(t-e.start)%e.interval===0&&(!e.hitEvery||Math.floor((t-e.start)/e.interval)%e.hitEvery===0)).map(e=>e.damage);
  if(strikes.length){let raw=coalesce?Math.max(...strikes):strikes.reduce((a,b)=>a+b,0);peak=Math.max(peak,raw);received+=raw;player-=raw*reduction;if(player<=0)return {result:'defeat',seconds:t/20,playerHp:+player.toFixed(2),attacks,peakConcurrentRaw:peak,rawReceived:received};}
 }
 return {result:'timeout',seconds:limit,playerHp:+player.toFixed(2),attacks,peakConcurrentRaw:peak,rawReceived:received};
}
const guardianProfiles=[
 {name:'careful and stocked',attackInterval:30,waveHitEvery:4,meleeHitEvery:10,recoveryEvery:10},
 {name:'careful',attackInterval:30,waveHitEvery:4,meleeHitEvery:10,recoveryEvery:20},
 {name:'pressured',attackInterval:40,waveHitEvery:2,meleeHitEvery:5,recoveryEvery:20},
 {name:'poor avoidance',attackInterval:40,waveHitEvery:1,meleeHitEvery:2,recoveryEvery:20}
];
const guardians=audit.stages.map(s=>({realm:s.realm,weapon:s.weapon.id,attack:s.weapon.damage,hp:s.guardian.hp,scenarios:guardianProfiles.map(p=>({name:p.name,...model({bossHp:s.guardian.hp,playerHp:20,attack:s.weapon.damage,attackInterval:p.attackInterval,recoveryEvery:p.recoveryEvery,recoveryAmount:4,events:[{start:80,interval:87,damage:s.guardian.techniques[1],hitEvery:p.waveHitEvery},{start:14,interval:14,damage:s.guardian.melee,hitEvery:p.meleeHitEvery}]})}))}));
// Traditional warned slots share a same-tick hit guard: model just one
// representative strike at a time. Special-mode strikes are a separate
// scenario: new traditional warnings cannot start while that mode is active.
// Detached blade hits may run alongside either. All cadence and coincidence
// here are intentionally hypothetical rather than a replay of the AI.
const wardenProfiles=[
 {name:'exceptional avoidance',attackInterval:20,hitEvery:12,recoveryEvery:10,parryEvery:30},
 {name:'careful',attackInterval:20,hitEvery:6,recoveryEvery:15,parryEvery:30},
 {name:'pressured',attackInterval:30,hitEvery:3,recoveryEvery:15,parryEvery:45},
 {name:'poor avoidance',attackInterval:40,hitEvery:1,recoveryEvery:15,parryEvery:0}
];
const warden=wardenProfiles.flatMap(p=>['traditional','special'].flatMap(mode=>[false,true].map(coalesce=>({name:p.name,mode,coalesce,...model({bossHp:audit.bosses.warden.hp,playerHp:28,attack:audit.allRealmsBeforeAnyBoss.damage,attackInterval:p.attackInterval,regen:WARDEN_HEAL_PER_SECOND,parryEvery:p.parryEvery,recoveryEvery:p.recoveryEvery,recoveryAmount:4,coalesce,events:[{start:120,interval:mode==='traditional'?120:85,damage:mode==='traditional'?36:WARDEN_MODE_DAMAGE.combo,hitEvery:p.hitEvery,pauseOnParry:mode==='special'},{start:120,interval:160,damage:Math.max(...WARDEN_BLADE_DAMAGE),hitEvery:p.hitEvery,pauseOnParry:true}]})}))));
// King and chief: simple deliberately conservative timing stress, not a
// reconstruction of AI, summons or a physically accurate resistance model.
const otherBosses=[
 {name:'chief careful',...model({bossHp:audit.bosses.chief.hp,playerHp:20,attack:audit.allRealmsBeforeAnyBoss.damage,attackInterval:30,recoveryEvery:10,recoveryAmount:4,events:[{start:80,interval:90,damage:Math.max(...audit.bosses.chief.attacks),hitEvery:3}]})},
 {name:'chief careless',...model({bossHp:audit.bosses.chief.hp,playerHp:20,attack:audit.allRealmsBeforeAnyBoss.damage,attackInterval:40,recoveryEvery:20,recoveryAmount:4,events:[{start:80,interval:90,damage:Math.max(...audit.bosses.chief.attacks),hitEvery:1}]})},
 {name:'king careful',...model({bossHp:audit.bosses.king.hp,playerHp:28,attack:audit.allRealmsBeforeAnyBoss.damage,attackInterval:30,reduction:.12,recoveryEvery:10,recoveryAmount:4,bossHealEvery:60,bossHealAmount:audit.bosses.king.rewindHeals,events:[{start:80,interval:90,damage:54,hitEvery:3},{start:14,interval:14,damage:audit.bosses.king.melee,hitEvery:12}]})},
 {name:'king pressured',...model({bossHp:audit.bosses.king.hp,playerHp:28,attack:audit.allRealmsBeforeAnyBoss.damage,attackInterval:40,reduction:.12,recoveryEvery:20,recoveryAmount:4,bossHealEvery:60,bossHealAmount:audit.bosses.king.rewindHeals,events:[{start:80,interval:90,damage:54,hitEvery:2},{start:14,interval:14,damage:audit.bosses.king.melee,hitEvery:6}]})}
];
console.log(JSON.stringify({assumptions:'Illustrative deterministic schedules only. 20/28 HP, 80% assumed damage reduction for all types, recovery +4 HP capped every 10/15/20s, perfect periodic landing/dodging; no mobility, effects, armor durability, gear damage bonuses, phase transitions, real invulnerability rules or multiplayer. Guardian wave spacing 87 ticks assumes 40 warning + 7 flight + 40 delay; always strongest wave, melee every 14 ticks. Warden slot spacing 120 ticks and impacts are synthetic, not the AI schedule; Traditional and special modes are modelled separately, with one independent blade impact in each. The two traditional slots share a code-level same-tick hit guard. Coalesce compares maximum vs sum of remaining independent paths at identical ticks only, not actual immunity. Parry assumes a 10s regen stop, pausing special mode and blades but not future traditional warnings; the cancelled in-progress old warning is not modelled. Parry is not guaranteed. First hit timing and recovery ordering are chosen for repeatability. Chief assumes the strongest 18-point skill every 4.5s; king assumes 54-point impact every 4.5s, 9-point melee every .7s and 145 HP healing every 60s irrespective of phase. King assumes Resistance II stacks to leave 12% damage; does not model its own resistance or summons. These deliberately synthetic schedules ignore real AI and terrain. Results are not victory probabilities.',guardians,otherBosses,warden},null,2));
