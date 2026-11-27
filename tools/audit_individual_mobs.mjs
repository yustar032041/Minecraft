// Static per-ID combat/movement inventory. This does not certify animation
// quality, in-game collision shapes, Bedrock execution or multiplayer.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {guardians} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {isMovingProjectileTalent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/attack_warning.js';
import {CREATURE_PATHS,TRAVELER_PATHS,PATH_LABELS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_attack_paths.js';
import {TWIN_CREATURES,SHOT_SPEED,hasTwinShot} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_shot_styles.js';
import {BODY_RUSH} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_body_rush.js';
import {BURST_DESIGNS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_burst_wave.js';
import {GUARD_STYLES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_guard_styles.js';
import {WILDLIFE_STYLES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_styles.js';
import {GUARDIAN_REALM_ATTACKS,KING_GUARDIAN_REALM_ATTACKS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_attacks.js';
const BP='Hakkai_v7.1.0/BehaviorPack/entities/',out='追加MOB個別技台帳.md';
const esc=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ');
const shape={circle:'全周',wedge:'扇',wide:'広い扇',line:'直線',double:'双閃',cross:'十字',diagonal:'斜め四方',side:'左右'};
function box(id){
 const e=JSON.parse(fs.readFileSync(`${BP}${id}.json`,'utf8'))['minecraft:entity'];
 const c=e.components?.['minecraft:collision_box'];assert.ok(c&&c.width>0&&c.height>0,`${id}: missing collision box`);
 return `${c.width}×${c.height}`;
}
function keysEqual(map,list,label){assert.deepEqual(Object.keys(map).sort(),list.map(x=>x.id).sort(),label);}
const hostile=mobContentList.filter(p=>p.temper==='hostile');
const projectile=hostile.filter(p=>isMovingProjectileTalent(p.talent));
const rush=hostile.filter(p=>['charge','leap'].includes(p.talent));
const guards=hostile.filter(p=>['armor','ward'].includes(p.talent));
const burst=hostile.filter(p=>p.talent==='burst');
const wildlife=mobContentList.filter(p=>p.temper!=='hostile');
assert.equal(mobContentList.length,120);assert.equal(hostile.length,104);assert.equal(wildlife.length,16);
assert.equal(projectile.length,65);assert.equal(rush.length,14);assert.equal(guards.length,18);assert.equal(burst.length,7);
keysEqual(CREATURE_PATHS,projectile,'projectile IDs');keysEqual(BODY_RUSH,rush,'body rush IDs');
keysEqual(GUARD_STYLES,guards,'guard IDs');keysEqual(BURST_DESIGNS,burst,'burst IDs');keysEqual(WILDLIFE_STYLES,wildlife,'peaceful wildlife IDs');
assert.equal(TWIN_CREATURES.length,30);assert.equal(new Set(TWIN_CREATURES).size,30);
for(const id of TWIN_CREATURES)assert.ok(projectile.some(p=>p.id===id));
// These are configuration tuples, not a claim that every combat encounter or
// target distance has a perceptibly different result.
const combinations=projectile.map(p=>[p.talent,CREATURE_PATHS[p.id],p.variant,hasTwinShot(p),p.signatureId%15,p.signatureTier].join('/'));
assert.equal(new Set(combinations).size,65,'individual projectile configurations');
let text='# ラスボス以外のMOB個別技台帳\n\n';
text+='`node --experimental-default-type=module tools/audit_individual_mobs.mjs --check` で各IDと設定を再照合。これは設定・静的参照の棚卸しであり、技の品質やBedrock実機・マルチの動作を証明するものではない。ボス新技と全体バランスは含めない。\n\n';
text+='幅×高さはエンティティ定義のcollision_box。突進・守りの接触距離はプレイヤー分の余裕を含む水平距離。飛び道具と波は粒子とレイ判定の区間を共有。二筋の弾はそれぞれ遮断され、1技で同じ対象に重ねて命中しない。\n\n';
text+='## 通常敵と野生種（120種）\n\n| ID・名前 | 体幅×高さ | 動き・攻撃の実装 | 固有効果・説明 |\n|---|---:|---|---|\n';
for(const p of mobContentList){
 let mechanics;
 if(isMovingProjectileTalent(p.talent)&&p.temper==='hostile'){
  assert.ok(PATH_LABELS[CREATURE_PATHS[p.id]]&&SHOT_SPEED[p.talent]);
  mechanics=`${hasTwinShot(p)?'二筋':'一筋'}の${PATH_LABELS[CREATURE_PATHS[p.id]]}弾・速度${SHOT_SPEED[p.talent]} / tick`;
 }else if(BODY_RUSH[p.id]){
  const d=BODY_RUSH[p.id];mechanics=`${p.talent==='leap'?'跳躍':'突進'}・速度${d.speed}・上昇${d.lift}・接触${d.reach}・${d.ticks}tick`;
 }else if(GUARD_STYLES[p.id]){
  const d=GUARD_STYLES[p.id];mechanics=`${p.talent==='armor'?'自分の装甲':'同界支援'}・${d.trait}・接触${d.reach}`;
 }else if(BURST_DESIGNS[p.id])mechanics=`${shape[BURST_DESIGNS[p.id]]}へ広がる移動波`;
 else if(WILDLIFE_STYLES[p.id]){
  const d=WILDLIFE_STYLES[p.id];mechanics=p.temper==='passive'?`安全床を確認して逃避（方向${d.escape}・速度${d.speed}・上昇${d.lift}・${d.effect}）`:`同界生物に耐性と${d.support}`;
 }else throw Error(`unmapped profile ${p.id}`);
 text+=`| ${esc(p.id)} ${esc(p.name)} | ${box(p.id)} | ${esc(mechanics)} | ${esc(p.actionKey)}：${esc(p.actionDetail)} ${esc(p.signatureName)}：${esc(p.signatureDetail)} |\n`;
}
text+='\n## 界渡り（8種）\n\n| ID | 体幅×高さ | 攻撃 |\n|---|---:|---|\n';
for(let i=0;i<8;i++){assert.ok(PATH_LABELS[TRAVELER_PATHS[i]]);text+=`| ender_${i} | ${box(`ender_${i}`)} | 界別の安全ワープ・${PATH_LABELS[TRAVELER_PATHS[i]]}弾・界別効果 |\n`;}
text+='\n## 守護獣と王が召喚する影（16種）\n\n| ID・名前 | 体幅×高さ | 3つの攻撃（発動後に移動） |\n|---|---:|---|\n';
for(let i=0;i<8;i++)for(const special of [false,true]){
 const id=`${special?'king_':''}guardian_${i}`,attacks=(special?KING_GUARDIAN_REALM_ATTACKS:GUARDIAN_REALM_ATTACKS)[i];
 assert.equal(attacks.length,3);assert.ok(attacks.every(a=>shape[a.shape]&&a.name&&a.effect));
 text+=`| ${id} ${esc(guardians[i])}${special?'の影':''} | ${box(id)} | ${attacks.map(a=>esc(`${a.name}（${shape[a.shape]}・${a.effect}）`)).join(' / ')} |\n`;
}
text+='\n## 見回りとFUSHI（5種）\n\n| ID | 体幅×高さ | 行動 |\n|---|---:|---|\n';
for(const [id,action] of [['village_watch','近接の見張り'],['village_archer','矢による遠距離見回り'],['village_mage','対象を選んで遮断可能な魔法弾'],['fushi','友好・移動・交換'],['fushi_chief','月光の体当たり・月の弾・周囲の霧']])text+=`| ${id} | ${box(id)} | ${action} |\n`;
text+='\n合計149種（通常・野生120、界渡り8、通常守護獣8、特別守護獣8、見回り3、FUSHIとチーフ2）。八界王と時空の管理者は含めない。\n';
if(process.argv.includes('--write')){fs.writeFileSync(out,text);console.log('Wrote per-creature inventory: 149 entries');}
else if(process.argv.includes('--check')){assert.equal(fs.readFileSync(out,'utf8'),text);console.log('149 per-creature entries and mapping coverage verified (static only)');}
else throw Error('specify --write or --check');
