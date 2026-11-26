// Static inventory only: an animation alias or AI component does not prove
// runtime visibility, timing, geometry rendering, or multiplayer behavior.
import fs from 'node:fs';
import path from 'node:path';
import {mobContent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
const root=path.resolve('Hakkai_v7.1.0'),bp=path.join(root,'BehaviorPack'),rp=path.join(root,'ResourcePack');
const out='追加MOB攻撃演出の棚卸し.md';
const langs=new Map(fs.readFileSync(path.join(rp,'texts/ja_JP.lang'),'utf8').split(/\r?\n/).flatMap(line=>{
 const m=/^entity\.(hakkai:[^=]+)\.name=(.*)$/.exec(line);return m?[[m[1],m[2]]]:[];
}));
const skip=new Set(['hakkai:time_train','hakkai:shore_ferry','hakkai:kinetic_visual']);
const animationIds=new Set();for(const f of fs.readdirSync(path.join(rp,'animations')).filter(x=>x.endsWith('.json'))){
 const j=JSON.parse(fs.readFileSync(path.join(rp,'animations',f),'utf8'));for(const id of Object.keys(j.animations??{}))animationIds.add(id);
}
const visualKeys=new Set(['creature_windup','creature_strike','native_contact','talent_windup','talent_strike','chief_impact_windup','chief_impact_strike','chief_moon_windup','chief_moon_strike','chief_mist_windup','chief_mist_strike','guardian_brace_windup','guardian_brace_strike','guardian_lunge_windup','guardian_lunge_strike','guardian_cast_windup','guardian_cast_strike','patrol_strike','patrol_cast','patrol_shot','eclipse_cleave_windup','eclipse_cleave_strike','eclipse_cleave_contact','eclipse_cast_windup','eclipse_cast_strike','eclipse_wave_windup','eclipse_wave_strike','warning','slash','sky_cast','slam','thunder_cast','moon_cast']);
function scriptRoute(id,profile){
 if(profile){const kind=profile.temper==='hostile'?'敵対：固有技':profile.temper==='neutral'?'中立：支援行動':'受動：逃走行動';return `${kind} ${profile.talent}・型${profile.variant}（mob_system）`;}
 if(/^hakkai:guardian_[0-7]$/.test(id))return '守護獣の固有技（guardian_boss）';
 if(/^hakkai:ender_[0-7]$/.test(id))return '界渡りの固有技（realm_ender）';
 if(id==='hakkai:fushi_chief')return 'チーフの固有技・突進／月光の弾（fushi_system／fushi_chief_charge／fushi_moon_projectile）';
 if(id==='hakkai:eclipse_colossus')return '八界王の固有技（mob_system）';
 if(id==='hakkai:time_warden')return '管理者の固有技（warden_boss 他）';
 if(id==='hakkai:village_mage')return '見回り魔法（main）';
 if(id==='hakkai:fushi')return '個別攻撃コードを未確認';
 if(id==='hakkai:village_watch')return '接触後演出（mob_attack_visuals）';
 if(id==='hakkai:village_archer')return 'バニラ矢・衝突後演出（mob_attack_visuals）';
 throw Error(`Unclassified entity ${id}`);
}
const rows=[],stats={entities:0,melee:0,ranged:0,profiles:0,hostile:0,neutral:0,passive:0,aliasesMissing:0};
for(const f of fs.readdirSync(path.join(bp,'entities')).filter(x=>x.endsWith('.json')).sort()){
 const e=JSON.parse(fs.readFileSync(path.join(bp,'entities',f),'utf8'))['minecraft:entity'],id=e.description.identifier;
 if(skip.has(id))continue;
 const componentSets=[e.components??{},...Object.values(e.component_groups??{})],keys=new Set(componentSets.flatMap(o=>Object.keys(o)));
 const melee=keys.has('minecraft:behavior.melee_attack')||keys.has('minecraft:behavior.delayed_attack');
 const ranged=keys.has('minecraft:behavior.ranged_attack')||keys.has('minecraft:behavior.fire_at_target');
 const native=[melee?'近接':'',ranged?'遠隔':''].filter(Boolean).join('・')||'定義なし';
 const clientPath=path.join(rp,'entity',f.replace(/\.json$/,'.entity.json'));
 const client=JSON.parse(fs.readFileSync(clientPath,'utf8'))['minecraft:client_entity'].description;
 const aliases=Object.entries(client.animations??{}).filter(([k])=>visualKeys.has(k));
 const missing=aliases.filter(([,v])=>!animationIds.has(v));
 const profile=mobContent.get(id);stats.entities++;stats.melee+=Number(melee);stats.ranged+=Number(ranged);stats.aliasesMissing+=missing.length;
 if(profile){stats.profiles++;stats[profile.temper]++;}
 rows.push(`| ${id} | ${(langs.get(id)??profile?.name??'名称未確認').replaceAll('|','／')} | ${native} | ${scriptRoute(id,profile)} | ${aliases.map(([k])=>k).join('、')||'該当別名なし'}${missing.length?'（参照先未発見）':''} |`);
}
if(stats.entities!==143||stats.profiles!==120||stats.aliasesMissing)throw Error(`Unexpected audit input: ${JSON.stringify(stats)}`);
const text=`# 追加MOBの攻撃経路・演出の静的棚卸し\n\n生成：\`node --experimental-default-type=module tools/audit_mob_combat.mjs\`（\`--check\`で再照合）。JSON、プロフィール、既知のスクリプト分類とクライアントの**別名の存在**を列挙したものです。攻撃可能・発生条件・警告と実ダメージの一致、アニメーションが動くこと、ビジュアル品質や端末・マルチ負荷を証明しません。別名なしも演出なしとは限らず、属性の動的参照・別アニメ・パーティクルや内部挙動は個別確認が必要です。バニラMOB・乗り物2種・描画専用1種は除外。\n\n対象 ${stats.entities} 種。定義内に近接AI ${stats.melee} 種、遠隔AI ${stats.ranged} 種（条件付きコンポーネントを含み、両方あり得る）。120種プロフィールの内訳：敵対 ${stats.hostile}、中立 ${stats.neutral}、受動 ${stats.passive}。\n\n- 敵対104種の警告技の発動時に、技系統別の小さな粒子を試作。敵96種の補助関節または胴・頭の仮動作と八界王3系統の専用動作も追加し、見回り2種の近接命中に粒子を追加。既存の予告・命中範囲は粒子から決まらない。実機と各種の個別仕上げは未完。\n- 八界王の大きな予告輪は半径ごと16〜48点にし、途中で生成に失敗した攻撃は中止。点線の見え方や粒子負荷は実機未確認。\n- 胞子・放電と範囲技の紛らわしい追加の輪を除き、予告輪を維持。FUSHIチーフは予告後、足場を検査した短い体当たり、スクリプト粒子とレイで飛ぶ月光の弾、固定地点の霧を試作。通常近接は被接触位置に小粒子、八界王は専用の斬撃動作を試作。接触後演出は事前予告ではなく、すべて実機未確認。\n- 120種のうち敵対種の固有技はスクリプトの警告・構え・発動。敵対104種の攻撃・構えは突進・防御・放出の3系統と体の形4系統を組み合わせた動作を試作（種別固有の完成ではない）、近接は接触後の演出。中立／受動の支援・逃走は攻撃を追加しない。エンジン近接の**事前予告**にはなっていない。\n- 見回りの見張り・魔法使いは近接接触後、魔法使いは実際の魔法実行後の腕動作を試作。弓兵は遠隔AIの\`swing\`と\`variable.attack_time\`で発射に連動する動作と、発射元が確認できるバニラ矢の衝突後粒子を試作。いずれも描画・同期・予告は実機未検証。\n- 守護獣8種の3技に、それぞれ防御・突進・放出の構えと発動を試作。守護獣と界渡りに界別の発動粒子も試作。空の守護獣は翼、残りは4本脚を動かす。界渡り8種の歩行・予告・反撃も各個体の骨に移植。FUSHIチーフ、八界王、時空の管理者の技は別実装。各種・各技・表示・命中範囲・妨害や遮蔽物・警告失敗時・複数人で個別に確認する。\n- 参照：Microsoft公式 [遠隔攻撃AIの swing](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitygoals/minecraftbehavior_ranged_attack?view=minecraft-bedrock-stable) は射撃時の振り動作、[Molang解説](https://learn.microsoft.com/en-us/minecraft/creator/documents/molang/practical-molang?view=minecraft-bedrock-stable) は variable.attack_time を使った攻撃アニメを説明。バージョン・実描画は実機確認が必要。\n- MOB高画質化の対象判断ではない。見た目の資産は別途棚卸しし、ラスボス・FUSHI関連などを不用意に上書きしないよう画像そのものを個別確認する。\n\n| ID | 名称 | エンジンAIの定義 | 既知のスクリプト経路 | クライアント別名（存在のみ） |\n|---|---|---|---|---|\n${rows.join('\n')}\n`;
if(process.argv.includes('--check')){
 if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==text){console.error(`${out} is out of date`);process.exit(1)}
 console.log(`Combat inventory matches: ${stats.entities} entities; static evidence only`);
}else{fs.writeFileSync(out,text);console.log(`Wrote ${out}: ${JSON.stringify(stats)}`);}
