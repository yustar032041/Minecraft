// Deterministic asset inventory, not an automated assessment of visual quality.
// Never modifies entity models, textures, animations or other pack assets.
import fs from 'node:fs';
import path from 'node:path';
import {mobContent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
const root='Hakkai_v7.1.0',bp=path.join(root,'BehaviorPack/entities'),rp=path.join(root,'ResourcePack'),output='追加MOB見た目の棚卸し.md';
const excluded=new Set(['hakkai:time_train','hakkai:shore_ferry','hakkai:kinetic_visual']);
const protectedIds=new Set(['hakkai:time_warden','hakkai:fushi','hakkai:fushi_chief']);
const prototypeIds=new Set([...Array.from({length:8},(_,r)=>Array.from({length:3},(_,i)=>`hakkai:wild_${r}_${i}`)).flat(),...Array.from({length:8},(_,i)=>`hakkai:guardian_${i}`),...Array.from({length:8},(_,i)=>`hakkai:ender_${i}`),...Array.from({length:12},(_,i)=>`hakkai:foe_0_${i}`),...Array.from({length:12},(_,i)=>`hakkai:foe_1_${i}`),...Array.from({length:12},(_,i)=>`hakkai:foe_2_${i}`),...Array.from({length:12},(_,i)=>`hakkai:foe_3_${i}`),...Array.from({length:12},(_,i)=>`hakkai:foe_4_${i}`),...Array.from({length:12},(_,i)=>`hakkai:foe_5_${i}`),...Array.from({length:12},(_,i)=>`hakkai:foe_6_${i}`),...Array.from({length:12},(_,i)=>`hakkai:foe_7_${i}`),...['village_archer','village_mage','village_watch','eclipse_colossus'].map(x=>`hakkai:${x}`)]);
const language=new Map(fs.readFileSync(path.join(rp,'texts/ja_JP.lang'),'utf8').split(/\r?\n/).flatMap(line=>{const m=/^entity\.(hakkai:[^=]+)\.name=(.*)$/.exec(line);return m?[[m[1],m[2]]]:[]}));
const geometries=new Map();
for(const filename of fs.readdirSync(path.join(rp,'models/entity')).filter(f=>f.endsWith('.json')).sort()){
 for(const model of JSON.parse(fs.readFileSync(path.join(rp,'models/entity',filename),'utf8'))['minecraft:geometry']??[]){
  const id=model.description.identifier;if(geometries.has(id))throw Error(`Duplicate geometry ${id}`);
  geometries.set(id,{filename,model});
 }
}
const exists=p=>fs.existsSync(path.join(rp,p));
function textureInfo(texture){
 const png=path.join(rp,`${texture}.png`);if(!fs.existsSync(png))return `${texture}（PNG未発見）`;
 const h=fs.readFileSync(png).subarray(0,24);if(h.length<24||h.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error(`Invalid PNG ${png}`);
 const w=h.readUInt32BE(16),height=h.readUInt32BE(20);
 const set=exists(`${texture}.texture_set.json`)?'set':'setなし';
 const mer=exists(`${texture}_mer.png`)?'mer':'merなし',normal=exists(`${texture}_n.png`)?'n':exists(`${texture}_normal.png`)?'normal':'法線なし';
 return `${texture} (${w}×${height}; ${set}/${mer}/${normal})`;
}
const rows=[],uses=new Map(),stats={all:0,candidates:0,protected:0};
const escape=s=>String(s).replaceAll('|','／').replaceAll('\n',' ');
for(const file of fs.readdirSync(bp).filter(f=>f.endsWith('.json')).sort()){
 const ent=JSON.parse(fs.readFileSync(path.join(bp,file),'utf8'))['minecraft:entity'],id=ent.description.identifier;
 if(excluded.has(id))continue;
 const client=JSON.parse(fs.readFileSync(path.join(rp,'entity',file.replace(/\.json$/,'.entity.json')),'utf8'))['minecraft:client_entity'].description;
 if(client.identifier!==id)throw Error(`Client mismatch ${id}`);
 const profile=mobContent.get(id),protectedAsset=protectedIds.has(id),models=[];
 for(const [key,geometry] of Object.entries(client.geometry??{})){
  const item=geometries.get(geometry);if(!item)throw Error(`Missing geometry ${id}: ${geometry}`);
  const d=item.model.description,bones=item.model.bones.map(b=>b.name);
  models.push(`${key}: ${geometry} [${item.filename}; UV ${d.texture_width}×${d.texture_height}; 骨 ${bones.join(', ')}]`);
 }
 const textures=[];for(const [key,texture] of Object.entries(client.textures??{})){
  textures.push(`${key}: ${textureInfo(texture)}`);
  const used=uses.get(texture)??[];used.push(id);uses.set(texture,used);
 }
 stats.all++;stats[protectedAsset?'protected':'candidates']++;
 const label=protectedAsset?'保護（変更しない）':prototypeIds.has(id)?'見た目試作中・要現物確認':'要現物確認';
 const role=profile?`${profile.realmName} / ${profile.temper} / ${profile.actionName}`:id.includes('guardian_')?'守護獣':id.includes('ender_')?'界渡り':id.includes('village_')?'村の見回り':id==='hakkai:eclipse_colossus'?'八界王':id==='hakkai:time_warden'?'時空の管理者':id.includes('fushi')?'FUSHI関連':'要確認';
 rows.push(`| ${escape(id)} | ${escape(language.get(id)??profile?.name??'名称未確認')} | ${escape(role)} | ${label} | ${escape(models.join('<br>')||'未発見')} | ${escape(textures.join('<br>')||'未発見')} |`);
}
if(stats.all!==143||stats.protected!==3)throw Error(`Unexpected scope ${JSON.stringify(stats)}`);
const shared=[...uses].filter(([,ids])=>ids.length>1).sort(([a],[b])=>a.localeCompare(b,'en'));
const text=`# 追加MOBの見た目・資産の棚卸し\n\n生成：\`node --experimental-default-type=module tools/audit_mob_appearance.mjs\`（\`--check\` で照合）。**静的な資産一覧であり、実際の見た目や完成度の評価ではない。** モデルや画像は変更しない。PNGの大きさ・同名マップの存在のみを表示し、UV対応、マップの参照・品質、実機描画、Switch／マルチの負荷は証明しない。\n\n生物 ${stats.all} 種：作り直しの検討対象 ${stats.candidates}、暫定保護 ${stats.protected}（時空の管理者とFUSHI・チーフ）。保護は高品質の証明ではなく、既存資産を不用意に上書きしないための扱い。候補はすべて要現物確認、うち8界の野生各3種・守護獣8種・界渡り8種・草原の敵12種・霧の森の敵12種・砂の回廊の敵12種・氷の鏡湖の敵12種・雷の断崖の敵12種・闇の地下庭園の敵12種・空の浮島群の敵12種・時の終着駅の敵12種・村の見回り3種・八界王は形と画像を試作中。既に良い資産を残せる。バニラMOB、乗り物2種、工業の描画専用1種は除外。ID・性能・攻撃を変更せず、個体の名前・属性・役割と見た目を照合し、必要なものを個別に改修する。単なる拡大・色替えは完成としない。\n\n共有画像の参照：${shared.length} パス${shared.length?'（下記）':'（なし）'}。モデルや画像はほかの参照経路でも共有され得るため、変更前に個別確認する。\n${shared.map(([tex,ids])=>`- ${tex}: ${ids.join('、')}`).join('\n')}\n\n| ID | 名前 | 役割・技（プロフィールがある場合） | 扱い | モデルと骨 | 画像と寸法・同名マップ |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n`;
if(process.argv.includes('--check')){
 if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==text){console.error(`${output} is out of date`);process.exit(1);}
 console.log(`Appearance inventory matches: ${stats.all} entities; ${stats.candidates} review candidates; ${stats.protected} protected`);
}else{fs.writeFileSync(output,text);console.log(`Wrote ${output}: ${JSON.stringify(stats)}`);}
