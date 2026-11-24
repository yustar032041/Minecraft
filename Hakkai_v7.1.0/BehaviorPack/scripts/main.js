import { JOBS, villagerJob, workstationTick, releaseWorkstation, releaseDeadWorker } from './villager_jobs.js';
import { disallowHostileSpawn, suppressVanillaSpawn, VANILLA_HOSTILES } from './hostile_spawn_rules.js';
import { configureFriendlyFire,friendlyFireEnabled,setFriendlyFire,protectsPlayer } from './friendly_fire.js';
import { placeRepeatSite } from './seeded_repeat_sites.js';
import { setupBowTrail } from './combat_bow_trail.js';
import { setupWeaponTrace, isTraceWeapon } from './combat_weapon_trace.js';
import { tomeSpells, tomeUnlocked, tomeCurrent, tomeNext, tomeCrouchTick } from './spell_tome.js';
import { VILLAGE_GUIDE_CHAPTERS } from './village_guide.js';
import { validPlot, repairPlotStep, validRoute, readCarry, carryStep, retrieveCargo, festivalGameStart, festivalGameAdvance, GAME_CORNERS, GAME_COURSES } from './village_projects.js';
import { seasonAt, festivalAt, villageTier, requestStatus, contributeRequest, festivalJoin, donation, workDay, detectCrisis, recoverCrisis, addVillageMemory, depositToVillage, validWorkshop, workshopStep } from './village_life.js';
import { BUILDER_IDS, claimBuilderWork, releaseBuilderWork, BLUEPRINTS, blueprint, readBuilderProject, stepBuilderProject, clearBuilderProject, foundBuilder, builderHome, builderPaused, setBuilderPaused, autoBuilderPlan, constructionCredit } from './village_builders.js';
import { FRIENDLY_RESIDENTS, friendlyResidentById, foundFriendlyResident, friendlySupportTick, friendlyTrade } from './friendly_residents.js';
import { CULTURE_SITES, CULTURE_PEOPLE, cultureResidentIdentity, foundCultureResident, factoryResidentRole, factoryResidentBonus } from './realm_culture.js';
import { FACTORY_VILLAGE_ID, foundFactoryResident } from './factory_village.js';
import { villageIdentity, villageBuilt } from './resident_spawn.js';
import { farmStep } from './factory_farm.js';
import { itemDuctStep } from './factory_ducts.js';
import { bearingState, setBearingMode, bearingStep, bearingAutoTick, armBearing } from './factory_bearing.js';
import { isGantry, gantryState, setGantryMode, gantryStep, gantryAutoTick, armGantry } from './factory_gantry.js';
import { fluidPumpStep, fluidBasinStep, fluidLoaderStep, adjacentWaterTank, tankState, consumeTankWater } from './factory_fluids.js';
import { INDUSTRY_CHAPTERS, claimIndustryGuide } from './industry_guide.js';
import { pipeEndpoints } from './factory_transport.js';
import { findLineRecipe, filteredDestination } from './factory_lines.js';
import { kineticNetwork, hasAdjacentWater, factoryRecipe, toggleClutch } from './factory_network.js';
import { syncKineticVisual, cleanKineticVisuals } from './factory_visual.js';
import { factoryTransaction } from './factory_transaction.js';
import { setupShieldWear } from './shield_wear.js';
import { deferShieldArrow } from './shield_reflect.js';
import { setupCustomShield } from './custom_shield.js';
import { world, system, BlockVolume, BlockPermutation, ItemStack, GameMode, EntityDamageCause, WeatherType, LiquidType, Difficulty, EquipmentSlot } from '@minecraft/server';
import { ActionFormData, FormCancelationReason } from '@minecraft/server-ui';
import { setupMobSystem } from './mob_system.js';
import { setupRealmEnders } from './realm_ender.js';
import { setupFushiSystem } from './fushi_system.js';
import { setupMoonBamboo, isMoonlitNight } from './moon_bamboo.js';
import { setupFushiQuest } from './fushi_quest.js';
import { setupShrineChiefs } from './shrine_chiefs.js';
import { spawnRareEncounter, fushiThresholds } from './rare_encounters.js';
import { setupWardenArena } from './warden_arena.js';
import { setupWardenBoss } from './warden_boss.js';
import { setupCombatResonance, combatEnemies, applyCombatHit } from './combat_resonance.js';
import { setupCombatGuard } from './combat_guard.js';
import { setupCombatParry } from './combat_parry.js';
import { setupCombatRoll } from './combat_roll.js';
import { setupAirDash } from './combat_air_dash.js';
import { setupAirStrike } from './combat_air_strike.js';
import { prepareWindRay, renderWindRay } from './combat_wind_ray.js';
import { castNewMagic } from './combat_magic.js';
import { setupFushiTotem } from './combat_totem.js';
import { setupCombatUltimate } from './combat_ultimate.js';
import { hasUltimateArmor, ultimateRegen, ultimateParryHeal } from './ultimate_armor.js';
import { ULTIMATE_WEAPONS } from './ultimate_weapons.js';
import { equippedSeries, ownsSeriesPiece, trialRewardSlot, seriesLegUpgrade } from './armor_series.js';
import { setupCombatCharge, RELEASE_WEAPON_KINDS } from './combat_charge.js';
import { places, atlas, linkedRealms, attrs, home, pairs, guardians, catalog, anchor, baseY, width, expandedY, expandedHeight, patterns, chronicles, biomes, families, wildlife, hudTokens, civicRoles, seasonalPlants } from './data.js';
import { setupFrontierWorlds } from './frontier_worlds.js';
import { isNaturalSite, initializeNaturalSitePlans, siteBounds, inSite } from './natural_sites.js';
import { setupSeededWorlds } from './seeded_worlds.js';
import { pickRealmWildlife } from './wildlife_selection.js';
import { spawnWildlife } from './wildlife_spawn.js';
import { setupExpeditionRecords } from './expedition_records.js';
import { GUIDE_ENTRIES, GUIDE_ICONS, GUIDE_SECTIONS, selectGuidePage, creatureEntriesByRealm, gearKinds, filterGear } from './guide_navigation.js';

configureFriendlyFire(world);
const ns='hakkai:', dimID=(id)=>ns+'realm_'+id;
let frontierWorlds, expeditionRecords, seededWorlds, mobSystem, realmEnders, fushiSystem, wardenArena, wardenBoss, combatResonance, combatGuard, combatRoll, combatParry, airDash, airStrike, fushiTotem, combatUltimate, combatCharge, weaponTrace, bowTrail;
const shieldWear=setupShieldWear({system});
const customShield=setupCustomShield({catalog,prepare:shieldWear.prepare});
const gear=new Map([...catalog,...ULTIMATE_WEAPONS].map(g=>[ns+g.id,g]));
const atlasGrid=new Map(atlas.map(a=>[`${a.col},${a.row}`,a]));
const travelSites=new Map([...places,...atlas,...linkedRealms].map(s=>[s.id,s]));
const sessions=new Map();
const builds=new Map();
const recentWeather=new Map();
const currentWeather=new Map();
const max=100;
const itemTexture=id=>`textures/items/hakkai_${id}`;
const bounds=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const num=(e,p,or=0)=>{const v=e.getDynamicProperty(ns+p);return typeof v==='number'&&Number.isFinite(v)?v:or;};
const property=(e,k,v)=>e.setDynamicProperty(ns+k,v);
const space=(p)=>p.getComponent('minecraft:inventory')?.container;
const selected=(p)=>space(p)?.getItem(p.selectedSlotIndex);
const isCreative=(p)=>p.getGameMode()===GameMode.Creative;
const markKey=(k,i)=>i<21?k:`${k}_v2_${Math.floor((i-21)/24)}`;
const markBit=i=>1<<(i<21?i:(i-21)%24);
const marked=(p,k,i)=>Boolean(num(p,markKey(k,i))&markBit(i));
const mark=(p,k,i)=>{const key=markKey(k,i);property(p,key,num(p,key)|markBit(i));};
const visited=(p,i)=>marked(p,'visits',i);
const tale=site=>site.story??chronicles[site.id];
const aspect=site=>site.theme??site.dim;
const raining=d=>{const w=currentWeather.get(d.id.replace(/^minecraft:/,''));return w===WeatherType.Rain||w===WeatherType.Thunder;};
const era=()=>['春','夏','秋','冬'][seasonAt(Math.floor(Math.max(0,world.getAbsoluteTime())/24000)).index];
const timed=(cb,n)=>new Promise(resolve=>system.runTimeout(()=>resolve(cb()),n));
function safeSub(root,when,name,fn){try{const o=(root==='world'?world:system)[when+'Events']?.[name];if(!o)throw new Error('このバージョンに無いイベント');o.subscribe(fn);}catch(err){console.error(`[8界風記: イベント登録失敗 ${when}.${name}] ${String(err)}`);}}
function safeReg(reg,name,def){try{reg.registerCustomComponent(name,def);}catch(err){console.error(`[8界風記: 部品登録失敗 ${name}] ${String(err)}`);}}
function state(p){
 if(!sessions.has(p.id))sessions.set(p.id,{s:bounds(num(p,'stamina',100),0,100),m:bounds(num(p,'mana',100),0,100),useTick:-10,cd:new Map(),menu:false,busy:false,until:0,arrival:0,musicAt:0,lastMusic:-1,sound:undefined,lastMove:0,action:'',campResting:false,campCheckAt:0});
 return sessions.get(p.id);
}
function report(label,err){console.error(`[8界風記: ${label}] ${String(err)}`);}
function notice(p,line,t=55){const s=state(p);s.action=line;s.until=system.currentTick+t;}
function getItem(c,id){if(!c)return -1;for(let i=0;i<c.size;i++)if(c.getItem(i)?.typeId===id)return i;return -1;}
function total(c,id){let count=0;if(c)for(let i=0;i<c.size;i++){const x=c.getItem(i);if(x?.typeId===id)count+=x.amount;}return count;}
function debit(c,id,count){
 if(count<=0)return true;
 if(total(c,id)<count)return false;
 for(let i=0;i<c.size&&count>0;i++){
   const v=c.getItem(i);if(v?.typeId!==id)continue;
   const used=Math.min(count,v.amount);
   if(used===v.amount)c.setItem(i);else{v.amount-=used;c.setItem(i,v);}
   count-=used;
 }
 return true;
}
function room(c,stack){
 if(!c)return false;
 let n=stack.amount;
 for(let i=0;i<c.size&&n>0;i++){
   const x=c.getItem(i);if(!x)n-=stack.maxAmount;else if(x.isStackableWith(stack))n-=x.maxAmount-x.amount;
 }
 return n<=0;
}
function give(p,id,count=1){
 const c=space(p), item=new ItemStack(id,count);
 if(!room(c,item))return false;
 return !c.addItem(item);
}
function exchange(p,input,n,output,k=1){
 const c=space(p), out=new ItemStack(output,k);
 if(total(c,input)<n){notice(p,'§e交換する素材が足りない');return false;}
 if(!room(c,out)){notice(p,'§e持ち物に空きを作ってね');return false;}
 if(!debit(c,input,n))return false;
 c.addItem(out);
 return true;
}
function persist(p,s){property(p,'stamina',Math.round(s.s));property(p,'mana',Math.round(s.m));}
function restore(p){
 let complete=true;
 for(const id of ['guide','return_stone']){
   if(getItem(space(p),ns+id)<0&&!give(p,ns+id))complete=false;
 }
 return complete;
}
function parsePoint(p,k){
 const raw=p.getDynamicProperty(ns+k);
 if(typeof raw!=='string')return;
 try{const d=JSON.parse(raw);if(typeof d.id==='string'&&[d.x,d.y,d.z].every(Number.isFinite))return d;}catch{}
}
function point(p){const {x,y,z}=p.location;return {x,y,z,id:p.dimension.id};}
function overworld(p){return p.dimension.id==='minecraft:overworld'||p.dimension.id==='overworld';}
function coords(site){return {x:site.x+.5,y:site.size?expandedY:baseY+anchor.y,z:site.z+(site.size ? .5 : anchor.z-anchor.x+.5)};}
function origin(site){const c=site.size?(site.size-1)/2:anchor.x;return {x:site.x-c,y:baseY,z:site.z-c};}
function currentPlace(p){
 const id=p.dimension.id;
 if(!id.startsWith(ns+'realm_'))return;
 const dim=Number(id.slice((ns+'realm_').length)), l=p.location;
 if(dim===8){
   const a=atlasGrid.get(`${Math.floor((l.x+16)/33)},${Math.floor((l.z+16)/33)}`);
   return a&&num(world,`built_${a.id}`)?a:undefined;
 }
 if(dim===9){
   const a=linkedRealms[Math.floor((l.x+22)/45)];
   return a&&l.z>=-22&&l.z<23&&num(world,`built_${a.id}`)?a:undefined;
 }
 const trail=trails.find(s=>dim===0&&Math.abs(s.x-l.x+.5)<s.size/2&&Math.abs(s.z-l.z)<s.size/2+2);
 return trail??places.find(s=>s.kind!=='trail'&&(!isNaturalSite(s)||num(world,`built_${s.id}`))&&s.dim===dim&&Math.abs(s.x-l.x)<(s.size??width)/2+2&&Math.abs(s.z-l.z)<(s.size??width)/2+2);
}
function safeFloor(type){return !/(magma|cactus|campfire|leaves|powder_snow|rail|pressure_plate|carpet|fern|vine|dripleaf|pointed_dripstone)/.test(type);}
function campfireNearby(p){
 const l=p.location,x=Math.floor(l.x),y=Math.floor(l.y),z=Math.floor(l.z),d=p.dimension;
 for(let dy=-1;dy<=1;dy++)for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){
  if(dx*dx+dz*dz>9)continue;
  try{const id=d.getBlock({x:x+dx,y:y+dy,z:z+dz})?.typeId;if(id==='minecraft:campfire'||id==='minecraft:soul_campfire')return true;}catch{}
 }
 return false;
}
/** @param {import('@minecraft/server').Dimension} d @param {import('@minecraft/server').Vector3} l */
function safe(d,l){
 const x=Math.floor(l.x),y=Math.floor(l.y),z=Math.floor(l.z);
 const floor=d.getBlock({x,y:y-1,z}),feet=d.getBlock({x,y,z}),head=d.getBlock({x,y:y+1,z});
 return Boolean(floor&&!floor.isAir&&!floor.isLiquid&&floor.isLiquidBlocking(LiquidType.Water)&&safeFloor(floor.typeId)&&feet?.isAir&&head?.isAir);
}
function safeNear(d,l,radius=4){
 for(let i=0;i<=radius;i++)for(let dz=-i;dz<=i;dz++)for(let dx=-i;dx<=i;dx++){
   if(i!==Math.max(Math.abs(dx),Math.abs(dz)))continue;
   for(const dy of [0,1,-1,2,-2,3,-3]){
     const v={x:Math.floor(l.x)+dx+.5,y:Math.floor(l.y)+dy,z:Math.floor(l.z)+dz+.5};
     try{if(safe(d,v))return v;}catch{}
   }
 }
}
let areaSerial=0;
async function loaded(d,from,to,fn){
 const id=`hakkai_${++areaSerial}`, mgr=world.tickingAreaManager;
 const whole=({x,y,z})=>({x:Math.floor(x),y:Math.floor(y),z:Math.floor(z)});
 try{
   await mgr.createTickingArea(id,{dimension:d,from:whole(from),to:whole(to)});
   return await fn();
 }finally{
   if(mgr.hasTickingArea(id))mgr.removeTickingArea(id);
 }
}

// --- 非戦闘地形：風見台〜始まりの草原の接続区間 ---
const meadowTerrainKey='meadow_terrain_v1';
const meadowTerrainSkippedKey='meadow_terrain_skipped_v1';
let meadowTerrainTask;
let meadowTerrainRetryAt=0;
const meadowRiver=[
 {x:30,z:-8},{x:36,z:-5},{x:42,z:0},{x:48,z:5},
 {x:54,z:3},{x:60,z:-2},{x:66,z:-5}
];
function meadowRiverDistance(x,z){
 let nearest=Infinity;
 for(let i=0;i<meadowRiver.length-1;i++){
   const a=meadowRiver[i],b=meadowRiver[i+1],dx=b.x-a.x,dz=b.z-a.z;
   const t=bounds(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
   nearest=Math.min(nearest,Math.hypot(x-(a.x+t*dx),z-(a.z+t*dz)));
 }
 return nearest;
}
function meadowSurfaceY(x,z){
 // 3ブロックの外周と横断路はY=88で固定し、既存拠点の到着床へつなぐ。
 if(x<26||x>70||z<-19||z>19||Math.abs(z)<=1)return 88;
 const hillA=3*Math.max(0,1-Math.hypot((x-36)/10,(z+12)/7));
 const hillB=2*Math.max(0,1-Math.hypot((x-60)/9,(z-12)/7));
 const hillC=1*Math.max(0,1-Math.hypot((x-50)/7,(z+14)/5));
 const softWave=.28*Math.sin(x*.41+z*.17)+.18*Math.cos(z*.53-x*.13);
 return 88+Math.min(3,Math.max(0,Math.round(Math.max(hillA,hillB,hillC)+softWave)));
}
function meadowSet(d,x,y,z,type){
 const block=d.getBlock({x,y,z});
 if(!block)throw new Error(`地形ブロックを取得できない: ${x},${y},${z}`);
 d.setBlockType({x,y,z},type);
}
function meadowTree(d,x,z,surfaceY){
 const leaf=BlockPermutation.resolve('minecraft:oak_leaves',{persistent_bit:true,update_bit:false});
 for(let y=1;y<=4;y++)meadowSet(d,x,surfaceY+y,z,'minecraft:oak_log');
 for(const dy of [2,3,4]){
   const radius=dy===4?1:2;
   for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
     if(dx*dx+dz*dz>radius*radius+1)continue;
     if(dx===0&&dz===0&&dy<=4)continue;
     d.setBlockPermutation({x:x+dx,y:surfaceY+dy,z:z+dz},leaf);
   }
 }
 for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
   if(dx===0&&dz===0)continue;
   d.setBlockPermutation({x:x+dx,y:surfaceY+5,z:z+dz},leaf);
 }
 d.setBlockPermutation({x,y:surfaceY+5,z},leaf);
}

const meadowLandmarkKey='meadow_landmarks_v1';
const meadowLandmarkSkippedKey='meadow_landmarks_skipped_v1';
const meadowLandmarkAllowed=new Set(['minecraft:air','minecraft:grass_block','minecraft:dirt','minecraft:stone','minecraft:coarse_dirt','minecraft:gravel','minecraft:water','minecraft:clay','minecraft:oak_leaves','minecraft:oak_log','minecraft:poppy','minecraft:dandelion','minecraft:cornflower','minecraft:oxeye_daisy','minecraft:azure_bluet','minecraft:allium']);
function landmarkAreaIsNatural(d,from,to,allowed){
 for(let x=from.x;x<=to.x;x++)for(let y=from.y;y<=to.y;y++)for(let z=from.z;z<=to.z;z++){
   const b=d.getBlock({x,y,z});if(!b||!allowed.has(b.typeId))return false;
 }
 return true;
}
async function ensureMeadowLandmarks(d){
 if(num(world,meadowLandmarkKey)||num(world,meadowLandmarkSkippedKey))return;
 // 風車・灯り・見張り標の設置予定範囲だけを確認。プレイヤー建築があれば触れない。
 if(!landmarkAreaIsNatural(d,{x:43,y:88,z:7},{x:52,y:96,z:16},meadowLandmarkAllowed)){
   property(world,meadowLandmarkSkippedKey,1);report('草原ランドマーク','設置予定範囲に既存建築を検出したため追加を見送りました');return;
 }
 const wx=47,wz=13,wy=meadowSurfaceY(wx,wz);
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)meadowSet(d,wx+dx,wy,wz+dz,'minecraft:stone_bricks');
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(Math.abs(dx)===1||Math.abs(dz)===1)meadowSet(d,wx+dx,wy+1,wz+dz,'minecraft:oak_planks');
 for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]])for(let h=2;h<=5;h++)meadowSet(d,wx+dx,wy+h,wz+dz,'minecraft:stripped_oak_log');
 for(let h=2;h<=6;h++)meadowSet(d,wx,wy+h,wz,'minecraft:stripped_oak_log');
 meadowSet(d,wx,wy+6,wz,'minecraft:copper_block');
 for(const dx of [-3,-2,2,3])meadowSet(d,wx+dx,wy+6,wz,'minecraft:white_wool');
 for(const dy of [-2,-1,1,2])meadowSet(d,wx,wy+6+dy,wz,'minecraft:white_wool');
 for(const [lx,lz] of [[43,7],[52,7]]){const ly=meadowSurfaceY(lx,lz);meadowSet(d,lx,ly+1,lz,'minecraft:oak_fence');meadowSet(d,lx,ly+2,lz,'minecraft:oak_fence');meadowSet(d,lx,ly+3,lz,'minecraft:lantern');}
 meadowSet(d,wx+5,wy,wz-2,'minecraft:stone_bricks');meadowSet(d,wx+5,wy+1,wz-2,'hakkai:watch_post');
 property(world,meadowLandmarkKey,1);
}

async function buildMeadowTerrain(){
 if(num(world,meadowTerrainKey)){
   const d=world.getDimension(dimID(0));
   return loaded(d,{x:43,y:88,z:7},{x:52,y:96,z:16},async()=>{await ensureMeadowLandmarks(d);return true;});
 }
 if(num(world,meadowTerrainSkippedKey))return false;
 if(system.currentTick<meadowTerrainRetryAt)return false;
 if(meadowTerrainTask)return meadowTerrainTask;
 const d=world.getDimension(dimID(0));
 const from={x:23,y:76,z:-22},to={x:73,y:96,z:22};
 const task=loaded(d,from,to,async()=>{
   if(num(world,meadowTerrainKey))return true;
   if(!num(world,'built_0')||!num(world,'built_1'))return false;
   // 既存プレイヤー建築や予期しないブロックがあれば、この区画には手を加えない。
   if(d.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']})){
     property(world,meadowTerrainSkippedKey,1);
     report('草原地形','接続区画に既存ブロックがあるため、上書きを避けて生成を中止しました');
     return false;
   }
   // 51×45の空き帯だけを使用。拠点の予約矩形（X=-22..22 / 74..118）には触れない。
   d.fillBlocks(new BlockVolume({x:23,y:76,z:-22},{x:73,y:85,z:22}),'minecraft:stone');
   d.fillBlocks(new BlockVolume({x:23,y:86,z:-22},{x:73,y:87,z:22}),'minecraft:dirt');
   d.fillBlocks(new BlockVolume({x:23,y:88,z:-22},{x:73,y:88,z:22}),'minecraft:grass_block');

   // ゆるやかな丘。Y=88を基準に最大3ブロックだけ上げる。
   for(let x=26;x<=70;x++)for(let z=-19;z<=19;z++){
     const top=meadowSurfaceY(x,z);
     if(top>88){
       for(let y=88;y<top;y++)meadowSet(d,x,y,z,'minecraft:dirt');
       meadowSet(d,x,top,z,'minecraft:grass_block');
     }
   }

   // 小川：幅およそ3ブロック、川底Y=86、水面Y=87。
   for(let x=23;x<=73;x++)for(let z=-22;z<=22;z++){
     const distance=meadowRiverDistance(x,z);
     if(distance<=1.55){
       // 丘の内部に水が埋まらないよう、川幅内の地表と上空を先に開ける。
       for(let y=88;y<=96;y++)meadowSet(d,x,y,z,'minecraft:air');
       meadowSet(d,x,86,z,(x+z)%4===0?'minecraft:gravel':'minecraft:clay');
       meadowSet(d,x,87,z,'minecraft:water');
     }else if(distance<=2.25&&meadowSurfaceY(x,z)===88){
       meadowSet(d,x,88,z,'minecraft:gravel');
     }
   }

   // 拠点どうしを結ぶ徒歩道。小川部分だけ木橋にする。
   for(let x=23;x<=73;x++){
     for(const z of [-1,0,1]){
       const type=z===0?'minecraft:gravel':'minecraft:coarse_dirt';
       meadowSet(d,x,88,z,type);
     }
   }
   for(let x=40;x<=45;x++)for(let z=-1;z<=1;z++)meadowSet(d,x,88,z,'minecraft:oak_planks');
   for(let x=40;x<=45;x++)for(const z of [-1,1])meadowSet(d,x,89,z,'minecraft:oak_fence');

   // 3本の小さな木立。葉は永続状態で置き、自然消滅を防ぐ。
   for(const [x,z] of [[31,-14],[57,14],[65,-13]]){
     const y=meadowSurfaceY(x,z);
     if(meadowRiverDistance(x,z)>4)meadowTree(d,x,z,y);
   }

   // 野花。横断路と小川から距離を取り、草地の上だけに配置する。
   const flowers=[
     [28,-16,'minecraft:poppy'],[33,-17,'minecraft:dandelion'],[39,-14,'minecraft:cornflower'],
     [44,-16,'minecraft:oxeye_daisy'],[49,-14,'minecraft:azure_bluet'],[54,-17,'minecraft:allium'],
     [62,-17,'minecraft:dandelion'],[68,-15,'minecraft:poppy'],[29,13,'minecraft:azure_bluet'],
     [35,16,'minecraft:oxeye_daisy'],[40,12,'minecraft:dandelion'],[50,16,'minecraft:poppy'],
     [55,12,'minecraft:cornflower'],[62,16,'minecraft:allium'],[68,12,'minecraft:oxeye_daisy'],
     [32,5,'minecraft:poppy'],[37,8,'minecraft:dandelion'],[52,-7,'minecraft:cornflower'],
     [58,7,'minecraft:azure_bluet'],[66,4,'minecraft:poppy']
   ];
   for(const [x,z,type] of flowers){
     if(meadowRiverDistance(x,z)>3&&Math.abs(z)>1){
       const y=meadowSurfaceY(x,z);
       meadowSet(d,x,y+1,z,type);
     }
   }
   await ensureMeadowLandmarks(d);
   property(world,meadowTerrainKey,1);
   return true;
 });
 meadowTerrainTask=task;
 try{return await task;}catch(err){meadowTerrainRetryAt=system.currentTick+200;throw err;}finally{meadowTerrainTask=undefined;}
}
// --- 非戦闘地形：霧の森〜まどろみの島の接続区間 ---
const forestTerrainKey='forest_terrain_v1';
const forestTerrainSkippedKey='forest_terrain_skipped_v1';
let forestTerrainTask;
let forestTerrainRetryAt=0;
function forestPathZ(x){
 // 両端はZ=0に戻し、森の中だけゆるく蛇行する小径。
 return Math.round(1.15*Math.sin((x-23)/50*Math.PI*2));
}
function forestSurfaceY(x,z){
 if(x<26||x>70||Math.abs(z-forestPathZ(x))<=3)return 88;
 const moundA=2*Math.max(0,1-Math.hypot((x-35)/9,(z+12)/7));
 const moundB=2*Math.max(0,1-Math.hypot((x-59)/10,(z-12)/8));
 const moundC=1.2*Math.max(0,1-Math.hypot((x-48)/7,(z+15)/5));
 const soft=.18*Math.sin(x*.31+z*.19)+.14*Math.cos(z*.37-x*.11);
 return 88+Math.min(2,Math.max(0,Math.round(Math.max(moundA,moundB,moundC)+soft)));
}
function forestSet(d,x,y,z,type){
 const block=d.getBlock({x,y,z});
 if(!block)throw new Error(`森の装飾ブロックを取得できない: ${x},${y},${z}`);
 d.setBlockType({x,y,z},type);
}
function forestTree(d,x,z,surfaceY,seasonalAccent=true){
 const leaves=BlockPermutation.resolve('minecraft:spruce_leaves',{persistent_bit:true,update_bit:false});
 for(let y=1;y<=6;y++)forestSet(d,x,surfaceY+y,z,'minecraft:spruce_log');
 for(const dy of [3,4,5,6]){
   const radius=dy===3?3:dy===4?3:dy===5?2:1;
   for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
     if(dx*dx+dz*dz>radius*radius+1||dx===0&&dz===0)continue;
     d.setBlockPermutation({x:x+dx,y:surfaceY+dy,z:z+dz},leaves);
   }
 }
 // 専用の季節樹冠ブロックを葉に混ぜる。既存のランダムティック処理で四季に応じて色が変わる。
 if(seasonalAccent){
   for(const [dx,dy,dz] of [[-2,4,0],[2,4,0],[0,5,-2],[0,5,2]])
     forestSet(d,x+dx,surfaceY+dy,z+dz,'hakkai:canopy_1');
 }
}

const forestLandmarkKey='forest_landmarks_v1';
const forestLandmarkSkippedKey='forest_landmarks_skipped_v1';
const forestLandmarkAllowed=new Set(['minecraft:air','minecraft:grass_block','minecraft:dirt','minecraft:stone','minecraft:coarse_dirt','minecraft:podzol','minecraft:moss_block','minecraft:moss_carpet','minecraft:mossy_cobblestone','minecraft:spruce_leaves','minecraft:spruce_log','minecraft:fern','minecraft:brown_mushroom','minecraft:red_mushroom','minecraft:spore_blossom']);
async function ensureForestLandmarks(d){
 if(num(world,forestLandmarkKey)||num(world,forestLandmarkSkippedKey))return;
 // 古木と読書小屋を別々に確認し、どちらかにプレイヤー建築があれば両方とも追加しない。
 const treeClear=landmarkAreaIsNatural(d,{x:31,y:88,z:-14},{x:39,y:96,z:-6},forestLandmarkAllowed);
 const nookClear=landmarkAreaIsNatural(d,{x:55,y:88,z:4},{x:61,y:96,z:10},forestLandmarkAllowed);
 if(!treeClear||!nookClear){property(world,forestLandmarkSkippedKey,1);report('霧の森ランドマーク','設置予定範囲に既存建築を検出したため追加を見送りました');return;}
 const gx=35,gz=-10,gy=forestSurfaceY(gx,gz);
 for(let h=1;h<=4;h++)forestSet(d,gx,gy+h,gz,'minecraft:dark_oak_log');
 const seasonalLeaves=BlockPermutation.resolve('minecraft:dark_oak_leaves',{persistent_bit:true,update_bit:false});
 for(const [dy,radius] of [[4,3],[5,3],[6,2]])for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
   if(dx*dx+dz*dz>radius*radius+1||dx===0&&dz===0)continue;
   d.setBlockPermutation({x:gx+dx,y:gy+dy,z:gz+dz},seasonalLeaves);
 }
 for(const [dx,dy,dz] of [[-2,5,0],[2,5,0],[0,5,-2],[0,5,2]])forestSet(d,gx+dx,gy+dy,gz+dz,'hakkai:canopy_1');
 forestSet(d,gx+2,gy,gz,'minecraft:shroomlight');forestSet(d,gx+2,gy+1,gz,'minecraft:moss_carpet');
 const lx=58,lz=7,floorY=91;
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
   const x=lx+dx,z=lz+dz,top=forestSurfaceY(x,z);
   for(let y=top+1;y<floorY;y++)forestSet(d,x,y,z,'minecraft:stripped_spruce_log');
   forestSet(d,x,floorY,z,'minecraft:spruce_planks');
 }
 for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]])for(let h=1;h<=3;h++)forestSet(d,lx+dx,floorY+h,lz+dz,'minecraft:spruce_log');
 for(let dx=-1;dx<=1;dx++)for(let h=1;h<=2;h++)forestSet(d,lx+dx,floorY+h,lz+2,'minecraft:bookshelf');
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)forestSet(d,lx+dx,floorY+4,lz+dz,'minecraft:spruce_planks');
 forestSet(d,lx-1,floorY+3,lz,'minecraft:lantern');forestSet(d,lx+1,floorY+3,lz,'minecraft:lantern');
 forestSet(d,lx,floorY,lz-2,'minecraft:mossy_cobblestone');
 property(world,forestLandmarkKey,1);
}

async function buildForestTerrain(){
 if(num(world,forestTerrainKey)){
   const d=world.getDimension(dimID(1));
   return loaded(d,{x:31,y:88,z:-14},{x:61,y:96,z:10},async()=>{await ensureForestLandmarks(d);return true;});
 }
 if(num(world,forestTerrainSkippedKey))return false;
 if(system.currentTick<forestTerrainRetryAt)return false;
 if(forestTerrainTask)return forestTerrainTask;
 const d=world.getDimension(dimID(1));
 const from={x:23,y:76,z:-22},to={x:73,y:96,z:22};
 const task=loaded(d,from,to,async()=>{
   if(num(world,forestTerrainKey))return true;
   if(!num(world,'built_2')||!num(world,'built_20'))return false;
   // 予約済みの二つの拠点には触れず、接続帯に既存ブロックがあれば生成を中止する。
   if(d.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']})){
     property(world,forestTerrainSkippedKey,1);
     report('霧の森地形','接続区画に既存ブロックがあるため、上書きを避けて生成を中止しました');
     return false;
   }
   d.fillBlocks(new BlockVolume({x:23,y:76,z:-22},{x:73,y:85,z:22}),'minecraft:stone');
   d.fillBlocks(new BlockVolume({x:23,y:86,z:-22},{x:73,y:87,z:22}),'minecraft:dirt');
   d.fillBlocks(new BlockVolume({x:23,y:88,z:-22},{x:73,y:88,z:22}),'minecraft:grass_block');

   // 苔と腐葉土の地面に、低い盛り上がりをつくる。
   for(let x=26;x<=70;x++)for(let z=-19;z<=19;z++){
     const top=forestSurfaceY(x,z);
     if(top>88){
       for(let y=88;y<top;y++)forestSet(d,x,y,z,'minecraft:dirt');
       forestSet(d,x,top,z,((x*13+z*7)%5===0)?'minecraft:podzol':'minecraft:moss_block');
     }else if(Math.abs(z-forestPathZ(x))>3){
       const n=Math.abs(x*17+z*29)%31;
       if(n===0||n===1)forestSet(d,x,88,z,'minecraft:moss_block');
       else if(n===4||n===5)forestSet(d,x,88,z,'minecraft:podzol');
     }
   }

   // 蛇行する道。足元の高さはY=88で固定し、拠点の到着床とつなぐ。
   for(let x=23;x<=73;x++){
     const center=forestPathZ(x);
     for(let dz=-1;dz<=1;dz++){
       const z=center+dz;
       forestSet(d,x,88,z,dz===0?'minecraft:mossy_cobblestone':'minecraft:coarse_dirt');
     }
   }
   // 道端の苔むした石と、歩行の妨げにならない薄い苔カーペット。
   for(const [x,z] of [[28,-5],[34,6],[41,-6],[49,6],[57,-5],[65,6],[70,-5]]){
     const top=forestSurfaceY(x,z);
     forestSet(d,x,top,z,'minecraft:mossy_cobblestone');
   }

   // 針葉樹の木立。樹冠は葉ブロックと専用の季節樹冠ブロックを混ぜて構成。
   const trees=[[29,-14],[36,13],[43,-13],[52,14],[61,-13],[68,13]];
   for(const [x,z] of trees)forestTree(d,x,z,forestSurfaceY(x,z),true);

   // 苔の絨毯とシダ、キノコ。道と木の幹の周囲には置かない。
   const mossCarpets=[[27,-17],[31,-10],[34,17],[39,9],[45,-17],[48,12],[55,17],[58,8],[63,-17],[67,17],[69,8]];
   for(const [x,z] of mossCarpets){
     if(Math.abs(z-forestPathZ(x))>4){
       const top=forestSurfaceY(x,z);
       if(d.getBlock({x,y:top,z})?.typeId!=='minecraft:moss_block')forestSet(d,x,top,z,'minecraft:moss_block');
       forestSet(d,x,top+1,z,'minecraft:moss_carpet');
     }
   }
   const ferns=[[30,-12],[33,15],[40,-16],[47,16],[54,-14],[59,16],[66,-15]];
   for(const [x,z] of ferns){
     if(Math.abs(z-forestPathZ(x))>4)forestSet(d,x,forestSurfaceY(x,z)+1,z,'minecraft:fern');
   }
   const mushrooms=[
     [32,-16,'minecraft:brown_mushroom'],[38,16,'minecraft:red_mushroom'],
     [46,-16,'minecraft:brown_mushroom'],[56,16,'minecraft:brown_mushroom'],
     [64,-16,'minecraft:red_mushroom'],[68,17,'minecraft:brown_mushroom']
   ];
   for(const [x,z,type] of mushrooms){
     if(Math.abs(z-forestPathZ(x))>4)forestSet(d,x,forestSurfaceY(x,z)+1,z,type);
   }

   // 胞子の花を木の枝の下に配置。既存の森粒子と合わせて、森らしい漂う演出を加える。
   for(const [x,z] of [[36,13],[61,-13]]){
     const y=forestSurfaceY(x,z);
     forestSet(d,x+1,y+6,z,'minecraft:spruce_log');
     forestSet(d,x+1,y+5,z,'minecraft:spore_blossom');
   }
   // 地面に埋めた光源を苔カーペットで覆い、夜でも道端が淡く見えるようにする。
   for(const [x,z] of [[34,-8],[50,9],[66,-8]]){
     const y=forestSurfaceY(x,z);
     if(Math.abs(z-forestPathZ(x))>4){
       forestSet(d,x,y,z,'minecraft:shroomlight');
       forestSet(d,x,y+1,z,'minecraft:moss_carpet');
     }
   }

   await ensureForestLandmarks(d);
   property(world,forestTerrainKey,1);
   return true;
 });
 forestTerrainTask=task;
 try{return await task;}catch(err){forestTerrainRetryAt=system.currentTick+200;throw err;}finally{forestTerrainTask=undefined;}
}

// --- 非戦闘地形：砂の回廊〜石門の迷宮の接続区間 ---
const desertTerrainKey='desert_terrain_v1';
const desertTerrainSkippedKey='desert_terrain_skipped_v1';
let desertTerrainTask;
let desertTerrainRetryAt=0;
function desertPathZ(x){
 // 両端はZ=0へ接続。中央部だけ緩やかに風紋のように蛇行する。
 return Math.round(.9*Math.sin((x-23)/50*Math.PI*2));
}
function desertSurfaceY(x,z){
 if(x<26||x>70||Math.abs(z-desertPathZ(x))<=3)return 88;
 const duneA=4*Math.max(0,1-Math.hypot((x-35)/12,(z+12)/8));
 const duneB=3*Math.max(0,1-Math.hypot((x-61)/11,(z-12)/8));
 const duneC=2*Math.max(0,1-Math.hypot((x-49)/8,(z+15)/6));
 const wind=.22*Math.sin(x*.27+z*.23)+.16*Math.cos(z*.39-x*.12);
 return 88+Math.min(4,Math.max(0,Math.round(Math.max(duneA,duneB,duneC)+wind)));
}
function desertSet(d,x,y,z,type){
 const block=d.getBlock({x,y,z});
 if(!block)throw new Error(`砂漠地形ブロックを取得できない: ${x},${y},${z}`);
 d.setBlockType({x,y,z},type);
}
function desertPalm(d,x,z,surfaceY){
 const leaves=BlockPermutation.resolve('minecraft:jungle_leaves',{persistent_bit:true,update_bit:false});
 for(let y=1;y<=5;y++)desertSet(d,x,surfaceY+y,z,'minecraft:stripped_jungle_log');
 // 平たい葉冠を放射状に広げ、砂漠のオアシスらしいシルエットにする。
 for(const [dx,dz,dy] of [[-3,0,5],[3,0,5],[0,-3,5],[0,3,5],[-2,-2,5],[2,-2,5],[-2,2,5],[2,2,5],[-2,0,6],[2,0,6],[0,-2,6],[0,2,6]]){
   d.setBlockPermutation({x:x+dx,y:surfaceY+dy,z:z+dz},leaves);
 }
 for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]])
   d.setBlockPermutation({x:x+dx,y:surfaceY+5,z:z+dz},leaves);
}

const desertLandmarkKey='desert_landmarks_v1';
const desertLandmarkSkippedKey='desert_landmarks_skipped_v1';
const desertLandmarkAllowed=new Set(['minecraft:air','minecraft:stone','minecraft:sand','minecraft:red_sand','minecraft:sandstone','minecraft:cut_sandstone','minecraft:chiseled_sandstone','hakkai:windworn_sandstone','hakkai:red_dune_stone']);
async function ensureDesertLandmarks(d){
 if(num(world,desertLandmarkKey)||num(world,desertLandmarkSkippedKey))return;
 // 既存の石柱・石門・オアシス・植物から離れた小区画だけを確認する。
 if(!landmarkAreaIsNatural(d,{x:26,y:88,z:14},{x:31,y:98,z:19},desertLandmarkAllowed)){
   property(world,desertLandmarkSkippedKey,1);report('砂の回廊ランドマーク','設置予定区画に既存建築または想定外ブロックがあるため追加を見送りました');return;
 }
 const pillars=[[27,15],[30,15],[27,18],[30,18]];
 const tops=pillars.map(([x,z])=>desertSurfaceY(x,z));
 const beamY=Math.max(...tops)+5;
 // 砂岩の低い基壇。地形の起伏に合わせて各列の表面に置く。
 for(let x=27;x<=30;x++)for(let z=15;z<=18;z++){
   if(x===27||x===30||z===15||z===18){const y=desertSurfaceY(x,z);desertSet(d,x,y+1,z,'minecraft:cut_sandstone');}
 }
 // 風紋を刻んだ赤砂岩の四柱と、上部をつなぐ石梁。
 for(let i=0;i<pillars.length;i++){
   const [x,z]=pillars[i],baseY=tops[i];
   for(let y=baseY+2;y<beamY;y++)desertSet(d,x,y,z,(y%2===0)?'hakkai:red_dune_stone':'hakkai:windworn_sandstone');
   desertSet(d,x,beamY,z,'hakkai:windworn_sandstone');
 }
 for(let x=27;x<=30;x++)for(const z of [15,18])desertSet(d,x,beamY,z,'minecraft:chiseled_sandstone');
 for(let z=16;z<=17;z++)for(const x of [27,30])desertSet(d,x,beamY,z,'hakkai:windworn_sandstone');
 // 中央の風見石と、視認しやすい控えめな光源。
 const cx=28,cz=16,cy=desertSurfaceY(cx,cz);
 desertSet(d,cx,cy+1,cz,'hakkai:windworn_sandstone');
 desertSet(d,cx,cy+2,cz,'hakkai:red_dune_stone');
 desertSet(d,cx,cy+3,cz,'minecraft:glowstone');
 desertSet(d,cx,cy+4,cz,'hakkai:windworn_sandstone');
 property(world,desertLandmarkKey,1);
}

async function buildDesertTerrain(){
 if(num(world,desertTerrainKey)){
   const d=world.getDimension(dimID(2));
   return loaded(d,{x:26,y:88,z:14},{x:31,y:98,z:19},async()=>{await ensureDesertLandmarks(d);return true;});
 }
 if(num(world,desertTerrainSkippedKey))return false;
 if(system.currentTick<desertTerrainRetryAt)return false;
 if(desertTerrainTask)return desertTerrainTask;
 const d=world.getDimension(dimID(2));
 const from={x:23,y:76,z:-22},to={x:73,y:98,z:22};
 const task=loaded(d,from,to,async()=>{
   if(num(world,desertTerrainKey))return true;
   if(!num(world,'built_3')||!num(world,'built_11'))return false;
   // 二つの拠点の予約範囲外だけを使用。既存ブロックがあれば絶対に上書きしない。
   if(d.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']})){
     property(world,desertTerrainSkippedKey,1);
     report('砂の回廊地形','接続区画に既存ブロックがあるため、上書きを避けて生成を中止しました');
     return false;
   }
   // 51×45の接続帯。地下は石、表層は砂にして、砂丘の下に空洞を作らない。
   d.fillBlocks(new BlockVolume({x:23,y:76,z:-22},{x:73,y:85,z:22}),'minecraft:stone');
   d.fillBlocks(new BlockVolume({x:23,y:86,z:-22},{x:73,y:87,z:22}),'minecraft:sandstone');
   d.fillBlocks(new BlockVolume({x:23,y:88,z:-22},{x:73,y:88,z:22}),'minecraft:sand');

   // 砂丘は最大4ブロック。砂が空中に残らないよう、基礎から連続して積む。
   for(let x=26;x<=70;x++)for(let z=-19;z<=19;z++){
     const top=desertSurfaceY(x,z);
     for(let y=89;y<=top;y++)desertSet(d,x,y,z,'minecraft:sand');
     if(Math.abs(z-desertPathZ(x))>3){
       const seed=Math.abs(x*19+z*31)%29;
       if(seed===0||seed===1)desertSet(d,x,top,z,'minecraft:red_sand');
       else if(seed===7)desertSet(d,x,top,z,'minecraft:sandstone');
     }
   }

   // 風で磨かれた石の小径。高さをY=88に固定して両拠点の到着床へ接続。
   for(let x=23;x<=73;x++){
     const center=desertPathZ(x);
     for(let dz=-1;dz<=1;dz++){
       const z=center+dz;
       desertSet(d,x,88,z,dz===0?'hakkai:windworn_sandstone':'minecraft:sandstone');
     }
   }
   // 道端の赤砂岩と砂利の風紋。
   for(const [x,z] of [[29,-5],[34,7],[40,-7],[48,8],[55,-6],[63,7],[69,-5]]){
     if(Math.abs(z-desertPathZ(x))>3){
       const top=desertSurfaceY(x,z);
       desertSet(d,x,top,z,(x+z)%2===0?'hakkai:red_dune_stone':'minecraft:cut_sandstone');
     }
   }

   // 風化した石柱の遺構。通路から離し、道幅には一切はみ出さない。
   const monoliths=[[33,-15],[39,-15],[65,15],[68,15]];
   for(const [x,z] of monoliths){
     const y=desertSurfaceY(x,z);
     const height=2+Math.abs(x*7+z*11)%3;
     for(let dy=1;dy<=height;dy++)desertSet(d,x,y+dy,z,dy===height?'hakkai:windworn_sandstone':'hakkai:red_dune_stone');
     if(height>=4)desertSet(d,x+1,y+height-1,z,'minecraft:chiseled_sandstone');
   }
   // 半ば砂に埋もれた石門の断片。両端の柱と上部の梁で遺跡の存在感を出す。
   const lintelY=Math.max(desertSurfaceY(44,-14),desertSurfaceY(45,-14),desertSurfaceY(46,-14),desertSurfaceY(47,-14),desertSurfaceY(48,-14))+4;
   for(const x of [44,48]){
     const y=desertSurfaceY(x,-14);
     for(let py=y+1;py<lintelY;py++)desertSet(d,x,py,-14,'hakkai:windworn_sandstone');
   }
   for(let x=44;x<=48;x++)desertSet(d,x,lintelY,-14,x===46?'minecraft:chiseled_sandstone':'hakkai:windworn_sandstone');

   // 小さなオアシス。周囲を同じ高さの固体ブロックで囲み、水の流出を抑える。
   const poolX=58,poolZ=-12;
   for(let x=poolX-2;x<=poolX+2;x++)for(let z=poolZ-2;z<=poolZ+2;z++){
     const edge=x===poolX-2||x===poolX+2||z===poolZ-2||z===poolZ+2;
     if(edge){
       desertSet(d,x,87,z,'hakkai:windworn_sandstone');
       desertSet(d,x,88,z,'hakkai:red_dune_stone');
     }else{
       desertSet(d,x,87,z,'minecraft:sandstone');
       desertSet(d,x,88,z,'minecraft:water');
     }
   }
   // オアシスの周囲にヤシ風の木と乾燥地の草木を配置。
   for(const [x,z] of [[54,-8],[62,-16]])desertPalm(d,x,z,desertSurfaceY(x,z));
   const dryPlants=[
     [30,-10,'minecraft:dead_bush'],[36,16,'minecraft:dead_bush'],[42,-18,'minecraft:dead_bush'],
     [50,17,'minecraft:dead_bush'],[64,-8,'minecraft:dead_bush'],[69,17,'minecraft:dead_bush'],
     [31,12,'minecraft:cactus'],[67,-16,'minecraft:cactus']
   ];
   for(const [x,z,type] of dryPlants){
     if(Math.abs(z-desertPathZ(x))>4){
       const y=desertSurfaceY(x,z);
       desertSet(d,x,y+1,z,type);
       if(type==='minecraft:cactus')desertSet(d,x,y+2,z,type);
     }
   }
   // 砂岩の低い灯り。夜間の道しるべとして、光源を石の縁に組み込む。
   for(const [x,z] of [[35,5],[51,-7],[70,5]]){
     if(Math.abs(z-desertPathZ(x))>3){
       const y=desertSurfaceY(x,z);
       desertSet(d,x,y,z,'minecraft:glowstone');
       desertSet(d,x,y+1,z,'minecraft:cut_sandstone');
     }
   }

   await ensureDesertLandmarks(d);
   property(world,desertTerrainKey,1);
   return true;
 });
 desertTerrainTask=task;
 try{return await task;}catch(err){desertTerrainRetryAt=system.currentTick+200;throw err;}finally{desertTerrainTask=undefined;}
}
// --- 非戦闘地形：氷の鏡湖〜静寂の鏡湖の接続区間 ---
const iceTerrainKey='ice_terrain_v1';
const iceTerrainSkippedKey='ice_terrain_skipped_v1';
let iceTerrainTask;
let iceTerrainRetryAt=0;
function icePathZ(x){
 // 湖へ向かう道。入口と出口はZ=0にそろえ、中央だけわずかに曲げる。
 return Math.round(.55*Math.sin((x-23)/50*Math.PI*2));
}
function iceLakeShape(x,z){
 const dx=(x-50)/9.2,dz=(z-10)/6.4;
 return dx*dx+dz*dz;
}
function iceSurfaceY(x,z){
 if(x<26||x>70||Math.abs(z-icePathZ(x))<=3||iceLakeShape(x,z)<=1.12)return 88;
 const ridgeA=2*Math.max(0,1-Math.hypot((x-34)/9,(z+13)/7));
 const ridgeB=2*Math.max(0,1-Math.hypot((x-66)/9,(z-14)/7));
 const ridgeC=1*Math.max(0,1-Math.hypot((x-44)/7,(z+17)/5));
 const soft=.16*Math.sin(x*.29+z*.17)+.13*Math.cos(z*.35-x*.12);
 return 88+Math.min(2,Math.max(0,Math.round(Math.max(ridgeA,ridgeB,ridgeC)+soft)));
}
function iceSet(d,x,y,z,type){
 const block=d.getBlock({x,y,z});
 if(!block)throw new Error(`氷原地形ブロックを取得できない: ${x},${y},${z}`);
 d.setBlockType({x,y,z},type);
}
function icePine(d,x,z,surfaceY){
 const leaves=BlockPermutation.resolve('minecraft:spruce_leaves',{persistent_bit:true,update_bit:false});
 for(let y=1;y<=6;y++)iceSet(d,x,surfaceY+y,z,'minecraft:spruce_log');
 for(const dy of [3,4,5,6]){
   const radius=dy===3?3:dy===4?3:dy===5?2:1;
   for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
     if(dx*dx+dz*dz>radius*radius+1||dx===0&&dz===0)continue;
     d.setBlockPermutation({x:x+dx,y:surfaceY+dy,z:z+dz},leaves);
   }
 }
 // 雪をまとった針葉樹の上部に、専用の氷晶を少量だけ混ぜる。
 iceSet(d,x,surfaceY+7,z,'hakkai:frost_crystal');
}

const iceLandmarkKey='ice_landmarks_v1';
const iceLandmarkSkippedKey='ice_landmarks_skipped_v1';
const iceLandmarkAllowed=new Set(['minecraft:air','minecraft:stone','minecraft:packed_ice','minecraft:snow_block','minecraft:ice','minecraft:blue_ice','minecraft:clay','minecraft:water','hakkai:mirror_ice','hakkai:frost_stone']);
async function ensureIceLandmarks(d){
 if(num(world,iceLandmarkKey)||num(world,iceLandmarkSkippedKey))return;
 // 湖面・雪道・既存の針葉樹・氷晶群に重ならない小区画を検査。
 if(!landmarkAreaIsNatural(d,{x:26,y:88,z:8},{x:32,y:98,z:14},iceLandmarkAllowed)){
   property(world,iceLandmarkSkippedKey,1);report('氷の鏡湖ランドマーク','設置予定区画に既存建築または想定外ブロックがあるため追加を見送りました');return;
 }
 const cx=29,cz=11,baseY=iceSurfaceY(cx,cz);
 // 雪道へはみ出さない3×3の氷晶観測台。
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)iceSet(d,cx+dx,baseY+1,cz+dz,'minecraft:packed_ice');
 iceSet(d,cx,baseY+2,cz,'hakkai:frost_stone');
 // 四隅の結晶柱と、鏡氷のアーチ。
 const posts=[[-2,-2],[2,-2],[-2,2],[2,2]];
 for(const [dx,dz] of posts){
   const x=cx+dx,z=cz+dz,y=iceSurfaceY(x,z);
   iceSet(d,x,y+1,z,'hakkai:frost_stone');
   iceSet(d,x,y+2,z,'minecraft:blue_ice');
   iceSet(d,x,y+3,z,'hakkai:frost_crystal');
 }
 for(let dx=-2;dx<=2;dx++){
   iceSet(d,cx+dx,baseY+4,cz-2,'hakkai:mirror_ice');
   iceSet(d,cx+dx,baseY+4,cz+2,'hakkai:mirror_ice');
 }
 // 両脇の低い照明は雪面から少しだけ立ち上げ、結晶の輪郭を見せる。
 for(const [dx,dz] of [[-1,0],[1,0]]){
   iceSet(d,cx+dx,baseY+2,cz,'minecraft:sea_lantern');
   iceSet(d,cx+dx,baseY+3,cz,'hakkai:mirror_ice');
 }
 property(world,iceLandmarkKey,1);
}

async function buildIceTerrain(){
 if(num(world,iceTerrainKey)){
   const d=world.getDimension(dimID(3));
   return loaded(d,{x:26,y:88,z:8},{x:32,y:98,z:14},async()=>{await ensureIceLandmarks(d);return true;});
 }
 if(num(world,iceTerrainSkippedKey))return false;
 if(system.currentTick<iceTerrainRetryAt)return false;
 if(iceTerrainTask)return iceTerrainTask;
 const d=world.getDimension(dimID(3));
 const from={x:23,y:76,z:-22},to={x:73,y:98,z:22};
 const task=loaded(d,from,to,async()=>{
   if(num(world,iceTerrainKey))return true;
   if(!num(world,'built_4')||!num(world,'built_12'))return false;
   // 既存拠点の予約区画には触れない。接続区画に空気以外があれば全生成を中止。
   if(d.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']})){
     property(world,iceTerrainSkippedKey,1);
     report('氷の鏡湖地形','接続区画に既存ブロックがあるため、上書きを避けて生成を中止しました');
     return false;
   }
   // 51×45の接続帯だけに、石の地盤と氷雪の表層を作る。
   d.fillBlocks(new BlockVolume({x:23,y:76,z:-22},{x:73,y:84,z:22}),'minecraft:stone');
   d.fillBlocks(new BlockVolume({x:23,y:85,z:-22},{x:73,y:87,z:22}),'minecraft:packed_ice');
   d.fillBlocks(new BlockVolume({x:23,y:88,z:-22},{x:73,y:88,z:22}),'minecraft:snow_block');

   // 湖を避けた場所に低い雪嶺をつくり、地面を段差2ブロック以内に抑える。
   for(let x=26;x<=70;x++)for(let z=-19;z<=19;z++){
     if(iceLakeShape(x,z)<=1.12)continue;
     const top=iceSurfaceY(x,z);
     if(top>88){
       for(let y=88;y<top;y++)iceSet(d,x,y,z,'minecraft:packed_ice');
       iceSet(d,x,top,z,((x*11+z*17)%7===0)?'hakkai:frost_stone':'minecraft:snow_block');
     }else if(Math.abs(z-icePathZ(x))>3){
       const n=Math.abs(x*23+z*19)%37;
       if(n===0||n===1)iceSet(d,x,88,z,'hakkai:frost_stone');
       else if(n===5)iceSet(d,x,88,z,'minecraft:blue_ice');
     }
   }

   // 凍った鏡湖。湖底は固体、Y=87に水、Y=88に氷を置いて水の流出を防ぐ。
   for(let x=40;x<=60;x++)for(let z=3;z<=17;z++){
     const shape=iceLakeShape(x,z);
     if(shape>1)continue;
     iceSet(d,x,86,z,'minecraft:clay');
     iceSet(d,x,87,z,'minecraft:water');
     const pattern=Math.abs(x*7+z*13)%13;
     const top=pattern===0?'hakkai:mirror_ice':pattern<=2?'minecraft:blue_ice':pattern<=5?'minecraft:packed_ice':'minecraft:ice';
     iceSet(d,x,88,z,top);
   }
   // 湖岸の氷縁。雪と氷晶の模様をつなぎ、輪郭を自然な形に見せる。
   for(let x=39;x<=61;x++)for(let z=2;z<=18;z++){
     const shape=iceLakeShape(x,z);
     if(shape>1&&shape<=1.28){
       const type=(Math.abs(x*5+z*11)%4===0)?'hakkai:frost_stone':'minecraft:packed_ice';
       iceSet(d,x,88,z,type);
     }
   }

   // 入口から出口までつながる雪道。中央は滑りにくい石、両脇に薄い氷の縁取り。
   for(let x=23;x<=73;x++){
     const center=icePathZ(x);
     for(let dz=-1;dz<=1;dz++){
       const z=center+dz;
       iceSet(d,x,88,z,dz===0?'minecraft:polished_diorite':'minecraft:snow_block');
     }
     for(const dz of [-2,2])iceSet(d,x,88,center+dz,'hakkai:mirror_ice');
   }

   // 湖から離した針葉樹の小群。葉は永続状態にして自然消滅を防ぐ。
   const pines=[[29,-14],[36,14],[43,-14],[64,-14],[68,14]];
   for(const [x,z] of pines){
     if(iceLakeShape(x,z)>1.35&&Math.abs(z-icePathZ(x))>5)icePine(d,x,z,iceSurfaceY(x,z));
   }

   // 湖岸の氷晶群。専用ブロックで青白い光を作り、道と湖面には置かない。
   const crystals=[[36,8,2],[40,17,1],[59,7,2],[64,12,1],[33,-6,2],[57,-15,1],[69,-7,1]];
   for(const [x,z,height] of crystals){
     if(iceLakeShape(x,z)>1.3&&Math.abs(z-icePathZ(x))>4){
       const y=iceSurfaceY(x,z);
       iceSet(d,x,y,z,'hakkai:frost_stone');
       for(let dy=1;dy<=height;dy++)iceSet(d,x,y+dy,z,'hakkai:frost_crystal');
     }
   }

   // 透明感のある氷柱と、湖畔の光る足元。いずれも歩道の外側に限定。
   for(const [x,z] of [[34,5],[62,5],[44,-9],[67,-11]]){
     if(Math.abs(z-icePathZ(x))>4&&iceLakeShape(x,z)>1.3){
       const y=iceSurfaceY(x,z);
       iceSet(d,x,y,z,'minecraft:sea_lantern');
       iceSet(d,x,y+1,z,'hakkai:mirror_ice');
     }
   }

   await ensureIceLandmarks(d);
   property(world,iceTerrainKey,1);
   return true;
 });
 iceTerrainTask=task;
 try{return await task;}catch(err){iceTerrainRetryAt=system.currentTick+200;throw err;}finally{iceTerrainTask=undefined;}
}
// --- 氷の鏡湖地形ここまで ---

// --- 非戦闘地形：雷の断崖〜火床の鍛冶場の接続区間 ---
const cliffTerrainKey='cliff_terrain_v1';
const cliffTerrainSkippedKey='cliff_terrain_skipped_v1';
let cliffTerrainTask;
let cliffTerrainRetryAt=0;
function cliffPathZ(x){
 // 両拠点の入口はZ=0。道は緩やかに蛇行させ、岩棚とぶつからないよう中央を保つ。
 return Math.round(.65*Math.sin((x-23)/50*Math.PI*2));
}
function cliffSurfaceY(x,z){
 if(x<26||x>70||Math.abs(z-cliffPathZ(x))<=3)return 88;
 const westShelf=4*Math.max(0,1-Math.hypot((x-35)/12,(z+13)/9));
 const eastShelf=4*Math.max(0,1-Math.hypot((x-63)/12,(z-13)/9));
 const northRidge=3*Math.max(0,1-Math.hypot((x-49)/9,(z+15)/7));
 const weather=.18*Math.sin(x*.31+z*.17)+.14*Math.cos(z*.37-x*.11);
 return 88+Math.min(4,Math.max(0,Math.round(Math.max(westShelf,eastShelf,northRidge)+weather)));
}
function cliffSet(d,x,y,z,type){
 const block=d.getBlock({x,y,z});
 if(!block)throw new Error(`断崖地形ブロックを取得できない: ${x},${y},${z}`);
 d.setBlockType({x,y,z},type);
}
function cliffRockColumn(d,x,z,baseY,height,accent=true){
 for(let dy=1;dy<=height;dy++){
   const type=dy===height?'hakkai:thunderstone':dy%3===0?'minecraft:tuff':'hakkai:copper_slate';
   cliffSet(d,x,baseY+dy,z,type);
 }
 if(accent&&height>=3)cliffSet(d,x+1,baseY+height-1,z,'minecraft:cut_copper');
}
async function buildCliffTerrain(){
 if(num(world,cliffTerrainKey))return true;
 if(num(world,cliffTerrainSkippedKey))return false;
 if(system.currentTick<cliffTerrainRetryAt)return false;
 if(cliffTerrainTask)return cliffTerrainTask;
 const d=world.getDimension(dimID(4));
 const from={x:23,y:76,z:-22},to={x:73,y:98,z:22};
 const task=loaded(d,from,to,async()=>{
   if(num(world,cliffTerrainKey))return true;
   if(!num(world,'built_5')||!num(world,'built_13'))return false;
   // 接続区画に既存ブロックがあれば生成を中止し、プレイヤー建築を保護する。
   if(d.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']})){
     property(world,cliffTerrainSkippedKey,1);
     report('雷の断崖地形','接続区画に既存ブロックがあるため、上書きを避けて生成を中止しました');
     return false;
   }
   // 51×45の範囲を連続した岩盤で満たす。外周側は触らず、地盤の空洞を作らない。
   d.fillBlocks(new BlockVolume({x:23,y:76,z:-22},{x:73,y:84,z:22}),'minecraft:stone');
   d.fillBlocks(new BlockVolume({x:23,y:85,z:-22},{x:73,y:87,z:22}),'minecraft:tuff');
   d.fillBlocks(new BlockVolume({x:23,y:88,z:-22},{x:73,y:88,z:22}),'hakkai:thunderstone');

   // 高さ4ブロック以内の岩棚。急な深い穴を作らず、上面も連続した歩行可能な地形にする。
   for(let x=26;x<=70;x++)for(let z=-19;z<=19;z++){
     const top=cliffSurfaceY(x,z);
     for(let y=89;y<=top;y++){
       const layer=y===top?'hakkai:thunderstone':(y%2===0?'minecraft:tuff':'minecraft:andesite');
       cliffSet(d,x,y,z,layer);
     }
     if(Math.abs(z-cliffPathZ(x))>4){
       const vein=Math.abs(x*17+z*29)%41;
       if(vein===0||vein===1)cliffSet(d,x,top,z,'hakkai:copper_slate');
       else if(vein===8)cliffSet(d,x,top,z,'minecraft:cut_copper');
     }
   }

   // 入口から出口まで途切れない石の遊歩道。中央を3ブロック幅にし、外側は低い手すりで示す。
   for(let x=23;x<=73;x++){
     const center=cliffPathZ(x);
     for(let dz=-1;dz<=1;dz++)cliffSet(d,x,88,center+dz,dz===0?'minecraft:polished_andesite':'minecraft:andesite');
     for(const dz of [-2,2]){
       cliffSet(d,x,88,center+dz,'minecraft:stone');
       if(x%3===0)cliffSet(d,x,89,center+dz,'minecraft:stone_brick_wall');
     }
     if(x%8===0)cliffSet(d,x,88,center,'hakkai:copper_slate');
   }

   // 風化した岩柱と銅の鉱脈。道の外側に限定し、枝や張り出しを通路へ出さない。
   const pillars=[[30,-15,4],[38,14,3],[63,-14,4],[69,14,3],[47,-17,2]];
   for(const [x,z,height] of pillars){
     if(Math.abs(z-cliffPathZ(x))>5){
       const y=cliffSurfaceY(x,z);
       cliffRockColumn(d,x,z,y,height,true);
     }
   }
   const copperVeins=[[28,-8],[42,17],[56,-16],[68,7],[34,8],[60,18]];
   for(const [x,z] of copperVeins){
     if(Math.abs(z-cliffPathZ(x))>4){
       const y=cliffSurfaceY(x,z);
       cliffSet(d,x,y,z,'hakkai:copper_slate');
       if((x+z)%2===0)cliffSet(d,x,y+1,z,'minecraft:cut_copper');
     }
   }

   // 小さな観測台。地面と同じ高さの石床にし、周囲に低い壁を置いて落下しにくくする。
   const deckX=45,deckZ=-13;
   let deckY=88;
   for(let x=deckX-2;x<=deckX+2;x++)for(let z=deckZ-2;z<=deckZ+2;z++)deckY=Math.max(deckY,cliffSurfaceY(x,z));
   for(let x=deckX-2;x<=deckX+2;x++)for(let z=deckZ-2;z<=deckZ+2;z++){
     const ground=cliffSurfaceY(x,z);
     for(let y=ground+1;y<deckY;y++)cliffSet(d,x,y,z,'minecraft:tuff');
     cliffSet(d,x,deckY,z,'minecraft:polished_andesite');
   }
   // 展望台から本道まで、地形の高さに沿った短い石の連絡路をつなぐ。
   for(let z=deckZ+3;z<=-4;z++){
     const y=cliffSurfaceY(deckX,z);
     cliffSet(d,deckX,y,z,'minecraft:polished_andesite');
   }
   for(let x=deckX-2;x<=deckX+2;x++)for(const z of [deckZ-2,deckZ+2])cliffSet(d,x,deckY+1,z,'minecraft:stone_brick_wall');
   for(let z=deckZ-1;z<=deckZ+1;z++)for(const x of [deckX-2,deckX+2])cliffSet(d,x,deckY+1,z,'minecraft:stone_brick_wall');
   // 中央に銅の観測標識。避雷・落雷を発生させない純粋な装飾。
   cliffSet(d,deckX,deckY+1,deckZ,'minecraft:copper_block');
   cliffSet(d,deckX,deckY+2,deckZ,'hakkai:storm_crystal');

   // 滝と滝壺。石の底面・側壁・外周壁で囲い、遊歩道側へ水が出ない小さな水路にする。
   const fx=63,fz=16;
   // 滝の縦水路と滝壺内部を掘り、深さ1ブロックの水面を作る。
   for(let y=88;y<=91;y++)cliffSet(d,fx,y,fz,'minecraft:air');
   for(let x=fx-1;x<=fx+1;x++)for(let z=fz;z<=fz+3;z++)cliffSet(d,x,86,z,'minecraft:stone');
   for(let x=fx-1;x<=fx+1;x++)for(let z=fz+1;z<=fz+3;z++)
     for(let y=88;y<=92;y++)cliffSet(d,x,y,z,'minecraft:air');
   // 水路の側壁・背面・滝壺の縁を上まで積み、流出経路を閉じる。
   for(let y=87;y<=92;y++){
     // 落水路はx=63の幅1。左右の壁だけで縦方向の水を導く。
     cliffSet(d,fx-1,y,fz,'hakkai:thunderstone');
     cliffSet(d,fx+1,y,fz,'hakkai:thunderstone');
     cliffSet(d,fx,y,fz-1,'hakkai:copper_slate');
     // 滝壺はx=62..64 / z=17..19。外側の壁を水面より高くする。
     for(let z=fz+1;z<=fz+3;z++){
       cliffSet(d,fx-2,y,z,'hakkai:thunderstone');
       cliffSet(d,fx+2,y,z,'hakkai:thunderstone');
     }
     for(let x=fx-1;x<=fx+1;x++)cliffSet(d,x,y,fz+4,'hakkai:thunderstone');
   }
   // 滝壺の底面と水面。水は x=62..64 / z=17..19 に閉じ込める。
   for(let x=fx-1;x<=fx+1;x++)for(let z=fz+1;z<=fz+3;z++){
     cliffSet(d,x,86,z,'minecraft:stone');
     cliffSet(d,x,87,z,'minecraft:water');
   }
   // 上部の水源は縦に落ち、下部の水面へつながる。雷やダメージは発生しない。 
   cliffSet(d,fx,92,fz,'minecraft:water');
   cliffSet(d,fx,87,fz,'minecraft:water');

   // 低い光る鉱晶。歩道や滝壺の縁を塞がないよう、岩棚の上に点在させる。
   const crystals=[[33,-16,2],[40,17,1],[59,-15,2],[68,10,1],[36,7,1],[55,18,2]];
   for(const [x,z,height] of crystals){
     if(Math.abs(z-cliffPathZ(x))>5){
       const y=cliffSurfaceY(x,z);
       cliffSet(d,x,y,z,'hakkai:copper_slate');
       for(let dy=1;dy<=height;dy++)cliffSet(d,x,y+dy,z,'hakkai:storm_crystal');
     }
   }

   property(world,cliffTerrainKey,1);
   return true;
 });
 cliffTerrainTask=task;
 try{return await task;}catch(err){cliffTerrainRetryAt=system.currentTick+200;throw err;}finally{cliffTerrainTask=undefined;}
}
// --- 雷の断崖地形ここまで ---

// --- 非戦闘地形：闇の地下庭園〜月影の庭園の接続区間 ---
const caveTerrainKey='cave_terrain_v1';
const caveTerrainSkippedKey='cave_terrain_skipped_v1';
let caveTerrainTask;
let caveTerrainRetryAt=0;
function cavePathZ(x){
 // 両端の入口はZ=0。洞窟の中心部だけ、ほとんど気づかない程度に曲げる。
 return Math.round(.45*Math.sin((x-23)/50*Math.PI*2));
}
function caveSurfaceY(x,z){
 if(x<26||x>70||Math.abs(z-cavePathZ(x))<=3)return 88;
 const mossRise=2*Math.max(0,1-Math.hypot((x-35)/9,(z+12)/7));
 const crystalRise=2*Math.max(0,1-Math.hypot((x-61)/9,(z-13)/7));
 const soft=.12*Math.sin(x*.27+z*.18)+.1*Math.cos(z*.31-x*.1);
 return 88+Math.min(2,Math.max(0,Math.round(Math.max(mossRise,crystalRise)+soft)));
}
function caveSet(d,x,y,z,type){
 const block=d.getBlock({x,y,z});
 if(!block)throw new Error(`地下庭園ブロックを取得できない: ${x},${y},${z}`);
 d.setBlockType({x,y,z},type);
}
function caveCrystal(d,x,z,baseY,height=2){
 caveSet(d,x,baseY,z,'hakkai:abyssal_stone');
 for(let dy=1;dy<=height;dy++)caveSet(d,x,baseY+dy,z,'hakkai:moonstone');
 if(height>=2)caveSet(d,x+1,baseY+1,z,'hakkai:glow_moss');
}
async function buildCaveTerrain(){
 if(num(world,caveTerrainKey))return true;
 if(num(world,caveTerrainSkippedKey))return false;
 if(system.currentTick<caveTerrainRetryAt)return false;
 if(caveTerrainTask)return caveTerrainTask;
 const d=world.getDimension(dimID(5));
 // 建物の床より下から天井の上までを事前検査し、置き忘れた既存ブロックも保護する。
 const from={x:23,y:72,z:-22},to={x:73,y:109,z:22};
 const task=loaded(d,from,to,async()=>{
   if(num(world,caveTerrainKey))return true;
   if(!num(world,'built_6')||!num(world,'built_14'))return false;
   if(d.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']})){
     property(world,caveTerrainSkippedKey,1);
     report('闇の地下庭園地形','接続区画に既存ブロックがあるため、上書きを避けて生成を中止しました');
     return false;
   }

   // 51×45の範囲だけに、空洞のない暗色の基礎床と岩の天井を作る。
   d.fillBlocks(new BlockVolume({x:23,y:72,z:-22},{x:73,y:84,z:22}),'minecraft:deepslate');
   d.fillBlocks(new BlockVolume({x:23,y:85,z:-22},{x:73,y:87,z:22}),'hakkai:abyssal_stone');
   d.fillBlocks(new BlockVolume({x:23,y:88,z:-22},{x:73,y:88,z:22}),'minecraft:moss_block');
   d.fillBlocks(new BlockVolume({x:23,y:105,z:-22},{x:73,y:107,z:22}),'minecraft:deepslate');

   // 大洞窟の側壁。両端は中央の幅7ブロックを入口として開けておく。
   for(let x=25;x<=71;x++)for(let y=89;y<=104;y++){
     caveSet(d,x,y,-22,(y%4===0)?'minecraft:deepslate_bricks':'hakkai:abyssal_stone');
     caveSet(d,x,y,22,(y%4===0)?'minecraft:deepslate_bricks':'hakkai:abyssal_stone');
   }
   for(let y=89;y<=104;y++)for(let z=-22;z<=22;z++){
     if(Math.abs(z)>3){
       caveSet(d,24,y,z,'hakkai:abyssal_stone');
       caveSet(d,72,y,z,'hakkai:abyssal_stone');
     }
   }
   // 入口の石柱と上梁。中央の通路は高さ8ブロックを確保する。
   for(const x of [25,71]){
     for(const z of [-4,4])for(let y=89;y<=97;y++)caveSet(d,x,y,z,'minecraft:deepslate_bricks');
     for(let z=-4;z<=4;z++)caveSet(d,x,98,z,'hakkai:abyssal_stone');
     for(let z of [-5,5])for(let y=89;y<=100;y++)caveSet(d,x,y,z,'hakkai:moonstone');
   }

   // 床面のゆるい岩棚。高低差は最大2ブロックに抑え、歩ける場所を広く残す。
   for(let x=26;x<=70;x++)for(let z=-19;z<=19;z++){
     const top=caveSurfaceY(x,z);
     if(top>88){
       for(let y=89;y<top;y++)caveSet(d,x,y,z,'hakkai:abyssal_stone');
       caveSet(d,x,top,z,((x+z)%5===0)?'hakkai:glow_moss':'minecraft:moss_block');
     }else if(Math.abs(z-cavePathZ(x))>4){
       const patch=Math.abs(x*19+z*23)%37;
       if(patch===0||patch===1)caveSet(d,x,88,z,'hakkai:glow_moss');
       else if(patch===8)caveSet(d,x,88,z,'minecraft:rooted_dirt');
     }
   }

   // 暗い石の遊歩道。中央1列は磨いた深層岩、両脇は苔むした石で縁取る。
   for(let x=23;x<=73;x++){
     const center=cavePathZ(x);
     for(let dz=-1;dz<=1;dz++){
       const z=center+dz;
       caveSet(d,x,88,z,dz===0?'minecraft:polished_deepslate':'minecraft:deepslate_bricks');
     }
     if(x%5===0){
       caveSet(d,x,89,center-2,'hakkai:glow_moss');
       caveSet(d,x,89,center+2,'hakkai:glow_moss');
     }
   }

   // 光る苔の庭。小さな発光パッチを岩棚と壁際に点在させる。
   const mossPatches=[[28,-15],[32,10],[38,-17],[42,15],[48,-14],[55,16],[63,-16],[68,11],[35,5],[59,5]];
   for(const [x,z] of mossPatches){
     if(Math.abs(z-cavePathZ(x))>4){
       const y=caveSurfaceY(x,z);
       caveSet(d,x,y,z,'hakkai:glow_moss');
       if((x+z)%2===0)caveSet(d,x,y+1,z,'minecraft:moss_carpet');
     }
   }

   // 月影色の結晶群。道の外側に限定し、通行幅を塞がない。
   const crystals=[[31,-13,2],[40,16,1],[58,-15,2],[66,13,2],[46,16,1],[61,5,1]];
   for(const [x,z,height] of crystals){
     if(Math.abs(z-cavePathZ(x))>5)caveCrystal(d,x,z,caveSurfaceY(x,z),height);
   }

   // 地底植物。天井の裏側に胞子の花、地面にシダとキノコを配置。
   for(const [x,z] of [[34,-13],[49,15],[63,-12]]){
     caveSet(d,x,104,z,'minecraft:spore_blossom');
     caveSet(d,x+1,103,z,'minecraft:hanging_roots');
     caveSet(d,x+1,102,z,'minecraft:hanging_roots');
   }
   const ferns=[[30,-11],[37,13],[45,-16],[54,15],[65,-16]];
   for(const [x,z] of ferns){
     if(Math.abs(z-cavePathZ(x))>4)caveSet(d,x,caveSurfaceY(x,z)+1,z,'minecraft:fern');
   }
   const fungi=[[33,16,'minecraft:brown_mushroom'],[43,-15,'minecraft:red_mushroom'],[56,15,'minecraft:brown_mushroom'],[67,-15,'minecraft:red_mushroom']];
   for(const [x,z,type] of fungi){
     if(Math.abs(z-cavePathZ(x))>4)caveSet(d,x,caveSurfaceY(x,z)+1,z,type);
   }

   // 天井から垂れる鍾乳石風の岩柱。入口と歩道の真上には置かない。
   const hangers=[[31,-17,2],[39,17,3],[53,-16,2],[65,16,3]];
   for(const [x,z,length] of hangers){
     if(Math.abs(z-cavePathZ(x))>5){
       for(let dy=1;dy<=length;dy++)caveSet(d,x,105-dy,z,dy===length?'minecraft:dripstone_block':'minecraft:deepslate');
     }
   }
   // 床から伸びる低い鍾乳石柱も壁際だけに置き、道の上には出さない。
   for(const [x,z,height] of [[29,17,2],[44,-17,1],[57,17,2],[68,-17,1]]){
     if(Math.abs(z-cavePathZ(x))>5){
       const y=caveSurfaceY(x,z);
       for(let dy=1;dy<=height;dy++)caveSet(d,x,y+dy,z,'minecraft:dripstone_block');
     }
   }

   // 浅い泉。底・四方・縁をすべて石で囲い、水が通路へ流れ出さない独立した水場にする。
   const pond={x1:48,x2:52,z1:8,z2:12};
   for(let x=pond.x1-1;x<=pond.x2+1;x++)for(let z=pond.z1-1;z<=pond.z2+1;z++){
     const edge=x===pond.x1-1||x===pond.x2+1||z===pond.z1-1||z===pond.z2+1;
     if(edge){
       for(let y=86;y<=89;y++)caveSet(d,x,y,z,'hakkai:abyssal_stone');
     }else{
       caveSet(d,x,86,z,'minecraft:deepslate_bricks');
       caveSet(d,x,87,z,'minecraft:water');
       caveSet(d,x,88,z,'minecraft:air');
     }
   }
   // 泉の周囲に結晶と光苔を添えて、静かな水辺の目印にする。
   caveSet(d,47,89,10,'hakkai:moonstone');
   caveSet(d,53,89,10,'hakkai:glow_moss');
   caveSet(d,50,89,7,'minecraft:moss_carpet');

   // 天井直下に控えめな胞子の花を追加し、暗い洞内に奥行きを出す。
   for(const [x,z] of [[28,8],[45,-10],[60,9],[68,-7]])caveSet(d,x,104,z,'minecraft:spore_blossom');

   property(world,caveTerrainKey,1);
   return true;
 });
 caveTerrainTask=task;
 try{return await task;}catch(err){caveTerrainRetryAt=system.currentTick+200;throw err;}finally{caveTerrainTask=undefined;}
}
// --- 闇の地下庭園地形ここまで ---

// --- ランドマーク追加：雷晶の展望モニュメント／月影の発光庭園 ---
const cliffLandmarkKey='cliff_landmarks_v1';
let cliffLandmarkTask;
const cliffLandmarkSkippedKey='cliff_landmarks_skipped_v1';
const cliffLandmarkAllowed=new Set(['minecraft:air','minecraft:stone','minecraft:tuff','minecraft:andesite','hakkai:thunderstone','hakkai:copper_slate','minecraft:cut_copper','minecraft:polished_andesite','minecraft:stone_brick_wall','minecraft:copper_block','hakkai:storm_crystal']);
async function ensureCliffLandmarks(d){
 if(num(world,cliffLandmarkKey)||num(world,cliffLandmarkSkippedKey))return;
 // 既存の観測台・滝・結晶列から離れた岩棚のみを対象にする。
 const from={x:48,y:88,z:10},to={x:54,y:98,z:16};
 if(!landmarkAreaIsNatural(d,from,to,cliffLandmarkAllowed)){
  property(world,cliffLandmarkSkippedKey,1);report('雷の断崖ランドマーク','設置区画に既存建築または想定外ブロックがあるため追加を見送りました');return;
 }
 const cx=51,cz=13,base=cliffSurfaceY(cx,cz);
 // 5×5の低い展望床。通路から離し、周囲の岩棚の高さに合わせる。
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
  const x=cx+dx,z=cz+dz,y=cliffSurfaceY(x,z);
  for(let yy=y+1;yy<=base;yy++)cliffSet(d,x,yy,z,'minecraft:tuff');
  cliffSet(d,x,base,z,'hakkai:copper_slate');
 }
 // 四隅の銅柱と中央の雷晶。落雷・ダメージを発生させない装飾構造。
 for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]]){
  for(let h=1;h<=3;h++)cliffSet(d,cx+dx,base+h,cz+dz,h===3?'minecraft:cut_copper':'hakkai:copper_slate');
  cliffSet(d,cx+dx,base+4,cz+dz,'minecraft:lantern');
 }
 cliffSet(d,cx,base+1,cz,'minecraft:copper_block');
 cliffSet(d,cx,base+2,cz,'hakkai:storm_crystal');
 cliffSet(d,cx,base+3,cz,'hakkai:storm_crystal');
 // 低い外周灯で夜間の輪郭を見せる。
 for(const [dx,dz] of [[0,-2],[0,2],[-2,0],[2,0]])cliffSet(d,cx+dx,base+1,cz+dz,'minecraft:lantern');
 property(world,cliffLandmarkKey,1);
}

const caveLandmarkKey='cave_landmarks_v1';
let caveLandmarkTask;
const caveLandmarkSkippedKey='cave_landmarks_skipped_v1';
const caveLandmarkAllowed=new Set(['minecraft:air','minecraft:stone','minecraft:deepslate','minecraft:deepslate_bricks','minecraft:moss_block','minecraft:moss_carpet','minecraft:rooted_dirt','minecraft:fern','minecraft:spore_blossom','minecraft:hanging_roots','hakkai:abyssal_stone','hakkai:glow_moss','hakkai:moonstone','minecraft:dripstone_block']);
async function ensureCaveLandmarks(d){
 if(num(world,caveLandmarkKey)||num(world,caveLandmarkSkippedKey))return;
 // 既存の泉・結晶群・遊歩道と重ならない北側の小区画を検査。
 const from={x:48,y:88,z:-19},to={x:54,y:100,z:-13};
 if(!landmarkAreaIsNatural(d,from,to,caveLandmarkAllowed)){
  property(world,caveLandmarkSkippedKey,1);report('地下庭園ランドマーク','設置区画に既存建築または想定外ブロックがあるため追加を見送りました');return;
 }
 const cx=51,cz=-16,base=caveSurfaceY(cx,cz);
 // 月影色の低い庭床。中央通路や既存の結晶群には接続しない。
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
  const x=cx+dx,z=cz+dz,y=caveSurfaceY(x,z);
  if(y<base)for(let yy=y+1;yy<=base;yy++)caveSet(d,x,yy,z,'hakkai:abyssal_stone');
  caveSet(d,x,base,z,(Math.abs(dx)===2||Math.abs(dz)===2)?'hakkai:glow_moss':'minecraft:moss_block');
 }
 // 四隅に月石の結晶を立て、中心に発光苔の意匠を置く。
 for(const [dx,dz,h] of [[-2,-2,3],[2,-2,2],[-2,2,2],[2,2,3]]){
  caveSet(d,cx+dx,base,dz+cz,'hakkai:abyssal_stone');
  for(let dy=1;dy<=h;dy++)caveSet(d,cx+dx,base+dy,cz+dz,'hakkai:moonstone');
 }
 caveSet(d,cx,base+1,cz,'hakkai:glow_moss');
 caveSet(d,cx,base+2,cz,'minecraft:sea_lantern');
 caveSet(d,cx,base+3,cz,'minecraft:moss_carpet');
 // 庭の外側に控えめな胞子の花を添える。天井や歩行空間には触れない。
 for(const [dx,dz] of [[-3,0],[3,0]])caveSet(d,cx+dx,104,cz+dz,'minecraft:spore_blossom');
 property(world,caveLandmarkKey,1);
}
// --- ランドマーク追加ここまで ---


// --- 非戦闘地形：空の浮島群〜渡り鳥の浮島の接続区間 ---
const skyTerrainKey='sky_terrain_v1';
const skyTerrainSkippedKey='sky_terrain_skipped_v1';
let skyTerrainTask;
let skyTerrainRetryAt=0;
function skyPathZ(x){return 0;}
function skyPathY(x){
 if(x<=49)return 88+Math.round((x-23)*12/26);
 return 100-Math.round((x-49)*12/24);
}
function skySet(d,x,y,z,type){
 const block=d.getBlock({x,y,z});
 if(!block)throw new Error(`浮島ブロックを取得できない: ${x},${y},${z}`);
 d.setBlockType({x,y,z},type);
}
function skyIsland(d,cx,cz,topY,rx,rz){
 // 上面は草地、下側ほど細くなる岩の島。最下層は尖りすぎない形にする。
 for(let drop=0;drop<=7;drop++){
   const scale=1-drop*.115;
   const ax=Math.max(1,Math.round(rx*scale)),az=Math.max(1,Math.round(rz*scale));
   for(let dx=-ax;dx<=ax;dx++)for(let dz=-az;dz<=az;dz++){
     if(dx*dx/(ax*ax)+dz*dz/(az*az)>1)continue;
     let type;
     if(drop===0){
       const edge=dx*dx/(rx*rx)+dz*dz/(rz*rz)>.72;
       type=edge?'minecraft:coarse_dirt':'minecraft:grass_block';
     }else if(drop===1)type='minecraft:dirt';
     else if(drop<=3)type=(Math.abs(dx+dz)%5===0)?'minecraft:calcite':'minecraft:stone';
     else type=drop>=6?'hakkai:cloudstone':'hakkai:aether_stone';
     skySet(d,cx+dx,topY-drop,cz+dz,type);
   }
 }
 // 島の下に雲の塊を添え、岩が空中に浮いている印象を作る。
 const puffs=[[-rx+1,-2,0,2], [rx-1,-3,1,2], [0,-5,-rz+1,2], [0,-4,rz-1,2]];
 for(const [ox,oy,oz,r] of puffs){
   for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
     if(dx*dx+dz*dz>r*r+1)continue;
     const px=cx+ox+dx,pz=cz+oz+dz;
     if(px<23||px>73||pz<-22||pz>22)continue;
     skySet(d,px,topY+oy,pz,'hakkai:cloudstone');
   }
 }
}
function skyTree(d,x,y,z,height=4){
 for(let dy=1;dy<=height;dy++)skySet(d,x,y+dy,z,'minecraft:oak_log');
 for(let dy=height-1;dy<=height+2;dy++){
   const radius=dy===height+2?1:2;
   for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
     if(Math.abs(dx)+Math.abs(dz)>radius+1)continue;
     if(dx===0&&dz===0&&dy<=height)continue;
     skySet(d,x+dx,y+dy,z+dz,'hakkai:canopy_0');
   }
 }
}
async function buildSkyTerrain(){
 if(num(world,skyTerrainKey))return true;
 if(num(world,skyTerrainSkippedKey))return false;
 if(system.currentTick<skyTerrainRetryAt)return false;
 if(skyTerrainTask)return skyTerrainTask;
 const d=world.getDimension(dimID(6));
 // 既存拠点の建築高も含めて接続区画を検査。空中の置き忘れブロックも保護する。
 const from={x:23,y:68,z:-22},to={x:73,y:136,z:22};
 const task=loaded(d,from,to,async()=>{
   if(num(world,skyTerrainKey))return true;
   if(!num(world,'built_7')||!num(world,'built_15'))return false;
   if(d.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']})){
     property(world,skyTerrainSkippedKey,1);
     report('空の浮島群地形','接続区画に既存ブロックがあるため、上書きを避けて生成を中止しました');
     return false;
   }

   // 浮島を3つ配置。中心島を最も高くし、両端から階段状に上がって渡れる構成。
   const islands=[
     {x:35,z:-14,y:94,rx:7,rz:7},
     {x:49,z:14,y:100,rx:8,rz:8},
     {x:62,z:-14,y:94,rx:7,rz:7}
   ];
   for(const island of islands)skyIsland(d,island.x,island.z,island.y,island.rx,island.rz);

   // 雲の小さな浮礁。主ルートから見える位置に配置し、通路の頭上は空ける。
   skyIsland(d,43,17,91,3,3);
   skyIsland(d,57,-17,91,3,3);

   // 3ブロック幅の連続した階段橋。段差は最大1ブロックで、左右に手すりを設置。
   for(let x=23;x<=73;x++){
     const y=skyPathY(x),cz=skyPathZ(x);
     for(let dz=-1;dz<=1;dz++){
       const z=cz+dz;
       const center=dz===0;
       skySet(d,x,y,z,center&&x%9===0?'minecraft:sea_lantern':center?'minecraft:quartz_bricks':'hakkai:cloudstone');
       skySet(d,x,y-1,z,'hakkai:aether_stone');
     }
     for(const side of [-2,2]){
       // 島への枝橋が接続する3か所だけ、手すりを開けて出入口にする。
       const branchOpening=(side===-2&&(x>=34&&x<=36||x>=61&&x<=63))||(side===2&&x>=48&&x<=50);
       if(branchOpening)continue;
       skySet(d,x,y+1,cz+side,'minecraft:oak_fence');
       if(x%8===0)skySet(d,x,y+2,cz+side,'minecraft:lantern');
     }
     // 5ブロックごとに橋の下面を補強する細い雲石の支柱。
     if(x%5===0&&x>25&&x<71){
       for(let py=Math.max(90,y-1-5);py<y-1;py++)skySet(d,x,py,cz,'hakkai:cloudstone');
     }
   }

   // 主橋から各浮島へ向かう幅3ブロックの枝橋。島の上面と同じ高さで接続。
   const skyBranches=[{x:35,z:-14,y:94},{x:49,z:14,y:100},{x:62,z:-14,y:94}];
   for(const branch of skyBranches){
     const step=Math.sign(branch.z);
     const start=step>0?2:-2;
     for(let z=start;step>0?z<=branch.z:z>=branch.z;z+=step){
       for(let dx=-1;dx<=1;dx++){
         skySet(d,branch.x+dx,branch.y,z,dx===0?'minecraft:quartz_bricks':'hakkai:cloudstone');
         skySet(d,branch.x+dx,branch.y-1,z,'hakkai:aether_stone');
       }
       for(const side of [-2,2])skySet(d,branch.x+side,branch.y+1,z,'minecraft:oak_fence');
       if(Math.abs(z)%6===0){
         for(let py=Math.max(88,branch.y-4);py<branch.y-1;py++)skySet(d,branch.x,py,z,'hakkai:cloudstone');
       }
     }
   }

   // 西の浮島：草花と小さな樹木。
   skyTree(d,32,94,-17,4);
   for(const [x,z,t] of [[30,-12,'minecraft:azure_bluet'],[33,-11,'minecraft:cornflower'],[37,-16,'minecraft:oxeye_daisy'],[31,-18,'minecraft:allium']])
     skySet(d,x,95,z,t);
   skySet(d,38,95,-12,'hakkai:sky_crystal');

   // 中央の主島：風を読む観測灯と結晶の輪。
   // 観測灯は主ルートから東へずらし、歩行者の頭上をふさがない。
   for(const [x,z] of [[47,18],[47,20],[54,18],[54,20]]){
     skySet(d,x,101,z,'minecraft:quartz_pillar');
     skySet(d,x,102,z,'minecraft:sea_lantern');
   }
   for(let dy=1;dy<=4;dy++)skySet(d,52,100+dy,19,'minecraft:quartz_pillar');
   skySet(d,52,105,19,'minecraft:lightning_rod');
   skySet(d,52,101,20,'hakkai:sky_crystal');
   skySet(d,51,101,18,'hakkai:sky_crystal');
   skySet(d,53,101,18,'hakkai:sky_crystal');
   for(const [x,z,t] of [[44,19,'minecraft:blue_orchid'],[55,12,'minecraft:azure_bluet'],[55,17,'minecraft:cornflower'],[45,11,'minecraft:allium']])
     skySet(d,x,101,z,t);

   // 東の浮島：白樺風の小さな林と、淡く光る結晶。
   for(let dy=1;dy<=4;dy++)skySet(d,64,94+dy,-15,'minecraft:birch_log');
   for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
     if(Math.abs(dx)+Math.abs(dz)<=3)skySet(d,64+dx,99,-15+dz,'minecraft:birch_leaves');
   }
   skySet(d,60,95,-11,'hakkai:sky_crystal');
   skySet(d,66,95,-18,'hakkai:sky_crystal');
   skySet(d,60,95,-17,'minecraft:azure_bluet');
   skySet(d,66,95,-12,'minecraft:oxeye_daisy');

   // 島の縁に垂れる雲鎖。足元と通路を塞がない外周だけに配置。
   for(const [x,z,y] of [[29,-14,93],[41,-14,93],[35,-20,93],[42,14,99],[56,14,99],[49,22,99],[56,-14,93],[68,-14,93],[62,-20,93]]){
     skySet(d,x,y,z,'minecraft:chain');
     skySet(d,x,y-1,z,'minecraft:chain');
   }
   // 下層の雲棚を点在させ、落下時にも視覚的な奥行きをつくる。
   for(const [x,y,z,r] of [[29,86,10,2],[49,88,-18,3],[68,86,8,2]]){
     for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
       if(dx*dx+dz*dz<=r*r+1)skySet(d,x+dx,y,z+dz,'hakkai:cloudstone');
     }
   }

   property(world,skyTerrainKey,1);
   return true;
 });
 skyTerrainTask=task;
 try{return await task;}catch(err){skyTerrainRetryAt=system.currentTick+200;throw err;}finally{skyTerrainTask=undefined;}
}
// --- 空の浮島群ランドマーク追加：雲上展望塔と雲花園 ---
const skyLandmarkKey='sky_landmark_v1';
const skyLandmarkSkippedKey='sky_landmark_skipped_v1';
let skyLandmarkTask;
async function ensureSkyLandmarks(d){
 if(num(world,skyLandmarkKey))return true;
 if(num(world,skyLandmarkSkippedKey))return false;
 // 既存の島上面より上だけを確認。プレイヤー建築や既存装飾があれば追加しない。
 const from={x:42,y:101,z:12},to={x:48,y:109,z:16};
 if(d.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']})){
   property(world,skyLandmarkSkippedKey,1);
   report('空の浮島群ランドマーク','展望塔・雲花園の予定区画に既存ブロックがあるため、上書きを避けて追加を見送りました');
   return false;
 }
 // 中央島の西側に、既存の観測灯・枝橋を避けた小型展望塔を追加。
 for(const [x,z] of [[46,13],[48,13],[46,15],[48,15]]){
   skySet(d,x,101,z,'hakkai:cloudstone');
   for(let y=102;y<=107;y++)skySet(d,x,y,z,'minecraft:quartz_pillar');
   skySet(d,x,108,z,'minecraft:sea_lantern');
   skySet(d,x,109,z,'hakkai:sky_crystal');
 }
 skySet(d,47,101,14,'hakkai:aether_stone');
 for(let y=102;y<=108;y++)skySet(d,47,y,14,'minecraft:quartz_pillar');
 skySet(d,47,109,14,'minecraft:lightning_rod');
 for(const [x,z] of [[47,12],[47,16],[45,14],[49,14]]){
   skySet(d,x,104,z,'hakkai:sky_crystal');
 }
 // 西端の小区画を雲花園にし、通路と中央観測灯の動線を空ける。
 for(let x=42;x<=44;x++)for(let z=12;z<=16;z++)skySet(d,x,101,z,'hakkai:cloudstone');
 for(const [x,z,t] of [[42,13,'minecraft:blue_orchid'],[44,13,'minecraft:azure_bluet'],[43,15,'minecraft:oxeye_daisy'],[42,16,'minecraft:allium']])
   skySet(d,x,102,z,t);
 skySet(d,43,102,14,'minecraft:sea_lantern');
 skySet(d,43,103,14,'hakkai:sky_crystal');
 property(world,skyLandmarkKey,1);
 report('空の浮島群ランドマーク','雲上展望塔と雲花園を追加しました');
 return true;
}
// --- 空の浮島群ランドマークここまで ---
// --- 空の浮島群地形ここまで ---

// --- 非戦闘地形ここまで ---

async function build(site,onlyIfVacant=false){
 if(num(world,`built_${site.id}`))return;
 if(builds.has(site.id))return builds.get(site.id);
 const d=world.getDimension(dimID(site.dim)), from=origin(site), w=site.size??width,
   to={x:from.x+w-1,y:baseY+(site.size?expandedHeight:34)-1,z:from.z+w-1};
 const task=loaded(d,from,to,async()=>{
   if(!num(world,`built_${site.id}`)){
     if(onlyIfVacant&&d.getPlayers().some(player=>Math.abs(player.location.x-site.x)<=(site.size??width)/2+2&&Math.abs(player.location.z-site.z)<=(site.size??width)/2+2))
       throw Error(`プレイヤーが予定地内にいるため生成を延期: ${site.id}`);
     const special=site.kind==='atlas'||site.kind==='linked';
     // 初回配置でも、既存ワールドの建築や以前の生成物を上書きしない。
     if(d.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']}))
       throw Error(`未生成の ${site.name} の予定地にブロックがあるため、上書きを中止: ${site.id}`);
     const structure=site.id===59?`site_59_village_${seededWorlds?.factoryVariant(site.x,site.z)??0}`:`${special?site.kind:'site'}_${site.id}`;
     world.structureManager.place(`${ns}${structure}`,d,from,{includeEntities:false});
     await timed(()=>{},2);
     if(!safeNear(d,coords(site),4))throw Error(`風記の到着床を確認できない: ${site.id}`);
     property(world,`built_${site.id}`,1);
     if(onlyIfVacant&&isNaturalSite(site))property(world,`natural_join_${site.id}_v1`,1);
     if(site.id===1){
       try{
         const v=coords(site);
         d.spawnEntity('minecraft:villager_v2',{x:v.x,y:v.y,z:v.z+11});
         d.spawnEntity('minecraft:iron_golem',{x:v.x+5,y:v.y,z:v.z+3});
       }catch{}
     }
     if(site.kind==='linked'&&site.theme===0&&world.gameRules.doMobSpawning){
       for(const {dx,dz,name} of [{dx:9,dz:14,name:'街道の宿守'},{dx:11,dz:14,name:'街道の畑守'}])try{
         const at=safeNear(d,{x:site.x+dx,y:baseY+17,z:site.z+dz},3);
         if(at)d.spawnEntity('minecraft:villager_v2',at).nameTag=name;
       }catch{}
     }
     if(site.landmark==='past')for(const {x,z,name,young} of [{x:-8,z:7,name:'駅村の子',young:true},{x:-8,z:-6,name:'若き駅長ハル',young:false},{x:-2,z:3,name:'工房見習いミナ',young:false}]){
       try{
         const v={x:site.x+x+.5,y:expandedY,z:site.z+z+.5};
         if(safe(d,v)){
           const e=d.spawnEntity('minecraft:villager_v2',v,young?{spawnEvent:'minecraft:entity_born'}:undefined);
           e.nameTag=name;
         }
       }catch{}
     }
     if(site.landmark==='future')try{
       const c=d.getBlock({x:site.x-10,y:expandedY,z:site.z-8})?.getComponent('minecraft:inventory')?.container;
       c?.addItem(new ItemStack('minecraft:raw_copper',8));c?.addItem(new ItemStack('minecraft:coal',2));
     }catch{}
     if(site.size)try{
       const chest=d.getBlock({x:site.x+3,y:expandedY,z:site.z+13})?.getComponent('minecraft:inventory')?.container;
       if(chest){chest.addItem(new ItemStack('minecraft:bread',3));chest.addItem(new ItemStack(ns+`shard_${home[aspect(site)][0]}`,2));}
     }catch{}
   }
 });
 builds.set(site.id,task);
 try{await task;}finally{builds.delete(site.id);}
}
const realmDiscoveries=[
 ['始まりの草原','風見の道標','草原を渡る風は、最初の一歩を覚えている。小川の音を聞けば、帰る方角も思い出せる。'],
 ['霧の森','苔むす古文庫','霧は道を隠すためではなく、急がない旅人にだけ古い頁を見せるために流れている。'],
 ['砂の回廊','砂紋の石標','砂は足あとを消しても、風が描いた曲線までは消せない。回廊の壁は旅人の歩幅を記憶している。'],
 ['氷の鏡湖','鏡湖の氷紋','湖面に映る光は、空が忘れた色。春が来るまで、氷はその色を静かに守り続ける。'],
 ['雷の断崖','雷を待つ炉床','鍛冶師は雷鳴を合図に炉を整えた。稜線に響く音は、遠くの旅人へ朝を知らせる鐘でもあった。'],
 ['闇の地下庭園','月影の水脈','地上の光が届かない場所にも、育つものはある。苔の明かりは、見つけた人の心に小さな道を灯す。'],
 ['空の浮島群','雲海の観測標','雲の向こうに道はない。それでも橋を渡った者だけが、風の流れに島々のつながりを見つける。'],
 ['時の終着駅','止まった時計の記憶','時計の針が止まっても、ここで交わした約束は止まらない。旅の終わりは、次の誰かの出発点になる。']
];
function realmDiscoveryCount(p){return realmDiscoveries.filter((_,i)=>marked(p,'realm_discoveries',i)).length;}
function realmDiscoveryLocation(site,i){
 const c=coords(site), offsets=[[8,0],[0,8],[-8,0],[0,-8],[8,8],[-8,8],[8,-8],[-8,-8]][i];
 return {x:c.x+offsets[0],y:c.y,z:c.z+offsets[1]};
}
function realmDiscoveryTick(p,site){
 if(!site||site.id<1||site.id>8||site.dim!==Number(p.dimension.id.slice((ns+'realm_').length)))return;
 const i=site.id-1,at=realmDiscoveryLocation(site,i),distance=Math.hypot(p.location.x-at.x,p.location.z-at.z);
 // 発見地点の目印は近くにいる時だけ低頻度で表示。ブロック設置・地形変更は行わない。
 const s=state(p),last=s.cd.get(`memory_marker_${i}`)??-1000;
 if(distance<15&&Math.abs(p.location.y-at.y)<12&&system.currentTick-last>=90){
   s.cd.set(`memory_marker_${i}`,system.currentTick);
   try{
     p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x,y:at.y+1.15,z:at.z});
     p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x+.65,y:at.y+1.8,z:at.z});
     p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x-.65,y:at.y+1.8,z:at.z});
   }catch{}
 }
 // 発見済みの記憶地点付近では、未体験の旅イベントが低確率で発生する。
 if(marked(p,'realm_discoveries',i)&&!marked(p,'realm_journey_events',i)&&distance<12&&Math.abs(p.location.y-at.y)<10&&!s.menu&&!s.busy){
   const key=`journey_encounter_${i}`,lastEvent=s.cd.get(key)??-10000;
   if(system.currentTick-lastEvent>=100&&Math.random()<.12){s.cd.set(key,system.currentTick);menu(p,player=>realmAdventureEvent(player,i));}
 }
 if(!p.isSneaking||marked(p,'realm_discoveries',i))return;
 if(distance>5.5||Math.abs(p.location.y-at.y)>8)return;
 mark(p,'realm_discoveries',i);
 const [realm,point]=realmDiscoveries[i];
 p.sendMessage(`§d✦ 発見：${point}§r`);
 p.sendMessage(`§7${realm}の風記に新しい一頁が加わった。ガイド本の「八界の発見記録」で読み返せます。`);
 try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x,y:at.y+1,z:at.z});p.playSound('random.orb',{volume:.65,pitch:1.15});}catch{}
 const count=realmDiscoveryCount(p);
 if(count===8&&!marked(p,'eight_discoveries_complete',0)){
   mark(p,'eight_discoveries_complete',0);
   p.sendMessage('§6✧ 八界記念頁が解放されました！§r');
   p.sendMessage('§7八つの風記がそろい、旅の地図に新しい記憶が刻まれました。');
   try{p.playSound('random.orb',{volume:.85,pitch:1.35});}catch{}
 }
}
async function eightRealmMemorialPage(p){
 const count=realmDiscoveryCount(p);
 if(count<8)return simple(p,'八界記念頁',`まだ記憶がそろっていません：${count}/8
八つの世界の発見ポイントをすべて見つけると、このページが完成します。`);
 return simple(p,'八界記念頁｜風は旅を覚えている',`八つの風記がひとつになった。

草原の風は始まりを、霧の森は静けさを、砂の回廊は歩みを、氷の鏡湖は光を、雷の断崖は約束を、地下庭園は希望を、空の浮島群はつながりを、時の終着駅は次の出発を記憶している。

§d八界の記憶、完成。§r`);
}
async function realmDiscoveryBook(p){
 const count=realmDiscoveryCount(p);
 const n=await paged(p,'八界の発見記録',`発見した記憶：${count}/8\n各世界の中心地から少し離れた記憶の場所で、しゃがむと記録できます。`,realmDiscoveries.map(([realm,point],i)=>[`${marked(p,'realm_discoveries',i)?'◆':'◇'} ${realm}｜${point}`]));
 if(n!==undefined){const [realm,point,lore]=realmDiscoveries[n];return simple(p,`${realm}｜${point}`,marked(p,'realm_discoveries',n)?lore:'まだ発見していません。世界の中心地から少し離れた場所を探し、しゃがんで風の記憶に耳を澄ませてください。');}
}


async function realmArchive(p){
 const count=realmDiscoveryCount(p);
 const choice=await form(p,'八界の宝物庫',`発見記録：${count}/8\n\n四つの記憶を集めると第一封印が解けます。八つすべてを集めると最終宝物庫が解放されます。\n\n報酬はこのページから受け取れます。`,[
  [`${count>=4?'◆':'◇'} 第一封印｜四つの記憶\n${count>=4?'解放済み':'発見記録を4つ集めると解放'}`],
  [`${count>=8?'◆':'◇'} 最終封印｜八界の宝物庫\n${count>=8?'解放済み':'発見記録を8つ集めると解放'}`],
  ['閉じる']
 ]);
 if(choice===0){
  if(count<4)return notice(p,'§e発見記録があと'+(4-count)+'つ必要です');
  if(marked(p,'archive_reward',0))return notice(p,'§7第一封印の報酬は受取済みです');
  if(!give(p,ns+'chronicle_fragment',2))return notice(p,'§e持ち物に空きを作ってください');
  mark(p,'archive_reward',0);notice(p,'§a古文書の欠片を2個受け取りました');
 }
 if(choice===1){
  if(count<8)return notice(p,'§e発見記録があと'+(8-count)+'つ必要です');
  if(marked(p,'archive_reward',1))return notice(p,'§7最終宝物庫の報酬は受取済みです');
  if(!give(p,ns+'relic_key',1))return notice(p,'§e持ち物に空きを作ってください');
  mark(p,'archive_reward',1);notice(p,'§d八界の宝物庫から古代の鍵を受け取りました');
  try{p.playSound('random.levelup',{volume:.8,pitch:1.15});}catch{}
 }
}


const realmTrialNames=['風鈴の調べ','苔灯の祈り','砂紋のこだま','氷鏡の静寂','雷炉の余韻','月影の水脈','雲海の道標','時鐘の約束'];
function realmTrialCount(p){return realmTrialNames.filter((_,i)=>marked(p,'realm_trials',i)).length;}
function realmTrialFinalReward(p){
 if(realmTrialCount(p)!==8||marked(p,'realm_trial_complete',0))return;
 if(give(p,ns+'crystal_7',2)){
  mark(p,'realm_trial_complete',0);
  p.sendMessage('§6✧ 八界の探索試練、すべて達成！記念結晶を2個受け取りました。§r');
  try{p.playSound('random.levelup',{volume:.9,pitch:1.25});}catch{}
 }else{
  const st=state(p),last=st.cd.get('trial_final_space')??-1000;
  if(system.currentTick-last>200){st.cd.set('trial_final_space',system.currentTick);p.sendMessage('§e全試練達成！持ち物に空きを作ると記念結晶2個を受け取れます。');}
 }
}
function realmTrialTick(p,site){
 realmTrialFinalReward(p);
 if(!site||site.id<1||site.id>8)return;
 const i=site.id-1;
 if(!marked(p,'realm_discoveries',i)||marked(p,'realm_trials',i))return;
 const expected=Number(p.dimension.id.slice((ns+'realm_').length));
 if(!Number.isFinite(expected)||site.dim!==expected)return;
 if(!p.isSneaking)return;
 const at=realmDiscoveryLocation(site,i);
 const d=Math.hypot(p.location.x-at.x,p.location.z-at.z);
 if(d>3.8||Math.abs(p.location.y-at.y)>6)return;
 if(!give(p,ns+`shard_${i}`,1)){
  const st=state(p),last=st.cd.get(`trial_space_${i}`)??-1000;
  if(system.currentTick-last>100){st.cd.set(`trial_space_${i}`,system.currentTick);notice(p,'§e持ち物に空きを作ると試練の報酬を受け取れます');}
  return;
 }
 mark(p,'realm_trials',i);
 p.sendMessage(`§d✦ 探索試練達成：${realmTrialNames[i]}§r`);
 p.sendMessage(`§7${realmDiscoveries[i][0]}の属性の欠片を受け取りました。`);
 try{
  p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x,y:at.y+1.1,z:at.z});
  p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x+.45,y:at.y+1.55,z:at.z+.45});
  p.playSound('random.levelup',{volume:.65,pitch:1+.08*i});
 }catch{}
 realmTrialFinalReward(p);
}
async function realmTrialBook(p){
 const count=realmTrialCount(p);
 const lines=realmTrialNames.map((name,i)=>`${marked(p,'realm_trials',i)?'◆':'◇'} ${i+1}. ${name}｜${marked(p,'realm_trials',i)?'達成済み':marked(p,'realm_discoveries',i)?'記憶の場所でしゃがむ':'先に発見記録を見つける'}`);
 return simple(p,'八界の探索試練',`達成状況：${count}/8\n\n各世界の発見記録を見つけたあと、その記憶の場所でしゃがむと試練に挑戦できます。\n\n${lines.join('\n')}\n\n八つすべて達成すると記念結晶2個を獲得できます。`);
}


const realmRuinData=[
 ['風の回廊','風が道を選ぶとき、最初に揺れるものは？',['石','草の穂','炎'],1,'草の穂'],
 ['苔灯の書庫','古い頁を守るものは？',['静かな湿り気','強い日差し','乾いた砂'],0,'静かな湿り気'],
 ['砂紋の祭壇','砂丘に道筋を描くものは？',['潮','風','雪'],1,'風'],
 ['氷鏡の聖堂','氷が映すものは？',['地中の音','空の光','遠い炎'],1,'空の光'],
 ['雷炉の遺構','雷鳴のあとに残るものは？',['炉の余熱','海の泡','木の実'],0,'炉の余熱'],
 ['月影の水庭','地下で道を照らすものは？',['苔の灯','昼の太陽','星の雨'],0,'苔の灯'],
 ['雲海の観測所','島々を結ぶ道標は？',['砂の流れ','風の流れ','溶岩の川'],1,'風の流れ'],
 ['時鐘の間','時計が止まっても進み続けるものは？',['約束','歯車','影'],0,'約束']
];
function realmRuinLocation(site,i){
 const at=realmDiscoveryLocation(site,i), dirs=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]][i];
 return {x:at.x+dirs[0]*13,y:at.y,z:at.z+dirs[1]*13};
}
function realmRuinCount(p){return realmRuinData.filter((_,i)=>marked(p,'realm_ruins',i)).length;}
async function realmRuinPuzzle(p,i){
 if(!p.isValid||marked(p,'realm_ruins',i)||!marked(p,'realm_trials',i))return;
 const [name,question,answers,correct,solution]=realmRuinData[i];
 const pick=await form(p,`秘密遺跡｜${name}`,`${question}\n\n正しい答えを選ぶと、遺跡の宝箱が解放されます。`,answers.map(a=>[a]));
 if(pick===undefined)return;
 if(pick!==correct){notice(p,'§e遺跡の仕掛けは静かに閉じた。もう一度考えてみよう。');try{p.playSound('note.bass',{volume:.6,pitch:.8});}catch{}return;}
 if(!give(p,ns+`crystal_${i}`,1)){notice(p,'§e宝箱は開いたが、持ち物に空きがない。再挑戦できます。');return;}
 mark(p,'realm_ruins',i);
 p.sendMessage(`§6✧ 秘密遺跡を制覇：${name}§r`);
 p.sendMessage(`§7答え：${solution}｜属性結晶を1個獲得しました。`);
 try{const at=realmRuinLocation(travelSites.get(i+1),i);p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x,y:at.y+1.2,z:at.z});p.playSound('random.levelup',{volume:.8,pitch:1.1+.05*i});}catch{}
 if(realmRuinCount(p)===8&&!marked(p,'realm_ruins_complete',0)){
  if(give(p,ns+'crystal_7',4)){mark(p,'realm_ruins_complete',0);p.sendMessage('§d✦ 八界の秘密遺跡をすべて制覇！時の結晶を4個獲得しました。§r');}
  else p.sendMessage('§e全遺跡制覇！持ち物に空きを作ると時の結晶4個を受け取れます。');
 }
}
function realmRuinFinalReward(p){
 if(realmRuinCount(p)!==8||marked(p,'realm_ruins_complete',0))return;
 if(give(p,ns+'crystal_7',4)){mark(p,'realm_ruins_complete',0);p.sendMessage('§d✦ 八界の秘密遺跡をすべて制覇！時の結晶を4個獲得しました。§r');}
}
function realmRuinTick(p,site){
 realmRuinFinalReward(p);
 if(!site||site.id<1||site.id>8)return;
 const i=site.id-1;if(!marked(p,'realm_trials',i)||marked(p,'realm_ruins',i))return;
 const expected=Number(p.dimension.id.slice((ns+'realm_').length));if(!Number.isFinite(expected)||site.dim!==expected)return;
 const at=realmRuinLocation(site,i),d=Math.hypot(p.location.x-at.x,p.location.z-at.z),st=state(p);
 const last=st.cd.get(`ruin_hint_${i}`)??-1000;
 if(d<14&&Math.abs(p.location.y-at.y)<12&&system.currentTick-last>100){
  st.cd.set(`ruin_hint_${i}`,system.currentTick);
  try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x,y:at.y+1.1,z:at.z});p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x+.55,y:at.y+1.6,z:at.z+.55});}catch{}
 }
 if(!p.isSneaking||d>3.8||Math.abs(p.location.y-at.y)>6)return;
 const busy=st.cd.get(`ruin_busy_${i}`)??-1000;if(system.currentTick-busy<80)return;
 st.cd.set(`ruin_busy_${i}`,system.currentTick);
 system.run(()=>realmRuinPuzzle(p,i).catch(e=>report('秘密遺跡の謎解き',e)));
}
async function realmRuinBook(p){
 const lines=realmRuinData.map(([name],i)=>`${marked(p,'realm_ruins',i)?'◆':'◇'} ${i+1}. ${name}｜${marked(p,'realm_ruins',i)?'制覇済み':marked(p,'realm_trials',i)?'遺跡の光を探す':'先に探索試練を達成'}`);
 return simple(p,'八界の秘密遺跡',`制覇状況：${realmRuinCount(p)}/8\n追加謎解き：${realmBonusRiddles.filter((_,i)=>marked(p,'realm_bonus_riddles',i)).length}/8\n\n探索試練を達成した世界に、秘密遺跡への道標が現れます。近くで光る粒子を探し、場所でしゃがむと謎解きが始まります。\n\n${lines.join('\n')}\n\n各遺跡の宝箱から属性結晶1個、八つすべての制覇で時の結晶4個を獲得できます。`);
}


// --- v2.4.0：八界の余韻・追加謎解き・記録帳 ---
const realmEchoLore=[
 ['草原の風紋','草の穂が同じ向きに揺れるのは、風が旅人を見送っているから。'],
 ['森の苔灯','苔の灯りは、急がず耳を澄ませた者にだけ森の古い歌を伝える。'],
 ['砂の道しるべ','砂に残る曲線は、迷った時間さえ旅の一部だったと教えてくれる。'],
 ['氷湖のひかり','氷の下の光は、凍った季節にも小さな変化が続いている証。'],
 ['雷炉の火花','雷の余韻は、強さではなく次の一歩を照らす明かりになった。'],
 ['月影のしずく','水音は地上に届かなくても、誰かの心に静かな道を作る。'],
 ['雲海の羽音','離れた島を結ぶのは橋だけではない。互いを思う気持ちも道になる。'],
 ['時鐘の残響','最後の鐘は終わりを告げず、次の旅人へ始まりを手渡した。']
];
const realmEchoOffsets=[[0,9],[9,0],[0,-9],[-9,0],[7,7],[-7,7],[7,-7],[-7,-7]];
const realmBonusRiddles=[
 ['風が草原を通り抜けたあと、何が残る？',['足音の記憶','石の壁','炎の道'],0,'足音の記憶'],
 ['苔灯の書庫で、古い言葉を見つける鍵は？',['急ぐこと','静かに耳を澄ますこと','強く叩くこと'],1,'静かに耳を澄ますこと'],
 ['砂紋が描く道を読み解く手がかりは？',['風の向き','星の色','水の深さ'],0,'風の向き'],
 ['氷鏡が守っているものは？',['夏の熱','空の光','炉の火'],1,'空の光'],
 ['雷炉が旅人に残すものは？',['次の一歩の明かり','深い霧','砂の壁'],0,'次の一歩の明かり'],
 ['月影の水音が運ぶものは？',['遠い月の光','乾いた砂','昼の熱'],0,'遠い月の光'],
 ['雲海の島々をつなぐものは？',['溶岩','互いを思う気持ち','深い雪'],1,'互いを思う気持ち'],
 ['時鐘の最後の音が手渡すものは？',['終わり','始まり','忘却'],1,'始まり']
];
function realmEchoCount(p){return realmEchoLore.filter((_,i)=>marked(p,'realm_echoes',i)).length;}
function realmEchoPoint(site,i){const at=realmRuinLocation(site,i),o=realmEchoOffsets[i];return{x:at.x+o[0],y:at.y,z:at.z+o[1]};}
async function realmBonusPuzzle(p,i){
 if(!p.isValid||!marked(p,'realm_ruins',i)||marked(p,'realm_bonus_riddles',i))return;
 const [question,answers,correct,solution]=realmBonusRiddles[i];
 const pick=await form(p,`遺跡の追憶｜${realmRuinData[i][0]}`,`${question}\n\nもうひとつの記憶を解き明かそう。`,answers.map(a=>[a]));
 if(pick===undefined)return;
 if(pick!==correct){notice(p,'§e記憶はまだ静かに眠っている。もう一度考えてみよう。');try{p.playSound('note.bass',{volume:.55,pitch:.85});}catch{}return;}
 if(!give(p,ns+`shard_${i}`,1)){notice(p,'§e答えは届いたが、持ち物に空きがない。もう一度挑戦できます。');return;}
 mark(p,'realm_bonus_riddles',i);
 p.sendMessage(`§b✧ 追加謎解き達成：${realmRuinData[i][0]}§r`);
 p.sendMessage(`§7答え：${solution}｜属性の欠片を1個獲得しました。`);
 try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:p.location.x,y:p.location.y+1,z:p.location.z});p.playSound('random.orb',{volume:.7,pitch:1.15});}catch{}
}
function realmEchoTick(p,site){
 if(!site||site.id<1||site.id>8)return;
 const i=site.id-1,expected=Number(p.dimension.id.slice((ns+'realm_').length));
 if(!Number.isFinite(expected)||site.dim!==expected||!marked(p,'realm_ruins',i))return;
 const st=state(p),echo=realmEchoPoint(site,i),d=Math.hypot(p.location.x-echo.x,p.location.z-echo.z);
 if(!marked(p,'realm_echoes',i)){
  const last=st.cd.get(`echo_hint_${i}`)??-1000;
  if(d<11&&Math.abs(p.location.y-echo.y)<9&&system.currentTick-last>120){st.cd.set(`echo_hint_${i}`,system.currentTick);try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:echo.x,y:echo.y+1.15,z:echo.z});}catch{}}
  if(p.isSneaking&&d<2.8&&Math.abs(p.location.y-echo.y)<5){
   if(!give(p,ns+'chronicle_fragment',1)){const t=st.cd.get(`echo_space_${i}`)??-1000;if(system.currentTick-t>100){st.cd.set(`echo_space_${i}`,system.currentTick);notice(p,'§e持ち物に空きを作ると、この記憶を受け取れます。');}}
   else{mark(p,'realm_echoes',i);p.sendMessage(`§d✧ 八界の余韻：${realmEchoLore[i][0]}§r`);p.sendMessage(`§7${realmEchoLore[i][1]}`);try{p.playSound('random.orb',{volume:.65,pitch:1.05});}catch{}}
  }
 }
 // 遺跡制覇地点で、通常の謎解きに続く第二の問いを解放。
 if(!marked(p,'realm_bonus_riddles',i)){
  const ruin=realmRuinLocation(site,i),rd=Math.hypot(p.location.x-ruin.x,p.location.z-ruin.z);
  const last=st.cd.get(`bonus_hint_${i}`)??-1000;
  if(rd<10&&Math.abs(p.location.y-ruin.y)<8&&system.currentTick-last>160){st.cd.set(`bonus_hint_${i}`,system.currentTick);try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:ruin.x,y:ruin.y+1.4,z:ruin.z});}catch{}}
  if(p.isSneaking&&rd<3.8&&Math.abs(p.location.y-ruin.y)<6){const busy=st.cd.get(`bonus_busy_${i}`)??-1000;if(system.currentTick-busy>90){st.cd.set(`bonus_busy_${i}`,system.currentTick);system.run(()=>realmBonusPuzzle(p,i).catch(e=>report('遺跡の追加謎解き',e)));}}
 }
 if(realmEchoCount(p)===8&&!marked(p,'realm_echoes_complete',0)){
  mark(p,'realm_echoes_complete',0);p.sendMessage('§d✦ 八界の余韻をすべて記録しました。ガイド本に最後の物語が加わりました。§r');
 }
}
async function realmEchoBook(p){
 const count=realmEchoCount(p),bonus=realmBonusRiddles.filter((_,i)=>marked(p,'realm_bonus_riddles',i)).length,hidden=realmHiddenCount(p),seasonal=realmSeasonEventCount(p);
 const rows=realmEchoLore.map(([name],i)=>`${marked(p,'realm_echoes',i)?'◆':'◇'} ${i+1}. ${name}`);
 const story=count===8?'\n\n【八界をつなぐ風】\n八つの余韻は、ひとつの旋律になった。旅人が歩いた道も、立ち止まった場所も、すべてが世界の記憶を形づくる。風は次の旅人へ、静かに道を譲った。':'\n\n八つの余韻を集めると、最後の物語が読めるようになります。';
 return simple(p,'八界の余韻と記録',`余韻の記録：${count}/8\n追加謎解き：${bonus}/8\n隠しルート：${hidden}/8\n季節イベント：${seasonal}/32\n\n各秘密遺跡を制覇したあと、遺跡の周囲に現れる光の場所でしゃがんでください。遺跡の中心でもう一度しゃがむと、追加の謎解きに挑戦できます。\n\n${rows.join('\n')}${story}`);
}


const realmMemoryNames=[
 ['風の余韻','草原を渡る風は、旅人の足音まで記憶している。'],
 ['苔の書簡','苔灯は、忘れられた言葉を静かに守っていた。'],
 ['砂の記憶','砂紋は、消えた道も確かに存在したと語る。'],
 ['氷の反射','氷鏡に映るのは景色だけではない。旅の決意もまた映る。'],
 ['雷の残響','雷鳴が去ったあと、炉には小さな希望が残った。'],
 ['月影の水音','地下の水脈は、遠い月の光を運んでいた。'],
 ['雲海の航路','雲の道標は、互いを信じる心でつながっていた。'],
 ['時鐘の約束','時が止まっても、交わした約束は消えない。']
];
const realmMemoryOffsets=[[-5,0],[0,5],[5,0]];
function realmMemoryCount(p){return realmMemoryNames.reduce((n,_,i)=>n+[0,1,2].filter(j=>marked(p,'realm_relics',i*3+j)).length,0);}
function realmMemoryPoint(site,i,j){const at=realmRuinLocation(site,i),o=realmMemoryOffsets[j];return{x:at.x+o[0],y:at.y,z:at.z+o[1]};}
function realmSanctumLocation(site){const at=realmRuinLocation(site,7);return{x:at.x+24,y:at.y,z:at.z+24};}
async function realmSanctumStory(p){
 if(!p.isValid||realmMemoryCount(p)!==24||marked(p,'realm_sanctum',0))return;
 const text='八つの世界に散らばった記憶は、ひとつの風景を描き出した。\n\n風は草原を越え、苔の書庫を抜け、砂と氷を渡り、雷の炉と月影の水庭を照らした。雲海の道の先で、時鐘が静かに鳴る。\n\n「旅の意味は、遠くへ行くことだけではない。出会った世界の記憶を、次の誰かへ手渡すこと。」\n\nその言葉とともに、最後の聖域が目を覚ました。';
 const result=await simple(p,'八界の記憶聖域',text+'\n\n記念の遺物を受け取りますか？');
 if(!p.isValid||marked(p,'realm_sanctum',0))return;
 if(!give(p,ns+'relic_key',1)){notice(p,'§e聖域は目覚めました。持ち物に空きを作ると記念の遺物を受け取れます。');return;}
 mark(p,'realm_sanctum',0);p.sendMessage('§d✦ 八界の記憶聖域を発見！記念の遺物を受け取りました。§r');
 try{p.dimension.spawnParticle('hakkai:climate_7',{x:p.location.x,y:p.location.y+1,z:p.location.z});p.playSound('random.levelup',{volume:1,pitch:1.25});}catch{}
}
function realmMemoryTick(p,site){
 if(!site||site.id<1||site.id>8)return;
 const expected=Number(p.dimension.id.slice((ns+'realm_').length));if(!Number.isFinite(expected)||site.dim!==expected)return;
 const i=site.id-1;if(!marked(p,'realm_ruins',i))return;
 const st=state(p);
 for(let j=0;j<3;j++){
  const k=i*3+j;if(marked(p,'realm_relics',k))continue;
  const at=realmMemoryPoint(site,i,j),d=Math.hypot(p.location.x-at.x,p.location.z-at.z);
  if(d<7&&Math.abs(p.location.y-at.y)<8){
   const last=st.cd.get(`memory_hint_${k}`)??-1000;
   if(system.currentTick-last>120){st.cd.set(`memory_hint_${k}`,system.currentTick);try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x,y:at.y+1,z:at.z});}catch{}}
  }
  if(!p.isSneaking||d>2.7||Math.abs(p.location.y-at.y)>5)continue;
  if(!give(p,ns+'chronicle_fragment',1)){const last=st.cd.get(`memory_space_${k}`)??-1000;if(system.currentTick-last>100){st.cd.set(`memory_space_${k}`,system.currentTick);notice(p,'§e記憶の欠片を受け取るには持ち物に空きが必要です。');}continue;}
  mark(p,'realm_relics',k);p.sendMessage(`§b✧ 記憶の欠片：${realmMemoryNames[i][0]}（${j+1}/3）§r`);
  p.sendMessage(`§7${realmMemoryNames[i][1]}`);
  try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x,y:at.y+1.2,z:at.z});p.playSound('random.orb',{volume:.55,pitch:1.2});}catch{}
 }
 if(realmMemoryCount(p)===24&&!marked(p,'realm_memory_complete',0)){
  mark(p,'realm_memory_complete',0);p.sendMessage('§d✦ 24個すべての記憶の欠片が集まりました。第八界に現れた聖域を探そう。§r');
 }
 if(realmMemoryCount(p)!==24||site.id!==8||marked(p,'realm_sanctum',0))return;
 const at=realmSanctumLocation(site),d=Math.hypot(p.location.x-at.x,p.location.z-at.z);
 if(d<12&&Math.abs(p.location.y-at.y)<10){const last=st.cd.get('sanctum_hint')??-1000;if(system.currentTick-last>100){st.cd.set('sanctum_hint',system.currentTick);try{p.dimension.spawnParticle('hakkai:climate_7',{x:at.x,y:at.y+1.3,z:at.z});}catch{}}}
 if(p.isSneaking&&d<3.5&&Math.abs(p.location.y-at.y)<6){const last=st.cd.get('sanctum_busy')??-1000;if(system.currentTick-last>100){st.cd.set('sanctum_busy',system.currentTick);system.run(()=>realmSanctumStory(p).catch(e=>report('八界の記憶聖域',e)));}}
}
async function realmMemoryBook(p){
 const count=realmMemoryCount(p),rows=realmMemoryNames.map(([name],i)=>{const n=[0,1,2].filter(j=>marked(p,'realm_relics',i*3+j)).length;return `${n===3?'◆':'◇'} ${i+1}. ${name}｜${n}/3`;});
 return simple(p,'八界の記憶断章',`収集状況：${count}/24\n\n各秘密遺跡を制覇したあと、周囲に現れる小さな光を探してください。光の場所でしゃがむと記憶の欠片を回収できます。\n\n${rows.join('\n')}\n\n24個すべて集めると、第八界に最後の聖域への道標が現れます。`);
}


// --- v2.5.0：季節の探索イベント・隠しルート・記念品交換・冒険者記録帳 ---
const realmHiddenLore=[
 ['草原の裏道','風見の丘の裏側には、旅人が見落とした小道がある。そこに残る足跡は、帰り道を探す誰かへの小さな案内だった。'],
 ['苔灯の抜け道','書庫の壁に沿う苔は、光の届かない場所にも続いていた。静かな道の先には、森が守ってきた手紙が眠る。'],
 ['砂紋の隠し道','砂丘の陰に刻まれた線は、地図に載らない道を示していた。遠回りに見える道も、旅の景色を増やしてくれる。'],
 ['氷鏡の裏廊下','氷の回廊の裏側には、空の色を映さない小さな廊下がある。そこには、冬を越えた記憶が残されていた。'],
 ['雷炉の保守路','炉の脇に続く道は、火花を守った職人たちの通り道だった。残された記録は、力を分け合うことの大切さを語る。'],
 ['月影の水路','水庭の端には、地上へ戻る細い水路がある。流れの音をたどると、月明かりのような静けさに出会う。'],
 ['雲海の連絡路','浮島の影に沿って、島々を結ぶ風の道が続いている。見えない橋も、互いを信じる心があれば渡れる。'],
 ['時鐘の保管路','時計塔の裏には、古い約束を保管する小道があった。最後の記録は、次の旅が始まることを告げている。']
];
const realmHiddenOffsets=[[22,0],[0,22],[-22,0],[0,-22],[18,18],[-18,18],[18,-18],[-18,-18]];
function realmHiddenPoint(site,i){const at=realmRuinLocation(site,i),o=realmHiddenOffsets[i];return{x:at.x+o[0],y:at.y,z:at.z+o[1]};}
function realmHiddenCount(p){return realmHiddenLore.filter((_,i)=>marked(p,'realm_hidden_routes',i)).length;}
function realmSeasonEventCount(p){let n=0;for(let i=0;i<32;i++)if(marked(p,'realm_seasonal_events',i))n++;return n;}
function realmSeasonWindow(i,t){const windows=[[0,3200],[6000,9200],[12000,15200],[18000,22000]];const [a,b]=windows[i%4];return t>=a&&t<=b;}
function realmSeasonalEventTick(p,site){
 if(!site||site.id<1||site.id>8)return;
 const i=site.id-1,expected=Number(p.dimension.id.slice((ns+'realm_').length));
 if(!Number.isFinite(expected)||site.dim!==expected||!marked(p,'realm_ruins',i)||!marked(p,'realm_echoes',i))return;
 const absolute=Math.max(0,world.getAbsoluteTime()),season=seasonAt(Math.floor(absolute/24000)).index,time=absolute%24000,key=season*8+i;
 if(marked(p,'realm_seasonal_events',key)||!realmSeasonWindow(i,time))return;
 const at=realmEchoPoint(site,i),d=Math.hypot(p.location.x-at.x,p.location.z-at.z),st=state(p);
 if(d<10&&Math.abs(p.location.y-at.y)<8){
  const last=st.cd.get(`season_hint_${key}`)??-1000;
  if(system.currentTick-last>100){st.cd.set(`season_hint_${key}`,system.currentTick);try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x,y:at.y+1.25,z:at.z});}catch{}}
 }
 if(!p.isSneaking||d>2.8||Math.abs(p.location.y-at.y)>5)return;
 if(!give(p,ns+`shard_${i}`,1)){const last=st.cd.get(`season_space_${key}`)??-1000;if(system.currentTick-last>100){st.cd.set(`season_space_${key}`,system.currentTick);notice(p,'§e季節の贈り物を受け取るには、持ち物に空きが必要です。');}return;}
 mark(p,'realm_seasonal_events',key);
 if(!marked(p,'realm_season_stories',i)){mark(p,'realm_season_stories',i);realmJourneyLog(p,`${realmSeasonStories[i][0]}が年鑑に加わった`);p.sendMessage(`§d✧ 季節の物語が解放：${realmSeasonStories[i][0]}§r`);}
 p.sendMessage(`§d✧ ${era()}の季節イベントを記録：${realmRuinData[i][0]}§r`);
 p.sendMessage('§7季節の光から属性の欠片を1個受け取りました。');
 try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:p.location.x,y:p.location.y+1,z:p.location.z});p.playSound('random.orb',{volume:.65,pitch:1.25});}catch{}
}
function realmHiddenRouteTick(p,site){
 if(!site||site.id<1||site.id>8)return;
 const i=site.id-1,expected=Number(p.dimension.id.slice((ns+'realm_').length));
 if(!Number.isFinite(expected)||site.dim!==expected||!marked(p,'realm_echoes',i)||!marked(p,'realm_bonus_riddles',i)||marked(p,'realm_hidden_routes',i))return;
 const at=realmHiddenPoint(site,i),d=Math.hypot(p.location.x-at.x,p.location.z-at.z),st=state(p);
 if(d<10&&Math.abs(p.location.y-at.y)<8){const last=st.cd.get(`hidden_hint_${i}`)??-1000;if(system.currentTick-last>120){st.cd.set(`hidden_hint_${i}`,system.currentTick);try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x,y:at.y+1.2,z:at.z});}catch{}}}
 if(!p.isSneaking||d>2.8||Math.abs(p.location.y-at.y)>5)return;
 if(!give(p,ns+'chronicle_fragment',1)){const last=st.cd.get(`hidden_space_${i}`)??-1000;if(system.currentTick-last>100){st.cd.set(`hidden_space_${i}`,system.currentTick);notice(p,'§e隠しルートの記録を受け取るには持ち物に空きが必要です。');}return;}
 mark(p,'realm_hidden_routes',i);
 p.sendMessage(`§b✧ 隠しルート発見：${realmHiddenLore[i][0]}§r`);
 p.sendMessage(`§7${realmHiddenLore[i][1]}`);
 try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:at.x,y:at.y+1,z:at.z});p.playSound('random.levelup',{volume:.65,pitch:1.05});}catch{}
}
async function realmSouvenirExchange(p){
 const choice=await form(p,'八界の記念品交換所','集めた記憶の断片を、旅の記念品と交換できます。\n\n・記憶の断片3個 → 選んだ世界の属性の欠片1個\n・記憶の断片6個 → 選んだ世界の属性結晶1個\n・記憶の断片12個 → 遺物の鍵1個', [['属性の欠片と交換（3個）'],['属性結晶と交換（6個）'],['遺物の鍵と交換（12個）'],['閉じる']]);
 if(choice===undefined||choice===3||!p.isValid)return;
 if(choice===2){if(exchange(p,ns+'chronicle_fragment',12,ns+'relic_key',1))notice(p,'§d遺物の鍵と交換しました');return;}
 const realm=await form(p,choice===0?'交換する属性の欠片':'交換する属性結晶','交換したい世界を選んでください。',realmRuinData.map(([name])=>[name]));
 if(realm===undefined||!p.isValid)return;
 const input=ns+'chronicle_fragment',output=ns+(choice===0?`shard_${realm}`:`crystal_${realm}`),cost=choice===0?3:6;
 if(exchange(p,input,cost,output,1))notice(p,`§a${realmRuinData[realm][0]}の記念品と交換しました`);
}
async function realmAdventurerRecord(p){
 const visits=places.filter(t=>visited(p,t.id)&&t.id!==0).length;
 const trials=realmTrialCount(p),ruins=realmRuinCount(p),echoes=realmEchoCount(p),memories=realmMemoryCount(p);
 const riddles=realmBonusRiddles.filter((_,i)=>marked(p,'realm_bonus_riddles',i)).length;
 const hidden=realmHiddenCount(p),seasonal=realmSeasonEventCount(p);
 const lines=[
  `訪問した場所：${visits}/${places.length-1}`,
  `八界の探索試練：${trials}/8`,
  `秘密遺跡の制覇：${ruins}/8`,
  `追加謎解き：${riddles}/8`,
  `八界の余韻：${echoes}/8`,
  `記憶の欠片：${memories}/24`,
  `隠しルート：${hidden}/8`,
  `季節イベント：${seasonal}/32`,
  `記憶聖域：${marked(p,'realm_sanctum',0)?'発見済み':'未発見'}`
 ];
 const total=trials+ruins+riddles+echoes+memories+hidden+seasonal;
 return simple(p,'冒険者記録帳',`八界を巡る旅の進行状況\n\n${lines.join('\n')}\n\n季節は4ゲーム日ごとに春・夏・秋・冬へ変わります。各世界の余韻の場所で、季節と時間帯が合うと光ります。
夜明け（0～3200）：始まりの草原・雷の断崖／昼（6000～9200）：霧の森・地下庭園／夕暮れ（12000～15200）：砂の回廊・空の浮島群／夜（18000～22000）：氷の鏡湖・時の終着駅。
隠しルートは追加謎解きと余韻を達成した世界で探せます。\n\n記録ポイント：${total}/96`);
}


// --- v2.6.0：八界の記念品展示・冒険者ランク・最終章 ---
const realmShowpieces=[
 ['風見の徽章','始まりの草原の風を刻んだ徽章','hakkai:climate_0'],
 ['苔灯のランタン','霧の森の静かな灯りを宿す記念品','hakkai:climate_1'],
 ['砂紋の羅針盤','砂の回廊の道しるべを写した羅針盤','hakkai:climate_2'],
 ['氷鏡の結晶','氷の鏡湖に残る光を閉じ込めた結晶','hakkai:climate_3'],
 ['雷炉の歯車','雷の断崖の炉から受け継いだ歯車','hakkai:climate_4'],
 ['月影の雫','地下庭園の水脈が育てた一滴','hakkai:climate_5'],
 ['雲海の羽飾り','空の浮島群を渡る風の羽飾り','hakkai:climate_6'],
 ['時鐘の砂時計','時の終着駅の約束を記す砂時計','hakkai:climate_7']
];
const realmRanks=[
 [0,'旅のはじまり','風の旅人'],[8,'街道の旅人','街道の旅人'],[20,'世界の探究者','世界の探究者'],[35,'遺跡の読解者','遺跡の読解者'],[50,'記憶の編纂者','記憶の編纂者'],[68,'八界の守り手','八界の守り手'],[84,'聖域の継承者','聖域の継承者'],[100,'風記の大賢者','風記の大賢者']
];
function realmProgressScore(p){
 const visits=places.filter(t=>t.id!==0&&visited(p,t.id)).length;
 return visits+realmDiscoveryCount(p)+realmTrialCount(p)+realmRuinCount(p)
  +realmBonusRiddles.filter((_,i)=>marked(p,'realm_bonus_riddles',i)).length
  +realmEchoCount(p)+realmMemoryCount(p)+realmHiddenCount(p)+realmSeasonEventCount(p)
  +realmJourneyEventCount(p)+realmSeasonStoryCount(p)+realmSecretChapterCount(p)+(marked(p,'realm_sanctum',0)?1:0)+realmArenaWins(p)*2;
}
function realmRankIndex(p){const score=realmProgressScore(p);let rank=0;for(let i=0;i<realmRanks.length;i++)if(score>=realmRanks[i][0])rank=i;return rank;}
function realmRankUpdate(p){
 const next=realmRankIndex(p),old=Math.max(0,Math.floor(num(p,'realm_rank',0)));
 if(next>old){property(p,'realm_rank',next);const [_,name]=realmRanks[next];p.sendMessage(`§d✦ 冒険者ランク昇格：${name}！§r`);try{p.dimension.spawnParticle('hakkai:climate_7',{x:p.location.x,y:p.location.y+1,z:p.location.z});p.playSound('random.levelup',{volume:.8,pitch:1.05+next*.04});}catch{}}
 return next;
}
function realmShowpieceUnlocked(p,i){
 return marked(p,'realm_trials',i)&&marked(p,'realm_ruins',i)&&marked(p,'realm_echoes',i)
  &&[0,1,2].every(j=>marked(p,'realm_relics',i*3+j));
}
function realmShowcaseSlots(p){
 try{const raw=p.getDynamicProperty(ns+'realm_showcase_slots');const data=typeof raw==='string'?JSON.parse(raw):{};return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}
}
function realmShowcaseKey(at){return `${at.dimension??'unknown'}|${Math.floor(at.x)}|${Math.floor(at.y)-1}|${Math.floor(at.z)}`;}
async function realmShowcaseMenu(p,at){
 if(!p.isValid)return;
 const slots=realmShowcaseSlots(p),key=realmShowcaseKey(at);
 const current=Number.isInteger(slots[key])?slots[key]-1:Math.floor(num(p,'realm_showcase',0))-1;
 const rows=realmShowpieces.map(([name],i)=>[`${realmShowpieceUnlocked(p,i)?'§a◆':'§8◇'} ${name}${current===i?' §e（この台に展示中）':''}`]);
 rows.push(['この展示台から外す']);
 const choice=await form(p,'八界の記念品展示台',`この展示台だけに飾る記念品を選んでください。\n\n展示台ごとに別々の記念品を保存できます。別の展示台を操作しても、この台の展示は変わりません。\n\n現在：${current>=0&&current<8?realmShowpieces[current][0]:'未設定'}\n解放済み記念品：${realmShowpieces.filter((_,i)=>realmShowpieceUnlocked(p,i)).length}/8`,rows);
 if(choice===undefined||!p.isValid)return;
 if(choice===8){delete slots[key];property(p,'realm_showcase_slots',JSON.stringify(slots));notice(p,'§7この展示台の記念品を外しました');return;}
 if(choice<0||choice>=8||!realmShowpieceUnlocked(p,choice)){notice(p,'§eこの記念品はまだ解放されていません');return;}
 slots[key]=choice+1;property(p,'realm_showcase_slots',JSON.stringify(slots));
 realmGalleryTitle(p);
 try{realmGalleryPulse(p,{x:at.x,y:at.y,z:at.z},choice);p.playSound('random.levelup',{volume:.65,pitch:1.1+choice*.03});}catch{}
 p.sendMessage(`§d✦ この展示台に${realmShowpieces[choice][0]}を飾りました。§r`);
}
async function realmShowcaseBook(p){
 const slots=realmShowcaseSlots(p),count=Object.keys(slots).filter(k=>Number.isInteger(slots[k])&&slots[k]>=1&&slots[k]<=8).length,displayed=realmGalleryDisplayed(p);
 realmGalleryTitle(p);
 const rows=realmShowpieces.map(([name,desc],i)=>`${realmShowpieceUnlocked(p,i)?'§a◆':'§7◇'} ${name}｜${realmShowpieceUnlocked(p,i)?'解放済み':'未解放'}\n  ${desc}`);
 return simple(p,'八界の記念品図鑑',`展示台に飾れる記念品：${realmShowpieces.filter((_,i)=>realmShowpieceUnlocked(p,i)).length}/8\n個別に記念品を設定した展示台：${count}台\n異なる記念品の展示：${displayed.size}/8\n特別称号：${marked(p,'realm_gallery_title',0)?'八界の展示館守':'未獲得'}\n\n各世界の探索試練・秘密遺跡・余韻を達成し、記憶の欠片を3個集めると、その世界の記念品が解放されます。\n\n${rows.join('\n\n')}\n\n展示台を複数設置し、それぞれを操作すると台ごとに異なる記念品を飾れます。展示内容はプレイヤーごとに保存されます。`);
}
function realmGalleryDisplayed(p){
 const slots=realmShowcaseSlots(p),set=new Set();
 for(const v of Object.values(slots))if(Number.isInteger(v)&&v>=1&&v<=8)set.add(v-1);
 return set;
}
function realmGalleryComplete(p){return realmGalleryDisplayed(p).size===8;}
function realmGalleryTitle(p){
 if(!realmGalleryComplete(p))return false;
 if(!marked(p,'realm_gallery_title',0)){
  mark(p,'realm_gallery_title',0);
  p.sendMessage('§d✦ 特別称号「八界の展示館守」を獲得しました！§r');
  p.sendMessage('§7八つの記念品がそろい、展示館に八界の光が満ちました。');
  try{for(let i=0;i<8;i++)p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:p.location.x,y:p.location.y+1+(i%2)*.35,z:p.location.z});p.playSound('random.levelup',{volume:1,pitch:1.25});}catch{}
 }
 return true;
}
function realmGalleryPulse(p,at,choice=7){
 const dim=p.dimension,base={x:at.x,y:at.y,z:at.z};
 const particle=realmShowpieces[Math.max(0,Math.min(7,choice))][2];
 const burst=(phase)=>{
  if(!p.isValid)return;
  const r=.45+phase*.22;
  for(let i=0;i<8;i++){
   const a=(Math.PI*2*i/8)+(phase*.18);
   try{dim.spawnParticle(particle,{x:base.x+Math.cos(a)*r,y:base.y+.35+phase*.32,z:base.z+Math.sin(a)*r});}catch{}
  }
 };
 burst(0);
 try{system.runTimeout(()=>burst(1),5);system.runTimeout(()=>burst(2),10);}catch{}
}
function realmGalleryRoomSurvey(p,at){
 const counts={floor:0,wall:0,ceiling:0,lamps:0,pillars:0,frames:0,pedestals:0,monuments:0,realmDecor:0};
 const dim=p.dimension;
 // Scan only a small, already-loaded area around the monument; never place or modify blocks.
 for(let x=-5;x<=5;x++)for(let y=-2;y<=4;y++)for(let z=-5;z<=5;z++){
  try{
   const b=dim.getBlock({x:Math.floor(at.x)+x,y:Math.floor(at.y)+y,z:Math.floor(at.z)+z});
   if(!b)continue;
   switch(b.typeId){
    case ns+'gallery_floor':counts.floor++;break;
    case ns+'gallery_wall':counts.wall++;break;
    case ns+'gallery_ceiling':counts.ceiling++;break;
    case ns+'display_lamp':counts.lamps++;break;
    case ns+'display_column':counts.pillars++;break;
    case ns+'display_frame':counts.frames++;break;
    case ns+'memory_pedestal':counts.pedestals++;break;
    case ns+'gallery_monument':counts.monuments++;break;
    default:if(b.typeId.startsWith(ns+'realm_gallery_'))counts.realmDecor++;break;
   }
  }catch{}
 }
 const displayed=realmGalleryDisplayed(p).size;
 const score=Math.min(100,
  Math.min(8,displayed)*6+
  Math.min(8,counts.floor)*1.25+
  Math.min(8,counts.wall)*1.25+
  Math.min(4,counts.ceiling)*2.5+
  Math.min(2,counts.lamps)*4+
  Math.min(2,counts.pillars)*4+
  Math.min(2,counts.frames)*3+
  Math.min(8,counts.realmDecor)*2.5
 );
 return {counts,displayed,score:Math.round(score)};
}
function realmGalleryHiddenStory(p,score){
 const unlocked=realmGalleryDisplayed(p).size===8&&score>=70;
 if(unlocked&&!marked(p,'realm_gallery_secret_story',0)){
  mark(p,'realm_gallery_secret_story',0);
  p.sendMessage('§d✦ 展示館の奥に、まだ読まれていない記録が現れました。ガイド本を確認してください。§r');
 }
 return unlocked;
}
async function realmGallerySecretStory(p){
 const survey=realmGalleryLastSurvey(p);
 const unlocked=realmGalleryHiddenStory(p,survey.score);
 if(!unlocked)return simple(p,'展示館の秘密記録',`この記録はまだ閉ざされています。

解放条件：
・八種類すべての記念品を別々の展示台に飾る
・展示館の完成度を70点以上にする

現在の展示品：${survey.displayed}/8
現在の完成度：${survey.score}/100`);
 return simple(p,'展示館の秘密記録',`【八界をつなぐ、九つ目の記憶】

八つの記念品がそれぞれの場所を得たとき、展示館の床下から小さな文字が浮かび上がった。

「この館は、過去を閉じ込めるために建てられたのではない。まだ見ぬ旅人が、自分の物語を始めるために建てられたのだ。」

風、苔、砂、氷、雷、月、雲、時。そのすべてがひとつの場所に集まっても、世界はひとつにはならない。それぞれの違いがあるからこそ、記録は輝き続ける。

あなたが次に飾るものは、まだ名前のない未来の記憶だ。`);
}
function realmGalleryLastSurvey(p){
 try{const raw=p.getDynamicProperty(ns+'realm_gallery_last_survey');const v=typeof raw==='string'?JSON.parse(raw):null;if(v&&typeof v.score==='number'&&v.counts)return v;}catch{}
 return {score:0,displayed:realmGalleryDisplayed(p).size,counts:{floor:0,wall:0,ceiling:0,lamps:0,pillars:0,frames:0,pedestals:0,monuments:0,realmDecor:0}};
}
async function realmGalleryMonumentMenu(p,at){
 const displayed=realmGalleryDisplayed(p),complete=displayed.size===8;
 if(complete)realmGalleryTitle(p);
 const survey=at?realmGalleryRoomSurvey(p,at):realmGalleryLastSurvey(p);
 property(p,'realm_gallery_last_survey',JSON.stringify(survey));
 realmMuseumTitle(p);
 const secret=realmGalleryHiddenStory(p,survey.score);
 if(complete&&at)realmGalleryPulse(p,{x:at.x+.5,y:at.y+1,z:at.z+.5},7);
 const lines=realmShowpieces.map(([name],i)=>`${displayed.has(i)?'§a◆':'§7◇'} ${name}`).join('\n');
 const c=survey.counts;
 const text=`八界の記念碑は、八つの世界の記念品をひとつに結ぶ場所です。\n\n展示済み記念品：${displayed.size}/8\n${lines}\n\n【展示館の完成度】${survey.score}/100\n床タイル ${c.floor}｜壁装飾 ${c.wall}｜天井装飾 ${c.ceiling}\nランプ ${c.lamps}｜展示柱 ${c.pillars}｜フレーム ${c.frames}｜八界飾り ${c.realmDecor??0}\n\n${complete?'§d【八界の光が満ちています】\n特別称号「八界の展示館守」を獲得済みです。':'八種類すべてを別々の展示台に飾ると、特別称号が解放されます。'}\n${secret?'§a秘密記録：解放済み':'秘密記録：全記念品の展示＋完成度70点で解放'}\n\n展示館の装飾ブロックを記念碑の周囲に配置すると完成度が上がります。ブロックの自動配置・撤去は行いません。`;
 return simple(p,'八界の記念碑',text);
}
async function realmGalleryGuide(p){
 return simple(p,'八界の展示コーナー設計帳',`自分だけの記念品展示コーナーを作りましょう。\n\n【おすすめの組み立て】\n・記憶展示台：主役となる記念品を飾る\n・展示柱：展示台の左右に置いて区画を作る\n・光彩ランプ：角や入口を照らす\n・記憶タイル：床に敷いて展示エリアを区切る\n\n【展示のポイント】\n1. 展示台を複数設置する\n2. それぞれの台を操作して、別々の記念品を選ぶ\n3. 展示柱・光彩ランプ・記憶タイル・八界別の光彩飾りで自由に装飾する\n\n展示品の設定はプレイヤーごとに保存されます。新しい八界別の光彩飾りは各世界の素材感を持つ装飾ブロックで、わずかに発光します。記念碑の周囲に置くと展示館の完成度調査にも反映されます。ブロックの配置や撤去は通常の建築と同じで、既存の建物を自動変更しません。`);
}
async function realmRankBook(p){
 const score=realmProgressScore(p),rank=realmRankUpdate(p),[threshold,name]=realmRanks[rank],next=realmRanks[rank+1];
 const achieved=realmRanks.map(([need,label],i)=>`${score>=need?'§a◆':'§7◇'} ${label}｜${need}ポイント`).join('\n');
 const story=score>=100?'\n\n【風記の大賢者】\n八つの世界を巡り、遺跡の謎を読み、季節の光を集め、記憶を次の旅人へ手渡した。あなたの記録は、もはや一人の旅人のものではない。八界そのものが、あなたの歩みを覚えている。':'\n\n100ポイントに到達すると、風記の大賢者の称号と最終章が解放されます。';
 return simple(p,'冒険者ランクと称号',`現在の称号：${name}
冒険記録ポイント：${score}/155
${next?`次の称号まで：あと${Math.max(0,next[0]-score)}ポイント`:'最高ランク到達！'}

【称号一覧】
${achieved}${story}`);
}


// --- v3.0.0：八界の大記念館・総合図鑑 ---
const realmMuseumTitles=[
 [25,'記憶の案内人'],[50,'八界の学芸員'],[75,'大記念館の守り手'],[90,'風記の大館長']
];
function realmMuseumProgress(p){
 const survey=realmGalleryLastSurvey(p), displayed=realmGalleryDisplayed(p).size;
 const exploration=places.filter(t=>t.id!==0&&visited(p,t.id)).length;
 const discoveries=realmDiscoveryCount(p)+realmTrialCount(p)+realmRuinCount(p)+realmEchoCount(p)+realmMemoryCount(p)+realmHiddenCount(p)+realmJourneyEventCount(p)+realmSeasonStoryCount(p)+realmSecretChapterCount(p);
 const collection=realmShowpieces.filter((_,i)=>realmShowpieceUnlocked(p,i)).length;
 const decor=Math.min(8,Math.floor((survey.counts.lamps+survey.counts.pillars+survey.counts.frames+survey.counts.floor+survey.counts.wall+survey.counts.ceiling)/8));
 return {exploration,discoveries,collection,displayed,room:survey.score,decor,score:Math.min(100,Math.round(exploration/Math.max(1,places.length-1)*20+discoveries/80*25+collection/8*15+displayed/8*20+survey.score/100*20))};
}
function realmMuseumTitle(p){
 const data=realmMuseumProgress(p);let rank=0;
 for(let i=0;i<realmMuseumTitles.length;i++)if(data.score>=realmMuseumTitles[i][0])rank=i+1;
 const old=Math.max(0,Math.floor(num(p,'realm_museum_title',0)));
 if(rank>old){property(p,'realm_museum_title',rank);p.sendMessage(`§d✦ 記念館称号「${realmMuseumTitles[rank-1][1]}」を獲得！§r`);try{p.dimension.spawnParticle('hakkai:climate_7',{x:p.location.x,y:p.location.y+1,z:p.location.z});p.playSound('random.levelup',{volume:.85,pitch:1.15});}catch{}}
 return {data,rank};
}
async function realmMuseumEncyclopedia(p){
 const {data,rank}=realmMuseumTitle(p);
 const titles=realmMuseumTitles.map(([need,name],i)=>`${rank>i?'§a◆':'§7◇'} ${name}｜総合達成度 ${need}%`).join('\n');
 return simple(p,'八界総合大図鑑',`【八界の旅と記念館・総合記録】

総合達成度：${data.score}/100
記録した探索地点：${data.exploration}/${Math.max(1,places.length-1)}
発見・試練・遺跡・記憶：${data.discoveries}件
解放した世界の記念品：${data.collection}/8
展示した異なる記念品：${data.displayed}/8
展示館の完成度：${data.room}/100
展示装飾の充実度：${data.decor}/8

【大記念館の称号】
${titles}

探索、発見、記念品の収集、展示館づくりの成果をまとめた記録です。称号は条件を満たすと自動で更新されます。`);
}
// --- v3.4.0：八界の幻影闘技場・難易度／連勝／優勝記念展示 ---
const realmArenaOpponents=[
 ['風紋の幻獣','hakkai:climate_0',68,8,'風の波動',0],
 ['氷鏡の守り手','hakkai:climate_3',88,10,'氷晶の余波',3],
 ['時環の幻影王','hakkai:climate_7',112,12,'時の共鳴波',7],
 ['記念館の守護幻影','hakkai:climate_7',148,13,'八界記念品の共鳴波',7]
];
const realmArenaStyles=[
 ['風迅','攻めの一手が強化される',1.18,0,0],
 ['水鏡','各ターン終了時に体力を少し回復',1,5,0],
 ['炎舞','属性共鳴の威力が大きく上がる',1.08,0,4],
 ['岩守','守りの構えがさらに強固になる',1,0,1],
 ['雷光','通常攻撃の後に追加の小さな共鳴',1.04,0,0],
 ['清明','魔力集中で得る魔力が増える',1,0,0],
 ['月影','属性共鳴の魔力消費が少なくなる',1,0,0],
 ['時詠','3ターンごとに相手の波動を弱める',1,0,0]
];
const realmArenaDifficulties=[
 ['旅の稽古','敵の体力 0.85倍・攻撃 0.8倍',.85,.8],
 ['標準','基本の難易度',1,1],
 ['覇者への挑戦','敵の体力 1.35倍・攻撃 1.3倍',1.35,1.3]
];
function realmArenaWins(p){return [0,1,2,3].filter(i=>marked(p,'realm_arena_clear',i)).length;}
function realmArenaStyle(p){return Math.max(0,Math.min(7,Math.floor(num(p,'realm_arena_style',0))));}
function realmArenaDifficulty(p){return Math.max(0,Math.min(2,Math.floor(num(p,'realm_arena_difficulty',1))));}
function realmArenaRecord(p){return {wins:realmArenaWins(p),best:Math.max(0,Math.floor(num(p,'realm_arena_best',0))),turns:Math.max(0,Math.floor(num(p,'realm_arena_turns',0))),matches:Math.max(0,Math.floor(num(p,'realm_arena_matches',0))),streak:Math.max(0,Math.floor(num(p,'realm_arena_streak',0))),bestStreak:Math.max(0,Math.floor(num(p,'realm_arena_best_streak',0))),hardWins:Math.max(0,Math.floor(num(p,'realm_arena_hard_wins',0)))};}
function realmArenaFinalUnlocked(p){const data=realmMuseumProgress(p);return marked(p,'realm_arena_clear',2)&&data.score>=50&&data.collection>=4;}
async function realmArenaMenu(p){
 const wins=realmArenaWins(p),style=realmArenaStyle(p),difficulty=realmArenaDifficulty(p),rec=realmArenaRecord(p),finalOpen=realmArenaFinalUnlocked(p);
 const rows=realmArenaOpponents.map(([name],i)=>{
  const clear=marked(p,'realm_arena_clear',i),locked=i===3&&!finalOpen;
  return [`${clear?'◆':'◇'} ${i+1}. ${name}｜${clear?'勝利済み':locked?'記念館条件未達':'挑戦する'}`];
 });
 rows.push([`戦術スタイル変更（現在：${realmArenaStyles[style][0]}）`],
  [`難易度変更（現在：${realmArenaDifficulties[difficulty][0]}）`],
  ['戦績・連勝記録を見る'],['優勝記念展示を見る'],['閉じる']);
 const data=realmMuseumProgress(p);
 const pick=await form(p,'八界の幻影闘技場',`八属性の戦術を選び、相手の予告を読んで戦うターン制ミニゲームです。実際のプレイヤー・モブ・建築物へのダメージはありません。

勝利記録：${wins}/4　｜　累計試合：${rec.matches}
連勝中：${rec.streak}　｜　最高連勝：${rec.bestStreak}
現在の戦術：${realmArenaStyles[style][0]}
難易度：${realmArenaDifficulties[difficulty][0]} — ${realmArenaDifficulties[difficulty][1]}

【記念館との連動】
総合達成度：${data.score}/100　｜　解放記念品：${data.collection}/8
第4戦「記念館の守護幻影」：${finalOpen?'§a挑戦可能':'§7達成度50%以上＋記念品4種類以上で解放'}

高難度で勝利すると、初回の高難度勝利ごとに追加結晶を獲得できます。`,rows);
 if(pick===undefined||pick===8)return;
 if(pick===4)return realmArenaStyleMenu(p);
 if(pick===5)return realmArenaDifficultyMenu(p);
 if(pick===6)return realmArenaRecordMenu(p);
 if(pick===7)return realmArenaHallOfFame(p);
 if(pick===3&&!finalOpen)return notice(p,'§e記念館の達成度50%以上、記念品4種類以上が必要です');
 if(pick>0&&!marked(p,'realm_arena_clear',pick-1)&&pick<3)return notice(p,'§eまず前の試合に勝利してください');
 return realmArenaBattle(p,pick);
}
async function realmArenaStyleMenu(p){
 const rows=realmArenaStyles.map(([name,desc],i)=>[`${realmArenaStyle(p)===i?'◆ ':'◇ '}${attrs[i]??'八界'}｜${name}：${desc}`]);
 rows.push(['戻る']);
 const pick=await form(p,'八属性の戦術スタイル','戦闘中の効果が異なります。いつでも変更できます。',rows);
 if(pick===undefined||pick>=8)return realmArenaMenu(p);
 property(p,'realm_arena_style',pick);
 notice(p,`§a戦術スタイルを「${realmArenaStyles[pick][0]}」に変更しました`);
 return realmArenaMenu(p);
}
async function realmArenaDifficultyMenu(p){
 const current=realmArenaDifficulty(p);
 const rows=realmArenaDifficulties.map(([name,desc],i)=>[`${current===i?'◆ ':'◇ '}${name}｜${desc}`]);
 rows.push(['戻る']);
 const pick=await form(p,'幻影闘技場・難易度選択','難易度は次の試合から反映されます。記録と解放条件は共通です。',rows);
 if(pick===undefined||pick>=3)return realmArenaMenu(p);
 property(p,'realm_arena_difficulty',pick);
 notice(p,`§a難易度を「${realmArenaDifficulties[pick][0]}」に変更しました`);
 return realmArenaMenu(p);
}
async function realmArenaRecordMenu(p){
 const r=realmArenaRecord(p),wins=r.wins;
 const title=wins===4?'八界の記念館守護者':wins===3?'八界の幻影覇者':wins===2?'三界の挑戦者':wins===1?'幻影の新星':'闘技場の見習い';
 return simple(p,'幻影闘技場・戦績',`称号：${title}
勝利記録：${wins}/4
累計試合数：${r.matches}
累計行動ターン：${r.turns}
最短勝利ターン：${r.best?`${r.best}ターン`:'未記録'}
現在の連勝：${r.streak}
最高連勝：${r.bestStreak}
高難度での勝利：${r.hardWins}回

闘技場の初回勝利1回につき、冒険者ランクポイントを2ポイント獲得します。`);
}
async function realmArenaHallOfFame(p){
 const r=realmArenaRecord(p),wins=r.wins;
 const title=wins===4?'八界の記念館守護者':wins===3?'八界の幻影覇者':wins===2?'三界の挑戦者':wins===1?'幻影の新星':'闘技場の見習い';
 if(wins===4&&!marked(p,'realm_arena_hall_title',0)){mark(p,'realm_arena_hall_title',0);p.sendMessage('§d✦ 記念館に優勝記録が刻まれました。称号「八界の幻影覇者」を獲得！§r');try{for(let i=0;i<8;i++)p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:p.location.x,y:p.location.y+1+(i%2)*.35,z:p.location.z});p.playSound('random.levelup',{volume:.8,pitch:1.25});}catch{}}
 return simple(p,'八界の幻影闘技場・優勝記念展示',`【記念館に刻まれた戦績】

現在の称号：${title}
幻影の勝利記録：${wins}/4
現在の連勝：${r.streak}
最高連勝：${r.bestStreak}
最短勝利：${r.best?r.best+'ターン':'未記録'}
高難度勝利：${r.hardWins}回

${wins===4?'§d八界すべての幻影に勝利しました。記念館に優勝記録が刻まれています。':'§7四つの幻影すべてに勝利すると、優勝記念展示が完成し、特別称号を獲得します。'}

この記録はプレイヤーごとに保存されます。`);
}
async function realmArenaEntrance(p,stage,difficulty){
 const [name,particle]=realmArenaOpponents[stage];
 const lines=[
  `§b【第一の幻影】${name}が風紋の向こうから姿を現した。`,
  `§3【第二の幻影】${name}が氷鏡の光をまとって現れた。`,
  `§d【最終の幻影】${name}が時の輪を越えて現れた。`,
  `§6【記念館の守護者】${name}が八つの記念品の光から目覚めた。`
 ];
 p.sendMessage(lines[stage]);
 p.sendMessage(`§7舞台：${['風紋の円庭','氷鏡の回廊','時環の祭壇','八界記念館・幻影の間'][stage]}　｜　難易度：${realmArenaDifficulties[difficulty][0]}`);
 try{
  for(let i=0;i<8;i++)p.dimension.spawnParticle(`hakkai:climate_${(stage*2+i)%8}`,{x:p.location.x+Math.cos(i*Math.PI/4)*1.8,y:p.location.y+1+(i%3)*.35,z:p.location.z+Math.sin(i*Math.PI/4)*1.8});
  p.playSound('mob.evocation_illager.prepare_summon',{volume:.6,pitch:stage===3?.8:1});
 }catch{}
}
async function realmArenaBattle(p,stage){
 const [name,particle,baseHp,baseDamage,enemyMove,element]=realmArenaOpponents[stage];
 const style=realmArenaStyle(p),styleName=realmArenaStyles[style][0],difficulty=realmArenaDifficulty(p),diff=realmArenaDifficulties[difficulty];
 const maxHp=Math.max(1,Math.round(baseHp*diff[2])),enemyDamage=Math.max(1,Math.round(baseDamage*diff[3]));
 const displayBonus=stage===3?realmGalleryDisplayed(p).size:0;
 let hp=100,mp=100,enemy=maxHp,turn=0,guard=false,focus=false,combo=0;
 await realmArenaEntrance(p,stage,difficulty);
 while(p.isValid&&hp>0&&enemy>0&&turn<20){
  const heavy=(stage===3?(turn+1)%2===0:(turn+1)%3===0);
  const intent=heavy?`${enemyMove}（強波動・守り推奨）`:'幻影波を放つ構え';
  const choice=await form(p,`幻影闘技場｜${name}`,`第${turn+1}ターン　｜　戦術：${styleName}　｜　難易度：${diff[0]}
あなた：体力 ${hp}/100　魔力 ${mp}/100
相手：${enemy} / ${maxHp}
連携：${combo>=2?'共鳴連携中':combo===1?'連携準備':'なし'}
${stage===3?`記念品共鳴：展示 ${displayBonus}/8（共鳴攻撃に追加効果）`:''}

相手の予告：${intent}

行動を選んでください。`,[
   ['風紋打ち｜安定した幻影ダメージ'],
   ['守りの構え｜次の波動を軽減'],
   ['魔力集中｜魔力を回復'],
   [`属性共鳴｜魔力${style===6?14:20}で大きな一撃（現在 ${mp}/100）`],
   ['試合をやめる']
  ]);
  if(choice===undefined||choice===4)return notice(p,'§7幻影闘技場を退出しました');
  turn++;
  let damage=0;
  if(choice===0){damage=Math.round((focus?23:15)*realmArenaStyles[style][2]);focus=false;combo=Math.min(2,combo+1);}
  if(choice===1){guard=true;focus=false;combo=0;}
  if(choice===2){mp=Math.min(100,mp+(style===5?34:24));focus=true;combo=0;}
  if(choice===3){const cost=style===6?14:20;if(mp<cost){notice(p,'§e魔力が足りません');turn--;continue;}mp-=cost;damage=Math.round((focus?38:29)*(style===2?1.32:1));if(combo>=1)damage=Math.round(damage*1.18);if(style===element)damage=Math.round(damage*1.2);if(stage===3&&displayBonus>=4)damage=Math.round(damage*(1+Math.min(8,displayBonus)*.025));focus=false;combo=0;}
  if(style===4&&choice===0&&turn%2===0)damage+=6;
  if(damage>0){enemy=Math.max(0,enemy-damage);try{p.dimension.spawnParticle(particle,{x:p.location.x,y:p.location.y+1,z:p.location.z});p.playSound('random.orb',{volume:.55,pitch:1.1});}catch{}}
  if(enemy<=0)break;
  let incoming=enemyDamage+(heavy?(stage===3?10:8):0);
  if(style===7&&turn%3===0)incoming=Math.max(2,Math.floor(incoming*.55));
  if(guard)incoming=Math.max(2,Math.floor(incoming*(style===3?.12:.22)));
  hp=Math.max(0,hp-incoming);guard=false;
  if(style===1)hp=Math.min(100,hp+realmArenaStyles[1][3]);
  try{p.playSound('random.anvil_land',{volume:.25,pitch:1.5});}catch{}
 }
 if(!p.isValid)return;
 property(p,'realm_arena_matches',realmArenaRecord(p).matches+1);
 property(p,'realm_arena_turns',realmArenaRecord(p).turns+turn);
 if(hp>0&&enemy<=0){
  const first=!marked(p,'realm_arena_clear',stage);
  if(first){
   let reward,count;
   if(stage===3&&realmGalleryComplete(p)){reward=ns+'crystal_7';count=3;}
   else if(stage===3){reward=ns+'chronicle_fragment';count=8;}
   else if(stage===2){reward=ns+'crystal_7';count=2;}
   else{reward=ns+`shard_${stage===0?0:3}`;count=3;}
   if(!give(p,reward,count)){notice(p,'§e勝利！持ち物に空きを作ると報酬を受け取れます。空きを作って再挑戦してください。');return;}
   mark(p,'realm_arena_clear',stage);
  }
  const oldBest=realmArenaRecord(p).best;
  if(!oldBest||turn<oldBest)property(p,'realm_arena_best',turn);
  const streak=realmArenaRecord(p).streak+1;
  property(p,'realm_arena_streak',streak);
  if(streak>realmArenaRecord(p).bestStreak)property(p,'realm_arena_best_streak',streak);
  if(difficulty===2&&!marked(p,'realm_arena_hard_clear',stage)){
   if(give(p,ns+'crystal_7',1)){mark(p,'realm_arena_hard_clear',stage);property(p,'realm_arena_hard_wins',realmArenaRecord(p).hardWins+1);p.sendMessage('§d✦ 高難度初回勝利：時鐘の結晶×1！§r');}
  }
  if(first)realmRankUpdate(p);
  p.sendMessage(`§d✦ 幻影闘技場勝利：${name}§r`);
  p.sendMessage(`§a連勝記録：${streak}回　｜　最高連勝：${realmArenaRecord(p).bestStreak}回`);
  p.sendMessage(first?(stage===3&&realmGalleryComplete(p)?'§a八界の展示完成報酬：時鐘の結晶×3':'§a初回報酬を受け取りました。'):'§7この試合の勝利記録は登録済みです。');
  try{for(let i=0;i<8;i++)p.dimension.spawnParticle(`hakkai:climate_${(style+i)%8}`,{x:p.location.x,y:p.location.y+1+(i%3)*.3,z:p.location.z});p.playSound('random.levelup',{volume:.8,pitch:1.05+style*.025});}catch{}
  return realmArenaMenu(p);
 }
 property(p,'realm_arena_streak',0);
 notice(p,'§c今回は敗北。連勝記録はここで終了しました。体勢を整えて再挑戦できます。');
}

async function realmMuseumGrandStory(p){
 const {data,rank}=realmMuseumTitle(p);
 if(data.score<75)return simple(p,'大記念館・最終記録',`この記録はまだ完成していません。\n\n総合達成度：${data.score}/100\n解放条件：総合達成度75%以上\n\n八界を巡り、記念品を集め、展示館にそれぞれの世界の光を灯しましょう。`);
 if(!marked(p,'realm_museum_grand_story',0)){mark(p,'realm_museum_grand_story',0);p.sendMessage('§d✦ 大記念館の最終記録が解放されました。§r');}
 return simple(p,'八界の大記念館・最後の頁',`【風記を受け継ぐ場所】\n\n八つの世界を巡った旅人は、やがて帰る場所をつくった。そこには風の徽章があり、苔灯のランタンがあり、砂紋の羅針盤や氷鏡の結晶が並んでいる。雷炉の歯車は静かに時を刻み、月影の雫は遠い水脈を思い出させ、雲海の羽飾りは空への道を示し、時鐘の砂時計は次の旅の始まりを告げる。\n\n記念館は旅の終わりではない。訪れた誰かが展示品を見て、新しい世界へ歩き出すための入口だ。\n\nあなたが残した風記は、次の旅人の最初の一頁になる。`);
}

function checkEightRealmMemory(p){
 const realmIds=[1,2,3,4,5,6,7,8];
 const count=realmIds.filter(id=>visited(p,id)).length;
 if(count===realmIds.length&&!marked(p,'eight_realms_memory',0)){
   mark(p,'eight_realms_memory',0);
   p.sendMessage('§d✦ 八界の記憶がひとつにつながった！§r');
   p.sendMessage('§7八つの世界を巡った旅の記録が完成しました。ガイド本の旅の記録から、これまでの出会いを読み返せます。');
 }
 return count;
}
function recordEntry(p,site){
 if(!visited(p,site.id)){
   mark(p,'visits',site.id);
   p.sendMessage(`§6風記に記録：${site.name}§r  ${site.description}`);
 }
 property(p,'last_site',site.id);
 if(site.kind==='island'||site.id>=9&&site.id<=20)property(p,'last_island',site.id);
 checkEightRealmMemory(p);
}
// 記録は旧IDを維持。配置はシード地形の区画キューが担当する。
function naturalSiteTick(p,site){
 if(isNaturalSite(site)&&num(world,`built_${site.id}`)&&!visited(p,site.id))recordEntry(p,site);
}
// Only untouched chunks qualify. A prior terrain job, partial structure or
// player construction must never be overwritten on an upgraded world.
async function buildSeededSite(site){
 const b=siteBounds(site,width);
 for(let cx=Math.floor(b.x0/16);cx<=Math.floor(b.x1/16);cx++)for(let cz=Math.floor(b.z0/16);cz<=Math.floor(b.z1/16);cz++){
  if(num(world,`seed_land_${site.dim}_${cx}_${cz}_v1`)||num(world,`seed_land_${site.dim}_${cx}_${cz}_skip_v1`))
   throw Error(`既存地形のため探索地 ${site.id} を保護: ${cx},${cz}`);
 }
 return build(site,true);
}
async function arrive(p,site){
 if(isNaturalSite(site)){notice(p,'§eこの場所には各界を歩いて向かってください');return false;}
 const s=state(p);
 if(s.busy||!p.isValid)return false;
 if(system.currentTick<s.arrival){notice(p,'§e風が静まるまで待ってね');return;}
 s.busy=true;notice(p,`§b${site.name}への風を待っています…`,100);
 if(overworld(p)){
   const l=point(p);
   try{if(safe(p.dimension,l))property(p,'overworld_point',JSON.stringify(l));}catch{}
 }
 try{
   await build(site);
   if(!p.isValid)return;
   const d=world.getDimension(dimID(site.dim)), l=coords(site);
   return await loaded(d,{x:l.x-5,y:l.y-3,z:l.z-5},{x:l.x+5,y:l.y+4,z:l.z+5},async()=>{
     if(!p.isValid)return false;
     const target=safeNear(d,l,4);
     if(!target||!p.tryTeleport(target,{dimension:d,checkForBlocks:true}))throw Error('到着地点がふさがれています');
     s.arrival=system.currentTick+45;
     s.musicAt=0;
     recordEntry(p,site);
     if(site.id===0){restore(p);notice(p,'§a風見台へようこそ');}else{notice(p,`§b${site.name}`);try{updateWeather(site);}catch{}}
     await timed(()=>{},8);
     return true;
   });
 }catch(err){if(p.isValid){p.sendMessage('§e風の道を開けなかった。少し待って、もう一度お試しください。');report('移動',err);}return false;}
 finally{s.busy=false;}
}
async function returnNatural(p,kind){
 const s=state(p);if(s.busy||!p.isValid)return;
 if(system.currentTick<s.arrival){notice(p,'§e風が静まるまで待ってね');return;}
 const saved=kind==='bed'?p.getSpawnPoint():parsePoint(p,kind);
 if(kind==='bed'&&!saved){notice(p,'§eベッドのリスポーン地点が登録されていない');return;}
 const dest=saved??world.getDefaultSpawnLocation();
 const id=saved?('id' in saved?saved.id:saved.dimension.id):'minecraft:overworld';
 const d=world.getDimension(id);
 s.busy=true;
 try{
   await loaded(d,{x:dest.x-6,y:dest.y-6,z:dest.z-6},{x:dest.x+6,y:dest.y+6,z:dest.z+6},async()=>{
     if(!p.isValid)return;
     let at=safeNear(d,dest);
     if(!at&&!saved){
       const above=d.getTopmostBlock({x:Math.floor(dest.x),z:Math.floor(dest.z)});
       if(above)at=safeNear(d,{...above.location,y:above.y+1});
     }
     if(!at||!p.tryTeleport(at,{dimension:d,checkForBlocks:true})){notice(p,'§e安全な足場がないため、移動を中止した');return;}
     s.arrival=system.currentTick+45;notice(p,'§b帰還しました');
     await timed(()=>{},8);
   });
 }catch(err){if(p.isValid)notice(p,'§e帰還できなかった。再試行してね');}
 finally{s.busy=false;}
}
function updateWeather(site){
 if(site.kind==='trail'||site.kind==='atlas'||site.kind==='linked')return;
 const id=site.dim,t=system.currentTick,old=recentWeather.get(id);
 if(old!==undefined&&t-old<900)return;
 recentWeather.set(id,t);
 const d=world.getDimension(dimID(id));
 const season=era(), shift=Math.floor(world.getAbsoluteTime()/2100)%6;
 const weather=id===4?(shift===0?WeatherType.Rain:shift===3?WeatherType.Clear:WeatherType.Thunder):
   id===1?(shift<4?WeatherType.Rain:WeatherType.Clear):
   id===3?(season==='冬'||shift%3!==0?WeatherType.Rain:WeatherType.Clear):
   id===0&&season==='春'&&shift%3===0?WeatherType.Rain:WeatherType.Clear;
 d.setWeather(weather,1000);
 currentWeather.set(d.id.replace(/^minecraft:/,''),weather);
}
function soundtrack(p,site,s){
 if(wardenBoss?.musicActive(p.id)){if(s.sound){try{s.sound.stop();}catch{}s.sound=undefined;}s.lastMusic=undefined;s.musicAt=0;return;}
 const town=townNear(p.dimension,p.location), work=s.workSoundAt>system.currentTick, danger=site&&enemies(p,11,1).length>0;
 const scene=danger?'combat':town&&townFestival(town)?'festival':work?'workshop':town?'village':site?.kind==='atlas'?'atlas':undefined;
 const id=scene??site?.original??site?.id??-1;
 if(s.lastMusic!==id||num(p,'mute')){
   if(s.sound){try{s.sound.stop();}catch{}s.sound=undefined;}
   s.lastMusic=id;s.musicAt=0;
 }
 if(id<0||num(p,'mute')||system.currentTick<s.musicAt)return;
 s.musicAt=system.currentTick+(scene?720:id<=8?1050:660);
 s.sound=p.playSound(`hakkai.${scene??`air_${id}`}`,{volume:scene?.43:.55,pitch:site?.landmark==='past'?1.09:site?.landmark==='future'?.88:1});
}

// --- 非戦闘地形：時の終着駅・左右の記憶庭園 ---
const timeTerrainKey='time_terrain_v1';
const timeTerrainSkippedKey='time_terrain_skipped_v1';
let timeTerrainTask;
let timeTerrainRetryAt=0;
function timeSet(d,x,y,z,type){
 const b=d.getBlock({x,y,z});if(!b)throw new Error(`時の庭園ブロックを取得できない: ${x},${y},${z}`);
 d.setBlockType({x,y,z},type);
}
async function buildTimeTerrain(){
 if(num(world,timeTerrainKey))return true;
 if(num(world,timeTerrainSkippedKey))return false;
 if(system.currentTick<timeTerrainRetryAt)return false;
 if(timeTerrainTask)return timeTerrainTask;
 const d=world.getDimension(dimID(7));
 const task=loaded(d,{x:23,y:78,z:-21},{x:73,y:104,z:21},async()=>{
   if(num(world,timeTerrainKey))return true;
   if(!num(world,'built_8')||!num(world,'built_16'))return false;
   // 中央の既存線路・ホームには触れない。左右の植栽帯だけを個別に事前確認。
   const leftFrom={x:23,y:78,z:-21},leftTo={x:73,y:104,z:-8};
   const rightFrom={x:23,y:78,z:8},rightTo={x:73,y:104,z:21};
   if(d.containsBlock(new BlockVolume(leftFrom,leftTo),{excludeTypes:['minecraft:air']})||d.containsBlock(new BlockVolume(rightFrom,rightTo),{excludeTypes:['minecraft:air']})){
     property(world,timeTerrainSkippedKey,1);
     report('時の終着駅','左右の装飾帯に既存ブロックがあるため、線路や建築を守って生成を中止しました');
     return false;
   }
   for(const z0 of [-21,8]){
     const z1=z0<0?-8:21;
     d.fillBlocks(new BlockVolume({x:23,y:78,z:z0},{x:73,y:84,z:z1}),'minecraft:stone');
     d.fillBlocks(new BlockVolume({x:23,y:85,z:z0},{x:73,y:87,z:z1}),'minecraft:deepslate_bricks');
     d.fillBlocks(new BlockVolume({x:23,y:88,z:z0},{x:73,y:88,z:z1}),'hakkai:clockstone');
     // 記憶の小径：中央の線路から離した左右の庭園帯。
     for(let x=25;x<=71;x+=2){
       const z=z0<0?-14:14;
       timeSet(d,x,89,z,'hakkai:brasswork');
       if(x%6===1){timeSet(d,x,90,z,'hakkai:timeglass');timeSet(d,x,91,z,'minecraft:sea_lantern');}
       for(const side of [-3,3]){
         timeSet(d,x,89,z+side,'minecraft:polished_andesite');
         if(x%8===1)timeSet(d,x,90,z+side,'minecraft:lantern');
       }
     }
     // 三つの時代を表す小さな記念柱。既存ホームの視界と動線から外す。
     for(const x of [31,47,63]){
       const z=z0<0?-18:18;
       for(let y=89;y<=93;y++)timeSet(d,x,y,z,y===93?'hakkai:timeglass':'hakkai:brasswork');
       timeSet(d,x+1,91,z,'hakkai:clockstone');
       timeSet(d,x-1,91,z,'hakkai:clockstone');
       timeSet(d,x,94,z,'minecraft:sea_lantern');
       timeSet(d,x,95,z,'hakkai:timeglass');
     }
     // 低い植栽と光の点在で、駅前の硬い印象を和らげる。
     for(const x of [27,37,57,67]){
       const z=z0<0?-11:11;
       timeSet(d,x,89,z,'minecraft:moss_block');
       timeSet(d,x,90,z,'minecraft:azalea');
       timeSet(d,x+1,89,z,'minecraft:flowering_azalea_leaves');
       timeSet(d,x-1,89,z,'hakkai:timeglass');
     }
   }
   property(world,timeTerrainKey,1);
   report('時の終着駅','左右の記憶庭園を生成しました。既存の中央線路・ホームは変更していません');
   return true;
 });
 timeTerrainTask=task;
 try{return await task;}catch(err){timeTerrainRetryAt=system.currentTick+200;throw err;}finally{timeTerrainTask=undefined;}
}
// --- 時の終着駅地形ここまで ---

// --- 時の終着駅ランドマーク追加：時環の大時計塔 ---
const timeLandmarkKey='time_landmark_v1';
const timeLandmarkSkippedKey='time_landmark_skipped_v1';
let timeLandmarkTask;
async function ensureTimeLandmarks(d){
 if(num(world,timeLandmarkKey))return true;
 if(num(world,timeLandmarkSkippedKey))return false;
 // 既存の記念柱（x31,z18）の上だけを使い、中央線路・ホームには触れない。
 const from={x:29,y:96,z:16},to={x:33,y:105,z:20};
 if(d.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']})){
   property(world,timeLandmarkSkippedKey,1);
   report('時の終着駅ランドマーク','時計塔の上部予定区画に既存ブロックがあるため、上書きを避けて追加を見送りました');
   return false;
 }
 // 記念柱の真上に真鍮の塔を立ち上げ、正面に時刻盤を設ける。
 for(const [x,z] of [[30,17],[32,17],[30,19],[32,19]]){
   timeSet(d,x,96,z,'hakkai:brasswork');
   for(let y=97;y<=103;y++)timeSet(d,x,y,z,'hakkai:brasswork');
   timeSet(d,x,104,z,'minecraft:sea_lantern');
 }
 for(let y=96;y<=103;y++)timeSet(d,31,y,18,'hakkai:clockstone');
 // 時計盤は線路と反対側（北側）を向ける。
 for(let x=30;x<=32;x++)for(let y=99;y<=102;y++){
   const edge=x===30||x===32||y===99||y===102;
   timeSet(d,x,y,16,edge?'hakkai:brasswork':'hakkai:clockstone');
 }
 timeSet(d,31,100,16,'hakkai:timeglass');
 timeSet(d,31,101,16,'hakkai:timeglass');
 timeSet(d,31,103,16,'minecraft:lightning_rod');
 timeSet(d,31,104,18,'hakkai:timeglass');
 // 駅舎側の足元照明を塔の外周に追加。
 for(const [x,z] of [[29,18],[33,18],[31,16],[31,20]])timeSet(d,x,96,z,'minecraft:sea_lantern');
 property(world,timeLandmarkKey,1);
 report('時の終着駅ランドマーク','時環の大時計塔を追加しました。中央線路・ホームは変更していません');
 return true;
}
// --- 時の終着駅ランドマークここまで ---


function climate(p,site,s){
 const forestPassage=p.dimension.id===dimID(1)&&num(world,forestTerrainKey)&&p.location.x>=23&&p.location.x<=73&&p.location.z>=-22&&p.location.z<=22;
 const desertPassage=p.dimension.id===dimID(2)&&num(world,desertTerrainKey)&&p.location.x>=23&&p.location.x<=73&&p.location.z>=-22&&p.location.z<=22;
 const icePassage=p.dimension.id===dimID(3)&&num(world,iceTerrainKey)&&p.location.x>=23&&p.location.x<=73&&p.location.z>=-22&&p.location.z<=22;
 const cliffPassage=p.dimension.id===dimID(4)&&num(world,cliffTerrainKey)&&p.location.x>=23&&p.location.x<=73&&p.location.z>=-22&&p.location.z<=22;
 const cavePassage=p.dimension.id===dimID(5)&&num(world,caveTerrainKey)&&p.location.x>=23&&p.location.x<=73&&p.location.z>=-22&&p.location.z<=22;
 const skyPassage=p.dimension.id===dimID(6)&&num(world,skyTerrainKey)&&p.location.x>=23&&p.location.x<=73&&p.location.z>=-22&&p.location.z<=22;
 const timePassage=p.dimension.id===dimID(7)&&num(world,timeTerrainKey)&&p.location.x>=23&&p.location.x<=73&&Math.abs(p.location.z)>=8&&Math.abs(p.location.z)<=21;
 // 共鳴判定は通路限定ではなく、地形生成済みの各界全域で有効化。
 // 実際のブロック探索は後段の9地点だけなので、遠方の建物を走査しない。
 const meadowRealm=p.dimension.id===dimID(0)&&num(world,meadowTerrainKey);
 const forestRealm=p.dimension.id===dimID(1)&&num(world,forestTerrainKey);
 const desertRealm=p.dimension.id===dimID(2)&&num(world,desertTerrainKey);
 const iceRealm=p.dimension.id===dimID(3)&&num(world,iceTerrainKey);
 const cliffRealm=p.dimension.id===dimID(4)&&num(world,cliffTerrainKey);
 const caveRealm=p.dimension.id===dimID(5)&&num(world,caveTerrainKey);
 const skyRealm=p.dimension.id===dimID(6)&&num(world,skyTerrainKey);
 const timeRealm=p.dimension.id===dimID(7)&&num(world,timeTerrainKey);
 const theme=forestPassage?1:desertPassage?2:icePassage?3:cliffPassage?4:cavePassage?5:skyPassage?6:timePassage?7:site?.id>0?aspect(site):-1, fogMode=num(p,'quiet_climate')?-1:theme;
 if(s.fogTheme!==fogMode){
   try{p.runCommand('fog @s remove hakkai_climate');}catch{}
   if(fogMode>=0)try{p.runCommand(`fog @s push hakkai:realm_fog_${theme} hakkai_climate`);}catch{}
   s.fogTheme=fogMode;
 }
 const hasGeneratedRealm=meadowRealm||forestRealm||desertRealm||iceRealm||cliffRealm||caveRealm||skyRealm||timeRealm;
 // 通路外では気候テーマが未設定でも、生成済みの界なら専用ブロック共鳴の処理を続行する。
 if((fogMode<0&&!hasGeneratedRealm)||p.location.y<75||system.currentTick<(s.climateAt??0))return;
 s.climateAt=system.currentTick+48+(p.id.length%4)*10;
 const view=p.getViewDirection(),l=p.location;
 // 気候粒子は従来どおりテーマが有効な場所だけ。共鳴粒子とは独立させる。
 if(theme>=0&&fogMode>=0)try{p.spawnParticle(`hakkai:climate_${theme}`,{x:l.x+view.x*2.6,y:l.y+1.05,z:l.z+view.z*2.6});}catch{}
 // 専用ブロックの近くにいる時だけ、その世界固有の共鳴粒子を追加する。
 // 3x3x1の小さな範囲を一定間隔で確認し、常時大量スキャンを避ける。
 const nearbyRealmBlock=(ids)=>{
   const bx=Math.floor(l.x),by=Math.floor(l.y),bz=Math.floor(l.z);
   for(const [dx,dy,dz] of [[0,0,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[1,-1,0],[-1,-1,0],[0,-1,1],[0,-1,-1]]){
     try{const b=p.dimension.getBlock({x:bx+dx,y:by+dy,z:bz+dz});if(b&&ids.includes(b.typeId))return {x:bx+dx+.5,y:by+dy+.65,z:bz+dz+.5};}catch{}
   }
   return undefined;
 };
 const resonance=(enabled,ids,particle,key,interval)=>{
   if(!enabled||system.currentTick<(s[key]??0))return;
   const at=nearbyRealmBlock(ids);
   if(!at)return;
   s[key]=system.currentTick+interval;
   try{p.spawnParticle(particle,at);}catch{}
 };
 resonance(desertRealm,['hakkai:windworn_sandstone','hakkai:red_dune_stone'],'hakkai:dune_spiral','desertBlockResonanceAt',150);
 resonance(iceRealm,['hakkai:mirror_ice','hakkai:frost_stone'],'hakkai:frost_glimmer','iceBlockResonanceAt',145);
 resonance(cliffRealm,['hakkai:thunderstone','hakkai:storm_crystal'],'hakkai:storm_spark','cliffBlockResonanceAt',135);
 resonance(caveRealm,['hakkai:abyssal_stone','hakkai:glow_moss','hakkai:moonstone'],'hakkai:cave_glimmers','caveBlockResonanceAt',155);
 resonance(skyRealm,['hakkai:cloudstone','hakkai:sky_crystal'],'hakkai:sky_motes','skyBlockResonanceAt',140);
 resonance(timeRealm,['hakkai:clockstone','hakkai:timeglass'],'hakkai:time_sparks','timeBlockResonanceAt',125);
 resonance(meadowRealm,['hakkai:season_plot','hakkai:spring_tulip','hakkai:summer_corn','hakkai:autumn_squash','hakkai:summer_sunflower','hakkai:watch_post'],'hakkai:meadow_pollen','meadowBlockResonanceAt',160);
 resonance(forestRealm,['hakkai:canopy_0','hakkai:canopy_1','hakkai:canopy_2','hakkai:canopy_3'],'hakkai:forest_spores','forestBlockResonanceAt',155);
 // ランドマーク固有の環境演出。既存粒子のみを低頻度で再利用し、建築・戦闘処理には触れない。
 if(skyRealm&&Math.hypot(l.x-47,l.z-14)<=11&&Math.abs(l.y-105)<=13&&system.currentTick>=(s.skyLandmarkAmbientAt??0)){
   s.skyLandmarkAmbientAt=system.currentTick+104;
   try{p.spawnParticle('hakkai:sky_motes',{x:47.5,y:110.15,z:14.5});}catch{}
   try{p.spawnParticle('hakkai:sky_motes',{x:43.5,y:103.25,z:14.5});}catch{}
 }
 if(timeRealm&&Math.hypot(l.x-31,l.z-18)<=11&&Math.abs(l.y-100)<=17&&system.currentTick>=(s.timeLandmarkAmbientAt??0)){
   s.timeLandmarkAmbientAt=system.currentTick+112;
   try{p.spawnParticle('hakkai:time_sparks',{x:31.5,y:105.35,z:18.5});}catch{}
   try{p.spawnParticle('hakkai:time_sparks',{x:29.5,y:96.25,z:18.5});}catch{}
 }
 if(theme===0&&system.currentTick>=(s.meadowPollenAt??0)){
   s.meadowPollenAt=system.currentTick+112;
   try{p.spawnParticle('hakkai:meadow_pollen',{x:l.x+view.x*2.1,y:l.y+1.2,z:l.z+view.z*2.1});}catch{}
 }
 if(forestPassage&&system.currentTick>=(s.forestSporeAt??0)){
   s.forestSporeAt=system.currentTick+94;
   try{p.spawnParticle('hakkai:forest_spores',{x:l.x+view.x*2.0,y:l.y+1.25,z:l.z+view.z*2.0});}catch{}
 }
 if(icePassage&&system.currentTick>=(s.frostAt??0)){
   s.frostAt=system.currentTick+105;
   try{p.spawnParticle('hakkai:frost_glimmer',{x:l.x+view.x*2.0,y:l.y+1.15,z:l.z+view.z*2.0});}catch{}
 }
 if(desertPassage&&system.currentTick>=(s.duneAt??0)){
   s.duneAt=system.currentTick+95;
   try{p.spawnParticle('hakkai:dune_spiral',{x:l.x+view.x*1.8,y:l.y+.55,z:l.z+view.z*1.8});}catch{}
 }
 if(cliffPassage&&system.currentTick>=(s.stormAt??0)){
   s.stormAt=system.currentTick+88;
   try{p.spawnParticle('hakkai:storm_spark',{x:l.x+view.x*2.0,y:l.y+1.1,z:l.z+view.z*2.0});}catch{}
 }
 if(cavePassage&&system.currentTick>=(s.caveAt??0)){
   s.caveAt=system.currentTick+76;
   try{p.spawnParticle('hakkai:cave_glimmers',{x:l.x+view.x*2.1,y:l.y+1.05,z:l.z+view.z*2.1});}catch{}
 }
 if(skyPassage&&system.currentTick>=(s.skyAt??0)){
   s.skyAt=system.currentTick+68;
   try{p.spawnParticle('hakkai:sky_motes',{x:l.x+view.x*2.2,y:l.y+1.25,z:l.z+view.z*2.2});}catch{}
 }
 if(timePassage&&system.currentTick>=(s.timeAt??0)){
   s.timeAt=system.currentTick+72;
   try{p.spawnParticle('hakkai:time_sparks',{x:l.x+view.x*1.9,y:l.y+1.35,z:l.z+view.z*1.9});}catch{}
 }
 // v1.9.7: 各界の記念ランドマークに、その世界の既存粒子で控えめな常設演出を追加。
 // 訪問者が近くにいる場合だけ発生し、建築区画・ブロック走査・戦闘処理には触れない。
 const landmarkAura=(enabled,key,cx,cy,cz,radius,particle,interval)=>{
   if(!enabled||Math.hypot(l.x-cx,l.z-cz)>radius||Math.abs(l.y-cy)>18||system.currentTick<(s[key]??0))return;
   s[key]=system.currentTick+interval;
   try{p.spawnParticle(particle,{x:cx+.5,y:cy,z:cz+.5});}catch{}
 };
 landmarkAura(meadowRealm&&num(world,meadowLandmarkKey),'meadowLandmarkAuraAt',47,meadowSurfaceY(47,13)+7,13,10,'hakkai:meadow_pollen',150);
 landmarkAura(forestRealm&&num(world,forestLandmarkKey),'forestLandmarkAuraAt',35,forestSurfaceY(35,-10)+7,-10,10,'hakkai:forest_spores',158);
 landmarkAura(desertRealm&&num(world,desertLandmarkKey),'desertLandmarkAuraAt',28,desertSurfaceY(28,16)+6,16,9,'hakkai:dune_spiral',154);
 landmarkAura(iceRealm&&num(world,iceLandmarkKey),'iceLandmarkAuraAt',29,iceSurfaceY(29,11)+4,11,9,'hakkai:frost_glimmer',152);
 landmarkAura(cliffRealm&&num(world,cliffLandmarkKey),'cliffLandmarkAuraAt',51,cliffSurfaceY(51,13)+3,13,9,'hakkai:storm_spark',146);
 landmarkAura(caveRealm&&num(world,caveLandmarkKey),'caveLandmarkAuraAt',51,caveSurfaceY(51,-16)+4,-16,9,'hakkai:cave_glimmers',160);
}

const effects=['speed','regeneration','fire_resistance','resistance','strength','night_vision','absorption','slow_falling','night_vision','absorption','invisibility','resistance','haste','regeneration','water_breathing','slow_falling','invisibility','haste','conduit_power','water_breathing'];
function enemies(p,r,cap=6){return combatEnemies(p,r,cap);}
function hit(p,e,str,a,mod,push){return applyCombatHit(p,e,str,a,mod,push);}
function cast(p,g,charged=false){
 const s=state(p),t=system.currentTick,ready=s.cd.get(g.id)??0;
 if(t<ready){notice(p,`§e再使用まで ${Math.ceil((ready-t)/20)}秒`);return;}
 const cost=g.cost+(charged?3:0), effort=charged?(['剣','斧','槍'].includes(g.kind)?8:7):5;
 if(!isCreative(p)&&(s.m<cost||s.s<effort)){notice(p,'§e魔力かスタミナが足りない');return;}
 // A fully charged crouch-use replaces the normal area hit with one ray.
 // Resolve terrain and entities before charging resources; API failure or an
 // unloaded path must not spend the player's marks or mana.
 const wantsRay=charged&&(combatResonance?.level(p,g,t)??0)===3;
 const beam=wantsRay?prepareWindRay(p,g):undefined;
 if(wantsRay&&!beam){notice(p,'§e風紋閃の進路を確認できません');return;}
 if(!isCreative(p)){s.m-=cost;s.s-=effort;}
 const resonance=combatResonance?.consume(p,g)??false;
 const combo=charged&&!resonance&&(combatResonance?.consumeCombo(p,g)??false);
 s.cd.set(g.id,t+g.seconds*20);
 const key=`xp_${g.id}`,old=num(p,key), lv=Math.min(5,1+Math.floor(old/8));
 if(old<32)property(p,key,old+1);
 const radius={'剣':4,'斧':5,'弓':14,'杖':9,'ハンマー':6,'槍':7,'扇':7,'盾':3,'鎧':3,'兜':2,'靴':3,'指輪':5,'首飾り':4,'マント':4}[g.kind]??5;
 const pushes={'ハンマー':.72,'斧':1.5,'扇':1.9,'盾':1.15,'槍':.54};
 const push=(pushes[g.kind]??.65)*(combo?1.5:1), site=currentPlace(p);
 const such=site?.id>0&&home[aspect(site)].includes(g.a), night=world.getTimeOfDay()>13000;
 const str=Math.round((3+g.damage*.28+g.power*.05+lv*1.4+(g.a===4?3:0)+(such||g.a===8&&night?2:0)+(charged?2:0))*(resonance?1.25:combo?1.2:1));
 const directional=['剣','槍','扇','弓'].includes(g.kind), view=directional?p.getViewDirection():undefined;
 const candidates=beam?(beam.target?[beam.target]:[]):enemies(p,radius+(charged?4:0),9).filter(e=>{
   if(!directional){
    // Charged axe finishers must not damage enemies through walls.
    if(combo&&g.kind==='斧')try{return visibleFrom(p,e.getHeadLocation());}catch{return false;}
    return true;
   }
   const a=e.location,b=p.location,x=a.x-b.x,z=a.z-b.z,len=Math.hypot(x,z);
   const cos=len===0?1:(x*view.x+z*view.z)/(len*Math.max(.01,Math.hypot(view.x,view.z)));
   if(cos<=({'剣':.18,'槍':.79,'扇':.22,'弓':.55}[g.kind]))return false;
   try{return visibleFrom(p,e.getHeadLocation());}catch{return false;}
 });
 const targetCount=({'槍':2,'剣':3,'弓':5,'盾':2,'兜':1,'杖':3}[g.kind]??6)+(charged&&['弓','扇','杖'].includes(g.kind)?1:0);
 for(const e of candidates.slice(0,targetCount)){
   if(g.kind==='ハンマー')try{e.addEffect('slowness',35,{showParticles:false});}catch{}
   if(g.kind==='弓')try{e.dimension.spawnParticle('minecraft:basic_crit_particle',{...e.location,y:e.location.y+.5});}catch{}
   hit(p,e,g.kind==='扇'?Math.max(2,str-2):str,g.a,g.modifier,push);
   if(resonance&&e.isValid)for(let i=0;i<4;i++){const a=i*Math.PI/2;try{e.dimension.spawnParticle('hakkai:wind_burst',{x:e.location.x+Math.cos(a)*.5,y:e.location.y+1,z:e.location.z+Math.sin(a)*.5});}catch{}}
 }
 if(!beam&&g.kind==='槍'&&candidates.length&&view)try{along(p,view.x,view.z,.42,.08);}catch{}
 // Optional status APIs must not abort the visual and animation portion of
 // a skill after its damage and cost have already been applied.
 if(g.kind==='靴'||g.kind==='マント')try{p.addEffect(g.kind==='靴'?'speed':'slow_falling',95,{showParticles:false});}catch{}
 if(g.kind==='盾')try{for(const ally of p.dimension.getPlayers({location:p.location,maxDistance:charged?7:5,closest:4}))try{ally.addEffect('resistance',charged?105:60,{showParticles:false});}catch{}}catch{}
 try{p.addEffect(effects[g.a],75+lv*16,{showParticles:false});}catch{}
 if(g.kind==='盾'||g.defense>=5)try{p.addEffect('resistance',55+g.defense*6,{showParticles:false});}catch{}
 if(g.a===6)try{p.addEffect('regeneration',35,{showParticles:false});}catch{}
 notice(p,`§b${beam?'風紋閃・':resonance?'風紋解放・':combo?'二連終撃・':''}${charged?(g.kind==='弓'?'溜め撃ち・':'溜め技・'):''}${g.skill} §7Lv.${lv}`);
 const v=p.getViewDirection(), l=p.location,n=Number(g.number),visualId=g.visualId??g.id;
 const where={x:l.x+v.x*(directional?1.4:.3),y:l.y+(g.kind==='ハンマー'?.13:g.kind==='弓'?2.1:1),z:l.z+v.z*(directional?1.4:.3)};
 try{p.playAnimation(`animation.hakkai.cast.${visualId}`,{blendOutTime:.13,stopExpression:'query.any_animation_finished'});}catch{}
 if(beam)renderWindRay(p,beam);
 if(combo){
   const count=g.kind==='斧'?14:g.kind==='槍'?9:12;
   for(let i=0;i<count;i++){
    const side=(i/(count-1)-.5)*(g.kind==='斧'?3.4:2.2),forward=g.kind==='槍'?1+i*.18:1.1;
    try{p.dimension.spawnParticle('hakkai:wind_burst',{x:l.x+v.x*forward-v.z*side,y:l.y+.55+i/count*.7,z:l.z+v.z*forward+v.x*side});}catch{}
   }
   try{p.playSound('random.orb',{volume:.35,pitch:.6});}catch{}
 }
 if(resonance)for(let i=0;i<16;i++){const a=i*Math.PI/8;try{p.dimension.spawnParticle('hakkai:wind_burst',{x:l.x+Math.cos(a)*1.7,y:l.y+.55,z:l.z+Math.sin(a)*1.7});}catch{}}
 if(charged)for(let i=0;i<24;i++){const a=i*Math.PI/6,r=.8+i*.07;try{p.dimension.spawnParticle(i%3?'hakkai:wind_trace':'hakkai:wind_burst',{x:l.x+Math.cos(a)*r,y:l.y+.3+i*.055,z:l.z+Math.sin(a)*r});}catch{}}
 try{p.dimension.spawnParticle(ns+visualId,where);p.playSound('random.orb',{volume:.36,pitch:.74+(n%21)*.038});}catch{}
 if(g.rank>1||['弓','槍','ハンマー'].includes(g.kind))system.runTimeout(()=>{
   if(p.isValid&&dist(p.location,l)<7)try{p.dimension.spawnParticle(ns+visualId,{x:where.x+v.x*.75,y:where.y+.25,z:where.z+v.z*.75});}catch{}
 },4+n%7);
}
function castElement(p,a,b=-1,label=attrs[a]){
 const s=state(p),key='spell',t=system.currentTick,n=b<0?12:19;
 if((s.cd.get(key)??0)>t){notice(p,'§e魔法はまだ再使用できない');return;}
 if(!isCreative(p)&&s.m<n){notice(p,'§e魔力が足りない');return;}
 if(!isCreative(p))s.m-=n;
 s.cd.set(key,t+120);
 const defense=[1,3,5].includes(a)&&b<0;
 p.addEffect(effects[a],170,{showParticles:!defense});
 if(b>=0)p.addEffect(effects[b],125,{showParticles:false});
 if(defense&&a===1){
   const h=p.getComponent('minecraft:health');
   if(h)h.setCurrentValue(Math.min(h.effectiveMax,h.currentValue+5));
 }
 if(defense&&a===5)for(const n of ['poison','wither','blindness'])p.removeEffect(n);
 if(defense&&a===3)p.addEffect('absorption',160,{showParticles:false});
 const night=world.getTimeOfDay()>13000, stage=currentPlace(p), boosted=Boolean(stage&&home[aspect(stage)].includes(a)||night&&[5,6,7].includes(a));
 const line=p.getViewDirection(), l=p.location;
 const targets=defense?[]:enemies(p,(b>=0?8:a===4?10:6)+(boosted?1:0)).filter(e=>{
   try{if(!visibleFrom(p,e.getHeadLocation()))return false;}catch{return false;}
   return a!==4||b>=0||(e.location.x-l.x)*line.x+(e.location.z-l.z)*line.z>=Math.hypot(e.location.x-l.x,e.location.z-l.z)*.62;
 });
 if(!defense)for(const e of targets){
   hit(p,e,(b>=0?12:8)+(boosted?2:0),a,b,a===0?1.5:.6);
   try{if(a===7)e.addEffect('slowness',b===0?105:72,{amplifier:4,showParticles:false});}catch{}
   try{if(a===4||b===4)e.addEffect('weakness',84,{showParticles:false});}catch{}
   try{if(a===0&&b===1)e.addEffect('blindness',90,{showParticles:false});}catch{}
 }
 if(a===6&&targets.length){
   const h=p.getComponent('minecraft:health');
   if(h)h.setCurrentValue(Math.min(h.effectiveMax,h.currentValue+Math.min(5,targets.length*2)));
 }
 if(a===7&&b===0)p.addEffect('speed',125,{amplifier:1,showParticles:false});
 if(a===5&&b===6)p.addEffect('absorption',130,{showParticles:false});
 const known=b<0?a:pairs.findIndex(v=>v.a===a&&v.b===b);
 if(known>=0)mark(p,'learned_spells',b<0?known:8+known);
 try{p.dimension.spawnParticle(`hakkai:climate_${(b>=0?b:a)%8}`,{x:l.x+line.x*2,y:l.y+1,z:l.z+line.z*2});}catch{}
 notice(p,`§b${label}の魔法`);
}

async function form(p,title,body,rows){
 const f=new ActionFormData().title(title).body(body);
 for(const row of rows)f.button(row[0],row[1]);
 for(let i=0;i<3;i++){
   if(!p.isValid)return;
   const r=await f.show(p);
   if(!r.canceled)return r.selection;
   if(r.cancelationReason!==FormCancelationReason.UserBusy)return;
   await timed(()=>{},10);
 }
 if(p.isValid)notice(p,'§eほかの画面を閉じて、もう一度使ってね');
}
const chapters=[
 ['はじめに','ガイド本は持ち物から「使う」で開きます。迷ったらこの本の章を順に読んでね。風見の帰還石を使うと、風見台・ベッド・登録地点・元の世界に帰れます。風見台で旅の地図を使い、まずは始まりの草原へ。'],
 ['世界の生成とシード','8つの界はそれぞれ別の空間です。到着すると、今いる場所を中心に周囲4チャンク分（最大9×9チャンク）の地形を先に準備します。地形の高さ・山脈・谷・島・地表素材はワールドシードと界ごとの計算で決まり、同じワールドの同じ座標なら同じ地形になります。各界には旧12種に加えて新5種ずつ、合計136種のスクリプト式シード地形帯があり、歩き続けるほど新しい地形帯が続きます。拠点・街道・既存建築のある区画は上書きしません。'],
 ['新しい地形帯と川','各界に5種類ずつ新しい地形帯を追加。界の土や植生、岩・結晶の景観が現れ、自然調査ノートにも記録されます。これはスクリプトで分類した地形帯で、エンジン本来のバイオーム変更ではありません。6界の谷では、地形条件が合えば短い川区画に水が入ります。氷の界は表面が凍ります。土手と床を確認して水を置くため川は区画ごとに途切れ、湖や海への連結はまだありません。生成済み区画は変更しません。'],
 ['四季と村の暮らし','四季は1季節4ゲーム日、16日で一巡します。文化名所の友好住人や八界の集落鐘から村の暮らしを開き、皆で季節の品を持ち寄れます。祭りは季節の2日目。寄付された小麦や板材は近くの住人が台帳上の備蓄に整理し、危機と復興や思い出も記録します。指定した樽同士の現物運搬と、許可した村の建物の自動修理にも対応します。'],
 ['建築係と村の発展','文化名所と風車工場村に建築係が一度だけ現れ、村の空き地を自分で探して小さな家・加工場・農場・交流施設・祭り会場を順に建てます。必要な平地・空間がなければ待機し、既存ブロックは壊しません。人や生物が工事範囲にいる間も作業を止めます。建築係に話しかけると進捗を見たり停止したりできます。材料不要の試作で、保護プラグインには対応せず、空地がなければ発展しません。'],
 ['特別な友好住人','八界それぞれの名所に道案内・手当て係・物資係・見守り兵の4種類、合計32種類が現れます。通常村人とは別の友好モブで、姿と帽子は界と役割ごとに違います。近くの道案内は移動支援、手当て係は傷の手当て、物資係はエメラルドと品の交換、見守り兵は近くの敵対モブと戦います。直接話しかけると説明を読めます。自然生成はモブ生成が有効なとき、各名所で各役割1人だけ一度限りです。死亡・失敗時の補充や通常の村人交易・繁殖・就職はありません。動きや描画は実機未確認です。'],
 ['八界の暮らしと名所','八界の人々が残した風車・文庫・隊商の迷路・氷宮・鍛冶場・地下庭・空の観測庭・待合駅があります。名所にある記録石を使うと、その土地の約束と歴史を読み、旅の記録にも残せます。名所ではモブ生成が有効なら語り手が各2人まで一度だけ現れます。しゃがんで話しかけると土地の話、立って話しかけると通常の取引です。予定地は新規の空き区画に限られます。'],
 ['八界の大景観','新しい空き区画では、草原の風車の飾り・森の巨木・砂の石門や化石・氷晶塔・雷石の尖塔・地下の光る茸や天井の鍾乳状の石・空の雲の塔・時の時計飾りなどが現れます。各界の丘や地表の色も違います。飾りの風車や時計は動きません。シードと地形により出現しない場所もあり、旧地形や建物は改造しません。'],
 ['工場村と観測遺跡','風車工場村は草原の界、雷雲の観測遺跡は雷の界の新しい探索地です。手引きで選ぶと予定座標を表示します。工場村では鐘が動く間に住人が少しずつ現れます。破砕機と製材機の西側の樽に素材を入れ、東側の樽に空きを作ると、風力で加工し、成功した生産量が集落の備蓄に加わります。備蓄は住人の維持や成長に使います。生成条件が合わない場合は現れません。'],
 ['最初のサバイバル','①ガイド本から旅の地図を開き、始まりの草原へ。②木・石・食料を集め、作業台とかまどを用意。③畑・釣り・牧場・採集を使って食料を確保。④スタミナ表示が減ったら走るのをやめて回復。⑤魔法を使うと魔力を消費するので、使いどころを考えよう。⑥ベッドでリスポーン地点を設定し、風見の帰還石も手元に置いておくと安心です。最初から守護獣に挑まず、食料と装備を整えてから遠征しよう。'],
 ['地形と集め方','各界の新しく生成される地形では、地表の下を掘って結晶鉱を探せます。浮島の地層は薄いので掘り抜きに注意。生成済みの場所には後から追加されません。到着地点近くにも小さな鉱床があります。守護獣を倒すと欠片が手に入り、同じ欠片2個とアメジストの欠片1個から結晶を作れます。バニラの敵も、ときどき欠片を落とします。'],
 ['野営とサバイバル','焚き火か魂の焚き火の近くで、しゃがんで静止すると野営休息になり、スタミナと魔力が速く回復します。野営のきのこ包み・根菜の焚き火焼き・森歩きの滋養食は採集や料理で作れます。乾燥肉・乾燥ベリー・燻製魚の切り身・乾燥昆布を作業台で合わせると野営の補給袋を2個作れます。畑・季節の菜園・釣り・牧場・かまどを組み合わせ、遠征前に食料を準備しましょう。'],
 ['戦闘とスタミナ','走る・泳ぐ・攻撃するとスタミナを使い、止まると回復。装備スキルや属性魔法を使えます。ガイド本の「八界の幻影闘技場」では、体力・魔力・相手の予告を見ながら行動を選ぶターン制ミニゲームに挑戦できます。記念館の達成度と記念品の収集が進むと、特別な第4戦が解放されます。闘技場はゲーム内の幻影戦で、実際のプレイヤーや建築物にはダメージを与えません。'],
 ['八属性と魔導書','本＋風の結晶＋水の結晶で魔導書を作れます。手に持ってしゃがむたび、使用可能な魔法へ順に切り替え、使うボタンで選択中の魔法を発動。選択名は画面に表示されます。風・水・火・土・雷・光・闇・時の8属性を使え、一度訪れた場所の属性が解放されます。霧・溶岩・嵐・虹・疾風は両方の属性が必要です。光の矢は光を訪問後、魔力5で視線上の敵へ放ちます。絆の灯は風と水を訪問後、近くにもう一人いる時に魔力20で参加者を回復し敵を攻撃します。風・水・炎の専用魔法も選べます。FUSHIのトーテムから月のまどろみを使用すると確認後に消費します。魔法の再使用時間は共通6秒です。'],
 ['村の暮らし','風記の集落鐘を置くか、村人の近くで普通の鐘をしゃがんで使うと台帳が開きます。壁の数、高い見張り台、足止め罠、工場が守りを強くします。工場が出荷した備蓄は交易・村の成長・祭りに役立ちます。村人には朝・昼・夕の行き先があります。'],
 ['季節と釣り','季節は4ゲーム日ごとに変わります。花壇を置くと季節の花に変わり、集落鐘の周りでは作物の成長も変化します。釣り竿を持ち物に入れてガイド本の「水辺の釣り」へ。釣果は季節や天気、水辺の種類で変わります。'],
 ['時の列車','第8界の時の終着駅に着いたら、ガイド本の「時の列車」へ。操車場で過去か未来を選ぶと乗車します。しゃがんで降りると、旅を中止できます。各時代の駅から現在へ戻れます。'],
 ['船便と刻印','五つの港でガイド本の「港の船便と市」を使います。船上で釣り・料理・交易もできます。剣を持ってしゃがんでエンチャント台を使うと、属性刻印の別画面が開きます。刻印書は本1冊と対応する結晶2個で作れます。刻印書を手に持ってしゃがみながらエンチャント台を使い、剣を選ぶと刻印できます。バニラのエンチャントはそのままです。'],
 ['刻印効果','刻印済みの剣で敵に攻撃すると発動します。風：移動速度上昇。水：体力を継続回復。雷：命中した相手に追加ダメージ。時：命中した相手を減速。再発動には約6秒の待ち時間があります。スタミナが0でも刻印効果は発動します。'],
 ['生き物と調査','8界を歩くと、界の素材とバニラブロックを組み合わせた136種のスクリプト式シード地形帯を発見できます。地形帯ごとに生息する野生動物と専用の強化MOBが異なり、夜や高地では希少種との遭遇率が上がります。追加MOBは個体ごとの専用モデル・512×512テクスチャ・発光／法線マップを持ちます。バニラMOBの標準テクスチャはゲーム本来のものを使います。追加の生き物にしゃがんで触れると観察記録に入ります。ガイド本の「自然調査ノート」で報酬を受け取れます。'],
 ['八界街道','旅の地図から八界街道へ。東西の道を歩くと草原・霧森・砂地・雪の峠・雷の高原・洞門・雲の橋・駅の順でつながります。街道は本界とは別の場所です。街道外へ落ちたら直前の場所に戻ります。']
];
const simple=(p,title,body)=>form(p,title,body,[['閉じる']]);
async function paged(p,title,body,rows){
 let page=0;
 while(p.isValid){
   const from=page*10,shown=rows.slice(from,from+10);
   const opts=[...shown];
   if(page)opts.push(['前のページ']);
   if(from+10<rows.length)opts.push(['次のページ']);
   const ix=await form(p,title,`${body}\n${page+1}/${Math.max(1,Math.ceil(rows.length/10))}ページ`,opts);
   if(ix===undefined)return;
   if(ix<shown.length)return from+ix;
   if(page&&ix===shown.length)page--;else page++;
 }
}
const trainLocks=new Set(),yard=places.find(s=>s.kind==='frontier'&&s.dim===7);
const trails=places.filter(s=>s.kind==='trail');
function trailTick(p,site,s){
 if(site?.kind!=='trail'||s.busy||p.location.y<82)return;
 if(!visited(p,site.id)&&num(world,`built_${site.id}`))recordEntry(p,site);
 const delta=p.location.x-site.x;
 if(Math.abs(delta)<12)return;
 const next=trails[aspect(site)+Math.sign(delta)];
 if(!next||num(world,`built_${next.id}`)||builds.has(next.id)||system.currentTick<(s.trailRetry??0))return;
 s.trailRetry=system.currentTick+45;
 void build(next).catch(err=>report('八界街道',err));
}
async function trailMap(p){
 const unlocked=trails.filter(s=>s===trails[0]||visited(p,s.id));
 const choice=await form(p,'八界街道','歩きながら隣の区画を開拓できます。一度歩いた道には、地図から戻れます。',unlocked.map(s=>[s.name]));
 if(choice!==undefined)return arrive(p,unlocked[choice]);
}
function atlasTick(p,site,s){
 if(site?.kind!=='atlas'||s.busy||p.location.y<expandedY-.5)return;
 if(s.atlasHere!==site.id){
   s.atlasHere=site.id;recordEntry(p,site);
 }
 const dx=p.location.x-site.x-.5,dz=p.location.z-site.z-.5;
 const eastWest=Math.abs(dx)>Math.abs(dz), far=eastWest?dx:dz, across=eastWest?dz:dx;
 if(Math.abs(far)<8||Math.abs(across)>3||system.currentTick<(s.atlasRetry??0))return;
 const next=atlasGrid.get(`${site.col+(eastWest?Math.sign(far):0)},${site.row+(eastWest?0:Math.sign(far))}`);
 if(!next||num(world,`built_${next.id}`)||builds.has(next.id))return;
 s.atlasRetry=system.currentTick+35;
 void build(next).catch(err=>report('風土図鑑',err));
}
async function atlasMenu(p){
 const groups=[...new Set(atlas.map(a=>a.family))];
 const section=await paged(p,'風土図鑑',`訪問 ${atlas.filter(a=>visited(p,a.id)).length}/${atlas.length}区画。展示の訪問記録と、バニラの調査記録は別々です。`,groups.map(k=>[families[k].name]));
 if(section===undefined||!p.isValid)return;
 const list=atlas.filter(a=>a.family===groups[section]);
 const index=await paged(p,'地形の展示区画','◆ 訪問済み ／ ◇ 未訪問。十字路に沿って隣の展示にも歩いて行けます。',list.map(a=>[`${visited(p,a.id)?'◆':'◇'} ${a.name}\n${a.biome}`]));
 if(index!==undefined&&p.isValid&&list[index])return arrive(p,list[index]);
}
function linkedTick(p,site,s){
 if(site?.kind!=='linked'||s.busy||p.location.y<baseY+15)return;
 if(num(p,'last_site',-1)!==site.id)recordEntry(p,site);
 const delta=p.location.x-site.x-.5;
 if(Math.abs(delta)<8||Math.abs(p.location.z-site.z+4.5)>7||system.currentTick<(s.linkedRetry??0))return;
 const next=linkedRealms[site.theme+Math.sign(delta)];
 if(!next||num(world,`built_${next.id}`)||builds.has(next.id))return;
 s.linkedRetry=system.currentTick+100;
 void build(next).catch(err=>{if(p.isValid&&p.dimension.id===dimID(9))notice(p,'§e次の区画の準備ができません。無理に渡らず、地図か帰還石を使ってね');report('八界本街道',err);});
}
async function linkedMenu(p){
 const count=linkedRealms.filter(a=>marked(p,'stories',a.id)).length;
 const stops=linkedRealms.filter((a,i)=>i===0||visited(p,a.id));
 const pick=await form(p,'八界本街道',`8つの本界を同じ世界の並びに再構成した道。東へ歩くと次の界が準備されます。\n読んだ記録石：${count}/8`,[
   ...stops.map(a=>[a.name]),['全界踏破の報酬']
 ]);
 if(pick===undefined||!p.isValid)return;
 if(stops[pick])return arrive(p,stops[pick]);
 if(pick!==stops.length)return;
 if(linkedRealms.some(a=>!marked(p,'stories',a.id)))return notice(p,'§e8つの本街道の記録石を読んでね');
 if(num(p,'linked_reward'))return notice(p,'§e踏破の報酬は受け取り済みです');
 if(give(p,ns+'travel_pass')){property(p,'linked_reward',1);notice(p,'§a八界踏破の報酬：離島の通行札');}
 else notice(p,'§e持ち物に空きを作ってね');
}
const eraStops=places.filter(s=>s.kind==='era');
const docks=places.filter(s=>s.landmark==='port'||s.kind==='island'&&s.landmark==='lagoon');
const newDock=site=>site.landmark==='port'||!['coast','dune'].includes(site.style);
const dockBase=site=>({x:site.x+4,y:116,z:site.z-18});
const dockSurface=site=>newDock(site)?118:expandedY;
async function retrofitDock(site){
 if(!newDock(site)||num(world,`dock_${site.id}`))return true;
 const d=world.getDimension(dimID(site.dim)), a=dockBase(site), end={x:a.x+10,y:a.y+4,z:a.z+17}, key=`dock_${site.id}`;
 if(builds.has(key))return builds.get(key);
 const task=loaded(d,a,end,()=>{
   if(num(world,key))return true;
   for(let x=a.x;x<=end.x;x++)for(let y=a.y;y<=end.y;y++)for(let z=a.z;z<=end.z;z++)if(!d.getBlock({x,y,z})?.isAir)return false;
   world.structureManager.place(ns+'mooring',d,a,{includeEntities:false});property(world,key,1);return true;
 });
 builds.set(key,task);
 try{return await task;}finally{builds.delete(key);}
}
const railPoint=(site,z)=>({x:site.x+6.5,y:expandedY+.08,z:site.z+z+.5});
function railsIntact(d,site){
 for(let z=-17;z<=1;z++){
   const l=railPoint(site,z);
   if(d.getBlock(l)?.typeId!=='minecraft:rail'||!d.getBlock({...l,y:l.y+1})?.isAir||!d.getBlock({...l,y:l.y+2})?.isAir)return false;
   for(const dx of [-1,1])if(!d.getBlock({...l,x:l.x+dx,y:l.y+1})?.isAir)return false;
 }
 return true;
}
const ferryPoint=(site,z)=>({x:site.x+10.5,y:dockSurface(site)-.18,z:site.z+z+.5});
function waterwayClear(d,site){
 for(let z=-15;z<=-4;z++){
   const l=ferryPoint(site,z);
   for(const x of [-1,0,1])if(d.getBlock({...l,x:l.x+x})?.typeId!=='minecraft:water'||!d.getBlock({...l,x:l.x+x,y:l.y+1})?.isAir)return false;
 }
 return true;
}
async function rideTrain(p,start,target,ferry=false,stay=false){
 const s=state(p);
 if(s.busy||!p.isValid||currentPlace(p)?.id!==start.id)return;
 if(trainLocks.has(start.id))return notice(p,'§eホームが使用中です。次の列車を待ってね');
 trainLocks.add(start.id);s.busy=true;
 let car,ride,complete=false;
 const d=p.dimension, first=ferry?ferryPoint(start,-4):railPoint(start,1), board={...first,x:first.x-(ferry?3:1),y:ferry?dockSurface(start):expandedY};
 if(ferry&&!newDock(start))board.x+=1;
 try{
   if(!stay)await build(target);
   if(ferry&&!(await retrofitDock(start)))return notice(p,'§e船着き場の予定位置に建物があるため運休しています');
   if(!p.isValid||currentPlace(p)?.id!==start.id)return;
   if(!safe(d,board)||!(ferry?waterwayClear(d,start):railsIntact(d,start)))return notice(p,ferry?'§e桟橋や水路がふさがれているため運休中です':'§eホームや線路がふさがれているため運休中です');
   if(!p.tryTeleport(board,{checkForBlocks:true}))return;
   car=d.spawnEntity(ns+(ferry?'shore_ferry':'time_train'),first,{initialRotation:180,initialPersistence:false});
   ride=car.getComponent('minecraft:rideable');
   if(!ride?.addRider(p))throw Error('乗車できない');
   if(stay){
     const choice=await form(p,'連絡船の船上','船は桟橋につながれています。船の上でも釣り・料理・交易ができます。',[
       ['水辺の釣り'],['生のタラ2匹を焼く'],['釣り祭りの記念札を港の欠片に交換'],['岸へ戻る']]);
     if(!p.isValid||!car.isValid||!ride.getRiders().some(e=>e.id===p.id))return;
     if(choice===0)await fishing(p);
     if(choice===1&&exchange(p,'minecraft:cod',2,'minecraft:cooked_cod',2))notice(p,'§a船の調理台で魚を焼いた');
     if(choice===2&&exchange(p,ns+'fish_token',1,ns+'shard_18',2))notice(p,'§a船上交易で港の欠片を受け取った');
     return;
   }
   notice(p,`§6${ferry?'潮渡りの連絡船':'時の列車 各駅停車'}：${target.name}\n§r降りると運行を中止します`,145);
   try{p.playSound('random.orb',{pitch:.65,volume:.6});}catch{}
   for(let i=0;i<(ferry?23:37);i++){
     await timed(()=>{},i===0?12:2);
     if(!p.isValid||!car.isValid||!ride.getRiders().some(e=>e.id===p.id))return;
     const l=ferry?ferryPoint(start,-4-i/2):railPoint(start,1-i/2);
     if(d.getBlock(l)?.typeId!==(ferry?'minecraft:water':'minecraft:rail')||!d.getBlock({...l,y:l.y+1})?.isAir||!d.getBlock({...l,y:l.y+2})?.isAir){
       notice(p,'§e進路に障害物があるため緊急停止しました');return;
     }
     if(!car.tryTeleport(l,{checkForBlocks:false,rotation:{x:0,y:180}}))throw Error('車両が動けない');
   }
   complete=true;
 }catch(err){if(p.isValid){notice(p,'§e運行できなかった');report(ferry?'連絡船':'列車',err);}}
 finally{
   if(car?.isValid){try{if(p.isValid)ride?.ejectRider(p);car.remove();}catch{}}
   if(ferry&&p.isValid&&p.dimension.id===d.id&&currentPlace(p)?.id===start.id&&
      p.location.x>=start.x+8&&p.location.x<=start.x+16&&p.location.z<start.z-2&&p.location.z>=start.z-20&&
      p.location.y>=dockSurface(start)-2&&p.location.y<=dockSurface(start)+4){
     try{
       const landing=newDock(start)?safeNear(d,coords(start),4):safeNear(d,board,2);
       if(landing)p.tryTeleport(landing,{checkForBlocks:true});
     }catch{}
   }
   trainLocks.delete(start.id);s.busy=false;
 }
 if(complete&&p.isValid){s.arrival=0;return arrive(p,target);}
}
async function harbor(p){
 const here=docks.find(s=>s.id===currentPlace(p)?.id);
 if(!here)return simple(p,'港の市','港で開くと、停泊中の船や釣り、市を利用できます。');
 const ix=await form(p,'港の市','船は桟橋につないで利用できます。各界の探索地へは歩いて向かってください。',[
   ['船上で過ごす'],['生のタラ2匹 → 焼き魚2匹'],['釣り祭りの記念札 → 港の欠片2個'],['岸から釣る'],['閉じる']
 ]);
 if(!p.isValid||currentPlace(p)?.id!==here.id)return;
 if(ix===0)return rideTrain(p,here,here,true,true);
 if(ix===1&&exchange(p,'minecraft:cod',2,'minecraft:cooked_cod',2))notice(p,'§a港で魚を焼いた');
 if(ix===2&&exchange(p,ns+'fish_token',1,ns+'shard_18',2))notice(p,'§a港の欠片を受け取った');
 if(ix===3)return fishing(p);
}
async function railOffice(p){
 const here=currentPlace(p);
 if(here?.id===8)return simple(p,'時の列車','乗り場までは第8界を歩いて探してください。ここから探索地への転送はできません。');
 if(here?.id!==yard.id&&here?.kind!=='era')return simple(p,'時の列車','乗り場は第8界の探索中に見つかります。');
 // No selectable destination may be one of the 40 natural sites. From an
 // era station the train returns to the main realm entrance, not the yard.
 const targets=here.kind==='era'?[places[8]]:eraStops;
 const ix=await form(p,'時の列車｜乗り場','行き先を選ぶと、ホームで乗車します。途中で降りると到着しません。',[...targets.map(x=>[x.name]),['閉じる']]);
 if(ix!==undefined&&ix<targets.length)return rideTrain(p,here,targets[ix]);
}
async function help(p){
 const ix=await form(p,'風記の手引き','調べたい章を選んでね。',chapters.map(x=>[x[0]]));
 if(ix!==undefined){
  let body=chapters[ix][1];
  if(chapters[ix][0]==='八界の暮らしと名所')body+='\n\n'+CULTURE_SITES.map(s=>`${s.dim+1}界 ${s.name}：X ${s.x} / Z ${s.z}（${num(world,`built_${s.id}`)?'配置済み':'予定地'}）`).join('\n');
  if(chapters[ix][0]==='工場村と観測遺跡'){
   const v=travelSites.get(59),o=travelSites.get(60);
   body+=`\n\n草原の界：工場村の予定地 X ${v.x} / Z ${v.z}\n雷の界：観測遺跡の予定地 X ${o.x} / Z ${o.z}\n予定地は空き区画に限ります。すでに地形や建築がある場合は保護して配置しません。徒歩で近づいて生成を待ってください。`;
  }
  await simple(p,chapters[ix][0],body);
 }
}
/** @param {import('@minecraft/server').Player} p @param {(import('@minecraft/server').Vector3 & {dim:string})} [forgeAt] */
async function details(p,forgeAt){
 let g;
 while(p.isValid&&!g){
  const mode=await form(p,forgeAt?'§6作業台｜風記の装備':'§6装備とレシピ図鑑',
   '§7全186種。種類や属性から探すか、従来どおり番号順で選べます。',[
    ['§b種類から探す\n§7剣・弓・鎧など',itemTexture('gear_048')],
    ['§d属性から探す\n§7主属性・型のどちらも検索',itemTexture('element_tome')],
    ['§6番号から探す\n§7これまでの番号順',itemTexture('guide')],['§8閉じる']
   ]);
  if(mode===undefined||mode===3)return;
  const kinds=gearKinds(catalog);
  const groups=Array.from({length:Math.ceil(catalog.length/12)},(_,i)=>[`${i*12+1}〜${Math.min(catalog.length,i*12+12)} 番`]);
  const filters=mode===0?kinds.map(kind=>[kind]):mode===1?attrs.map((attr,i)=>[`${attr}の属性`,itemTexture(`crystal_${i}`)]):groups;
  const title=mode===0?'§6装備の種類':mode===1?'§6装備の属性':'§6装備の番号';
  const instruction=mode===1?'§7主属性または型に含まれる装備を表示します。':'§7絞り込みたい項目を選んでください。';
  let filterPage=0;
  while(p.isValid){
   const selected=await guideSelect(p,title,instruction,filters,filterPage);
   if(selected.closed)return;
   if(selected.back)break;
   filterPage=selected.page;
   const gs=mode===0?filterGear(catalog,'kind',kinds[selected.index]):mode===1?filterGear(catalog,'attribute',selected.index):filterGear(catalog,'number',selected.index);
   const chosen=await guideSelect(p,'§6装備とレシピ図鑑',`§7${gs.length}種類。装備を選ぶと性能と材料を確認できます。`,gs.map(entry=>[`${entry.number}　${entry.label}`,itemTexture(entry.id)]));
   if(chosen.closed)return;
   if(chosen.back)continue;
   g=gs[chosen.index];break;
  }
 }
 if(!g||!p.isValid)return;
 const realm=(attribute)=>places[home.findIndex(h=>h.includes(attribute))+1].name;
 const rec=g.prev?`通常の不定形レシピ：${gear.get(ns+g.prev).label}＋紙2＋鉄＋結晶＋欠片`:
   `定形：\n${patterns[Math.floor((Number(g.number)-1)/20)].map(row=>[...row].map(c=>({' ':'□',P:'紙',I:'鉄',C:'晶',F:'片'})[c]).join(' ')).join('\n')}`;
 const body=`${g.stars}\n攻撃力 ${g.damage}　防御力 ${g.defense}　魔力 ${g.power}\n${g.skill}\n魔力消費 ${g.cost}　再使用 ${g.seconds}秒\n\n${rec}\n晶：${attrs[g.a]}の結晶（${realm(g.a)}）\n片：${attrs[g.modifier]}の欠片（${realm(g.modifier)}の守護獣）\n別の入手方法：${prizeKinds[prizeKind(g)]}（ガイド本の「装備を見つける・注文する」）\n紙を持ってしゃがみながら作業台を使うと、全等級とも元の材料で作れます。`;
 if(!forgeAt)return simple(p,g.label,body);
 const held=selected(p), method=baseWeapon(held)===g.kind;
 const result=await form(p,g.label,body,[['紙2＋鉄1＋結晶1＋欠片1で作る'],...(method?[['手に持つバニラ武器を作り替える（旧武器・刻印・エンチャントは戻りません）']]:[]),['閉じる']]);
 if(!p.isValid||p.getGameMode()===GameMode.Spectator||p.dimension.id!==forgeAt.dim||dist(p.location,forgeAt)>6||p.dimension.getBlock(forgeAt)?.typeId!=='minecraft:crafting_table')return;
 if(result===0)return forgeGear(p,g,false);
 if(result===1&&method){
   const yes=await form(p,'武器の作り替え',`今手に持つバニラの武器と、${attrs[g.a]}の結晶・${attrs[g.modifier]}の欠片を1個ずつ消費します。元の武器と付与効果は戻りません。`,[['作り替える'],['やめる']]);
   if(yes===0&&p.isValid&&p.dimension.id===forgeAt.dim&&dist(p.location,forgeAt)<=6&&p.dimension.getBlock(forgeAt)?.typeId==='minecraft:crafting_table')forgeGear(p,g,true);
 }
}
function baseWeapon(x){
 if(!x?.typeId.startsWith('minecraft:'))return;
 return x.typeId.endsWith('_sword')?'剣':x.typeId.endsWith('_axe')?'斧':x.typeId==='minecraft:bow'?'弓':undefined;
}
function forgeGear(p,g,upgrade=false){
 const c=space(p), at=p.selectedSlotIndex, now=selected(p);
 /** @type {[string,number][]} */
 const costs=[[ns+`crystal_${g.a}`,1],[ns+`shard_${g.modifier}`,1]];
 if(upgrade&&baseWeapon(now)!==g.kind)return notice(p,'§e同じ武器種を手に持ってください');
 if(!upgrade)costs.push(['minecraft:paper',2],['minecraft:iron_ingot',1]);
 if(!isCreative(p)&&costs.some(([id,n])=>total(c,id)<n))return notice(p,'§e必要な材料が足りません');
 const product=new ItemStack(ns+g.id,1);
 if(!upgrade&&!room(c,product)||!c)return notice(p,'§e持ち物に空きを作ってください');
 if(!isCreative(p))for(const [id,n] of costs)debit(c,id,n);
 if(upgrade)c.setItem(at,product);else c.addItem(product);
 notice(p,`§6${g.label}ができた`);
}
function unlocked(p,site){
 if(site.kind==='era')return false;
 if(site.id===0||site.id===1||isCreative(p)||visited(p,site.id))return true;
 if(site.id<=8)return visited(p,site.id-1);
 if(site.kind==='frontier')return visited(p,site.dim+1);
 return visited(p,site.dim+1)&&total(space(p),ns+'travel_pass')>0;
}
async function map(p){
 const part=await form(p,'風見の地図',`八つの界は順に解放されます。各界の周囲を歩いて探索できます。\n発見記録：${realmDiscoveryCount(p)}/8`,[
   ['風見台',itemTexture('return_stone')],['八つの界'],['時の列車'],['徒歩で巡る八界街道'],['風土図鑑の展示を巡る'],['地続きの八界本街道']
 ]);
 if(part===undefined)return;
 if(part===0)return arrive(p,places[0]);
 if(part===2)return railOffice(p);
 if(part===3)return trailMap(p);
 if(part===4)return atlasMenu(p);
 if(part===5)return linkedMenu(p);
 const list=places.filter(x=>x.id>=1&&x.id<=8);
 const chosen=await form(p,'八つの界','◆ 記録済み　◇ 未踏　× 未解放',
   list.map(s=>[`${visited(p,s.id)?'◆':unlocked(p,s)?'◇':'×'}  ${s.name}${marked(p,'realm_discoveries',s.id-1)?'  §d✦発見済§r':'  §7◇記憶未発見§r'}\n${s.description}`]));
 if(chosen===undefined)return;
 const site=list[chosen];
 if(!unlocked(p,site))return simple(p,'まだ風の道がない','一つ前の界を訪れてください。');
 await arrive(p,site);
}
async function quest(p){
 const cleared=num(p,'guards'),site=currentPlace(p),c=space(p);
 const ix=await form(p,'風見台の依頼帳',`守護獣を倒した界：${guardians.filter((_,i)=>cleared&(1<<i)).length}/8\n村の信頼度：${num(p,'trust')}\n\n敵と戦うときは、ガイド本と帰還石を手元に。`,[
   ['近くの守護獣に挑む'],['初討伐の報酬を受け取る'],['村守りの報酬を受け取る'],['見回りを頼む'],['閉じる']
 ]);
 if(ix===undefined||ix===4)return;
 if(ix===3)return villageWatch(p);
 if(ix===0){
   if(!site||site.id===0||currentPlace(p)?.id!==site.id||!p.isValid)return notice(p,'§e風見台以外の界や離島で開いてね');
   if(world.getDifficulty()===Difficulty.Peaceful)return notice(p,'§eピースフルでは守護獣に挑めません');
   const s=state(p),id=ns+`guardian_${aspect(site)}`;
   if((s.cd.get('guard')??0)>system.currentTick)return notice(p,'§e次の挑戦まで少し待ってね');
   if(p.dimension.getEntities({type:id,location:coords(site),maxDistance:32,closest:1}).length)return notice(p,'§eすでに守護獣が近くにいる');
   if(Math.hypot(p.location.x-site.x,p.location.z-site.z)>25)return notice(p,'§e島の中心付近で開いてね');
   const l=coords(site), spawn=safeNear(p.dimension,{x:l.x,y:l.y,z:l.z+7},3);
   if(!spawn)return notice(p,'§e守護獣の足場がふさがっています');
   p.dimension.spawnEntity(id,spawn);
   s.cd.set('guard',system.currentTick+360);
   notice(p,`§c${guardians[aspect(site)]}が現れた`);
 }
 if(ix===1){
   const i=guardians.findIndex((_,i)=>(cleared&(1<<i))&&!(num(p,'claimed')&(1<<i)));
   if(i<0)return notice(p,'§e受け取れる初討伐報酬はない');
   if(give(p,ns+`crystal_${home[i][0]}`,2)){property(p,'claimed',num(p,'claimed')|(1<<i));notice(p,'§a結晶2個を受け取った');}
   else notice(p,'§e持ち物に空きがない');
 }
 if(ix===2){
   if(num(p,'trust')<6||num(p,'village_claim'))return notice(p,'§e信頼度6以上の初回報酬です');
   if(room(c,new ItemStack(ns+'village_badge'))&&give(p,ns+'village_badge')){
     property(p,'village_claim',1);notice(p,'§a村守りのしるしを受け取った');
   }else notice(p,'§e持ち物に空きがない');
 }
}
async function settings(p){
 const ix=await form(p,'風記の設定','表示と効果音は個人設定。プレイヤー同士の攻撃は全員共通のワールド設定です。',[
   [`HUD：${num(p,'hide_hud')?'非表示':'表示'}`],[`HUDテーマ：${num(p,'hud_color')?'淡色':'標準'}`],
   [`追加の環境音：${num(p,'mute')?'無効':'有効'}`],['今の足場を帰還地点に登録'],
   [`HUD位置：${['左上','右上','通常のアクションバー'][num(p,'hud_pos')]??'左上'}`],[`HUDの大きさ：${num(p,'hud_size')?'大きい':'標準'}`],
   [`追加モブの出現：${num(p,'quiet_wildlife')?'控えめ':'有効'}`],
   [`各界の霧と天候演出：${num(p,'quiet_climate')?'無効':'有効'}`],
   [`バニラ村の自動検出：${num(p,'no_bell_search')?'無効':'有効'}`],
   [`プレイヤー同士の攻撃：${friendlyFireEnabled()?'ON（当たる）':'OFF（当たらない）'}｜全員共通`]
 ]);
 if(ix===undefined)return;
 if(ix<3){const k=['hide_hud','hud_color','mute'][ix];property(p,k,1-num(p,k));return;}
 if(ix===4){property(p,'hud_pos',(num(p,'hud_pos')+1)%3);return;}
 if(ix===5){property(p,'hud_size',1-num(p,'hud_size'));return;}
 if(ix===6){property(p,'quiet_wildlife',1-num(p,'quiet_wildlife'));return;}
 if(ix===7){property(p,'quiet_climate',1-num(p,'quiet_climate'));return;}
 if(ix===8){property(p,'no_bell_search',1-num(p,'no_bell_search'));return;}
 if(ix===9){
  const desired=!friendlyFireEnabled();
  const yes=await form(p,'プレイヤー同士の攻撃',`ワールド全員に適用されます。${desired?'ONにすると攻撃技もプレイヤーを狙います。本体のPvP設定も影響します。':'OFFにすると直接攻撃や技から保護します。攻撃元不明の間接被害は防げない場合があります。'}\n他の人に確認してから変更してください。`,[[desired?'ONにする':'OFFにする'],['変更しない']]);
  if(yes!==0||!p.isValid)return;
  if(!setFriendlyFire(desired))return notice(p,'§e設定を確認できません。もう一度設定画面を確認してください');
  for(const player of world.getAllPlayers())try{player.sendMessage(`§e${p.name}がプレイヤー同士の攻撃を${desired?'ON（当たる）':'OFF（当たらない）'}にしました。`);}catch{}
  return;
 }
 const l=point(p);if(!safe(p.dimension,l)){notice(p,'§e動かず安全な床に立って登録してね');return;}
 property(p,'home_point',JSON.stringify(l));notice(p,'§a帰還地点を登録した');
}
function castMagic(p,kind){
 return castNewMagic({p,s:state(p),system,kind,notice,mark,visibleFrom,
   consumeTotem:()=>selected(p)?.typeId===ns+'fushi_totem'&&debit(space(p),ns+'fushi_totem',1),
   stagger:(enemy,duration)=>{
     try{combatParry?.staggerTarget(enemy,system.currentTick,duration);}catch{}
     try{mobSystem?.stagger(enemy,system.currentTick);}catch{}
     try{realmEnders?.stagger(enemy,system.currentTick);}catch{}
   }});
}
const magicItems={magic_hikari:['light',5],magic_kaze:['wind',0],magic_mizu:['water',1],magic_homura:['fire',2],magic_kizuna:['bond',0,1]};
async function totemMagicMenu(p){
 const slot=p.selectedSlotIndex,dim=p.dimension.id;
 const choice=await form(p,'FUSHIのトーテム','月のまどろみ：魔力15で自分を回復し周囲の敵の動きと近接を一時抑制。ボスには無効。サバイバルでは月魔法を使うとトーテムを1個消費します。持ち手かオフハンドで致命傷を受けた時にも消費し、復活を試みます（試作・実機未検証）。',[['トーテムを消費して使う'],['やめる']]);
 if(choice!==0||!p.isValid)return;
 if(p.selectedSlotIndex!==slot||p.dimension.id!==dim||selected(p)?.typeId!==ns+'fushi_totem')return notice(p,'§eトーテムの位置が変わったため中止しました');
 castMagic(p,'moon');
}
const TOME_SPELLS=tomeSpells(attrs,pairs);
function tomeHasAttribute(p,a){return isCreative(p)||visited(p,home.findIndex(x=>x.includes(a))+1);}
function tomeSelection(p){return tomeCurrent(TOME_SPELLS,num(p,'tome_spell_v1',-1),a=>tomeHasAttribute(p,a));}
function advanceTome(p){
 const next=tomeNext(TOME_SPELLS,num(p,'tome_spell_v1',-1),a=>tomeHasAttribute(p,a));
 if(next<0)return notice(p,'§eまだ使用できる魔法がありません。対応する界を訪れてね',70);
 property(p,'tome_spell_v1',next);notice(p,`§b魔導書：${TOME_SPELLS[next].label} §7｜使うボタンで発動`,70);
}
function castTome(p){
 if(!p?.isValid||p.getGameMode()===GameMode.Spectator||selected(p)?.typeId!==ns+'element_tome')return;
 const i=tomeSelection(p);if(i<0)return notice(p,'§eまだ使用できる魔法がありません。対応する界を訪れてね',70);
 const spell=TOME_SPELLS[i];if(!tomeUnlocked(spell,a=>tomeHasAttribute(p,a)))return;
 property(p,'tome_spell_v1',i);
 if(spell.special)return castMagic(p,spell.special);
 return castElement(p,spell.a,spell.b,spell.label);
}
function shore(p){
 const l=p.location;
 for(const dx of [-5,-3,-1,0,1,3,5])for(const dz of [-5,-3,-1,0,1,3,5])for(const dy of [-2,-1,0]){
   try{const b=p.dimension.getBlock({x:Math.floor(l.x)+dx,y:Math.floor(l.y)+dy,z:Math.floor(l.z)+dz});if(b?.typeId==='minecraft:water')return true;}catch{}
 }
 return false;
}
async function fishing(p){
 const site=currentPlace(p),s=state(p);
 if(total(space(p),'minecraft:fishing_rod')<1||!shore(p))return notice(p,'§e釣り竿を持ち、水面の近くで開いてね');
 const ix=await form(p,'水辺の釣り',`${site?.name??'オーバーワールド'}　${era()}\nワールドの魚とは別の風記の釣果です。`,[['糸をたらす'],['やめる']]);
 if(ix!==0)return;
 if((s.cd.get('fish')??0)>system.currentTick)return notice(p,'§e魚が戻るまで待ってね');
 s.cd.set('fish',system.currentTick+420);notice(p,'§b魚を待っている…',76);
 const starting=point(p);
 await timed(()=>{},65);
 if(!p.isValid||p.dimension.id!==starting.id||Math.hypot(p.location.x-starting.x,p.location.z-starting.z)>6)return;
 const area=biomeAt(p)?.key;
 const fish=area==='warmwater'?'tropical_fish':area==='ocean'?'cod':area==='icywater'||site?.style==='snow'?'salmon':
   {'春':'salmon','夏':'tropical_fish','秋':'cod','冬':'salmon'}[era()];
 const night=world.getTimeOfDay()>13000;
 const roll=Math.random(), festival=seasonAt(seasonDay()).dayInSeason===2, rare=festival&&roll<.17;
 const mode=festival?.38:raining(p.dimension)?.28:night?.23:0, prize=roll<mode;
 if(give(p,rare?ns+`festival_fish_${seasons.indexOf(era())}`:prize?ns+'fish_token':`minecraft:${fish}`)){
   notice(p,rare?`§6${era()}の祭り魚を釣り上げた！`:prize?'§a釣り祭りの記念札を釣り上げた！':'§a釣り上げた！');
 }
 else notice(p,'§e持ち物に空きがありません');
}
const seasonDay=()=>Math.floor(Math.max(0,world.getAbsoluteTime())/24000);
async function harvestMarket(p){
 if(!villagerNear(p,12))return simple(p,'季節の収穫市','村人の近くで開いてください。季節によって求められる作物が変わります。');
 const [food,label]=({春:['wheat','小麦'],夏:['carrot','ニンジン'],秋:['pumpkin','カボチャ'],冬:['beetroot','ビートルート']})[era()];
 const day=seasonDay(), used=num(p,'harvest_day',-1)===day, festival=seasonAt(day).dayInSeason===2;
 const ix=await form(p,`${era()}の収穫市`,`${festival?'今日は釣り祭りの日。':'季節の作物を持ち寄って村を手伝おう。'}\n作物の交換はゲーム内で一日一回。`,[
   [used?'今日は交換済み':`${label}4個 → 風の結晶1個`],['釣り祭りの記念札1枚 → 湖の欠片2個'],['季節の祭り魚1匹 → 湖の結晶1個'],['閉じる']
 ]);
 if(!p.isValid||!villagerNear(p,12))return;
 if(ix===0&&num(p,'harvest_day',-1)!==day){
   if(exchange(p,`minecraft:${food}`,4,ns+'crystal_0')){property(p,'harvest_day',day);property(p,'trust',Math.min(30,num(p,'trust')+1));notice(p,'§a収穫市を手伝った！');}
   else notice(p,'§e作物か持ち物の空きが足りません');
 }
 if(ix===1&&!exchange(p,ns+'fish_token',1,ns+'shard_19',2))notice(p,'§e記念札か持ち物の空きが足りません');
 if(ix===2)exchange(p,ns+`festival_fish_${seasons.indexOf(era())}`,1,ns+'crystal_19');
}
const runes=[
 {name:'風',a:0,desc:'攻撃すると自分の移動がしばらく速くなる'},
 {name:'水',a:1,desc:'攻撃しながら少しずつ回復する'},
 {name:'雷',a:4,desc:'命中した相手に小さな追撃を与える'},
 {name:'時',a:7,desc:'敵の移動速度をしばらく落とす'}
];
const vanillaSword=x=>x?.typeId.startsWith('minecraft:')&&x.typeId.endsWith('_sword');
async function inscribeBooks(p,table){
 const near=()=>p.isValid&&p.getGameMode()!==GameMode.Spectator&&p.dimension.id===table.dim&&dist(p.location,table)<6&&p.dimension.getBlock(table)?.typeId==='minecraft:enchanting_table';
 if(!near())return;
 const i=await form(p,'風記の刻印書','本1冊と対応する結晶2個。完成した刻印書を持ってしゃがみ、エンチャント台を使うと手持ちの剣に写せます。',runes.map(x=>[`${x.name}の刻印書：${x.desc}`]));
 if(i===undefined||!near())return;
 const c=space(p), cost=ns+`crystal_${runes[i].a}`, product=new ItemStack(ns+`rune_book_${i}`);
 if(!room(c,product)||!isCreative(p)&&(total(c,cost)<2||total(c,'minecraft:book')<1))return notice(p,'§e本と結晶、持ち物の空きが必要です');
 if(!isCreative(p)){debit(c,cost,2);debit(c,'minecraft:book',1);}
 c.addItem(product);notice(p,'§6刻印書ができた');
}
async function transferRuneBook(p,table,i){
 const c=space(p), type=ns+`rune_book_${i}`;
 const near=()=>p.isValid&&p.getGameMode()!==GameMode.Spectator&&p.dimension.id===table.dim&&dist(p.location,table)<6&&p.dimension.getBlock(table)?.typeId==='minecraft:enchanting_table'&&selected(p)?.typeId===type;
 if(!near())return;
 const slots=[];
 for(let j=0;j<c.size;j++){
   const item=c.getItem(j);
   if(vanillaSword(item)&&item.getDynamicProperty(ns+'rune')===undefined)slots.push({slot:j,id:item.typeId,damage:item.getComponent('minecraft:durability')?.damage});
 }
 if(!slots.length)return notice(p,'§e持ち物に刻印のないバニラの剣が必要です');
 const choice=await paged(p,`${runes[i].name}の刻印を写す`,'持ち物の番号から剣を選ぶと、刻印書を1冊消費します。',slots.map(({slot,id,damage})=>[`${slot+1}番：${id.slice(10)}（消耗 ${damage??0}）`]));
 if(choice===undefined||!near())return;
 const {slot,id,damage}=slots[choice], item=c.getItem(slot);
 if(item?.typeId!==id||item.getDynamicProperty(ns+'rune')!==undefined||item.getComponent('minecraft:durability')?.damage!==damage)return notice(p,'§e剣が持ち替えられました');
 setRune(item,i); c.setItem(slot,item);
 if(!isCreative(p))debit(c,type,1);
 notice(p,`§6${runes[i].name}の刻印を写した`);
}
function setRune(item,i){
 item.setDynamicProperty(ns+'rune',i);
 const lore=item.getLore();if(lore.length<18)item.setLore([...lore,`§7風記：${runes[i].name}の刻印`]);
}
/** @param {import('@minecraft/server').Player} p @param {(import('@minecraft/server').Vector3 & {dim:string})} [table] */
async function runeForge(p,table){
 const v=villagerNear(p,8), c=space(p), idx=p.selectedSlotIndex, sword=c?.getItem(idx);
 const near=()=>table?p.dimension.id===table.dim&&dist(p.location,table)<6&&p.dimension.getBlock(table)?.typeId==='minecraft:enchanting_table':villagerNear(p,8);
 if(!(table?near():v)||!vanillaSword(sword))return simple(p,'風記の刻印','バニラの剣を手に持って、しゃがんでエンチャント台を使うか、村人に相談してください。通常のエンチャント欄とは別の属性効果です。');
 const existing=sword.getDynamicProperty(ns+'rune'), trust=num(p,'trust');
 if(existing!==undefined)return simple(p,'風記の刻印','この剣にはすでに刻印があります。');
 if(!table&&trust<3&&!isCreative(p))return simple(p,'風記の刻印','村の信頼度3が必要です。村の近くで敵を倒したり、収穫市を手伝ってください。');
 const mode=await form(p,'風記の鍛冶｜剣への属性刻印','対応の結晶2個。剣の耐久値とバニラのエンチャントはそのまま残ります。',runes.map(r=>[`${r.name}の刻印：${r.desc}`]));
 if(mode===undefined||!p.isValid||!near())return;
 const now=c.getItem(idx), rune=runes[mode], cost=ns+`crystal_${rune.a}`;
 if(idx!==p.selectedSlotIndex||!vanillaSword(now)||now.typeId!==sword.typeId||now.getDynamicProperty(ns+'rune')!==undefined)return notice(p,'§e剣を持ち替えずにお試しください');
 if(!isCreative(p)&&total(c,cost)<2)return notice(p,'§e結晶が2個必要です');
 setRune(now,mode);
 c.setItem(idx,now);
 if(!isCreative(p))debit(c,cost,2);
 notice(p,`§6${rune.name}の刻印を入れた`);
}
async function villageWatch(p){
 const v=villagerNear(p,12),trust=num(p,'trust'),day=seasonDay();
 if(!v)return simple(p,'村の見回り','村人の近くで依頼を開いてください。');
 const ix=await form(p,'村の見回り','信頼度が高いほど頼める守り手が増えます。日ごとに一人、エメラルド1個で6分間の見回りを依頼できます。',civicRoles.map((r,i)=>[`${r.name}：信頼度${[3,7,12][i]}`]));
 if(ix===undefined||!p.isValid||!v.isValid||p.dimension.id!==v.dimension.id||dist(p.location,v.location)>12)return;
 const c=space(p),r=civicRoles[ix],d=p.dimension;
 if(num(p,'patrol_day',-1)===day||d.getEntities({location:v.location,maxDistance:30,families:['hakkai_patrol'],closest:2}).length>=2)return notice(p,'§e村にはすでに見回りを頼んでいます');
 if(!isCreative(p)&&(trust<[3,7,12][ix]||total(c,'minecraft:emerald')<1))return notice(p,'§e信頼度かエメラルドが足りません');
 const at=safeNear(d,{...v.location,x:v.location.x+2},3);
 if(!at)return notice(p,'§e近くに見張りを呼べる足場がありません');
 d.spawnEntity(ns+r.id,at);
 if(!isCreative(p))debit(c,'minecraft:emerald',1);
 property(p,'patrol_day',day);notice(p,`§a${r.name}が見回りを始めた`);
}
const seasonalCrops={春:'minecraft:wheat',夏:'minecraft:carrots',秋:'minecraft:pumpkin_stem',冬:'minecraft:beetroot'};
const cropIds=new Set([...Object.values(seasonalCrops),'minecraft:potatoes','minecraft:melon_stem']);
const seasons=['春','夏','秋','冬'];
const gardenById=new Map(seasonalPlants.map(x=>[ns+x.id,x]));
// Script API's generated BlockStateSuperset enumerates vanilla keys only.
const gardenAge=/** @type {any} */ ('hakkai:age');
/** @param {import('@minecraft/server').Block} b */
function growGarden(b,fertilized=false){
 const plant=gardenById.get(b.typeId), age=b.permutation.getState(gardenAge);
 if(!plant||typeof age!=='number'||age>=3)return false;
 const floor=b.below();
 if(floor?.typeId!=='minecraft:farmland')return false;
 if(!fertilized){
   if(!raining(b.dimension)&&(floor.permutation.getState('moisturized_amount')??0)<4)return false;
   const d=b.dimension.id.replace(/^minecraft:/,'');
   if(d==='nether'||d==='the_end')return false;
   if(seasons.indexOf(era())!==plant.season&&!raining(b.dimension)&&Math.random()>.38)return false;
 }
 b.setPermutation(b.permutation.withState(gardenAge,age+1));
 return true;
}
async function gardenGuide(p){
 const i=await form(p,'季節の菜園','作業台で種を作って耕地に植えます。旬や雨で育ちやすくなり、骨粉も使えます。育ちきった株は使うと収穫でき、空の株に戻ります。',seasonalPlants.map(x=>[x.name]));
 if(i===undefined)return;
 const info=['赤いチューリップ＋小麦の種。花びらは桃色の染料や季節樹の葉に使えます。','干草の俵＋小麦の種。穂は食べたり、穂2＋小麦でパンを作ったりできます。','カボチャの種＋オークの葉。実＋砂糖＋卵でパイを作れます。','雪玉＋小麦の種。花＋ガラス瓶＋水の結晶で魔力の薬を作れます。','ヒマワリ＋小麦の種。花びら2枚で黄色の染料が作れます。'];
 const plant=seasonalPlants[i];if(plant)return simple(p,plant.name,`${seasons[plant.season]}が旬。${info[i]}\n収穫物から種も作れます。`);
}
function nudgeCrop(block,strict=true){
 const l=block.location,d=block.dimension,id=block.typeId;
 if(!cropIds.has(id)||strict&&id!==seasonalCrops[era()]&&!raining(d))return false;
 const growth=block.permutation.getState('growth');
 if(typeof growth!=='number'||growth>=7||(d.getBlock({...l,y:l.y-1})?.permutation.getState('moisturized_amount')??0)<4)return false;
 block.setPermutation(block.permutation.withState('growth',growth+1));return true;
}
function seasonPlot(block){
 const next=ns+`season_${seasons.indexOf(era())}`;
 if(block.typeId!==next)block.setType(next);
 const l=block.location,d=block.dimension;
 if(d.getPlayers({location:l,maxDistance:26,closest:1}).length){
   const spin=Math.floor(system.currentTick/100)%8,dx=[2,2,0,-2,-2,-2,0,2][spin],dz=[0,2,2,2,0,-2,-2,-2][spin];
   try{const b=d.getBlock({x:l.x+dx,y:l.y,z:l.z+dz});if(b)nudgeCrop(b);}catch{}
 }
}
safeSub('world','after','weatherChange',e=>currentWeather.set(e.dimension.replace(/^minecraft:/,''),e.newWeather));
safeSub('world','after','playerPlaceBlock',({block,player:p})=>{
 try{
   if(!isCreative(p)&&cropIds.has(block.typeId)&&block.permutation.getState('growth')===0)nudgeCrop(block);
 }catch{}
});
const wildlifeById=new Map(wildlife.map(m=>[ns+m.id,m])), wildlifeIndex=new Map(wildlife.map((m,i)=>[m.id,i]));
const biomeOrder=Object.keys(biomes),familyOrder=Object.keys(families),biomeIndex=new Map(biomeOrder.map((id,i)=>[id,i]));
function biomeAt(p){
 if(p.dimension.id.startsWith(ns+'realm_')){
   const realm=Number(p.dimension.id.slice((ns+'realm_').length));
   return seededWorlds?.biomeAt(realm,p.location);
 }
 if(p.dimension.id.startsWith(ns))return;
 try{
   const id=p.dimension.getBiome(p.location).id.replace(/^minecraft:/,'');
   const key=biomes[id];
   if(key)return {id,key,profile:families[key]};
 }catch{}
}
const waterAt=(d,l)=>d.getBlock(l)?.typeId==='minecraft:water';
function survey(p){
 const s=state(p),b=biomeAt(p);
 if(!b||b.profile.mode==='water'&&!waterAt(p.dimension,p.location)){s.biomeCandidate=undefined;return b;}
 const index=biomeIndex.get(b.id);
 if(s.biomeCandidate!==b.id){s.biomeCandidate=b.id;return b;}
 if(!marked(p,'survey',index)){
   mark(p,'survey',index);mark(p,'regions',familyOrder.indexOf(b.key));
   notice(p,`§a自然調査：${b.profile.name}${b.id.startsWith('hakkai:seed_')?'':` / ${b.id}`}`);
 }
 return b;
}
function observe(p,e){
 const m=wildlifeById.get(e.typeId);
 if(!m||!p.isValid||!e.isValid||p.dimension.id!==e.dimension.id||Math.hypot(e.location.x-p.location.x,e.location.y-p.location.y,e.location.z-p.location.z)>8)return false;
 const i=wildlifeIndex.get(m.id);
 if(!marked(p,'sight',i)){mark(p,'sight',i);notice(p,`§a生き物を観察：${m.name}`);}
 return true;
}
async function journal(p){
 const discovered=biomeOrder.filter((_,i)=>marked(p,'survey',i)), regions=familyOrder.filter((_,i)=>marked(p,'regions',i)),
   seen=wildlife.filter((_,i)=>marked(p,'sight',i));
 const ix=await form(p,'自然調査ノート',`バイオーム記録 ${discovered.length}件 / 調査区分 ${regions.length}/${familyOrder.length}\n生き物を観察 ${seen.length}/${wildlife.length}\n海では水に入り、地上では同じ場所に少し留まると記録できます。`,[
   ['見つけたバイオーム'],['調査区分と初回報酬'],['追加の生き物図鑑'],['野外観察をする（正面の生き物）'],['観察隊の報酬'],['現在地の採集調査'],['風土図鑑の展示を巡る']
 ]);
 if(ix===0)return discovered.length?paged(p,'見つけたバイオーム','バニラの自然環境と、8界のシード地形で発見したバイオーム。',discovered.map(id=>[id.startsWith('hakkai:seed_')?families[biomes[id]].name:`${families[biomes[id]].name} / ${id}`])):simple(p,'見つけたバイオーム','まだ記録はありません。');
 if(ix===1){
   const at=await paged(p,'自然調査の区分','同じ区分のどれかを見つけると、最初の一回だけ素材を受け取れます。',familyOrder.map((k,i)=>[
     `${marked(p,'survey_reward',i)?'済':regions.includes(k)?'◆':'◇'} ${families[k].name} → ${attrs[families[k].ore]}の欠片`
   ]));
   if(at===undefined||!p.isValid)return;
   if(!marked(p,'regions',at))return notice(p,'§eまだこの地域を調査していません');
   if(marked(p,'survey_reward',at))return notice(p,'§eこの地域の報酬は受け取り済み');
   if(give(p,ns+`shard_${families[familyOrder[at]].ore}`,2)){mark(p,'survey_reward',at);notice(p,'§a調査の報酬を受け取った');}
   else notice(p,'§e持ち物に空きを作ってね');
 }
 if(ix===2){
   const at=await paged(p,'生き物図鑑','◆ は観察済み。威嚇する生き物には少し離れて接近してね。',wildlife.map((m,i)=>[`${marked(p,'sight',i)?'◆':'◇'} ${m.name}`]));
   if(at!==undefined){
     const m=wildlife[at];return simple(p,m.name,`${places[m.dim+1].name}の生き物。\n${{hostile:'敵対：プレイヤーを見つけると襲います。',neutral:'中立：攻撃されると反撃します。',passive:'おとなしい：近づくと逃げることがあります。'}[m.temper]}`);
   }
 }
 if(ix===3){
   const hit=p.getEntitiesFromViewDirection({maxDistance:8}).find(e=>wildlifeById.has(e.entity.typeId));
   if(!hit||!observe(p,hit.entity))notice(p,'§e見たい生き物の方を向いてね');
 }
 if(ix===4){
   const step=num(p,'expedition'), goals=[3,8,16,24], goal=goals[step];
   if(!goal)return notice(p,'§aすべての観察隊の報酬を受け取りました');
   if(seen.length<goal)return notice(p,`§e観察隊の次の報酬まで：${seen.length}/${goal}種`);
   if(give(p,ns+`crystal_${[0,5,6,7][step]}`,2)){property(p,'expedition',step+1);notice(p,'§a観察隊から結晶を受け取った');}
   else notice(p,'§e持ち物に空きを作ってね');
 }
 if(ix===5)return surveySample(p);
 if(ix===6)return atlasMenu(p);
}
async function surveySample(p){
 const b=biomeAt(p);
 if(!b)return notice(p,'§eバニラの地形で開いてください');
 const i=biomeIndex.get(b.id);
 if(!marked(p,'survey',i))return notice(p,'§eまずこのバイオームに少し留まって名前を記録してください');
 /** @type {Record<string,[string,()=>boolean]>} */
 const sampleRules={
   water:['水中で使う',()=>waterAt(p.dimension,p.location)],
   shore:['川の水が見える近くで使う',()=>shore(p)],
   snow:['雪か氷を見ながら使う',()=>/^minecraft:(?:.*snow.*|.*ice)$/.test(p.getBlockFromViewDirection({maxDistance:7})?.block.typeId??'')],
   peaks:['高さ100以上で使う',()=>p.location.y>=100],
   lush:['洞窟の苔や垂れ根を見ながら使う',()=>/^minecraft:(?:moss_block|moss_carpet|hanging_roots|cave_vines.*)$/.test(p.getBlockFromViewDirection({maxDistance:7})?.block.typeId??'')],
   drip:['鍾乳石を見ながら使う',()=>/^minecraft:(?:pointed_dripstone|dripstone_block)$/.test(p.getBlockFromViewDirection({maxDistance:7})?.block.typeId??'')],
   dark:['スカルクを見ながら使う',()=>p.getBlockFromViewDirection({maxDistance:7})?.block.typeId.startsWith('minecraft:sculk')??false]
 };
 const [clue,ok]=sampleRules[b.profile.mode]??sampleRules[b.key]??['この場所で使う',()=>true];
 const take=await form(p,'バイオーム別の採集',`${b.profile.name} / ${b.id}\n${clue}。1つのバイオームにつき1回、${attrs[b.profile.ore]}の欠片が1つもらえます。`,
  [[marked(p,'biome_sample',i)?'受け取り済み':'採集する'],['閉じる']]);
 if(take!==0||!p.isValid||biomeAt(p)?.id!==b.id||marked(p,'biome_sample',i))return;
 if(!ok())return notice(p,`§e${clue}という条件を満たしてね`);
 if(give(p,ns+`shard_${b.profile.ore}`)){mark(p,'biome_sample',i);notice(p,'§a採集調査を記録した');}
 else notice(p,'§e持ち物に空きを作ってね');
}
// --- v3.5.0：八界の巡礼イベント・旅先の出会い・冒険年鑑 ---
const realmJourneyEvents=[
 ['始まりの草原','風見の道標のそばで、小さな風鈴が草に埋もれている。風が吹く向きを読むには？',['風が草を倒す向き','太陽が沈む向き','石の色'],0,'風鈴の音は、草の穂が揺れる方向を教えてくれる。'],
 ['霧の森','苔むす古文庫の頁が一枚だけ白く光る。古い本を守るのにふさわしいものは？',['強い日差し','静かな湿り気','熱い砂'],1,'霧の森では、静かな湿り気が古い頁を守っている。'],
 ['砂の回廊','砂紋の石標に三本の線が刻まれている。砂丘に道筋を描くものは？',['風','雨粒だけ','遠い星'],0,'風は砂を運び、見えない道を描いていく。'],
 ['氷の鏡湖','氷の下に淡い光が見える。湖面が映しているものは？',['地中の炎','空の光','深い森の影'],1,'氷は空の光を閉じ込め、春まで守り続ける。'],
 ['雷の断崖','古い炉床のそばで歯車が鳴る。鍛冶師が炉を整える合図にしたものは？',['雷鳴','小雨','朝露'],0,'雷鳴は炉を整える合図であり、旅人への鐘でもあった。'],
 ['闇の地下庭園','月影の水脈に小さな灯りが浮かぶ。地上の光が届かない場所を照らすものは？',['苔の明かり','昼の太陽','遠い稲妻'],0,'苔の明かりは、見つけた人の心に道を灯す。'],
 ['空の浮島群','雲海の観測標に風向きが記されている。島々を結ぶ道は何が作る？',['砂の流れ','風の流れ','溶岩の川'],1,'風の流れが、見えない橋となって島々をつなぐ。'],
 ['時の終着駅','止まった時計のそばに古い手紙がある。時計が止まっても進み続けるものは？',['約束','歯車','影'],0,'約束は時計の針が止まっても、次の旅へ受け継がれる。']
];
function realmJourneyEventCount(p){let n=0;for(let i=0;i<8;i++)if(marked(p,'realm_journey_events',i))n++;return n;}
function realmJourneyHistory(p){try{const raw=p.getDynamicProperty(ns+'realm_adventure_history');const a=typeof raw==='string'?JSON.parse(raw):[];return Array.isArray(a)?a.filter(x=>typeof x==='string').slice(-20):[];}catch{return [];}}
function realmJourneyLog(p,line){const a=realmJourneyHistory(p);a.push(`${era()}｜${line}`);property(p,'realm_adventure_history',JSON.stringify(a.slice(-20)));}
async function realmAdventureEvent(p,i){
 if(!p.isValid||i<0||i>=8)return;
 if(marked(p,'realm_journey_events',i))return notice(p,'§7この世界の旅先イベントは記録済みです。');
 if(!marked(p,'realm_discoveries',i))return notice(p,'§e先にこの世界の発見記録を見つけてください。');
 const [realm,story,answers,correct,solution]=realmJourneyEvents[i];
 const pick=await form(p,`旅先の出会い｜${realm}`,`${story}\n\n風記に残された問いに答えてみましょう。`,answers.map(a=>[a]));
 if(pick===undefined||!p.isValid)return;
 if(pick!==correct){notice(p,'§e風鈴の音が遠ざかった。もう一度、この世界を観察してみよう。');try{p.playSound('note.bass',{volume:.5,pitch:.85});}catch{}return;}
 const rank=realmRankUpdate(p),items=[[ns+`shard_${i}`,2]];
 if(rank>=3)items.push([ns+'chronicle_fragment',1]);
 if(rank>=5)items.push([ns+'crystal_7',1]);
 const inv=space(p);
 if(!inv||items.some(([id,count])=>!room(inv,new ItemStack(id,count)))){notice(p,'§e報酬を受け取る空きがありません。空きを作って再挑戦してください。');return;}
 for(const [id,count] of items)if(!give(p,id,count)){notice(p,'§e報酬の受け取りに失敗しました。持ち物を確認してください。');return;}
 mark(p,'realm_journey_events',i);realmJourneyLog(p,`${realm}の旅先イベントを達成`);
 p.sendMessage(`§d✦ 旅先イベント達成：${realm}§r`);
 p.sendMessage(`§7${solution}`);
 p.sendMessage(`§a属性の欠片×2${rank>=3?'・古文書の欠片×1':''}${rank>=5?'・時の結晶×1':''}を獲得しました。`);
 try{for(let n=0;n<3;n++)p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:p.location.x+(n-1)*.55,y:p.location.y+1+n*.25,z:p.location.z});p.playSound('random.levelup',{volume:.7,pitch:1.08+i*.025});}catch{}
 realmRankUpdate(p);
}
const realmRankRequests=[
 {rank:1,name:'街道の観察記録',desc:'八界のうち3つ以上を訪問する',check:p=>places.filter(t=>t.id!==0&&visited(p,t.id)).length>=3,reward:[[ns+'shard_0',3]],text:'街道の風景を記録した。'},
 {rank:3,name:'遺跡の余韻を集める',desc:'秘密遺跡4か所以上と余韻4つ以上を記録する',check:p=>realmRuinCount(p)>=4&&realmEchoCount(p)>=4,reward:[[ns+'chronicle_fragment',3]],text:'四つの遺跡と余韻を年鑑に記録した。'},
 {rank:5,name:'八界の巡礼者',desc:'八界の発見記録8つ、探索試練6つ以上を達成する',check:p=>realmDiscoveryCount(p)===8&&realmTrialCount(p)>=6,reward:[[ns+'crystal_7',2]],text:'八界を巡る旅の記録が完成した。'},
 {rank:7,name:'大館長からの挑戦状',desc:'幻影闘技場3勝以上、八界の記念品をすべて展示する',check:p=>realmArenaWins(p)>=3&&realmGalleryComplete(p),reward:[[ns+'crystal_7',4]],text:'大館長からの挑戦を達成した。'}
];
async function realmAdventureRequest(p,i){
 const r=realmRankRequests[i];if(!r)return;
 const rank=realmRankUpdate(p);
 if(rank<r.rank)return notice(p,`§e冒険者ランク${realmRanks[r.rank][1]}以上で受注できます。`);
 if(marked(p,'realm_journey_requests',i))return notice(p,'§7この特別依頼は達成済みです。');
 if(!r.check(p))return notice(p,'§e依頼条件がまだそろっていません。冒険を続けましょう。');
 const inv=space(p);if(!inv||r.reward.some(([id,count])=>!room(inv,new ItemStack(id,count))))return notice(p,'§e報酬を受け取る空きがありません。');
 for(const [id,count] of r.reward)if(!give(p,id,count))return notice(p,'§e報酬の受け取りに失敗しました。');
 mark(p,'realm_journey_requests',i);realmJourneyLog(p,`特別依頼「${r.name}」を達成`);
 p.sendMessage(`§d✦ 特別依頼達成：${r.name}§r`);p.sendMessage(`§7${r.text}`);
 realmRankUpdate(p);
}
async function realmAdventureRequestBoard(p){
 realmRankUpdate(p);
 const rank=realmRankIndex(p),rows=realmRankRequests.map((r,i)=>[`${marked(p,'realm_journey_requests',i)?'◆':rank>=r.rank?'◇':'§8🔒'} ${r.name}｜必要ランク：${realmRanks[r.rank][1]}\n${r.desc}\n${marked(p,'realm_journey_requests',i)?'達成済み':r.check(p)?'達成条件クリア・受注可能':'条件未達成'}`]);
 rows.push(['戻る']);
 const pick=await form(p,'冒険者ランク別・特別依頼',`現在のランク：${realmRanks[rank][1]}\n依頼は条件を満たしたあと、ここから報酬を受け取れます。`,rows);
 if(pick!==undefined&&pick<4)return realmAdventureRequest(p,pick);
}
async function realmAdventureHistory(p){
 const h=realmJourneyHistory(p),events=realmJourneyEventCount(p),requests=realmRankRequests.filter((_,i)=>marked(p,'realm_journey_requests',i)).length;
 return simple(p,'八界の冒険年鑑',`【冒険の記録】\n旅先イベント：${events}/8\nランク別特別依頼：${requests}/4\n\n【最近の記録】\n${h.length?h.slice().reverse().join('\n'):'まだ記録はありません。'}\n\n旅先イベントは各世界の発見地点付近で発生します。ガイド本からも未体験イベントに挑戦できます。`);
}
async function realmAdventureBoard(p){
 const count=realmJourneyEventCount(p),rank=realmRankUpdate(p),rows=realmJourneyEvents.map(([realm],i)=>[`${marked(p,'realm_journey_events',i)?'◆':'◇'} ${realm}｜${marked(p,'realm_journey_events',i)?'記録済み':marked(p,'realm_discoveries',i)?'イベントに挑戦':'発見記録を見つけると解放'}`]);
 rows.push(['旅先のランダムイベントを探す'],['冒険者ランク別・特別依頼'],['冒険年鑑・記録を見る'],['閉じる']);
 const pick=await form(p,'八界の巡礼と旅先イベント',`旅先イベント：${count}/8\n現在の冒険者ランク：${realmRanks[rank][1]}\n\n各世界の発見記録を見つけると、その場所の近くでランダムイベントが発生することがあります。ここから直接挑戦することもできます。\n\n正解すると属性の欠片を獲得。高ランクでは追加報酬もあります。`,rows);
 if(pick===undefined||pick===11)return;
 if(pick<8)return realmAdventureEvent(p,pick);
 if(pick===8){const eligible=realmJourneyEvents.map((_,i)=>i).filter(i=>marked(p,'realm_discoveries',i)&&!marked(p,'realm_journey_events',i));if(!eligible.length)return notice(p,'§7挑戦できる未体験イベントはありません。');const i=eligible[Math.floor(Math.random()*eligible.length)];return realmAdventureEvent(p,i);}
 if(pick===9)return realmAdventureRequestBoard(p);
 if(pick===10)return realmAdventureHistory(p);
}

// --- v3.6.0：四季巡礼・風記の案内人・特別訪問先・八界の秘話 ---
const realmSeasonStories=[
 ['草原に届く春便り','草原の風見番は、春になると小川の石を一つだけ裏返した。そこに新しい芽が見つかれば、旅人たちへ春の訪れを知らせたという。','春の芽吹きは、小さな変化を見つける目から始まる。'],
 ['霧森の夏灯','夏の霧森では、書庫番が苔灯を一つずつ磨いた。遠くから来た旅人が、迷わず本を返せるように。','知識は独り占めせず、次の人へ渡す灯り。'],
 ['砂の回廊の秋譜','秋の砂丘では、旅人たちが風紋を写し取った。昨日と同じ模様は一つもなく、だからこそ記録する価値があった。','変わり続ける景色も、記録すれば物語になる。'],
 ['氷鏡湖の冬灯','冬の湖守は、氷の下に小さな灯りを置いた。春に湖が解けたとき、遠くの村からも帰り道が見えるように。','誰かのために残した灯りは、季節を越えて届く。'],
 ['雷炉に実る春','炉の職人は春の初雷を聞くと、古い歯車を一つ磨いた。新しい季節の仕事を、仲間と始める合図だった。','始まりの合図は、誰かと分かち合うと力になる。'],
 ['地下庭園の夏雨','地下庭園の庭師は、夏の雨音を数えて水路を整えた。地上の天気を知らない花にも、季節は届いていた。','見えない場所にも、変化と成長は訪れている。'],
 ['雲海の秋渡り','浮島の観測士は、秋の風向きを旗に記した。渡り鳥が迷わず休める島を選べるように。','道しるべは、自分のためだけでなく誰かのためにもある。'],
 ['時の駅の冬約束','終着駅の駅長は、冬の最後の日に時計を巻かなかった。旅人が交わした約束を、次の春まで静かに守るためだった。','時が止まっても、約束を受け継ぐ人がいれば旅は続く。']
];
const realmGuideDialogues=[
 ['風見番','風向きが変わる前には、草の穂が先に揺れる。急がずに見ていけば、道はきっと見つかる。','草原の発見地点と、風の余韻を探してみよう。'],
 ['古文庫の司書','本に残るのは答えだけではない。誰かが問いを抱えて旅をした、その足音も残っている。','森の秘密遺跡と、記憶の欠片を調べてみよう。'],
 ['砂紋の案内人','砂に描いた道は風で消える。でも、誰かと歩いた時間までは消えない。','石標の近くで、追加の謎解きに挑戦してみよう。'],
 ['氷湖の守り手','氷の下の光は、すぐには手に入らない。季節が巡るのを待つことも、旅の知恵だ。','時間帯と季節を変えて、湖の余韻を訪ねよう。'],
 ['炉守りの職人','一つの歯車だけでは時計は動かない。仲間の仕事がつながって、初めて大きな仕組みになる。','探索試練と記念品の収集を進めてみよう。'],
 ['月影の庭師','光が届かない場所にも、育つものはある。見つけるには、少しだけ歩みをゆるめること。','地下庭園の水脈と、隠しルートを探してみよう。'],
 ['雲海の観測士','遠くの島は小さく見える。けれど、橋を渡ればそこにも誰かの暮らしがある。','浮島の観測標と、特別な訪問先を巡ってみよう。'],
 ['終着駅の駅長','終わりの駅に着いた人も、誰かに道を譲れば次の旅の始まりを作れる。','八界の記憶を集め、最後の聖域を訪ねよう。']
];
const realmHiddenChapters=[
 ['風見番が残した地図','古い地図の端には、道の名前ではなく「誰と歩いたか」が書かれていた。風見番は、場所よりも旅の出会いを忘れないために地図を描いたのだ。'],
 ['霧の書庫の返却票','返却票には本の題名がなく、借りた人の短い感想だけが並んでいた。読む人が変わるたび、同じ本も違う物語になる。'],
 ['砂丘の約束石','石の裏には、遠く離れた二人の旅人が同じ日に刻んだ印があった。二人は再会できなかったが、互いの道しるべを守り続けた。'],
 ['氷湖の預かりもの','湖守が預かったのは宝石ではなく、春に届ける小さな手紙だった。氷が解ける日まで、誰かの希望を守ることが役目だった。'],
 ['雷炉の交換日誌','職人たちは道具を貸し借りするたび、使い心地を書き残した。最高の道具は、一人の工夫ではなく皆の知恵から生まれた。'],
 ['月影庭園の種箱','種箱には、咲かなかった花の種も大切に保管されていた。庭師は失敗を捨てず、次の季節に生かそうとしていた。'],
 ['雲海橋の渡し歌','橋を渡る人々は、向こう岸の人にも聞こえる歌を歌った。声が届けば、島と島の距離は少しだけ近くなる。'],
 ['終着駅の未投函便','最後の郵便袋には、宛先のない手紙が一通だけ残っていた。「次にここを訪れる人へ」と始まる、旅の続きを託す手紙だった。']
];
function realmSeasonStoryCount(p){let n=0;for(let i=0;i<8;i++)if(marked(p,'realm_season_stories',i))n++;return n;}
function realmSecretChapterCount(p){let n=0;for(let i=0;i<8;i++)if(marked(p,'realm_secret_chapters',i))n++;return n;}
function realmSeasonalRecordsFor(p,i){let n=0;for(let season=0;season<4;season++)if(marked(p,'realm_seasonal_events',season*8+i))n++;return n;}
function realmGuideLog(p,line){realmJourneyLog(p,line);}
async function realmGuideConversation(p,i){
 if(i<0||i>=8||!marked(p,'realm_discoveries',i))return notice(p,'§e先にこの世界の発見記録を見つけてください。');
 const [name,line,hint]=realmGuideDialogues[i];
 const choice=await form(p,`風記の案内人｜${name}`,`${line}\n\nどの話を聞きますか？`,[['この世界の探索のヒント'],['季節の物語を読む'],['秘密の章を読む'],['また今度']]);
 if(choice===undefined||choice===3||!p.isValid)return;
 if(choice===0)return simple(p,`${name}の助言`,hint);
 if(choice===1){
  if(!marked(p,'realm_season_stories',i))return notice(p,'§7この世界の季節イベントを一度記録すると、季節の物語が読めます。');
  const [title,story,moral]=realmSeasonStories[i];
  const pick=await form(p,title,`${story}\n\n${moral}`,[['年鑑に記録する'],['閉じる']]);
  if(pick===0&&!marked(p,'realm_season_story_read',i)){mark(p,'realm_season_story_read',i);realmGuideLog(p,`季節の物語「${title}」を読んだ`);notice(p,'§d季節の物語を年鑑に記録しました。');}
  return;
 }
 if(choice===2){
  if(realmRankIndex(p)<2||!marked(p,'realm_echoes',i))return notice(p,'§7冒険者ランク「世界の探究者」以上で、世界の余韻を記録すると読めます。');
  const [title,story]=realmHiddenChapters[i];
  const pick=await form(p,title,story,[['秘密の章を記録する'],['閉じる']]);
  if(pick===0&&!marked(p,'realm_secret_chapters',i)){mark(p,'realm_secret_chapters',i);realmGuideLog(p,`秘密の章「${title}」を読んだ`);notice(p,'§d秘密の章を年鑑に記録しました。');realmRankUpdate(p);}
 }
}
async function realmGuideConversationBoard(p){
 const rows=realmGuideDialogues.map(([name],i)=>[`${marked(p,'realm_discoveries',i)?'◇':'§8🔒'} ${name}｜${marked(p,'realm_discoveries',i)?'対話できます':'発見記録で解放'}`]);
 rows.push(['閉じる']);
 const pick=await form(p,'風記の案内人たち',`八界を巡る案内人の言葉を聞き、季節の物語や秘密の章を年鑑に残しましょう。\n季節の物語：${realmSeasonStoryCount(p)}/8\n秘密の章：${realmSecretChapterCount(p)}/8`,rows);
 if(pick!==undefined&&pick<8)return realmGuideConversation(p,pick);
}
async function realmRankDestinationBoard(p){
 return simple(p,'八界の探索','各界の奥にある景色は、転送先から選ぶのではなく歩いて探せます。冒険者ランクによる直接移動はありません。');
}
async function realmSeasonStoryArchive(p){
 const rows=realmSeasonStories.map(([title],i)=>[`${marked(p,'realm_season_stories',i)?'◆':'§8◇'} ${title}｜${marked(p,'realm_season_stories',i)?'読了':'未解放'}`]);
 rows.push(['閉じる']);
 const pick=await form(p,'四季巡礼・物語の記録',`季節イベントを記録した世界の物語を読めます。\n読了：${realmSeasonStoryCount(p)}/8`,rows);
 if(pick===undefined||pick>=8)return;
 return realmGuideConversation(p,pick);
}
// --- v3.7.0：ワールド内の案内人NPC・友好度・連続ストーリー依頼 ---
const realmNpcQuestNames=['旅の足音を集めて','季節の便りを届けて','記憶の欠片をつないで'];
const realmNpcQuestNeeds=[
 p=>realmDiscoveryCount(p)>=2,
 p=>realmSeasonEventCount(p)>=2,
 p=>realmMemoryCount(p)>=4
];
const realmNpcQuestHints=[
 '八界のうち、2つの世界で発見記録を残しましょう。',
 '四季の探索イベントを2回記録しましょう。',
 '記憶の欠片を合計4つ集めましょう。'
];
function realmNpcFriend(p,i){return Math.max(0,Math.floor(num(p,`realm_npc_friend_${i}`,0)));}
function realmNpcQuestStage(p,i){return Math.max(0,Math.min(3,Math.floor(num(p,`realm_npc_quest_${i}`,0))));}
function realmNpcEntityName(i){return `§d風記の案内人§r｜${i}｜${realmGuideDialogues[i][0]}`;}
// --- v3.8.0：案内人の交流拠点・時間帯の暮らし・会話変化 ---
// v3.9.0：集落発展支援・八界甲冑テクスチャ刷新
const realmNpcCampPrefix='hakkai_guide_home_';
function realmNpcCampTag(x,y,z){return `${realmNpcCampPrefix}${x}_${y}_${z}`;}
function realmNpcCampFrom(e){
 try{const t=e.getTags().find(v=>v.startsWith(realmNpcCampPrefix));if(!t)return undefined;const m=t.slice(realmNpcCampPrefix.length).split('_').map(Number);return m.length===3&&m.every(Number.isFinite)?{x:m[0],y:m[1],z:m[2]}:undefined;}catch{return undefined;}
}
function realmNpcBuildCamp(dim,x,y,z){
 // 既存建築を壊さない。床・柱を置ける空間が完全に空いている場合だけ小さな交流拠点を設置する。
 try{
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
   const floor=dim.getBlock({x:x+dx,y:y,z:z+dz});
   const ground=dim.getBlock({x:x+dx,y:y-1,z:z+dz});
   const body=dim.getBlock({x:x+dx,y:y+1,z:z+dz});
   if(!floor||!ground||!body||!floor.isAir||ground.isAir||!body.isAir)return false;
   if(!dim.getBlock({x:x+dx,y:y+2,z:z+dz})?.isAir)return false;
  }
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)dim.getBlock({x:x+dx,y:y,z:z+dz}).setType('minecraft:spruce_planks');
  for(const [dx,dz] of [[-1,-1],[-1,1],[1,-1],[1,1]])dim.getBlock({x:x+dx,y:y+1,z:z+dz}).setType('minecraft:spruce_fence');
  dim.getBlock({x,y,z}).setType('minecraft:oak_planks');
  return true;
 }catch{return false;}
}
function realmNpcDayPhase(){const t=((world.getAbsoluteTime()%24000)+24000)%24000;return t<6000?0:t<12000?1:t<18000?2:3;}
function realmNpcPhaseLabel(phase){return ['朝','昼','夕方','夜'][phase]??'旅の途中';}
function realmNpcCommunityBoard(p){
 const rows=[['交流拠点の記録を見る'],['案内人たちの交流を振り返る'],['時間帯ごとの暮らしについて'],['閉じる']];
 return form(p,'八界の案内人・交流拠点',`現在の時間帯：${realmNpcPhaseLabel(realmNpcDayPhase())}\n案内人たちは、それぞれの交流拠点を中心に時間帯に合わせて過ごします。既存の建物や地形を壊さない場所に限り、小さな木製の休憩床を設置します。`,rows).then(async pick=>{
  if(pick===0){const guides=p.dimension.getEntities({type:'minecraft:villager_v2',location:p.location,maxDistance:96}).filter(e=>e.isValid&&typeof e.nameTag==='string'&&e.nameTag.startsWith('§d風記の案内人§r｜'));const lines=guides.map(e=>`${e.nameTag.split('｜')[2]??'案内人'}：${realmNpcPhaseLabel(realmNpcDayPhase())}の時間を過ごしています。${realmNpcCampFrom(e)?'交流拠点あり':'拠点未設置'}`);return simple(p,'近くの交流拠点',lines.length?lines.join('\n'):'この範囲に案内人はいません。');}
  if(pick===1){const a=JSON.parse(String(p.getDynamicProperty(ns+'realm_npc_social_log')??'[]'));return simple(p,'案内人たちの交流記録',a.length?a.slice(-8).join('\n'):'まだ交流の記録はありません。二人以上の案内人が同じ場所で過ごすと、交流が記録されます。');}
  if(pick===2)return simple(p,'案内人の一日','朝は旅の準備、昼は訪問者との会話、夕方は仲間との語らい、夜は静かな休息の時間です。案内人は拠点の周囲で過ごし、時間帯が変わると立ち位置も変わります。');
 });
}
function realmNpcSocialLog(p,line){try{const a=JSON.parse(String(p.getDynamicProperty(ns+'realm_npc_social_log')??'[]'));a.push(`${era()}｜${line}`);p.setDynamicProperty(ns+'realm_npc_social_log',JSON.stringify(a.slice(-20)));}catch{}}
let realmNpcLifeTick=0;
system.runInterval(()=>{
 const tick=system.currentTick;if(tick<realmNpcLifeTick)return;realmNpcLifeTick=tick+100;
 const phase=realmNpcDayPhase(),day=Math.floor(world.getAbsoluteTime()/24000);
 for(const dimId of ['minecraft:overworld','minecraft:nether','minecraft:the_end',...Array.from({length:8},(_,i)=>`hakkai:realm_${i}`)]){
  let dim;try{dim=world.getDimension(dimId);}catch{continue;}
  let guides=[];try{guides=dim.getEntities({type:'minecraft:villager_v2'}).filter(e=>e.isValid&&typeof e.nameTag==='string'&&e.nameTag.startsWith('§d風記の案内人§r｜'));}catch{continue;}
  for(const npc of guides){
   try{
    const camp=realmNpcCampFrom(npc);if(!camp)continue;
    const phaseTag=`hakkai_guide_phase_${phase}`;
    const tags=npc.getTags();
    if(!tags.includes(phaseTag)&&Math.hypot(npc.location.x-camp.x,npc.location.z-camp.z)<18){
     for(const old of tags.filter(v=>v.startsWith('hakkai_guide_phase_')))npc.removeTag(old);
     npc.addTag(phaseTag);
     const spots=[[0,0],[-1,0],[0,1],[1,0]];const [dx,dz]=spots[phase];
     npc.teleport({x:camp.x+dx+.5,y:camp.y+1,z:camp.z+dz+.5},{dimension:dim,checkForBlocks:true});
    }
   }catch{}
  }
  // 同じ拠点の近くにいる案内人同士は、1日1回だけ短い交流演出を行う。
  if(tick%1200<100&&guides.length>=2){
   let done=false;
   for(let i=0;i<guides.length&&!done;i++)for(let j=i+1;j<guides.length&&!done;j++){
    const a=guides[i],b=guides[j];if(!a.isValid||!b.isValid||Math.hypot(a.location.x-b.location.x,a.location.z-b.location.z)>5)continue;
    const tag=`hakkai_social_day_${day}`;if(a.getTags().includes(tag)||b.getTags().includes(tag))continue;
    try{a.addTag(tag);b.addTag(tag);dim.spawnParticle('hakkai:climate_6',{x:(a.location.x+b.location.x)/2,y:Math.max(a.location.y,b.location.y)+1,z:(a.location.z+b.location.z)/2});}catch{}
    const an=a.nameTag.split('｜')[2]??'案内人',bn=b.nameTag.split('｜')[2]??'案内人';
    for(const p of world.getAllPlayers())if(p.dimension.id===dim.id&&Math.hypot(p.location.x-a.location.x,p.location.z-a.location.z)<20){realmNpcSocialLog(p,`${an}と${bn}が交流した`);notice(p,`§d${an}と${bn}が旅の思い出を語り合っています。`);}
    done=true;
   }
  }
 }
},20);

async function realmNpcPlaceBoard(p){
 const rows=realmGuideDialogues.map(([name],i)=>[`${marked(p,'realm_discoveries',i)?'◇':'§8🔒'} ${name}｜${marked(p,'realm_discoveries',i)?'ワールドに呼ぶ':'発見記録で解放'}`]);
 rows.push(['閉じる']);
 const pick=await form(p,'案内人NPCを配置',`発見済みの世界の案内人を、現在地の近くに呼び出します。配置した案内人はワールド内に残り、近づいて操作すると会話できます。

※同じ案内人が近くにいる場合は重複配置しません。`,rows);
 if(pick===undefined||pick>=8||!p.isValid)return;
 if(!marked(p,'realm_discoveries',pick))return notice(p,'§e先に該当する世界の発見記録を残してください。');
 const name=realmNpcEntityName(pick),near=p.dimension.getEntities({type:'minecraft:villager_v2',location:p.location,maxDistance:12}).find(e=>e.isValid&&typeof e.nameTag==='string'&&e.nameTag.startsWith(name));
 if(near){notice(p,`§a${realmGuideDialogues[pick][0]}は近くにいます。`);return;}
 try{
  const at={x:Math.floor(p.location.x)+2,y:Math.floor(p.location.y),z:Math.floor(p.location.z)+2};
  const campBuilt=realmNpcBuildCamp(p.dimension,at.x,at.y,at.z);
  const npc=p.dimension.spawnEntity('minecraft:villager_v2',{x:at.x,y:at.y+1,z:at.z});
  npc.nameTag=name;
  try{npc.addTag(`hakkai_guide_${pick}`);npc.addTag(realmNpcCampTag(at.x,at.y,at.z));npc.addTag(`hakkai_guide_phase_${realmNpcDayPhase()}`);}catch{}
  npc.addEffect('resistance',6000,{amplifier:4,showParticles:false});
  realmJourneyLog(p,`${realmGuideDialogues[pick][0]}を旅先に招いた`);
  notice(p,`§d${realmGuideDialogues[pick][0]}が旅先にやって来ました。${campBuilt?'交流拠点も整いました。':'周囲に建物があるため、拠点の建築は見送りました。'}`);
  try{p.dimension.spawnParticle(`hakkai:climate_${pick}`,{x:at.x,y:at.y+1,z:at.z});p.playSound('random.levelup',{volume:.55,pitch:1.15});}catch{}
 }catch(err){report('案内人NPC配置',err);notice(p,'§eこの場所には案内人を配置できませんでした。少し開けた場所で試してください。');}
}
async function realmNpcConversation(p,i){
 if(i<0||i>=8||!p.isValid)return;
 const [name,baseLine,hint]=realmGuideDialogues[i],friend=realmNpcFriend(p,i),stage=realmNpcQuestStage(p,i);
 const line=stage>=3?`${name}「三つの旅を越えたね。あなたと見た景色は、ずっと忘れないよ。」`:friend>=2?`${name}「また会えたね。前よりも、この世界のことを話せる気がする。」`:baseLine;
 const questLine=stage>=3?'連続依頼：完了。ここまでの旅を、年鑑に残しておこう。':`連続依頼：${realmNpcQuestNames[stage]}\n${realmNpcQuestHints[stage]}`;
 const pick=await form(p,`${name}｜旅先での会話`,`${line}\n\n${hint}\n\n§d友好度：${friend}§r\n${questLine}`,[[stage>=3?'依頼の記録を読み返す':'連続ストーリー依頼を進める'],['この世界の物語を聞く'],[friend>=2?'二人の思い出を語る':'また今度']]);
 if(pick===undefined||!p.isValid)return;
 if(pick===2){if(friend>=2)return simple(p,`${name}との思い出`,`友好度：${friend}\n\n${name}「旅の途中で交わした言葉も、見つけた景色も、二人の大切な思い出だね。」`);return;}
 if(pick===1){
  const [title,story,moral]=realmSeasonStories[i];
  return simple(p,title,`${story}\n\n${moral}`);
 }
 if(stage>=3)return simple(p,`${name}との旅`,`友好度：${friend}\n\n${name}との3つの依頼をすべて達成しました。これからも八界の旅を楽しんでください。`);
 if(!realmNpcQuestNeeds[stage](p))return notice(p,`§e${realmNpcQuestHints[stage]}`);
 const rewards=[['hakkai:shard_0',2],['hakkai:shard_3',2],['hakkai:crystal_7',1]];
 const [item,count]=rewards[stage];
 if(!give(p,item,count))return notice(p,'§e持ち物に空きを作ってから、もう一度話しかけてください。');
 property(p,`realm_npc_quest_${i}`,stage+1);
 property(p,`realm_npc_friend_${i}`,friend+1);
 realmJourneyLog(p,`${name}の連続依頼「${realmNpcQuestNames[stage]}」を達成`);
 realmRankUpdate(p);
 notice(p,`§d${realmNpcQuestNames[stage]}を達成！ 友好度が上がりました。`);
 try{p.dimension.spawnParticle(`hakkai:climate_${i}`,{x:p.location.x,y:p.location.y+1,z:p.location.z});p.playSound('random.levelup',{volume:.7,pitch:1.2});}catch{}
}
async function realmNpcRoster(p){
 const rows=realmGuideDialogues.map(([name],i)=>{const stage=realmNpcQuestStage(p,i);return [`${name}｜友好度 ${realmNpcFriend(p,i)}｜依頼 ${stage}/3`];});
 rows.push(['閉じる']);
 const pick=await form(p,'案内人との出会い帳',`配置済みの案内人はワールド内で会話できます。友好度と連続依頼の進行はプレイヤーごとに保存されます。`,rows);
 if(pick!==undefined&&pick<8)return simple(p,realmGuideDialogues[pick][0],`友好度：${realmNpcFriend(p,pick)}\n依頼進行：${realmNpcQuestStage(p,pick)}/3\n\n${realmNpcQuestStage(p,pick)<3?realmNpcQuestHints[realmNpcQuestStage(p,pick)]:'3つの依頼を達成済みです。'}`);
}

async function realmV36Board(p){
 const rank=realmRankUpdate(p),rows=[['風記の案内人と対話する（ガイド本）'],['ワールド内に案内人NPCを配置する'],['案内人との出会い帳・友好度'],['八界の探索について'],['四季巡礼・物語の記録'],['八界の秘密の章'],['案内人の交流拠点・暮らし'],['v3.8.0の記録を見る'],['閉じる']];
 const pick=await form(p,'八界の四季巡礼と物語',`現在の季節：${era()}\n冒険者ランク：${realmRanks[rank][1]}\n季節の物語：${realmSeasonStoryCount(p)}/8\n秘密の章：${realmSecretChapterCount(p)}/8\n\n案内人との会話や、八界に残る物語を楽しめます。`,rows);
 if(pick===0)return realmGuideConversationBoard(p);
 if(pick===1)return realmNpcPlaceBoard(p);
 if(pick===2)return realmNpcRoster(p);
 if(pick===3)return realmRankDestinationBoard(p);
 if(pick===4)return realmSeasonStoryArchive(p);
 if(pick===5){
  const eligible=realmHiddenChapters.map((_,i)=>i).filter(i=>marked(p,'realm_echoes',i)&&realmRankIndex(p)>=2);
  if(!eligible.length)return notice(p,'§7秘密の章は、ランク「世界の探究者」以上で各世界の余韻を記録すると解放されます。');
  const list=eligible.map(i=>[`${marked(p,'realm_secret_chapters',i)?'◆':'◇'} ${realmHiddenChapters[i][0]}`]);
  const ix=await form(p,'八界の秘密の章',`読了：${realmSecretChapterCount(p)}/8`,list);
  if(ix!==undefined&&eligible[ix]!==undefined)return realmGuideConversation(p,eligible[ix]);
 }
 if(pick===6)return realmNpcCommunityBoard(p);
 if(pick===7)return simple(p,'v3.8.0｜案内人の交流と暮らし',`案内人は時間帯に合わせて交流拠点の周囲で過ごします。近くに複数の案内人がいると、1日1回の交流演出が発生し、年鑑に記録されます。会話は友好度や依頼進行によって変化します。\n\n季節イベントの記録をきっかけに、八界それぞれの季節の物語が解放されます。\n\n各界の奥にある景色は、その界を歩いて探せます。\n\n案内人はワールド内に村人NPCとして配置でき、会話・友好度・3段階の連続依頼が利用できます。依頼の進行と友好度はプレイヤーごとに保存されます。\n\n季節の物語：${realmSeasonStoryCount(p)}/8\n秘密の章：${realmSecretChapterCount(p)}/8`);
}

const armorShowcase=[
 ['霧銀の旅装','霧色の青緑と銀の縁取り。細かな格子模様を抑え、胸元に淡い水晶の輝きを配置。','gear_010 / gear_011 / gear_012 / series_leggings_00（旧マント gear_013）'],
 ['深影の黒曜甲','黒曜石色に紫の差し色。暗い金属面と鋭い縁取りで重厚感を表現。','gear_026 / gear_027 / gear_028 / series_leggings_01（旧マント gear_029）'],
 ['紅蓮の守護装','深紅と琥珀金。炎を思わせる斜めの意匠と金属の留め具。','gear_042 / gear_043 / gear_044 / series_leggings_02（旧マント gear_045）'],
 ['大地の古代装','砂岩色と苔の緑。石板のような面構成と銅色の装飾。','gear_058 / gear_059 / gear_060 / series_leggings_03（旧マント gear_061）'],
 ['雷光の紫電装','青紫と明るい金。稲妻をイメージした発光ラインと鋭いシルエット。','gear_074 / gear_075 / gear_076 / series_leggings_04（旧マント gear_077）'],
 ['星輝の白銀装','象牙白と金。星形の意匠と明るい縁取りで軽やかな英雄装備に。','gear_090 / gear_091 / gear_092 / series_leggings_05（旧マント gear_093）'],
 ['夢幻の藤霞装','藤色と淡い桃色。柔らかな光沢と細い装飾ライン。','gear_106 / gear_107 / gear_108 / series_leggings_06（旧マント gear_109）'],
 ['翠風の森装','深緑と金。葉脈のような模様と自然石の留め具。','gear_122 / gear_123 / gear_124 / series_leggings_07（旧マント gear_125）'],
 ['蒼海の潮騎装','深い青と水色。波紋を思わせる曲線模様と銀の縁取り。','gear_138 / gear_139 / gear_140 / series_leggings_08（旧マント gear_141）'],
 ['天空の白翼装','淡い空色と白銀。雲の層を思わせる明るい装甲面。','gear_154 / gear_155 / gear_156 / series_leggings_09（旧マント gear_157）'],
 ['時環の覇者装','濃紺と古金。時計の歯車をイメージした幾何学模様。','gear_170 / gear_171 / gear_172 / series_leggings_10（旧マント gear_173）'],
 ['終章・夜渡りの鎧','黒紫と金の最終級胸甲。深い色合いに控えめな魔力の輝きを追加。','gear_186']
];
async function armorShowcaseBook(p){
 const ix=await form(p,'八界の甲冑展示室','11系列の脚装備を追加。旧マントも残り、既存装備の性能・レシピは変わりません。',armorShowcase.map(x=>[x[0]]));
 if(ix!==undefined&&armorShowcase[ix])return simple(p,armorShowcase[ix][0],`${armorShowcase[ix][1]}\n\n対応装備：${armorShowcase[ix][2]}\n\n旧装備の性能・耐久値は従来どおりです。新しい脚装備のレシピは収集帳で確認できます。立体モデルは実機未検証です。`);
}

const armorLegCrystals=[10,6,2,18,14,10,6,2,18,14,10];
const armorSetDefs=[
 ['霧銀の旅装','gear_010','gear_011','gear_012','series_leggings_00','霧の結晶片'],
 ['深影の黒曜甲','gear_026','gear_027','gear_028','series_leggings_01','闇の結晶片'],
 ['紅蓮の守護装','gear_042','gear_043','gear_044','series_leggings_02','火の結晶片'],
 ['大地の古代装','gear_058','gear_059','gear_060','series_leggings_03','土の結晶片'],
 ['雷光の紫電装','gear_074','gear_075','gear_076','series_leggings_04','雷の結晶片'],
 ['星輝の白銀装','gear_090','gear_091','gear_092','series_leggings_05','光の結晶片'],
 ['夢幻の藤霞装','gear_106','gear_107','gear_108','series_leggings_06','夢の結晶片'],
 ['翠風の森装','gear_122','gear_123','gear_124','series_leggings_07','森の結晶片'],
 ['蒼海の潮騎装','gear_138','gear_139','gear_140','series_leggings_08','海の結晶片'],
 ['天空の白翼装','gear_154','gear_155','gear_156','series_leggings_09','空の結晶片'],
 ['時環の覇者装','gear_170','gear_171','gear_172','series_leggings_10','時の結晶片']
];
const armorSetBonusDefs=[
 ['霧銀の旅装','gear_010','gear_011','gear_012','series_leggings_00','speed',0],
 ['深影の黒曜甲','gear_026','gear_027','gear_028','series_leggings_01','night_vision',0],
 ['紅蓮の守護装','gear_042','gear_043','gear_044','series_leggings_02','fire_resistance',0],
 ['大地の古代装','gear_058','gear_059','gear_060','series_leggings_03','resistance',0],
 ['雷光の紫電装','gear_074','gear_075','gear_076','series_leggings_04','haste',0],
 ['星輝の白銀装','gear_090','gear_091','gear_092','series_leggings_05','regeneration',0],
 ['夢幻の藤霞装','gear_106','gear_107','gear_108','series_leggings_06','slow_falling',0],
 ['翠風の森装','gear_122','gear_123','gear_124','series_leggings_07','jump_boost',0],
 ['蒼海の潮騎装','gear_138','gear_139','gear_140','series_leggings_08','water_breathing',0],
 ['天空の白翼装','gear_154','gear_155','gear_156','series_leggings_09','health_boost',0],
 ['時環の覇者装','gear_170','gear_171','gear_172','series_leggings_10','strength',0]
];
function equippedSetParts(p,ids){return equippedSeries(p,ids,id=>ownsArmorPiece(p,id));}
function ownsArmorPiece(p,id){
 if(inventoryCount(p,id)>0)return true;
 const eq=p.getComponent('minecraft:equippable');
 return [EquipmentSlot.Head,EquipmentSlot.Chest,EquipmentSlot.Legs,EquipmentSlot.Feet].some(slot=>eq?.getEquipment(slot)?.typeId===ns+id);
}
function applyArmorSetBonuses(p){
 for(let i=0;i<armorSetBonusDefs.length;i++){
  const d=armorSetBonusDefs[i],status=equippedSetParts(p,d.slice(1,5));
  if(status.active){try{p.addEffect(d[5],150,{amplifier:0,showParticles:false});}catch{}}
 }
}
// v4.3.0：完成した甲冑セットの固有粒子演出。既存RP粒子を使用。
function applyArmorSetVisuals(p){
 const dim=p.dimension,loc=p.location;
 for(let i=0;i<armorSetBonusDefs.length;i++){
  const d=armorSetBonusDefs[i],status=equippedSetParts(p,d.slice(1,5));
  if(!status.active)continue;
  try{dim.spawnParticle(`${ns}${d[1]}`,{x:loc.x,y:loc.y+1.0,z:loc.z});}catch{}
 }
}
async function armorCollectionArchive(p){
 const rows=armorSetDefs.map(([name,...ids])=>{
  const have=ids.slice(0,4).filter(id=>ownsSeriesPiece(id,x=>ownsArmorPiece(p,x))).length;
  const active=equippedSetParts(p,ids.slice(0,4)).active;
  return [`${have===4?'§a◆':'§7◇'} ${name}｜${have}/4${active?'｜§d演出発動中':''}`];
 });
 const complete=armorSetDefs.filter(([, ...ids])=>ids.slice(0,4).every(id=>ownsSeriesPiece(id,x=>ownsArmorPiece(p,x)))).length;
 const pick=await form(p,'八界の甲冑図鑑・収集記録',`収集完成：${complete}/${armorSetDefs.length} セット
全44種の甲冑を集めて、八界の装備コレクションを完成させましょう。
頭・胴・脚・足を装備するとセット効果が発動。旧マント所持でも従来どおり発動できます。`,[...rows,['閉じる']]);
 if(pick!==undefined&&pick<armorSetDefs.length){
  const [name,...ids]=armorSetDefs[pick];
  const have=ids.slice(0,4).filter(id=>ownsSeriesPiece(id,x=>ownsArmorPiece(p,x))).length;
  return simple(p,name,`収集状況：${have}/4
必要装備：${ids.slice(0,4).join('・')}
脚装備：鉄のレギンス＋crystal_${armorLegCrystals[pick]}＋shard_${pick}（作業台）。旧マントは脚の収集代替。
セット効果：${armorSetBonusDefs.find(x=>x[0]===name)?.[5]??'特殊効果'}
専用粒子：${have===4?'セット完成。装備条件を満たすと発動します。':'4部位を集めると専用演出が解放されます。'}`);
 }
}
function inventoryCount(p,id){const c=space(p);if(!c)return 0;let n=0;for(let i=0;i<c.size;i++){const x=c.getItem(i);if(x?.typeId===ns+id)n+=x.amount;}return n;}
async function armorProgressBoard(p){
 const c=space(p);if(!c)return;
 const rows=armorSetDefs.map(([name,...ids])=>{const have=ids.slice(0,4).reduce((n,id)=>n+Math.min(1,ownsSeriesPiece(id,x=>ownsArmorPiece(p,x))),0);return [`${have===4?'◆': '◇'} ${name}｜4部位中 ${have}/4`];});
 const pick=await form(p,'八界の装備収集帳',`装備セットは4部位を集めて完成です。装備中も数えます。旧マントもレギンスの代わりに収集扱いです。
完成セット：${armorSetDefs.filter(([, ...ids])=>ids.slice(0,4).every(id=>ownsSeriesPiece(id,x=>ownsArmorPiece(p,x)))).length}/${armorSetDefs.length}

セットの収集記録と、装備の強化をここから確認できます。`,[...rows,['装備を強化する'],['装備セットの試練'],['閉じる']]);
 if(pick===armorSetDefs.length)return enhanceHeldGear(p);
 if(pick===armorSetDefs.length+1)return armorSetTrial(p);
 if(pick!==undefined&&pick<armorSetDefs.length){const [name,...ids]=armorSetDefs[pick];const have=ids.slice(0,4).filter(id=>ownsSeriesPiece(id,x=>ownsArmorPiece(p,x))).length;return simple(p,name,`収集状況：${have}/4
必要装備：${ids.slice(0,4).join('・')}
脚装備：鉄のレギンス＋crystal_${armorLegCrystals[pick]}＋shard_${pick}（作業台）。

4部位をそろえると、このセットの収集記録が完成します。
装備ボーナス：${armorSetBonusDefs.find(x=>x[0]===name)?.[5]??'特殊効果'}（頭・胴・脚・足を装備、または旧マント所持で発動）
装備セットの見た目はリソースパックに収録されています。`);}
}
async function armorSetTrial(p){
 const complete=armorSetDefs.filter(([, ...ids])=>ids.slice(0,4).every(id=>ownsSeriesPiece(id,x=>ownsArmorPiece(p,x))));
 const claimed=num(p,'armor_set_trial_claimed');
 const ready=complete.length>0;
 const pick=await form(p,'八界の装備セット試練',`完成セット：${complete.length}/${armorSetDefs.length}

いずれか1つの甲冑セットを4部位そろえると試練達成です。
報酬：終章・夜渡りの鎧（gear_186）×1、エメラルド×8

${claimed?'報酬は受け取り済みです。':ready?'試練達成！報酬を受け取れます。':'まずは甲冑4部位を集めてください。'}`,[['試練の報酬を受け取る'],['戻る']]);
 if(pick!==0)return;
 if(num(p,'armor_set_trial_claimed'))return notice(p,'§eこの試練の報酬は受け取り済みです');
 if(!armorSetDefs.some(([, ...ids])=>ids.slice(0,4).every(id=>ownsSeriesPiece(id,x=>ownsArmorPiece(p,x)))))return notice(p,'§e甲冑セットを4部位そろえてください');
 const c=space(p);if(!c)return;
 const slot=trialRewardSlot(c,new ItemStack('minecraft:emerald',8));
 if(slot<0)return notice(p,'§e報酬を受け取るため、持ち物に空きを作ってください');
 c.setItem(slot,new ItemStack(ns+'gear_186',1));
 if(!give(p,'minecraft:emerald',8)){c.setItem(slot);return notice(p,'§e報酬を受け取るため、持ち物に空きを作ってください');}
 property(p,'armor_set_trial_claimed',1);
 notice(p,'§d装備セット試練達成！ 終章・夜渡りの鎧を獲得');
 try{p.playSound('random.levelup',{volume:1,pitch:1.25});p.dimension.spawnParticle('minecraft:totem_particle',{x:p.location.x,y:p.location.y+1,z:p.location.z});}catch{}
}

// --- v4.9.0：守護核継承装備・八界統合装備 ---
const guardianLegacyGear=[
 ['草原','翠嵐・守護継承鎧','gear_204','gear_196','guardian_core_0','crystal_0',0,4,'speed'],
 ['霧の森','霧晶・守護継承鎧','gear_205','gear_197','guardian_core_1','crystal_1',1,4,'night_vision'],
 ['砂の回廊','金砂・守護継承鎧','gear_206','gear_198','guardian_core_2','crystal_2',2,4,'fire_resistance'],
 ['氷の鏡湖','氷華・守護継承鎧','gear_207','gear_199','guardian_core_3','crystal_3',3,4,'resistance'],
 ['雷の断崖','紫電・守護継承鎧','gear_208','gear_200','guardian_core_4','crystal_4',4,5,'haste'],
 ['地下庭園','深翠・守護継承鎧','gear_209','gear_201','guardian_core_5','crystal_5',5,5,'regeneration'],
 ['空の浮島','天翼・守護継承鎧','gear_210','gear_202','guardian_core_6','crystal_6',6,5,'slow_falling'],
 ['時の終着駅','時環・守護継承鎧','gear_211','gear_203','guardian_core_7','crystal_7',7,6,'health_boost']
];
async function guardianLegacyForge(p){
 const c=space(p);if(!c)return;const rank=realmRankIndex(p),done=num(p,'guardian_legacy_claims',0);
 const rows=guardianLegacyGear.map(([realm,label,item,prev,core,crystal,idx,need],i)=>[`${done&(1<<i)?'§a◆':'◇'} ${label}\n必要ランク：${realmRanks[need][1]}｜守護核×1・極進化鎧×1\n界の結晶×4・エメラルド×32`]);
 rows.push([`${num(p,'guardian_legacy_complete')?'§a◆':'◇'} 八界統合・風記の継承鎧\n守護継承鎧8種を素材に統合`]);
 const pick=await form(p,'守護核継承工房',`八界の守護核を使い、極進化鎧を守護継承鎧へ進化させます。\n現在の冒険者ランク：${realmRanks[rank][1]}\n完成：${guardianLegacyGear.filter((_,i)=>done&(1<<i)).length}/8\n\n最後に8種類を統合し、八界統合装備を作れます。`,[...rows,['閉じる']]);
 if(pick===undefined||pick<0||!p.isValid)return;
 if(pick===8){
  if(num(p,'guardian_legacy_complete'))return notice(p,'§e八界統合装備はすでに完成しています');
  if((done&255)!==255)return notice(p,'§e先に守護継承鎧を8種類すべて完成させてください');
  if(!room(c,new ItemStack(ns+'gear_212',1)))return notice(p,'§e持ち物に空きを作ってください');
  for(let i=0;i<8;i++)if(total(c,ns+`gear_${204+i}`)<1)return notice(p,`§e守護継承鎧 gear_${204+i} が不足しています`);
  for(let i=0;i<8;i++)if(!debit(c,ns+`gear_${204+i}`,1))return notice(p,'§c素材の確認に失敗しました');
  if(!give(p,ns+'gear_212',1))return notice(p,'§c統合装備を収納できませんでした');
  property(p,'guardian_legacy_complete',1);notice(p,'§d✦ 八界統合・風記の継承鎧が完成しました！');
  try{p.playSound('ui.toast.challenge_complete',{volume:1,pitch:0.8});p.dimension.spawnParticle('minecraft:totem_particle',{x:p.location.x,y:p.location.y+1,z:p.location.z});}catch{}
  return;
 }
 if(pick>=8)return;
 const [realm,label,item,prev,core,crystal,idx,need]=guardianLegacyGear[pick],bit=1<<pick;
 if(done&bit)return notice(p,'§eこの守護継承鎧は完成済みです');
 if(rank<need)return notice(p,`§e冒険者ランク「${realmRanks[need][1]}」以上が必要です`);
 const costs=[[ns+prev,1],[ns+core,1],[ns+crystal,4],['minecraft:emerald',32]];
 if(costs.some(([id,n])=>total(c,id)<n))return notice(p,`§e${realm}の守護核・極進化鎧・結晶・エメラルドが不足しています`);
 if(!room(c,new ItemStack(ns+item,1)))return notice(p,'§e持ち物に空きを作ってください');
 for(const [id,n] of costs)if(!debit(c,id,n))return notice(p,'§c素材の消費に失敗しました');
 if(!give(p,ns+item,1))return notice(p,'§c進化後の装備を収納できませんでした');
 property(p,'guardian_legacy_claims',done|bit);notice(p,`§d✦ ${label}を完成させました！`);
 try{p.playSound('random.levelup',{volume:1,pitch:1.1+pick*.025});p.dimension.spawnParticle(`hakkai:climate_${idx}`,{x:p.location.x,y:p.location.y+1,z:p.location.z});}catch{}
 if((done|bit)===255&&!num(p,'guardian_legacy_all_complete')){property(p,'guardian_legacy_all_complete',1);p.sendMessage('§6✦ 八界守護継承者：8種類すべての守護継承鎧を完成させました！');}
}
function applyGuardianLegacyEffects(p){
 try{const chest=p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Chest);if(!chest)return;const i=guardianLegacyGear.findIndex(x=>chest.typeId===ns+x[2]);if(i>=0)p.addEffect(guardianLegacyGear[i][8],150,{amplifier:1,showParticles:false});if(chest.typeId===ns+'gear_212'){for(const e of ['resistance','strength','speed'])p.addEffect(e,150,{amplifier:1,showParticles:false});}if(chest.typeId===ns+'gear_213'){for(const e of ['resistance','strength','speed','regeneration','health_boost'])p.addEffect(e,150,{amplifier:1,showParticles:false});if(system.currentTick%200===0)p.dimension.spawnParticle('minecraft:totem_particle',{x:p.location.x,y:p.location.y+1,z:p.location.z});}}
 catch{}
}


// --- v5.0.0：八界統合・終章の大記念館 ---
async function finalAwakeningTrial(p){
 const c=space(p);if(!c)return;
 const guards=num(p,'guards',0),done=num(p,'final_awakening_complete',0);
 if(done)return simple(p,'終章の最終試練','この試練は達成済みです。\n称号：§d八界永劫の継承者§r\n最終装備：八界終章・風記の永劫鎧');
 const missing=[];
 if((guards&255)!==255)missing.push(`八界守護者の討伐記録：${(Array.from({length:8},(_,i)=>(guards>>i)&1).reduce((a,b)=>a+b,0))}/8`);
 if(realmRankIndex(p)<7)missing.push(`冒険者ランク：${realmRanks[7][1]}以上`);
 if(total(c,ns+'gear_212')<1)missing.push('八界統合・風記の継承鎧 ×1');
 for(let i=0;i<8;i++)if(total(c,ns+`guardian_core_${i}`)<1)missing.push(`${guardianCoreNames[i]} ×1`);
 if(total(c,'minecraft:emerald')<128)missing.push('エメラルド ×128');
 const empties=Array.from({length:c.size},(_,i)=>c.getItem(i)).filter(x=>!x).length;
 if(empties<2)missing.push('インベントリの空きスロット ×2');
 const yes=await form(p,'八界終章・最後の覚醒',`八界すべての守護者の記録を確かめ、統合鎧を終章の姿へ導きます。\n\n§d必要条件§r\n・八界守護者8体の討伐記録\n・冒険者ランク「${realmRanks[7][1]}」以上\n・八界統合・風記の継承鎧 ×1\n・八界の守護核 各1個\n・エメラルド ×128\n\n§6報酬§r\n八界終章・風記の永劫鎧\n八界統合終章の記念章\n称号「八界永劫の継承者」\n\n${missing.length?`§e現在の不足条件§r\n${missing.map(x=>'・'+x).join('\n')}`:'§aすべての条件を満たしています。最終覚醒を行えます。'}`,[['最終覚醒を行う'],['戻る']]);
 if(yes!==0||!p.isValid)return;
 if(missing.length)return notice(p,'§e必要条件をすべて満たしてから、もう一度挑戦してください');
 // Recheck immediately before consuming.
 if((num(p,'guards',0)&255)!==255||realmRankIndex(p)<7||total(c,ns+'gear_212')<1||
    Array.from({length:8},(_,i)=>total(c,ns+`guardian_core_${i}`)>=1).some(v=>!v)||
    total(c,'minecraft:emerald')<128||
    Array.from({length:c.size},(_,i)=>c.getItem(i)).filter(x=>!x).length<2)
   return notice(p,'§e条件が変わったため、素材と記録を再確認してください');
 for(let i=0;i<8;i++)if(!debit(c,ns+`guardian_core_${i}`,1))return notice(p,'§c守護核の確認に失敗しました');
 if(!debit(c,ns+'gear_212',1)||!debit(c,'minecraft:emerald',128))return notice(p,'§c素材の消費に失敗しました');
 if(!give(p,ns+'gear_213',1)||!give(p,ns+'wind_legacy_memorial',1)){
   notice(p,'§c報酬を収納できませんでした。インベントリを確認してください。');return;
 }
 property(p,'final_awakening_complete',1);
 property(p,'final_title_unlocked',1);
 notice(p,'§d✦ 八界終章・風記の永劫鎧が完成！');
 p.sendMessage('§6称号獲得：八界永劫の継承者');
 try{p.playSound('ui.toast.challenge_complete',{volume:1,pitch:0.72});p.dimension.spawnParticle('minecraft:totem_particle',{x:p.location.x,y:p.location.y+1,z:p.location.z});}catch{}
}
async function finalChronicle(p){
 const guards=num(p,'guards',0),core=num(p,'guardian_core_claims',0),legacy=num(p,'guardian_legacy_claims',0);
 const guardCount=Array.from({length:8},(_,i)=>(guards>>i)&1).reduce((a,b)=>a+b,0);
 const coreCount=Array.from({length:8},(_,i)=>(core>>i)&1).reduce((a,b)=>a+b,0);
 const legacyCount=Array.from({length:8},(_,i)=>(legacy>>i)&1).reduce((a,b)=>a+b,0);
 const ascended=num(p,'realm_awakening_claims',0);
 return simple(p,'八界風記・終章年代記',
 `守護者討伐記録：${guardCount}/8\n守護核収集記録：${coreCount}/8\n守護継承鎧の完成記録：${legacyCount}/8\n八界統合鎧：${num(p,'guardian_legacy_complete')?'完成':'未完成'}\n終章の最終覚醒：${num(p,'final_awakening_complete')?'達成':'未達成'}\n\n装備進化回数：${num(p,'gear_evolution_count',0)}回\n到達進化ランク：${realmRanks[Math.min(7,num(p,'gear_evolution_rank',0))][1]}\n冒険者ランク：${realmRanks[realmRankIndex(p)][1]}\n八界踏破：${checkEightRealmMemory(p)}/8\n\nこの年代記は、現在のプレイヤー保存データに記録された実績を表示します。`);
}
async function finalExhibition(p){
 const legacy=num(p,'guardian_legacy_claims',0),final=num(p,'final_awakening_complete',0);
 const names=['翠嵐・守護継承鎧','霧晶・守護継承鎧','金砂・守護継承鎧','氷華・守護継承鎧','紫電・守護継承鎧','深翠・守護継承鎧','天翼・守護継承鎧','時環・守護継承鎧'];
 const rows=names.map((n,i)=>`${legacy&(1<<i)?'§a◆':'§7◇'} ${n}`);
 rows.push(`${num(p,'guardian_legacy_complete')?'§a◆':'§7◇'} 八界統合・風記の継承鎧`);
 rows.push(`${final?'§d◆':'§7◇'} 八界終章・風記の永劫鎧`);
 rows.push(`${num(p,'final_awakening_complete')?'§6◆':'§7◇'} 八界統合終章の記念章`);
 return simple(p,'八界統合・大記念館 展示目録',`守護継承装備と終章装備の記録です。\n\n${rows.join('\n')}\n\n◆ 完成済み　◇ 未完成\nここでは所持・完成記録を一覧できます。`);
}
async function finalMemorialHall(p){
 const pick=await form(p,'八界統合・終章の大記念館','八界を巡った記録を確かめ、最後の覚醒へ。',[
  ['終章・最後の覚醒試練'],
  ['八界風記・終章年代記'],
  ['八界統合装備の展示目録'],
  ['閉じる']
 ]);
 if(pick===0)return finalAwakeningTrial(p);
 if(pick===1)return finalChronicle(p);
 if(pick===2)return finalExhibition(p);
}

// --- v4.8.0：八界守護核・初討伐報酬と収集記録 ---
const guardianCoreNames=['風紋の守護核','霧灯の守護核','砂暦の守護核','氷鏡の守護核','雷炉の守護核','月影の守護核','雲海の守護核','時鐘の守護核'];
async function guardianCoreArchive(p){
 const bits=num(p,'guardian_core_claims',0),guards=num(p,'guards',0),rows=guardianCoreNames.map((name,i)=>[`${bits&(1<<i)?'§a◆':guards&(1<<i)?'§e◇':'§7◇'} ${name}\n${bits&(1<<i)?'収集済み':guards&(1<<i)?'過去の討伐記録あり・受取可能':'未獲得｜守護者：'+guardians[i]}`]);
 const count=guardianCoreNames.filter((_,i)=>bits&(1<<i)).length;
 const pick=await form(p,'八界の守護核・収集年鑑',`守護者を初めて討伐すると、その界の守護核を1個獲得できます。\n\n収集状況：${count}/8\n八つの守護核は八界統合の記念品です。`,[...rows,['閉じる']]);
 if(pick!==undefined&&pick<8){const bit=1<<pick;if(bits&bit)return simple(p,guardianCoreNames[pick],'収集済みです。');if(!(guards&bit))return simple(p,guardianCoreNames[pick],'対応する守護者を討伐すると獲得できます。');const item=ns+`guardian_core_${pick}`;if(!give(p,item,1)){try{p.dimension.spawnItem(new ItemStack(item,1),p.location);}catch{return notice(p,'§e守護核を受け取れませんでした');}}property(p,'guardian_core_claims',bits|bit);notice(p,`§d✦ ${guardianCoreNames[pick]}を受け取りました！`);return;}
}

// --- v4.7.0：八界覚醒鎧・極進化と固有能力 ---
const realmAscendedGear=[
 ['草原','翠嵐・極の覚醒鎧','gear_196','gear_188',0,4,'speed'],['霧の森','霧晶・極の覚醒鎧','gear_197','gear_189',1,4,'night_vision'],['砂の回廊','金砂・極の覚醒鎧','gear_198','gear_190',2,4,'fire_resistance'],['氷の鏡湖','氷華・極の覚醒鎧','gear_199','gear_191',3,4,'resistance'],['雷の断崖','紫電・極の覚醒鎧','gear_200','gear_192',4,5,'haste'],['地下庭園','深翠・極の覚醒鎧','gear_201','gear_193',5,5,'regeneration'],['空の浮島','天翼・極の覚醒鎧','gear_202','gear_194',6,5,'slow_falling'],['時の終着駅','時環・極の覚醒鎧','gear_203','gear_195',7,6,'health_boost']
];
async function realmAscensionBoard(p){
 const c=space(p);if(!c)return;const rank=realmRankIndex(p),claims=num(p,'realm_ascended_claims',0);
 const rows=realmAscendedGear.map(([realm,label,item,prev,idx,need],i)=>{const done=Boolean(claims&(1<<i));return [`${done?'§a◆':'◇'} ${label}\n必要ランク：${realmRanks[need][1]}｜素材：対応結晶×6・欠片×12・エメラルド×24\n${done?'極進化済み':rank<need?'ランク不足':'進化条件を確認'}`];});
 const pick=await form(p,'八界の覚醒鎧・極進化',`覚醒鎧を第二段階「極」へ進化させます。\n現在のランク：${realmRanks[rank][1]}\n極進化済み：${realmAscendedGear.filter((_,i)=>claims&(1<<i)).length}/8\n\n対応する覚醒鎧を持ち、必要ランクと素材を満たしてください。`,[...rows,['閉じる']]);
 if(pick===undefined||pick<0||pick>=8||!p.isValid)return;
 const [realm,label,item,prev,idx,need]=realmAscendedGear[pick],bit=1<<pick;
 if(claims&bit)return notice(p,'§eこの装備はすでに極進化済みです');
 if(rank<need)return notice(p,`§e冒険者ランク「${realmRanks[need][1]}」以上が必要です`);
 if(total(c,ns+prev)<1)return notice(p,`§e${prev}（対応する覚醒鎧）が必要です`);
 const costs=[[ns+`crystal_${idx}`,6],[ns+`shard_${idx}`,12],['minecraft:emerald',24]];
 if(costs.some(([id,n])=>total(c,id)<n))return notice(p,'§e極進化素材が不足しています');
 if(!room(c,new ItemStack(ns+item,1)))return notice(p,'§e持ち物に空きを作ってください');
 if(!debit(c,ns+prev,1))return notice(p,'§e覚醒鎧の確認に失敗しました');
 for(const [id,n] of costs)if(!debit(c,id,n))return notice(p,'§e素材の消費に失敗しました');
 if(!give(p,ns+item,1))return notice(p,'§c進化後の装備を収納できませんでした');
 property(p,'realm_ascended_claims',claims|bit);notice(p,`§d✦ ${label}へ極進化しました！`);
 try{p.playSound('random.levelup',{volume:1,pitch:1.2});p.dimension.spawnParticle(`hakkai:gear_${188+pick}`,{x:p.location.x,y:p.location.y+1,z:p.location.z});}catch{}
 if((claims|bit)===255&&!num(p,'realm_ascension_complete')){property(p,'realm_ascension_complete',1);p.sendMessage('§6✦ 八界統合の極継承者：八界すべての覚醒鎧を極進化させました！');}
}
function applyRealmAwakenedEffects(p){
 try{const chest=p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Chest);if(!chest)return;const i=realmAscendedGear.findIndex(x=>chest.typeId===ns+x[2]||chest.typeId===ns+x[3]);if(i<0)return;const effect=realmAscendedGear[i][6];const amp=chest.typeId===ns+realmAscendedGear[i][2]?1:0;p.addEffect(effect,140,{amplifier:amp,showParticles:false});}catch{}
}
// --- v4.6.0：八界の守護者別・覚醒装備継承試練 ---
const realmAwakenedGear=[
 ['草原','翠嵐の覚醒鎧','gear_188',0,0],['霧の森','霧晶の覚醒鎧','gear_189',1,1],['砂の回廊','金砂の覚醒鎧','gear_190',2,2],['氷の鏡湖','氷華の覚醒鎧','gear_191',3,3],['雷の断崖','紫電の覚醒鎧','gear_192',4,4],['地下庭園','深翠の覚醒鎧','gear_193',5,5],['空の浮島','天翼の覚醒鎧','gear_194',6,6],['時の終着駅','時環の覚醒鎧','gear_195',7,7]
];
async function realmAwakeningBoard(p){
 const c=space(p);if(!c)return;const rank=realmRankIndex(p),guards=num(p,'guards',0),claims=num(p,'realm_awakened_claims',0);
 const rows=realmAwakenedGear.map(([realm,label,item,idx,need],i)=>{const done=Boolean(claims&(1<<i)),cleared=Boolean(guards&(1<<i));return [`${done?'§a◆':cleared&&rank>=need?'◇':'§8🔒'} ${label}\n守護者：${guardians[idx]}｜必要ランク：${realmRanks[need][1]}\n${done?'継承済み':!cleared?'守護者の討伐記録が必要':rank<need?'冒険者ランクが不足':'継承可能'}`];});
 const pick=await form(p,'八界の覚醒装備・継承試練',`八界の守護者から、それぞれの界に伝わる覚醒鎧を継承します。\n現在のランク：${realmRanks[rank][1]}\n継承済み：${realmAwakenedGear.filter((_,i)=>claims&(1<<i)).length}/8\n\n各報酬は一度だけ受け取れます。素材は対応する界の結晶×4、欠片×8、エメラルド×16です。`,[...rows,['閉じる']]);
 if(pick===undefined||pick<0||pick>=8||!p.isValid)return;
 const [realm,label,item,idx,need]=realmAwakenedGear[pick],bit=1<<pick;
 if(claims&bit)return notice(p,'§eこの覚醒装備はすでに継承済みです');
 if(!(guards&(1<<idx)))return notice(p,`§e先に${guardians[idx]}を討伐してください`);
 if(rank<need)return notice(p,`§e冒険者ランク「${realmRanks[need][1]}」以上が必要です`);
 const costs=[[ns+`crystal_${idx}`,4],[ns+`shard_${idx}`,8],['minecraft:emerald',16]];
 if(costs.some(([id,n])=>total(c,id)<n))return notice(p,'§e対応する界の結晶・欠片・エメラルドが不足しています');
 if(!room(c,new ItemStack(ns+item,1)))return notice(p,'§e覚醒鎧を受け取るため、持ち物に空きを作ってください');
 for(const [id,n] of costs)if(!debit(c,id,n))return notice(p,'§e素材の確認に失敗しました。もう一度お試しください');
 if(!give(p,ns+item,1))return notice(p,'§c報酬を収納できませんでした');
 property(p,'realm_awakened_claims',claims|bit);notice(p,`§d✦ ${label}を継承しました！`);
 try{p.playSound('random.levelup',{volume:1,pitch:1.05+pick*.04});p.dimension.spawnParticle(`hakkai:gear_${188+pick}`,{x:p.location.x,y:p.location.y+1,z:p.location.z});}catch{}
}
function applyRealmAwakenedVisual(p){
 try{const chest=p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Chest);if(!chest)return;const i=realmAwakenedGear.findIndex(x=>chest.typeId===ns+x[2]);if(i>=0)p.dimension.spawnParticle(`hakkai:gear_${188+i}`,{x:p.location.x,y:p.location.y+1.05,z:p.location.z});}catch{}
}

// --- v4.5.0：終章・夜渡りの鎧 覚醒試練 ---
async function nightwalkerAwakeningTrial(p){
 const c=space(p);if(!c)return;
 const rank=realmRankIndex(p),guards=num(p,'guards',0),already=num(p,'nightwalker_awakened',0);
 const costs=[[ns+'gear_186',1],[ns+'crystal_6',8],[ns+'shard_18',8],[ns+'chronicle_fragment',4],['minecraft:emerald',32]];
 const have=costs.map(([id,n])=>`${id.replace('hakkai:','').replace('minecraft:','')}: ${total(c,id)}/${n}`).join('\n');
 const ready=rank>=6&&(guards&255)===255&&costs.every(([id,n])=>total(c,id)>=n);
 const pick=await form(p,'終章・夜渡りの鎧 覚醒試練',`八界の守護者すべての記録を束ね、終章の鎧を覚醒させます。

解放条件：
・冒険者ランク「聖域の継承者」以上（現在：${realmRanks[rank][1]}）
・八界の守護者8体すべての討伐記録（${(guards&255).toString(2).replace(/0/g,'').length}/8）
・終章・夜渡りの鎧（gear_186）×1
・闇の結晶×8、港の欠片×8
・風記の断片×4、エメラルド×32

所持素材：
${have}

${already?'覚醒はすでに達成済みです。':'覚醒後は専用テクスチャ・強化耐久値・専用オーラを持つ覚醒鎧に変化します。'}`,[['鎧を覚醒させる'],['閉じる']]);
 if(pick!==0||!p.isValid)return;
 if(already)return notice(p,'§e覚醒の儀式はすでに完了しています');
 if(rank<6)return notice(p,'§e冒険者ランク「聖域の継承者」以上が必要です');
 if((guards&255)!==255)return notice(p,'§e八界の守護者8体すべての討伐記録が必要です');
 if(costs.some(([id,n])=>total(c,id)<n))return notice(p,'§e覚醒素材が不足しています');
 if(!room(c,new ItemStack(ns+'gear_187',1)))return notice(p,'§e覚醒鎧を受け取るため、持ち物に空きを作ってください');
 // Recheck the held inventory and consume only after all conditions are confirmed.
 for(const [id,n] of costs){if(!debit(c,id,n))return notice(p,'§e素材の確認に失敗しました。もう一度お試しください');}
 if(!give(p,ns+'gear_187',1))return notice(p,'§c覚醒鎧を収納できませんでした。運営記録を確認してください');
 property(p,'nightwalker_awakened',1);
 property(p,'nightwalker_awakened_at',system.currentTick);
 notice(p,'§d✦ 終章・夜渡りの鎧が覚醒した！');
 try{p.playSound('random.levelup',{volume:1,pitch:.72});p.dimension.spawnParticle('hakkai:gear_187',{x:p.location.x,y:p.location.y+1,z:p.location.z});}catch{}
}
function applyNightwalkerAwakeningVisual(p){
 try{const chest=p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Chest);if(chest?.typeId===ns+'gear_187')p.dimension.spawnParticle('hakkai:gear_187',{x:p.location.x,y:p.location.y+1.05,z:p.location.z});}catch{}
}

// --- v4.2.0：八界の伝説装備・守護獣の継承試練 ---
const legendGearTrials=[
 ['始まりの草原','草原の風鹿','gear_170',0],
 ['霧の森','霧森の苔獣','gear_171',0],
 ['砂の回廊','砂廊の石守','gear_172',1],
 ['氷の鏡湖','鏡湖の氷獣','gear_173',1],
 ['雷の断崖','断崖の雷獣','gear_174',2],
 ['闇の地下庭園','地下庭園の影守','gear_175',2],
 ['空の浮島群','浮島の雲獣','gear_176',3],
 ['時の終着駅','終着駅の時守','gear_177',3]
];
async function legendGearTrialBoard(p){
 const cleared=num(p,'guards'),claimed=num(p,'legend_gear_claims'),rank=realmRankIndex(p);
 const rows=legendGearTrials.map(([realm,boss,item,need],i)=>{
  const done=Boolean(cleared&(1<<i)),got=Boolean(claimed&(1<<i));
  const gearInfo=gear.get(ns+item);
  const status=got?'§a受領済み':done&&rank>=need?'§e報酬受取可能':done?'§7ランク条件未達':'§8未達成';
  return [`${status}｜${realm}\n守護獣：${boss}／報酬：${gearInfo?.label??item}\n必要ランク：${realmRanks[need][1]}`];
 });
 const ready=legendGearTrials.filter((r,i)=>(cleared&(1<<i))&&!(claimed&(1<<i))&&rank>=r[3]).length;
 const pick=await form(p,'八界の伝説装備・継承試練',`守護獣の初討伐記録をもとに、八界に伝わる伝説装備を受け取れます。\n現在の冒険者ランク：${realmRanks[rank][1]}\n受取可能：${ready}/8\n\n各界の守護獣を初討伐し、指定ランクに到達すると、その界の伝説装備が解放されます。報酬は各1回です。`,[...rows,['閉じる']]);
 if(pick===undefined||pick>=legendGearTrials.length)return;
 const [realm,boss,item,need]=legendGearTrials[pick],bit=1<<pick;
 if(claimed&bit)return notice(p,'§eこの伝説装備は受け取り済みです');
 if(!(cleared&bit))return notice(p,`§e${boss}の初討伐記録が必要です`);
 if(rank<need)return notice(p,`§e冒険者ランク「${realmRanks[need][1]}」以上が必要です`);
 const c=space(p);if(!c)return;
 const rewardId=ns+item;
 if(!room(c,new ItemStack(rewardId,1))||!room(c,new ItemStack('minecraft:emerald',6)))return notice(p,'§e報酬を受け取るため、持ち物に空きを作ってください');
 if(!give(p,rewardId,1))return notice(p,'§e装備を収納できません');
 if(!give(p,'minecraft:emerald',6))return notice(p,'§eエメラルドを収納できません');
 property(p,'legend_gear_claims',claimed|bit);
 notice(p,`§d伝説装備「${gear.get(rewardId)?.label??item}」を継承した！`);
 try{p.playSound('random.levelup',{volume:1,pitch:1.15});p.dimension.spawnParticle('minecraft:totem_particle',{x:p.location.x,y:p.location.y+1,z:p.location.z});}catch{}
}

async function enhanceHeldGear(p){
 const c=space(p),slot=p.selectedSlotIndex,held=selected(p);if(!c||!held?.typeId)return notice(p,'§e強化したい風記の装備を手に持ってください');
 const leg=seriesLegUpgrade(held.typeId.startsWith(ns)?held.typeId.slice(ns.length):'',catalog);
 const current=leg?.current??(held.typeId.startsWith(ns+'gear_')?gear.get(held.typeId):undefined);if(!current)return notice(p,'§eこの装備は強化対象外です');
 const next=leg?leg.next:catalog.find(x=>x.prev===current.id);
 if(!next)return simple(p,'装備の最終段階',`${current.label}

この装備は現在の系統で最終段階です。
これまでの進化回数：${num(p,'gear_evolution_count',0)}回`);
 const requiredRank=Math.min(7,Math.max(0,next.rank??0));
 const currentRank=realmRankUpdate(p);
 if(currentRank<requiredRank)return notice(p,`§e${next.label}への進化には冒険者ランク「${realmRanks[requiredRank][1]}」以上が必要です。`);
 const costs=[[ns+`crystal_${next.a}`,1],[ns+`shard_${next.modifier}`,1],['minecraft:emerald',2+requiredRank]];
 const labels=`必要素材：${attrs[next.a]}の結晶1個・${attrs[next.modifier]}の欠片1個・エメラルド${2+requiredRank}個`;
 const yes=await form(p,'装備の進化',`${current.label}
　↓
${next.label}

必要冒険者ランク：${realmRanks[requiredRank][1]}
${labels}
強化すると装備を次の等級に置き換え、進化記録に登録します。元のエンチャント・耐久などは引き継ぎません。`,[['進化させる'],['やめる']]);
 if(yes!==0||!p.isValid||p.selectedSlotIndex!==slot||selected(p)?.typeId!==ns+current.id)return;
 if(!isCreative(p)&&costs.some(([id,n])=>total(c,id)<n))return notice(p,'§e進化素材が足りません');
 const product=new ItemStack(ns+next.id,held.amount);
 if(!isCreative(p))for(const [id,n] of costs)debit(c,id,n);
 c.setItem(slot,product);
 property(p,'gear_evolution_count',num(p,'gear_evolution_count',0)+1);
 property(p,'gear_evolution_rank',Math.max(num(p,'gear_evolution_rank',0),requiredRank));
 notice(p,`§d${next.label}へ進化！ 進化記録に登録しました。`);
 try{p.playSound('random.levelup',{volume:.8,pitch:1.15});p.dimension.spawnParticle('minecraft:totem_particle',{x:p.location.x,y:p.location.y+1,z:p.location.z});}catch{}
}
async function gearEvolutionChronicle(p){
 const count=num(p,'gear_evolution_count',0),rank=Math.min(7,num(p,'gear_evolution_rank',0));
 const finalCount=catalog.filter(g=>g.rank>=3&&inventoryCount(p,g.id)>0).length;
 return simple(p,'風記の装備進化年鑑',`これまでの進化回数：${count}回
到達した進化ランク：${realmRanks[rank][1]}
所持している等級三装備：${finalCount}種

進化は装備収集帳から行えます。装備を手に持ち、必要な属性結晶・属性の欠片・エメラルドを用意してください。

等級が上がるほど必要な冒険者ランクとエメラルド数が増えます。進化履歴はプレイヤーごとに保存されます。`);
}

async function survivalGuide(p){
 const rows=[
  ['旅の地図・行き先を選ぶ'],
  ['水辺の釣り・釣果を集める'],
  ['季節の収穫市・食料を準備する'],
  ['村の集落台帳・村の暮らし'],
  ['自然調査ノート・発見を記録する'],
  ['追加レシピ・道具と料理を確認する'],
  ['季節の菜園・作物を育てる'],
  ['港の船便・交易と船旅'],
  ['風記の手引き・野営と休息'],
  ['生き物・素材・技図鑑'],
  ['時空の闘技場・再入場'],
  ['風紋連撃・戦闘の試作'],
  ['風の旅帳へ戻る']
 ];
 const i=await paged(p,'サバイバル実践ガイド','冒険の準備から生活、探索、記録まで、実際に使える機能へ進めます。',rows);
 if(i===0)return map(p);
 if(i===1)return fishing(p);
 if(i===2)return harvestMarket(p);
 if(i===3)return townMenu(p);
 if(i===4)return journal(p);
 if(i===5)return recipeIndex(p);
 if(i===6)return gardenGuide(p);
 if(i===7)return harbor(p);
 if(i===8)return help(p);
 if(i===9)return openCreatureGuide(p);
 if(i===10)return wardenArena?.open(p);
 if(i===11)return simple(p,'風紋・防御・回避・パリィ（試作）','§b風記の剣・斧・槍で立ったまま敵に命中すると風紋がたまります。4秒以内の命中を3回、間隔は0.4秒以上。最大で6秒間維持します。\n\n§e2つたまったら、しゃがみながら剣・斧・槍を使うボタンを押すだけで二連終撃。剣は前方3体、槍は前方2体、斧は周囲6体まで。威力と吹き飛ばしが上がります。3つたまってからの溜め技は代わりに風紋閃。壁や味方で止まります。どちらも外しても消費します。通常の近接命中はスタミナ3、溜め技は8と魔力が必要です。\n\n§b風記の剣・斧・槍を持ってしゃがむと、前方からの近接・飛び道具を70%軽減します。スタミナを毎秒5消費し、なくなったらしゃがみを解除して回復。構えの開始には最大約0.5秒かかります。\n\n§b風記の盾は両手どちらでも持て、しゃがむと試作の正面防御。斧を防ぐと約5秒無効。耐久と矢の跳ね返りは試作で、完全再現ではありません。実機確認まで頼らないでね。\n\n§a回避ロール：しゃがみながら前進を素早く2回入力。スタミナ10、約0.5秒の攻撃回避。空中や段差・すき間でも発動しますが、壁・未読込は停止し、崖から落ちる可能性があります。\n\n§b空中ダッシュ：空中でしゃがまずに前進を一度離し、素早く2回入力。スタミナ15、着地まで1回。着地時の落下ダメージ1回を防ぎますが、攻撃無敵や奈落防止ではありません。\n\n§b武器の軌跡：風記の武器97種で攻撃すると前方に当たり判定付きの軌跡が出ます。同じ一振りで本体が当たった相手には重ねて当たりません。軌跡は壁や味方を越えず、プレイヤーや友好生物を攻撃しません。基礎威力は武器と同じですが防具やエンチャント等で実際の損傷は変わります。落下中に攻撃すると着地まで1回空中攻撃に変化。スタミナ9を消費し、通常命中の費用は別。直接命中への重複ダメージはありません。杖は最大16ブロックへ飛ぶ弾を放ち、弓の矢には光跡が付きます。剣・斧・槍・盾・扇・ハンマーは種類ごとの形。しゃがみ近接の自動スキルは停止。しゃがんで武器を使うと溜め技（弓は約0.4秒使用して離す）。\n\n§6必殺：武器を持ってジャンプし、しゃがまず空中で使うボタン。スタミナ20と魔力10で、見通せる敵へ必殺。武器の種類で範囲が変わり、1秒間通常ダメージを防ぎます。護符版は従来の低資源条件です。奈落や直接体力変更は防げず、30秒待機します。\n\n§eパリィ：盾を持たない剣・斧・槍の防御中にしゃがみを解除し、約0.3秒以内に正面から敵の近接か飛び道具を受けるとスタミナ15で防ぎます。近い敵の近接と一部の技を約2秒止めます。全攻撃・全行動が止まるわけではありません。管理者へのしゃがみ近接パリィも使えます。\n\n§7マナ・再使用時間は通常通り必要。操作・演出・バランスは試作で、統合版の検証が必要です。');
 if(i===12)return guide(p);
}

// The guide uses the same ActionFormData path as the rest of the pack. Every
// page is awaited, including back navigation, so menu locks and user-busy
// retries remain in effect across the whole interaction.
const guideSelect=(p,title,body,rows,startPage=0)=>selectGuidePage(p,title,body,rows,form,startPage);
async function openCreatureGuide(p){
 if(!mobSystem)return simple(p,'生き物・素材・技図鑑','図鑑データを読み込めませんでした。');
 const list=mobSystem.mobContentList;
 while(p.isValid){
  const rows=Array.from({length:8},(_,realm)=>{
   const entries=creatureEntriesByRealm(list,realm);
   const found=entries.filter(({profile})=>marked(p,'sight',wildlifeIndex.get(profile.id))).length;
   return [`§b第${realm+1}界 §r${places[realm+1].name}\n§7観察 ${found}/${entries.length}`,itemTexture(`guardian_core_${realm}`)];
  });
  rows.push(['§d界渡りとFUSHIについて',itemTexture('pearl_7')],['§8↩ 本を閉じる']);
  const realm=await form(p,'§6生き物・素材・技図鑑','§7調べたい界を選択。◆ は観察済み、◇ は未観察です。\n§7敵対種はピースフルでは出現しません。',rows);
  if(realm===undefined||realm===9)return;
  if(realm===8){
   const fq=fushiQuest.status(p);
   await simple(p,'§d界渡りとFUSHI', `§b友好の記録：竹 ${fq.bamboo}/16・月夜 ${fq.nights}/2 ${fq.claimed?'（受取済み）':''}\n\n各界を探索すると、その界のエンダーマンにまれに出会います。攻撃するまでは中立で、倒すと界のパールを落とします。使うと対応する界の到着地点へ帰還します（消費しません）。\n\n第8界では友好的なFUSHIとチーフもまれに出現します。新規地形の竹林では出会いやすく、竹を採って交換に使えます。チーフは攻撃された場合だけ反撃し、倒すと時の結晶を落とします。戦わず竹8本を届ければ、1日1回、時の欠片2個と交換できます。\n\nFUSHIのトーテムはチーフの討伐か竹16本との交換に加え、月竹林で新月以外の夜に竹を採るとまれに見つかります（取得後24000ティックは再獲得不可）。8種のパールと合わせると挑戦印を作れます。使うと確認後に消費して月のまどろみを発動できます。両手のいずれかで持つと致命傷からの復活を試みます（試作）。挑戦印から試作の時空の闘技場へ入れます。新しい月竹林には小さな社もあります。チーフから月夜に竹16本を2夜にわたり採る友好の贈り物も受け取れます。社と管理者の全技はまだ試作です。`);
   continue;
  }
  const entries=creatureEntriesByRealm(list,realm);let page=0;
  while(p.isValid){
   const choices=entries.map(({profile})=>{
    const seen=marked(p,'sight',wildlifeIndex.get(profile.id));
    const type=profile.temper==='hostile'?'敵対':profile.temper==='neutral'?'中立':'友好';
    return [`${seen?'§a◆':'§7◇'} §r${profile.name}\n§7${type}｜${profile.dropName}`,itemTexture(profile.dropId.slice(ns.length))];
   });
   const result=await guideSelect(p,`§6${places[realm+1].name}｜生き物`, '§7生き物を選ぶと、生息地・技・ドロップの使い道を表示します。',choices,page);
   if(result.closed)return;
   if(result.back)break;
   page=result.page;
   const entry=entries[result.index];if(!entry)continue;
   const detail=await form(p,`§6${entry.profile.name}`,mobSystem.fieldGuide(p,entry.index),[['§b↩ 生き物の一覧へ'],['§8本を閉じる']]);
   if(detail!==0)return;
  }
 }
}
async function colossusGuide(p){
 const defeated=Array.from({length:8},(_,i)=>Boolean(num(p,'guards')&(1<<i))).filter(Boolean).length;
 const choice=await form(p,'§4終焉の八界王',`§7守護獣の討伐記録 §e${defeated}/8\n§7八界すべての守護獣を倒し、時の終着駅の開けた場所で挑戦できます。`,[
  ['§6攻略情報を読む',itemTexture('eclipse_core')],['§c八界王を召喚する',itemTexture('guardian_core_7')],['§8閉じる']
 ]);
 if(choice===1)return mobSystem?.summonColossus(p);
 if(choice===0)return simple(p,'§4終焉の八界王｜攻略帳','三段階の巨大ボス。八界断ち、星骸落とし、時環封じ、蝕光爆ぜ、影兵招来、時空裂波、終焉咆哮、逆刻再編、星蝕の収束を使う。\n\n赤い予告輪の外へ退避し、最終形態では回復行動を止めるため攻撃を続けよう。討伐すると時蝕核を獲得できる。');
}
async function villageGuide(p){
 while(p.isValid){
  const chosen=await guideSelect(p,'§6村と四季のガイド','§7知りたい項目を選んでね。村の画面の開き方から、祭り・仕事・運搬・修理まで説明します。',VILLAGE_GUIDE_CHAPTERS.map(([title])=>[title]));
  if(chosen.closed||chosen.back)return;
  const chapter=VILLAGE_GUIDE_CHAPTERS[chosen.index];if(!chapter)return;
  const action=await form(p,`§6${chapter[0]}`,chapter[1],[['§b項目一覧に戻る'],['§8本を閉じる']]);
  if(action!==0)return;
 }
}
async function industrialGuide(p){
 while(p.isValid){
  const chosen=await guideSelect(p,'§6工業ガイド本','§7章を選んでください。工業の追加や変更に合わせて内容を更新します。',INDUSTRY_CHAPTERS.map(([title])=>[title]));
  if(chosen.closed||chosen.back)return;
  const chapter=INDUSTRY_CHAPTERS[chosen.index];if(!chapter)return;
  const action=await form(p,`§6${chapter[0]}`,chapter[1],[['§b章一覧に戻る'],['§8本を閉じる']]);
  if(action!==0)return;
 }
}
async function guide(p){
 while(p.isValid){
  const realmCount=checkEightRealmMemory(p);
  const rank=realmRankUpdate(p),rankName=realmRanks[rank][1];
  const realmStatus=realmCount===8?'§d八界踏破 完了§r':`§b八界踏破 ${realmCount}/8§r`;
  const status=`§6━━ 風の旅帳 ━━§r\n${era()}　｜　${realmStatus}　｜　余韻 ${realmEchoCount(p)}/8\n§7称号：§r${rankName}　§7訪問：§r${places.filter(t=>visited(p,t.id)&&t.id!==0).length}/${places.length-1}\n§7現在地：§r${currentPlace(p)?.name??'バニラの世界'}\n\n§7よく使う項目、または目的別の章を選んでください。`;
  const rows=[
   ['§b旅の地図\n§7行き先を選ぶ',itemTexture('return_stone')],
   ['§aサバイバル実践ガイド\n§7はじめての冒険はこちら',itemTexture('trail_ration')],
   ['§e工業ガイド本を受け取る\n§7工場の動力・加工・搬送',itemTexture('industrial_guide')],
   ['§a村と四季のガイド\n§7祭り・運搬・自動修理',itemTexture('guide')],
   ...GUIDE_SECTIONS.map(section=>[`§6${section.title}\n§7${section.hint}`,itemTexture(section.icon)]),
   ['§8本を閉じる']
  ];
  const choice=await form(p,'§6§l8界風記 §r§7｜風の旅帳',status,rows);
  if(choice===undefined||choice===rows.length-1)return;
  if(choice===0)return dispatchGuide(p,0);
  if(choice===1)return dispatchGuide(p,52);
  if(choice===2)return claimIndustryGuide(p,{space,getItem,give,notice,ns});
  if(choice===3)return villageGuide(p);
  const section=GUIDE_SECTIONS[choice-4];if(!section)return;
  const sectionRows=section.ids.map(id=>[`§r${GUIDE_ENTRIES[id]}`,itemTexture(GUIDE_ICONS[id])]);
  const picked=await guideSelect(p,`§6風の旅帳｜${section.title}`,`§7${section.hint}`,sectionRows);
  if(picked.closed)return;
  if(picked.back)continue;
  const route=section.ids[picked.index];
  if(route!==undefined)return dispatchGuide(p,route);
 }
}
async function dispatchGuide(p,ix){
 if(ix===52)return survivalGuide(p);
 if(ix===53)return openCreatureGuide(p);
 if(ix===54)return colossusGuide(p);
 if(ix===0)return map(p);if(ix===1)return help(p);if(ix===2)return details(p);if(ix===3)return quest(p);if(ix===4)return fishing(p);if(ix===5)return settings(p);
 if(ix===6)notice(p,restore(p)?'§aガイド本と帰還石は持ち物にある':'§e持ち物に空きを作ってね');
 if(ix===7){
   const list=[...travelSites.values()].filter(site=>marked(p,'stories',site.id));
   if(!list.length)return simple(p,'旅の記録','建物の近くにある光る「風記の記録石」を使うと、このページに記録が増えます。');
   const choice=await paged(p,'旅の記録',`読んだ記録：${list.length}/${travelSites.size}`,list.map(site=>[site.name]));
   if(choice!==undefined)return simple(p,list[choice].name,tale(list[choice]));
 }
 if(ix===8)return journal(p);
 if(ix===9)return railOffice(p);
 if(ix===10)return harvestMarket(p);
 if(ix===11)return harbor(p);
 if(ix===12)return townMenu(p);
 if(ix===13)return expeditionStory(p);
 if(ix===14)return spellwork(p);
 if(ix===15)return magicIndex(p);
 if(ix===16)return prizeExchange(p);
 if(ix===17)return recipeIndex(p);
 if(ix===18)return gardenGuide(p);
 if(ix===19)return realmDiscoveryBook(p);
 if(ix===20)return eightRealmMemorialPage(p);
 if(ix===21)return realmArchive(p);
 if(ix===22)return realmTrialBook(p);
 if(ix===23)return realmRuinBook(p);
 if(ix===24)return realmMemoryBook(p);
 if(ix===25)return realmEchoBook(p);
 if(ix===26)return realmSouvenirExchange(p);
 if(ix===27)return realmAdventurerRecord(p);
 if(ix===28)return realmShowcaseBook(p);
 if(ix===29)return realmRankBook(p);
 if(ix===30)return realmGalleryGuide(p);
 if(ix===31)return realmGalleryMonumentMenu(p);
 if(ix===32)return realmGallerySecretStory(p);
 if(ix===33)return realmMuseumEncyclopedia(p);
 if(ix===34)return realmMuseumGrandStory(p);
 if(ix===35)return realmArenaMenu(p);
 if(ix===36)return realmArenaStyleMenu(p);
 if(ix===37)return realmArenaHallOfFame(p);
 if(ix===38)return realmAdventureBoard(p);
 if(ix===39)return realmV36Board(p);
 if(ix===40)return armorShowcaseBook(p);
 if(ix===41)return armorProgressBoard(p);
 if(ix===42)return legendGearTrialBoard(p);
 if(ix===43)return armorCollectionArchive(p);
 if(ix===44)return gearEvolutionChronicle(p);
 if(ix===45)return nightwalkerAwakeningTrial(p);
 if(ix===46)return realmAwakeningBoard(p);
 if(ix===47)return realmAscensionBoard(p);
 if(ix===48)return guardianCoreArchive(p);
 if(ix===49)return guardianLegacyForge(p);
 if(ix===50)return finalMemorialHall(p);
 if(ix===51)return expeditionRecords?.journal(p);
}
async function magicIndex(p){
 const desc=['速さと突風','回復と水中呼吸','火炎と火への耐性','耐性と吸収','前方への雷撃と弱体化','毒・衰弱・盲目を解除','命中した敵から体力を吸収','敵の動きを大幅に遅くする','突風と目くらまし','熱と土の守り','雷と水の嵐','光と闇、吸収の加護','敵を遅くし、自分を速くする','前方への光の一撃','仲間と共に回復と反撃','周囲の敵を吹き飛ばす','敵を大幅に遅くする','周囲の敵に火をつける','トーテムを消費し回復と眠り'];
 const names=[...attrs.slice(0,8),...pairs.map(r=>`${r.label}（${attrs[r.a]}＋${attrs[r.b]}）`),'光の矢','絆の灯','風の輪','水の縛り','炎の環','月のまどろみ'];
 return paged(p,'魔法図鑑','◆ 発動したことがある魔法。訪問による解放と発動方法は魔導書に記載。',names.map((v,i)=>[`${marked(p,'learned_spells',i)?'◆':'◇'} ${v}：${desc[i]}`]));
}
async function recipeIndex(p){
 const entries=[
  ['導入の道具','ガイド本：本＋羽根。風見の帰還石：アメジストの欠片＋紙＋丸石。旧離島の帰還石も風見の帰還石と同じ帰還画面を開きます。'],
  ['魔法と醸造','不屈の護符：アメジストの欠片＋風と時の結晶。魔導書：本＋風と水の結晶。専用魔法の本：本＋各属性の結晶（絆は風と水）。月はFUSHIのトーテムを使います。薄明の薬液：瓶＋グロウベリー。薬液＋水の結晶を醸造台で醸造（燃料はブレイズパウダー）。'],
  ['結晶と通行札','同属性の欠片2個＋アメジストの欠片で結晶。離島の通行札：紙＋風の結晶＋風の欠片。'],
  ['生き物の素材と欠片','生き物の専用素材1個を作業台で加工すると、その界に対応する属性の欠片を2個入手できます。生き物ごとの属性は「生き物・素材・技図鑑」で確認できます。欠片2個＋アメジストの欠片1個から結晶を作り、装備や魔法に利用できます。'],
  ['牧場と遺跡','季節の花壇：牧場繊維＋育てのしるし＋土でも製作。時渡りの羅針盤：コンパス＋風記の断片＋時の結晶。'],
  ['装備・設備','装備の全レシピは「装備とレシピ図鑑」へ。工業設備や加工の説明は、ガイド本の「工業ガイド本を受け取る」から工業ガイド本を受け取り確認してください。'],
  ['旅人の携帯食','作業台で焼き牛肉1個＋ベイクドポテト1個＋パン1個＋ニンジン1個から2個作れます。食べると満腹度を回復し、スタミナも35回復します。焚き火か魂の焚き火の近くでしゃがんで静止すると、スタミナ回復が速くなります。']
 ];
 const i=await form(p,'追加レシピ一覧','開きたい種類を選んでください。',entries.map(([title])=>[title]));
 if(i!==undefined)return simple(p,entries[i][0],entries[i][1]);
}
const prizeKinds=['守護獣の討伐報酬','村人への特注','離島の宝探し','遺跡の断片交換'];
const prizeKind=g=>(Number(g.number)-1)%prizeKinds.length;
async function prizeExchange(p){
 const k=await form(p,'装備を見つける・注文する','186件の装備には、製作に加えて別の入手経路があります。',prizeKinds.map(v=>[v]));
 if(k===undefined)return;
 const list=catalog.filter(g=>prizeKind(g)===k), site=currentPlace(p);
 const n=await paged(p,prizeKinds[k],[
   '該当する守護獣を討伐してから、その界で欠片を3個納める。',
   '信頼度3以上で村人のそばに立ち、値段分のエメラルドを支払う。',
   '離島の記録石を調べ、その島にいる間に離島の通行札を使う。各装備につき一度。',
   '遺跡の調査後、目印を見ながら風記の断片を1枚納める。各装備につき一度。'
 ][k],list.map(g=>[`${g.label} ${g.stars}`,itemTexture(g.id)]));
 if(n===undefined||!p.isValid||p.getGameMode()===GameMode.Spectator)return;
 const g=list[n], j=Number(g.number)-1, a=home.findIndex(h=>h.includes(g.a)), now=currentPlace(p);
 let cost=ns+'chronicle_fragment', count=1;
 if(k===0){
   if(!now||now.id===0||aspect(now)!==a||!(num(p,'guards')&(1<<a)))return notice(p,`§e${guardians[a]}を討伐し、その界で交換してください`);
   cost=ns+`shard_${g.a}`;count=3;
 }else if(k===1){
   if(num(p,'trust')<3||!villagerNear(p,9))return notice(p,'§e信頼度3以上で村人のそばへ');
   cost='minecraft:emerald';count=2+g.stars.length*2;
 }else if(k===2){
   const island=site&&now?.id===site.id&&(site.kind==='island'||site.id>=9&&site.id<=20);
   if(!island||!marked(p,'stories',site.id))return notice(p,'§e離島で記録石を調べてから開いてください');
   cost=ns+'travel_pass';
 }else{
   const found=fieldStructure(p);
   if(found<0||!marked(p,'field_story',found))return notice(p,'§e調査済みの遺跡の目印を見てください');
 }
 if(k>=2&&marked(p,'gear_prize',j))return notice(p,'§eこの装備の報酬は受け取り済みです');
 if(exchange(p,cost,count,ns+g.id)){if(k>=2)mark(p,'gear_prize',j);notice(p,`§6${g.label}を受け取った`);}
}

const townCache=new Map(), workplaces=['','composter','barrel','loom','fletching_table','lectern','cartography_table','brewing_stand','blast_furnace','grindstone','smithing_table','smoker','cauldron','stonecutter_block',''];
const workBlocks=new Set(workplaces.filter(Boolean).map(s=>'minecraft:'+s));
const fortressPart=/^minecraft:.*(?:fence|wall)$/;
const townKey=(d,l)=>`town:${d.id}:${Math.floor(l.x)}:${Math.floor(l.y)}:${Math.floor(l.z)}`;
function townNear(d,l){
 let best,range=Infinity;
 for(const town of townCache.values()){
   if(town.lifeSiteId||town.d.id!==d.id||system.currentTick-town.last>240)continue;
   const n=dist(l,town.l);
   if(n<(town.factoryVillage?60:24)&&n<range){range=n;best=town;}
 }
 return best;
}
function townRecord(town){
 return typeof town.data?.goods==='number'?{level:0,...town.data}:{goods:0,work:-50000,birth:-20,upkeep:seasonDay(),level:0};
}
function townSave(town,v){town.data=v;property(world,town.key,JSON.stringify(v));}
function townGet(d,l,seen=false){
 const k=townKey(d,l);let t=townCache.get(k);
 if(!t){
   if(townCache.size>=96){
     for(const [key,s] of townCache)if(system.currentTick-s.last>240)townCache.delete(key);
     if(townCache.size>=96)return;
   }
   let data;try{data=JSON.parse(String(world.getDynamicProperty(ns+k)??''));}catch{}
   t={key:k,d,l:{x:Math.floor(l.x),y:Math.floor(l.y),z:Math.floor(l.z)},last:system.currentTick,i:0,sites:{},list:{},data};
   townCache.set(k,t);
 }
 if(seen)t.last=system.currentTick;
 const village=travelSites.get(FACTORY_VILLAGE_ID);
 const repeated=d.id===dimID(0)?seededWorlds?.repeatSiteAt(0,t.l.x,t.l.z):undefined;
 t.repeatSiteKey=repeated?.id===59&&t.l.x===repeated.x&&t.l.z===repeated.z&&t.l.y===expandedY?repeated.repeatKey:undefined;
 t.factoryVillage=Boolean(t.repeatSiteKey||village&&num(world,`built_${village.id}`)&&d.id===dimID(village.dim)&&t.l.x===village.x&&t.l.y===expandedY&&t.l.z===village.z);
 return t;
}
function discoverTown(p,s){
 const d=p.dimension,t=system.currentTick;
 if(num(p,'no_bell_search')||d.id.replace(/^minecraft:/,'')!=='overworld'||t<(s.bellRetry??0))return;
 if(!s.bellScan){
   const around=d.getEntities({families:['villager'],location:p.location,maxDistance:22,closest:3}).filter(e=>e.typeId.startsWith('minecraft:villager'));
   if(around.length<2){s.bellRetry=t+160;return;}
   const [a,b]=around.map(e=>e.location);
   s.bellScan={x:Math.floor((a.x+b.x)/2),y:Math.floor((a.y+b.y)/2),z:Math.floor((a.z+b.z)/2),i:0};
 }
 const scan=s.bellScan;
 if(dist(p.location,scan)>26){s.bellScan=undefined;s.bellRetry=t+160;return;}
 for(let j=0;j<104&&scan.i<17*17*5;j++){
   const k=scan.i++, pt={x:scan.x+k%17-8,y:scan.y+[0,-1,1,-2,2][Math.floor(k/289)],z:scan.z+Math.floor(k/17)%17-8};
   try{
     if(!d.isChunkLoaded(pt)||d.getBlock(pt)?.typeId!=='minecraft:bell')continue;
     if(d.getEntities({families:['villager'],location:pt,maxDistance:22,closest:3}).filter(e=>e.typeId.startsWith('minecraft:villager')).length<2)continue;
     const town=townGet(d,pt,true);
     if(!town)continue;
     town.vanilla=true;
     property(p,'vanilla_bell',JSON.stringify({...pt,id:d.id}));
     notice(p,'§a村の鐘を見つけ、集落台帳に登録した');
     s.bellScan=undefined;s.bellRetry=t+160;
     return;
   }catch{}
 }
 if(scan.i>=17*17*5){s.bellScan=undefined;s.bellRetry=t+260;}
}
function townScore(t){
 const sites=t.sites,d=townRecord(t), working=d.work+2400>world.getAbsoluteTime();
 return Math.min(12,Math.floor((sites.wall?.length??0)/4)+(sites.tower?.length?2:0)+Math.min(2,sites.trap?.length??0)+Math.min(2,sites.machine?.length??0)+(working?2:0)+Math.min(4,d.level??0));
}
function townFestival(t){return seasonAt(seasonDay()).dayInSeason===2&&townScore(t)>=4&&townRecord(t).goods>=6;}
function production(b,count){
 if(!b.dimension.id)return;
 const l={x:b.x+.5,y:b.y+.5,z:b.z+.5}, town=townNear(b.dimension,l);
 // Visuals are best-effort and only happen after a successful transaction.
 try{const frame=b.permutation.getState('hakkai:spin');if(Number.isInteger(frame))b.setPermutation(b.permutation.withState('hakkai:spin',(frame+1)%4));}catch{}
 try{b.dimension.spawnParticle(b.typeId===ns+'kiln'?'hakkai:climate_2':b.typeId===ns+'washer'?'hakkai:climate_3':'hakkai:wind_burst',{x:l.x,y:l.y+.7,z:l.z});}catch{}
 try{b.dimension.playSound('random.anvil_use',l,{volume:.18,pitch:1.4});}catch{}
 if(town){
   const d=townRecord(town),bonus=town.factoryVillage?factoryResidentBonus(town,b,world.getTimeOfDay()):0;
   townSave(town,{...d,goods:Math.min(200,d.goods+count+bonus),work:world.getAbsoluteTime()});
 }
 try{for(const p of b.dimension.getPlayers({location:l,maxDistance:14,closest:4}))state(p).workSoundAt=system.currentTick+125;}catch{}
}
function gatherTown(t){
 const d=t.d, c=t.l;
 // Spread the scan across ticks. Rebuild the snapshot from scratch so removing a wall lowers the score.
 const side=t.factoryVillage?97:23, span=side*side;
 for(let j=0;j<(t.factoryVillage?700:155);j++){
   const i=t.i++, x=i%side-Math.floor(side/2),z=Math.floor(i/side)%side-Math.floor(side/2),y=Math.floor(i/span)-1;
   if(y>5){t.sites=t.list;t.list={};t.i=0;break;}
   const at={x:c.x+x,y:c.y+y,z:c.z+z};
   if(!d.isChunkLoaded(at))continue;
   let b;try{b=d.getBlock(at);if(!b||b.isAir)continue;}catch{continue;}
   const id=b.typeId, type=fortressPart.test(id)&&y>=0&&y<3?'wall':id===ns+'watch_post'&&y>=3?'tower':
     id===ns+'snare'?'trap':id==='minecraft:bed'?'shelter':workBlocks.has(id)?'work':
     /^hakkai:(mill|miner|compressor|kiln|crusher|washer|press|saw|mixer|assembler)$/.test(id)?'machine':cropIds.has(id)?'crop':'';
   if(type){
     const list=t.list[type]??=[];
     if(list.length<(t.factoryVillage?64:32))list.push({...at,id});
   }
 }
}
function nearestSpot(e,list){
 if(!list?.length)return;
 return list.reduce((a,b)=>dist(e.location,a)<dist(e.location,b)?a:b);
}
function townRoutine(t){
 const now=world.getTimeOfDay(), d=t.d,l=t.l,crops=t.sites.crop??[];
 if(crops.length&&Math.random()<(raining(d)?.9:.48))try{nudgeCrop(d.getBlock(crops[system.currentTick%crops.length]));}catch{}
 if(system.currentTick<(t.duty??0))return;
 t.duty=system.currentTick+75;
 const citizens=d.getEntities({families:['villager'],location:l,maxDistance:t.factoryVillage?60:23,closest:t.factoryVillage?40:12}).filter(e=>e.typeId.startsWith('minecraft:villager'));
 if(!citizens.length)return;
 const hostile=d.getEntities({families:['monster'],location:l,maxDistance:20,closest:6}).filter(e=>['minecraft:zombie','minecraft:husk','minecraft:drowned','minecraft:pillager','minecraft:vindicator','minecraft:witch','minecraft:ravager','minecraft:skeleton'].includes(e.typeId));
 const score=townScore(t), age=seasonDay();
 let data=townRecord(t);
 const last=data.upkeep??age;
 if(age>last){
   const spent=Math.min(12,age-last)*Math.max(1,Math.ceil(citizens.length/3));
   data={...data,goods:Math.max(0,data.goods-spent),upkeep:age};
   townSave(t,data);
 }
 const patrol=d.getEntities({families:['hakkai_patrol'],location:l,maxDistance:24,closest:3});
 const cap=hostile.length>=3&&(score>=6||t.vanilla&&citizens.length>=4)?2:1;
 if(world.gameRules.doMobSpawning&&world.getDifficulty()!==Difficulty.Peaceful&&(score>=2||t.vanilla&&hostile.length&&citizens.length>=2)&&
   (t.patrolAt??0)<system.currentTick&&(hostile.length||score>=6)&&patrol.length<cap){
   const at=safeNear(d,l,4);
   if(at){
     let role=score>=9||hostile.some(e=>e.typeId==='minecraft:witch'||e.typeId==='minecraft:ravager')?2:
       score>=6||hostile.some(e=>e.typeId==='minecraft:pillager'||e.typeId==='minecraft:skeleton')?1:0;
     if(patrol.some(e=>e.typeId===ns+civicRoles[role].id))role=(role+1)%3;
     d.spawnEntity(ns+civicRoles[role].id,at);
     t.patrolAt=system.currentTick+(patrol.length+1<cap?140:1800);
   }
 }
 const bedCount=Math.ceil((t.sites.shelter?.length??0)/2);
 if(!hostile.length&&world.gameRules.doMobSpawning&&citizens.length>=2&&citizens.length<Math.min(t.factoryVillage?32:8,bedCount)&&score>=6&&data.goods>=12&&age>data.birth+2&&now<9000){
   const at=safeNear(d,l,4);
   if(at){
     const born=d.spawnEntity('minecraft:villager_v2',at,{spawnEvent:'minecraft:entity_born'});
     property(born,'town_born',age+1);
     townSave(t,{...data,birth:age,goods:data.goods-12});
   }
 }
 for(const mage of d.getEntities({type:ns+'village_mage',location:l,maxDistance:22,closest:2}))try{
   const foe=hostile.find(e=>dist(e.location,mage.location)<9&&visibleFrom(mage,e.getHeadLocation()));
   if(foe&&permit(mage,115,'town_spell')){
     foe.addEffect('slowness',55,{amplifier:1,showParticles:false});
     foe.applyDamage(3,{cause:EntityDamageCause.magic,damagingEntity:mage});
     d.spawnParticle('hakkai:climate_5',{...foe.location,y:foe.location.y+.7});
   }
 }catch{}
 const dutyStart=t.factoryVillage?(t.dutyCursor??0)%citizens.length:0;
 if(t.factoryVillage)t.dutyCursor=dutyStart+7;
 for(const e of (t.factoryVillage?Array.from({length:Math.min(7,citizens.length)},(_,i)=>citizens[(dutyStart+i)%citizens.length]):citizens.slice(0,7)))try{
   if(!permit(e,50,'town_duty'))continue;
   const baby=Boolean(e.getComponent('minecraft:is_baby')), born=num(e,'town_born');
   if(!born)property(e,'town_born',age+1);
   const elder=!baby&&born>0&&age-born>=8, flee=hostile.find(a=>dist(e.location,a.location)<11);
   const job=e.getComponent('minecraft:variant')?.value??0, workplace=workplaces[job];
   const villageRole=t.factoryVillage?factoryResidentRole(e):undefined;
   let goal;
   if(flee||now>=11600&&now<23000)goal=nearestSpot(e,t.sites.shelter);
   else if(baby)goal={x:l.x+Math.cos(now/620+e.id.length)*3,y:l.y,z:l.z+Math.sin(now/620+e.id.length)*3};
   else if(!elder&&villageRole&&now<7100){
     const target=villageRole==='grower'?t.sites.crop:villageRole==='keeper'?[l]:t.sites.machine?.filter(b=>b.id===ns+villageRole);
     goal=nearestSpot(e,target);
   }
   else if(!elder&&job===1&&now<3800)goal=nearestSpot(e,t.sites.crop);
   else if(!elder&&workplace&&now<7100)goal=nearestSpot(e,t.sites.work?.filter(b=>b.id==='minecraft:'+workplace));
   if(!goal&&!flee&&now<11600)goal=l;
   if(flee&&!goal){along(e,e.location.x-flee.location.x,e.location.z-flee.location.z,.22);continue;}
   if(goal&&dist(e.location,goal)>2.3){
     const dx=goal.x+.5-e.location.x,dz=goal.z+.5-e.location.z, h=flee?.24:baby?.16:elder?.10:.14;
     along(e,dx,dz,h)||along(e,dx-dz*.65,dz+dx*.65,h)||along(e,dx+dz*.65,dz-dx*.65,h);
   }
 }catch{}
}
function townTick(block){
 const d=block.dimension;
 if(!d.getPlayers({location:block.location,maxDistance:64,closest:1}).length)return;
 const t=townGet(d,block.location,true);if(!t)return;
 if(!t.factoryVillage&&!d.getPlayers({location:block.location,maxDistance:39,closest:1}).length)return;
 foundFactoryResident({town:t,world,num,property,findFloor:safeNear,report});
 gatherTown(t);townRoutine(t);
}
const deliveryGoods=[
 ['小麦','minecraft:wheat',8,9],['タラ','minecraft:cod',4,8],['ニンジン','minecraft:carrot',8,9],
 ['石炭','minecraft:coal',5,8],['銅の原石','minecraft:raw_copper',6,10],
 ['木炭','minecraft:charcoal',6,8]
];
function orderFor(t,day){
 const local=Math.abs(Math.imul(t.l.x,31)^Math.imul(t.l.z,17)^t.d.id.length);
 return deliveryGoods[(local+day)%deliveryGoods.length];
}
function orderNear(p,t){
 return p.isValid&&[GameMode.Survival,GameMode.Adventure].includes(p.getGameMode())&&p.dimension.id===t.d.id&&
   dist(p.location,t.l)<24&&['minecraft:bell',ns+'town_bell'].includes(t.d.getBlock(t.l)?.typeId)&&Boolean(villagerNear(p,18));
}
async function townOrder(p,t){
 const day=seasonDay(),[name,id,count,goods]=orderFor(t,day);
 const left=data=>data.orderDay===day?Math.max(0,2-(data.orders??0)):2;
 const pick=await form(p,'村の納品依頼',`${name} ${count}個を納品するとエメラルド1個、村の信頼度+1、村の備蓄+${goods}。\nこの村の本日の残り：${left(townRecord(t))}/2。プレイヤー1人につき1日1件。`,[['今の依頼に納品する'],['閉じる']]);
 if(pick!==0||!orderNear(p,t))return;
 if(seasonDay()!==day)return notice(p,'§e日が変わって依頼が更新されました。台帳を開き直してね');
 const data=townRecord(t), remaining=left(data);
 if(num(p,'order_day',-1)===day||!remaining)return notice(p,'§e本日の納品枠は使い切りました');
 if(data.goods+goods>200)return notice(p,'§e村の備蓄に空きができてから納品してね');
 if(!exchange(p,id,count,'minecraft:emerald'))return;
 townSave(t,{...data,goods:data.goods+goods,orderDay:day,orders:3-remaining});
 property(p,'order_day',day);property(p,'trust',Math.min(30,num(p,'trust')+1));
 notice(p,`§a${name}を納品した。村の備蓄 +${goods}`);
}
const townDevelopmentPlans=[
 {name:'集いの広場',item:'minecraft:oak_planks',count:24,desc:'木材を寄付して、集落の交流広場を整えます。守り評価 +1。'},
 {name:'石造りの門',item:'minecraft:stone_bricks',count:16,desc:'石材を寄付して、集落の入口を整えます。守り評価 +1。'},
 {name:'灯りの回廊',item:'minecraft:lantern',count:8,desc:'ランタンを寄付して、夜の集落を明るくします。守り評価 +1。'},
 {name:'旅人の掲示所',item:'minecraft:emerald',count:6,desc:'交易品を寄付して、旅人を迎える掲示所を整えます。守り評価 +1。'}
];
async function townDevelopment(p,t){
 const near=()=>p.isValid&&p.dimension.id===t.d.id&&dist(p.location,t.l)<24&&['minecraft:bell',ns+'town_bell'].includes(t.d.getBlock(t.l)?.typeId);
 const data=townRecord(t),level=Math.max(0,Math.min(4,data.level??0));
 if(level>=4)return simple(p,'集落の発展計画','この集落は最高段階「八界の交流中心」まで発展しました。これまでの支援が住民の暮らしを支えています。');
 const plan=townDevelopmentPlans[level],c=space(p),creative=isCreative(p);
 const ix=await form(p,'集落の発展計画',`現在：${level}/4段階\n次の計画：${plan.name}\n必要素材：${plan.item.replace('minecraft:','').replaceAll('_',' ')} × ${plan.count}\n\n${plan.desc}\n\n発展すると村の守り評価・住民活動・集落記録が強化されます。`,[['素材を寄付して発展させる'],['閉じる']]);
 if(ix!==0||!near())return;
 // Another player may have changed this shared village while the form was open.
 const latest=townRecord(t);if(Math.max(0,Math.min(4,latest.level??0))!==level)return notice(p,'§e集落の計画が更新されました。開き直してください');
 if(!creative&&total(c,plan.item)<plan.count)return notice(p,`§e必要素材が足りません：${plan.count}個`);
 if(!creative&&!debit(c,plan.item,plan.count))return notice(p,'§e素材を確認できませんでした');
 townSave(t,{...latest,level:level+1,goods:Math.min(200,latest.goods+8),work:world.getAbsoluteTime()});
 property(p,'town_development_count',num(p,'town_development_count')+1);
 notice(p,`§a集落が発展！ ${plan.name}（${level+1}/4）`,90);
 try{t.d.spawnParticle('hakkai:climate_5',{x:t.l.x+.5,y:t.l.y+1,z:t.l.z+.5});}catch{}
 try{p.playSound('random.levelup',{volume:.7,pitch:1.1});}catch{}
}
// Shared seasonal village life: existing bell ledgers or a culture site's
// chronicle serve as the meeting point. No signs or old buildings are edited.
function cultureTownForSite(d,site){
 if(site?.kind!=='culture'||d.id!==dimID(site.dim)||!num(world,`built_${site.id}`))return;
 try{if(d.getBlock({x:site.x+2,y:expandedY,z:site.z+11})?.typeId!==ns+'chronicle')return;}catch{return;}
 const t=townGet(d,{x:site.x,y:expandedY,z:site.z},true);if(t)t.lifeSiteId=site.id;return t;
}
function lifeTownForPlayer(p,site=currentPlace(p)){
 if(!/^hakkai:realm_[0-7]$/.test(p.dimension.id))return;
 if(site?.kind==='culture')return cultureTownForSite(p.dimension,site);
 const t=townNear(p.dimension,p.location);
 return t&&lifeNear(p,t)?t:undefined;
}
function lifeNear(p,t){
 if(!p.isValid||p.dimension.id!==t.d.id||![GameMode.Survival,GameMode.Adventure,GameMode.Creative].includes(p.getGameMode())||dist(p.location,t.l)>(t.lifeSiteId||t.factoryVillage?40:24))return false;
 try{
  const valid=t.lifeSiteId?(()=>{const site=places.find(s=>s.id===t.lifeSiteId);return Boolean(site&&num(world,`built_${site.id}`)&&t.d.getBlock({x:site.x+2,y:expandedY,z:site.z+11})?.typeId===ns+'chronicle');})():['minecraft:bell',ns+'town_bell'].includes(t.d.getBlock(t.l)?.typeId);
  if(!valid)return false;
  const current=townGet(t.d,t.l,true);if(!current)return false;
  if(current!==t){t.data=current.data;if(t.lifeSiteId)current.lifeSiteId=t.lifeSiteId;}
  return true;
 }catch{return false;}
}
function lifeRealm(t){const m=/^hakkai:realm_([0-7])$/.exec(t.d.id);return m?Number(m[1]):0;}
function readVillagePlot(site,stage){
 try{const v=JSON.parse(String(world.getDynamicProperty(ns+`builder_plot_${villageIdentity(site)}_${stage}_v1`)??''));
  return v.stage===stage&&BLUEPRINTS[stage]?.id===v.kind&&validPlot(v,site,blueprint)?v:undefined;
 }catch{return;}
}
function villageSite(t){const id=t.lifeSiteId??t.repeatSiteKey??(t.factoryVillage?59:undefined);return villageSiteByHome(id);}
function villageSiteByHome(id){return typeof id==='string'?seededWorlds?.repeatSiteByKey(id):places.find(s=>s.id===id&&(s.id===59||s.kind==='culture'));}
function lifeBuildings(t){
 const id=t.lifeSiteId??t.repeatSiteKey??(t.factoryVillage?59:undefined);return id===undefined?0:num(world,`builder_stage_${id}_v1`);
}
function saveVillageLife(t,data){property(world,t.key,JSON.stringify(data));t.data=data;const current=townGet(t.d,t.l,true);if(current){current.data=data;if(t.lifeSiteId)current.lifeSiteId=t.lifeSiteId;}}
function lifeSignals(t){
 const monsters=t.d.getEntities({families:['monster'],location:t.l,maxDistance:18,closest:6}).length;
 return {monsters,rain:raining(t.d)};
}
function lifeWorkers(t){
 const people=t.d.getEntities({location:t.l,maxDistance:t.factoryVillage?60:32,closest:48}).filter(e=>e.isValid);
 return {farmer:people.some(e=>t.factoryVillage&&e.typeId==='minecraft:villager_v2'&&factoryResidentRole(e)==='grower'&&!e.getComponent('minecraft:is_baby')),artisan:people.some(e=>friendlyResidentById.get(e.typeId)?.role==='artisan'||villagerJob(e,world)==='artisan'),builder:people.some(e=>BUILDER_IDS.includes(e.typeId)||villagerJob(e,world)==='builder')};
}
function lifeTick(p,site,tick){
 const s=state(p);if(tick<(s.villageLifeAt??0))return;s.villageLifeAt=tick+200;
 const t=lifeTownForPlayer(p,site);if(!t||!lifeNear(p,t)||tick<(t.lifeTickAt??0))return;t.lifeTickAt=tick+200;
 try{
  const day=seasonDay(),data=townRecord(t),signals=lifeSignals(t),alert=detectCrisis(data,day,signals);
  const next=workDay(alert??data,day,lifeWorkers(t));if(next||alert)saveVillageLife(t,next??alert);
  const live=townRecord(t),now=world.getAbsoluteTime();
  if(live.lifeWorkshop&&now>=(live.lifeCraftAt??-1200)+1200){
   workshopStep(t,live.lifeWorkshop,{ItemStack,factoryTransaction,factoryResidentRole,friendlyResidentById,extraRole:e=>villagerJob(e,world),report,
    onCraft:result=>saveVillageLife(t,addVillageMemory({...townRecord(t),lifeCraftAt:now},day,result))});
  }
  const f=festivalAt(day,lifeRealm(t)),tier=villageTier(townRecord(t),lifeBuildings(t));
  if(f.open||tier.index>=1){try{t.d.spawnParticle(`hakkai:climate_${f.open?lifeRealm(t):seasonAt(day).index}`,{x:t.l.x+.5,y:t.l.y+2,z:t.l.z+.5});}catch{}}
 }catch(err){report('村の暮らし',err);}
}
async function villageLifeMenu(p,t){
 if(!t||!lifeNear(p,t))return simple(p,'八界の村の暮らし','文化名所の記録石か、八界にある有効な集落鐘の近くで開いてください。');
 const day=seasonDay(),realm=lifeRealm(t),data=townRecord(t),tier=villageTier(data,lifeBuildings(t)),season=seasonAt(day),fest=festivalAt(day,realm),q=requestStatus(data,day,realm);
 const crisis=data.lifeCrisis?.active?(data.lifeCrisis.type==='monster'?'魔物を警戒中':'嵐への備え'):'なし';
 const ix=await form(p,`${tier.name}｜八界の暮らし`,`${season.year}年目 ${season.name} ${season.dayInSeason}/4日目｜建築 ${tier.structures}/5
村の備蓄 ${data.goods}/200｜共同小麦 ${data.lifeFood??0}/64｜共同板材 ${data.lifeWood??0}/64
${fest.title}：${fest.open?'今日開催':'季節の2日目に開催'}　｜　警戒：${crisis}

村の発展度 ${tier.points}。建物・持ち寄り・祭り・復興の実績で変わります。自然な見た目や住人の行動は実機未検証です。`,[
  ['みんなの季節のお願い'],['界の四季祭り'],['住人の仕事と共同備蓄'],['危機と復興'],['村の思い出掲示板'],['建築係の自動修理'],['閉じる']
 ]);
 if(ix===undefined||!lifeNear(p,t))return;
 if(ix===0)return villageSharedRequest(p,t);
 if(ix===1)return villageSeasonFestival(p,t);
 if(ix===2)return villageSupplyMenu(p,t);
 if(ix===3)return villageCrisisMenu(p,t);
 if(ix===5)return villageRepairMenu(p,t);
 if(ix===4){const entries=Array.isArray(townRecord(t).lifeHistory)?townRecord(t).lifeHistory.slice(-20).reverse():[];
  return simple(p,'村の思い出掲示板',entries.length?entries.map(x=>`第${x.day+1}日｜${x.who?x.who+'：':''}${x.text}`).join('\n'):'まだ記録はありません。みんなで村を助けたり、祭りに参加したりしてみましょう。');}
}
async function villageRepairMenu(p,t){
 const site=villageSite(t);if(!site)return simple(p,'自動修理','自動建築係が所属する村で利用できます。');
 const enabled=!!num(world,`builder_repair_enabled_${villageIdentity(site)}_v2`),plots=BLUEPRINTS.map((_,i)=>readVillagePlot(site,i)).filter(Boolean).length;
 const ix=await form(p,'建築係の自動修理',`現在：${enabled?'有効':'停止'}｜記録済み建物 ${plots}/5

許可すると、建築係は完成記録のある自分たちの建物を無料で補修します。木材・ガラスのほか、壊れた樽・機械・照明・耕地・水・小麦も設計図に従って空気の場所に再設置。既存ブロックは壊しません。
樽は空の新品で、中身は復元できません。機械の状態も初期状態です。再設置で機械が動き始めることがあります。水は囲いと床が揃い、人や生物が範囲にいない時だけ復旧。小麦は成長0からです。
改造された建物、支え不足、人の近く、未読込は待機。意図的に撤去した部分も戻すため改装前に停止してください。古い完成建物は位置記録がなく対象外。水・機械・保護は実機未検証、先にバックアップしてください。`,[[enabled?'自動修理を停止':'自動修理を許可'],['閉じる']]);
 if(ix!==0||!lifeNear(p,t))return;property(world,`builder_repair_enabled_${villageIdentity(site)}_v2`,enabled?0:1);notice(p,enabled?'§e自動修理を停止しました':'§a自動修理を許可しました');
}
async function villageSharedRequest(p,t){
 const day=seasonDay(),r=lifeRealm(t),q=requestStatus(townRecord(t),day,r);
 const ix=await form(p,q.name,`みんなで ${q.label} ${q.goal}個を持ち寄ります。進捗 ${q.count}/${q.goal}。1回につき${q.amount}個ずつ、複数人で協力できます。完成で村の抽象備蓄+6。翌日には新しい依頼へ変わります。`,[['2個を持ち寄る'],['閉じる']]);
 if(ix!==0||!lifeNear(p,t)||seasonDay()!==day)return;
 const plan=contributeRequest(townRecord(t),day,r,p.name);if(!plan)return notice(p,'§eこの依頼は達成済みです');
 if(!depositToVillage(space(p),plan.item,plan.count,()=>saveVillageLife(t,plan.next),report))return notice(p,'§e必要な品が足りないか、寄付に失敗しました。持ち物も確認してください');
 notice(p,plan.done?'§aみんなのお願い達成！ 村の備蓄+6':'§a品物を持ち寄りました');
}
async function villageSeasonFestival(p,t){
 const day=seasonDay(),f=festivalAt(day,lifeRealm(t));
 const ix=await form(p,f.title,`${f.name}の2日目に開かれる村の祭りです。今は${f.name} ${f.dayInSeason}/4日目。祭りの日は参加者の名前が村の思い出に残り、最初の参加で村の備蓄+2。1人につき村ごとに季節1回です。会場完成後は四隅めぐりと逆回りリレーにも参加できます。`,[['祭りに参加する'],['四隅めぐり'],['逆回りリレー'],['閉じる']]);
 if((ix===1||ix===2)&&lifeNear(p,t)&&seasonDay()===day)return startVillageGame(p,t,day,ix-1);
 if(ix!==0||!lifeNear(p,t)||seasonDay()!==day)return;
 const next=festivalJoin(townRecord(t),day,lifeRealm(t),p.id,p.name);
 if(!next)return notice(p,'§e開催日ではないか、参加済み／参加人数の上限です');
 saveVillageLife(t,next);
 try{t.d.spawnParticle(`hakkai:climate_${lifeRealm(t)}`,{x:t.l.x+.5,y:t.l.y+2,z:t.l.z+.5});p.playSound('random.levelup',{volume:.6,pitch:1.1});}catch{}
 notice(p,`§d${f.title}に参加しました`);
}
function startVillageGame(p,t,day,course){
 if(!festivalAt(day,lifeRealm(t)).open)return notice(p,'§e祭りの開催日に挑戦できます');
 const site=villageSite(t),plot=site&&readVillagePlot(site,4);if(!plot)return notice(p,'§e建築係の祭り会場が完成するまで待ってください');
 try{if(t.d.getBlock({x:plot.at.x,y:plot.at.y+1,z:plot.at.z})?.typeId!=='minecraft:gold_block')return notice(p,'§e会場の中央の目印がありません');}catch{return;}
 const game=festivalGameStart(day,lifeRealm(t),plot,p,course);if(!game)return notice(p,`§e会場の近くへ：X ${plot.at.x} Z ${plot.at.z}`);
 game.expires=system.currentTick+(course?1800:1200);game.town=t;state(p).villageGame=game;
 notice(p,course?'§6逆回りリレー開始！ 90秒以内に四隅を逆順に2周しよう':'§6四隅めぐり開始！ 60秒以内に表示される四隅へ順に走ろう',100);gameHint(p,game);
}
function gameHint(p,g){const [x,z]=GAME_CORNERS[GAME_COURSES[g.course][g.step]];notice(p,`§b次の目印 ${g.step+1}/${GAME_COURSES[g.course].length}：X ${g.at.x+x} Z ${g.at.z+z}`,100);}
function villageGameTick(p,tick){
 const s=state(p),g=s.villageGame;if(!g)return;const result=festivalGameAdvance(g,p,seasonDay(),tick);
 if(result==='expired'){s.villageGame=undefined;return notice(p,'§e四隅めぐり終了。もう一度挑戦できます');}
 if(result==='next')return gameHint(p,g);
 if(result!=='complete')return;s.villageGame=undefined;
 if(!lifeNear(p,g.town)||!festivalAt(seasonDay(),g.realm).open)return;
 const data=townRecord(g.town),cycle=seasonAt(seasonDay()).cycle,all=data.lifeGameCycle4===cycle&&data.lifeGameWinners?data.lifeGameWinners:{},people=Array.isArray(all[g.course])?all[g.course].slice(0,32):[];
 if(people.includes(p.id)||people.length>=32)return notice(p,'§a完走！ この祭りの記録は登録済みです');
 saveVillageLife(g.town,addVillageMemory({...data,lifeGameCycle4:cycle,lifeGameWinners:{...all,[g.course]:[...people,p.id]},goods:Math.min(200,(data.goods??0)+1)},seasonDay(),`${g.course?'逆回りリレー':'四隅めぐり'}を完走（村の備蓄+1）`,p.name));
 notice(p,`§6${g.course?'逆回りリレー':'四隅めぐり'}完走！ 村の備蓄+1、思い出に記録しました`,100);try{p.playSound('random.levelup',{volume:.7,pitch:1.3});}catch{}
}
function villageCarryTick(p,site,tick){
 const town=lifeTownForPlayer(p,site);if(!town||!lifeNear(p,town))return;
 const route=townRecord(town).lifeRoute;
 const people=p.dimension.getEntities({families:['hakkai_resident_2'],location:town.l,maxDistance:town.factoryVillage?50:32,closest:8});
 const candidates=people.filter(e=>e.isValid).sort((a,b)=>String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0);
 const active=candidates.some(e=>readCarry(e)?.townKey===town.key);
 const primary=active?undefined:candidates.find(e=>readCarry(e)===undefined);
 for(const worker of candidates){
  const job=readCarry(worker);if(job===null||job&&job.townKey!==town.key||!job&&(!route||worker!==primary)||!permit(worker,40,'carry_work'))continue;
  const result=carryStep(worker,route,{town,along,report});
  if(result==='delivered')saveVillageLife(town,addVillageMemory(townRecord(town),seasonDay(),'物資係が実物を樽から樽へ運んだ'));
 }
}
async function villageSupplyMenu(p,t){
 const d=townRecord(t),workers=lifeWorkers(t);
 const ix=await form(p,'住人の仕事と共同備蓄',`共同小麦 ${d.lifeFood??0}/64｜共同板材 ${d.lifeWood??0}/64
畑守：${workers.farmer?'近くにいる':'不在'}／物資係：${workers.artisan?'近くにいる':'不在'}／建築係：${workers.builder?'近くにいる':'不在'}

寄付した品は抽象備蓄になります。畑守か物資係が近くにいる日、小麦2→村の備蓄3。建築係が近くにいる日、板材2→備蓄2。それぞれ1日1回。寄付備蓄の処理は現物の収穫・運搬や建築資材への消費ではありません。

共同工房：登録した2つの樽だけを使い、近くの物資係は小麦3→パン1、工場村の製材係はオーク原木1→板材4を現物で加工します。入出力樽から6ブロック以内に住人が必要、成功後60秒待機。

運搬：物資係が登録した2樽の間を歩き、実物の小麦・パン・オーク原木・板材を1個ずつ運びます。樽は3〜16ブロック離して登録。住人の持ち物に入るため死亡・移動不能に注意。`,[['小麦4個を寄付'],['オークの板材4個を寄付'],['共同工房の樽を登録'],['工房の登録を解除'],['運搬元と運搬先の樽を登録'],['運搬登録を解除'],['閉じる']]);
 if(!lifeNear(p,t))return;
 if(ix===2||ix===4){state(p).villageBarrelPick={town:t,phase:0,mode:ix===4?'route':'workshop',expires:system.currentTick+600};return notice(p,'§b30秒以内に入力樽、次に出力樽をしゃがんで使ってください',120);}
 if(ix===3){const data=townRecord(t);delete data.lifeWorkshop;saveVillageLife(t,data);return notice(p,'§e共同工房の樽登録を解除しました');}
 if(ix===5){const data=townRecord(t);delete data.lifeRoute;saveVillageLife(t,data);return notice(p,'§e運搬登録を解除しました。持ち運び中の品は運搬先へ届けます');}
 if(ix!==0&&ix!==1)return;
 const plan=donation(townRecord(t),ix===0?'food':'wood',seasonDay(),p.name);
 if(!plan)return notice(p,'§e共同備蓄に空きがありません');
 if(!depositToVillage(space(p),plan.item,plan.count,()=>saveVillageLife(t,plan.next),report))return notice(p,'§e品物が足りないか、寄付に失敗しました。持ち物も確認してください');
 notice(p,'§a共同備蓄に品物を寄付しました');
}
async function villageCrisisMenu(p,t){
 const day=seasonDay();let data=townRecord(t),signals;try{signals=lifeSignals(t);}catch{return notice(p,'§e周囲を確認できません');}
 const alert=detectCrisis(data,day,signals);if(alert){saveVillageLife(t,alert);data=alert;}
 const c=data.lifeCrisis,info=!c?.active?'現在警戒はありません。周囲の魔物や季節3日目の雨を観測すると、警戒記録が生まれます。':c.type==='monster'?`魔物への警戒：近くに ${signals.monsters} 体。いなくなったら板材4個で復興を支援できます。`:`嵐への備え：${signals.rain?'雨が続いています。':'雨はやみました。'} 雨がやんだら板材4個で復興を支援できます。`;
 const ix=await form(p,'危機と復興',`${info}\n\nこの復興支援は敵を新たに出現させたり建築物を破壊したりしません。備蓄の回復と建築係の自動修理の許可は別です。`,[['板材4個で復興を支援'],['閉じる']]);
 if(ix!==0||!lifeNear(p,t))return;
 try{signals=lifeSignals(t);}catch{return;}
 const plan=recoverCrisis(townRecord(t),seasonDay(),signals,p.name);if(!plan)return notice(p,'§e危険が去っていないか、復興は完了済みです');
 if(!depositToVillage(space(p),plan.item,plan.count,()=>saveVillageLife(t,plan.next),report))return notice(p,'§e板材が足りないか、寄付に失敗しました。持ち物も確認してください');
 notice(p,'§a復興を支援！ 村の備蓄+6');
}
async function townMenu(p,ref){
 const t=ref??townNear(p.dimension,p.location);
 if(!t)return simple(p,'村の集落台帳','村に「風記の集落鐘」を設置するか、バニラの鐘をしゃがんで使って台帳を開いてください。設備を鐘の前後左右11ブロックに作ると守りが強くなります。');
 const score=townScore(t),info=townRecord(t),day=seasonDay(),n=seasons.indexOf(era()),festival=townFestival(t),level=Math.max(0,Math.min(4,info.level??0)),townTitles=['小さな集落','交流の集落','にぎわう集落','八界の宿場','八界の交流中心'];
 const near=()=>p.isValid&&p.dimension.id===t.d.id&&dist(p.location,t.l)<24&&['minecraft:bell',ns+'town_bell'].includes(t.d.getBlock(t.l)?.typeId);
 const ix=await form(p,'村の集落台帳',`${townTitles[level]}（発展 ${level}/4）
守り ${score}/12　備蓄 ${info.goods}/200
${info.work+2400>world.getAbsoluteTime()?'工場出荷あり':'工場出荷が途絶えている'}　${festival?`${era()}の祭り開催中`:'祭りは守り4・備蓄6以上の季節2日目'}
壁4個ごとに加点。鐘より3〜5ブロック高い標、足止め罠、加工機と出荷も加点されます。村人は日ごとに備蓄を消費します。`,[
   ['季節の収穫市'],['備蓄から品物を交換する'],['祭りの記念章を受け取る'],['見回りを頼む'],['日替わりの納品依頼'],['集落の発展計画'],...(t.factoryVillage?[['風車村の暮らしと約束']]:[]),...(/^hakkai:realm_[0-7]$/.test(t.d.id)?[['八界の村の暮らし']]:[])
 ]);
 if(ix===undefined||!near())return;
 if(ix===0)return harvestMarket(p);
 if(ix===3)return villageWatch(p);
 if(ix===4)return townOrder(p,t);
 if(ix===5)return townDevelopment(p,t);
 if(ix===(t.factoryVillage?7:6)&&/^hakkai:realm_[0-7]$/.test(t.d.id))return villageLifeMenu(p,t);
 if(ix===6&&t.factoryVillage)return simple(p,'風車村の暮らしと約束','風は皆で分けるもの。粉砕係と製材係は朝から工房へ向かい、畑守は作物へ、灯守は鐘の周りへ向かいます。\n\n朝〜昼の作業時間に、担当の大人が対応する機械から6ブロック以内にいて、実際の加工が成功すると、通常の生産分に加えて備蓄が1増えます。機械の材料は村人が運ぶわけではありません。備蓄は日々の暮らしや発展・祭りを支えます。');
 const data=townRecord(t);
 if(ix===1){
   if(townScore(t)<3||data.goods<3||!villagerNear(p,18))return notice(p,'§e守り3・備蓄3と村人が必要です');
   if(exchange(p,'minecraft:emerald',1,ns+`shard_${[0,1,3,11][n]}`,townScore(t)>=7?4:2))townSave(t,{...data,goods:data.goods-3});
 }
 if(ix===2){
   if(!townFestival(t)||num(p,'town_festival',-1)===day)return notice(p,'§e本日は祭りの記念章を受け取れません');
   if(give(p,ns+`festival_${n}`)){property(p,'town_festival',day);notice(p,`§6${era()}の祭りの記念章を受け取った！`);}
   else notice(p,'§e持ち物に空きを作ってね');
 }
}

const fieldChronicles=[
 ['地下牢の風記','スポナーに向かって、ガイド本から調べる。','旅人は石牢に風を通すため、松明を一列に並べた。'],
 ['砂の神殿の風記','模様入り砂岩・青いテラコッタ・感圧板が近い部屋で調べる。','土の守り手は、宝を開ける前に足元を見るようにと教えた。'],
 ['密林の仕掛けの風記','苔石、トリップワイヤー、ディスペンサーの近くで調べる。','旅人の合図は、弦の揺れる回数で決まっていた。'],
 ['古要塞・時の扉','エンドポータルの枠を見て調べる。','石の輪が閉じるとき、遠くの駅で鐘が鳴った。',8],
 ['深層の残響','強化された深層岩を見て調べる。','音を失った街で、風の記録だけが残響を覚えていた。'],
 ['海底神殿の守護像','海の水中で、プリズマリンとシーランタンがそろう場所を調べる。','像は帰る船を見送り、海の灯りを守った。'],
 ['ネザー｜火床への道','ネザーレンガと柵・階段・スポナーがそろう場所を調べる。','火床の鍛冶師が、炉の火を地底から運び出した。',13],
 ['エンド｜時の分岐','帰還口・ゲートウェイ、またはエンドレンガとプルプァがそろう場所を調べる。','誰もいないホームに、終着駅行きの切符が残った。',8],
 ['氷の地下室の風記','雪原で鉄格子と醸造台の近くを調べる。','雪を避ける小さな家の下で、凍りつかない薬が試された。'],
 ['森の洋館の風記','暗い森でシラカバの板材と濃い色のオーク材の近くを調べる。','西の広間に刻まれた風の印は、夜明けを待つ旅人の目印だった。'],
 ['試練の間の風記','試練のスポナー、宝物庫を見て調べる。','銅の扉を抜けた者は、風と土の呼吸がそろう音を聞いた。'],
 ['坑道の風記','地下で線路、クモの巣、柵がそろう所を調べる。','坑夫は、収穫した鉱石と同じ数だけ木の支えを作っていた。'],
 ['残された砦の風記','ネザーで磨かれた黒石レンガと黒石、金や金色の黒石がそろう場所を調べる。','石壁を飾る金色は、旅の道しるべだったという。'],
 ['半分沈んだ船の風記','海岸や水中で、樽・階段・トラップドアの周りを調べる。','舵を振り切った最後の瞬間まで、灯台の光を覚えていた。'],
 ['風化した見張り塔','旗、濃いオーク材、丸石が近くにある場所を調べる。','見張りの影が丘を越えるより早く、鐘の音が谷へ届いた。']
];
function fieldEvidence(d,k){
 const found=new Set();
 for(let dy=-2;dy<=2;dy++)for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){
   const at={x:k.x+dx,y:k.y+dy,z:k.z+dz};
   try{if(d.isChunkLoaded(at))found.add(d.getBlock(at)?.typeId.slice(10));}catch{}
 }
 return found;
}
function fieldStructure(p){
 const d=p.dimension, dimension=d.id.replace(/^minecraft:/,''), l=p.location;
 if(dimension!=='overworld'&&dimension!=='nether'&&dimension!=='the_end')return -1;
 const b=p.getBlockFromViewDirection({maxDistance:8,includeLiquidBlocks:false})?.block;
 if(!b)return -1;
 const id=b.typeId.replace(/^minecraft:/,''), biome=biomeAt(p);
 if(dimension==='the_end'){
   if(id==='end_gateway'||id==='end_portal')return 7;
   if(!/^(end_bricks|end_brick_stairs|purpur_.+)$/.test(id))return -1;
   const found=fieldEvidence(d,b.location);
   return found.has('end_bricks')&&[...found].some(x=>x?.startsWith('purpur_'))?7:-1;
 }
 if(dimension==='nether'){
   if(/^(polished_blackstone_bricks|cracked_polished_blackstone_bricks|gilded_blackstone|gold_block)$/.test(id)){
     const found=fieldEvidence(d,b.location);
     return found.has('polished_blackstone_bricks')&&found.has('blackstone')&&(found.has('gilded_blackstone')||found.has('gold_block'))?12:-1;
   }
   if(!/^(nether_brick|nether_brick_fence|nether_brick_stairs|mob_spawner|spawner)$/.test(id))return -1;
   const found=fieldEvidence(d,b.location);
   return found.has('nether_brick')&&['nether_brick_fence','nether_brick_stairs','mob_spawner','spawner'].some(x=>found.has(x))?6:-1;
 }
 if(['mob_spawner','spawner'].includes(id))return 0;
 if(['trial_spawner','vault'].includes(id))return 10;
 if(['end_portal_frame','end_portal'].includes(id))return 3;
 if(id==='reinforced_deepslate')return 4;
 if(biome?.profile.mode==='water'&&(/^(prismarine.*|dark_prismarine.*|sea_lantern)$/.test(id))){
   if(!waterAt(d,l)&&!waterAt(d,{...l,y:l.y+1}))return -1;
   const found=fieldEvidence(d,b.location);
   return found.has('sea_lantern')&&['prismarine','prismarine_bricks','dark_prismarine'].some(x=>found.has(x))?5:-1;
 }
 const signature=/^(chiseled_sandstone|blue_terracotta|stone_pressure_plate|mossy_cobblestone|dispenser|trip_wire|tripwire_hook|iron_bars|brewing_stand|birch_planks|dark_oak_planks|dark_oak_log|rail|web|barrel|standing_banner|wall_banner|\w+_trapdoor)$/;
 if(!signature.test(id))return -1;
 const found=fieldEvidence(d,b.location);
 if(biome?.key==='dry'&&found.has('stone_pressure_plate')&&(found.has('blue_terracotta')||found.has('chiseled_sandstone')))return 1;
 if(biome?.key==='jungle'&&found.has('mossy_cobblestone')&&found.has('dispenser')&&(found.has('trip_wire')||found.has('tripwire_hook')))return 2;
 if(biome?.key==='snow'&&found.has('iron_bars')&&found.has('brewing_stand'))return 8;
 if(biome?.id.includes('roofed')&&found.has('birch_planks')&&found.has('dark_oak_planks'))return 9;
 if(l.y<55&&found.has('rail')&&found.has('web')&&[...found].some(b=>b?.endsWith('_fence')))return 11;
 if((biome?.profile.mode==='water'||biome?.key==='beach')&&id!=='web'&&[...found].some(b=>b?.endsWith('_trapdoor'))&&
   [...found].some(b=>b?.endsWith('_stairs'))&&[...found].some(b=>b?.endsWith('_planks')))return 13;
 if(found.has('dark_oak_log')&&found.has('cobblestone')&&(found.has('standing_banner')||found.has('wall_banner')))return 14;
 return -1;
}
async function expeditionStory(p){
 const found=fieldStructure(p);
 const choice=await form(p,'バニラの遺跡と風の道','構造物の特徴を証拠に、風記の断片を読み解きます。調べる前に目印ブロックを見てください。',[
   [found>=0?`調べる：${fieldChronicles[found][0]}`:'調べる：目印が見つかりません'],['遺跡の手がかりと記録'],['近くの空き地に遺跡の装置を置く']]);
 if(choice===2)return installRelic(p,found);
 if(choice===1){
   const n=await paged(p,'各地の風の記録','◆ 読了　◇ 手がかり',fieldChronicles.map(([title],i)=>[`${marked(p,'field_story',i)?'◆':'◇'} ${title}`]));
   if(n!==undefined){const [title,clue,story]=fieldChronicles[n];return simple(p,title,`${clue}${marked(p,'field_story',n)?`\n\n${story}`:''}`);}
 }
 if(choice!==0||!p.isValid||found<0||fieldStructure(p)!==found)return;
 const [title,clue,story]=fieldChronicles[found];
 if(!marked(p,'field_story',found)){
   if(!give(p,ns+'chronicle_fragment'))return notice(p,'§e断片を受け取るには持ち物に空きを作ってね');
   mark(p,'field_story',found);
 }
 if(!relicPuzzles[found])return simple(p,title,story);
 const ix=await form(p,title,`${story}\n\n時渡りの羅針盤を手に、同じ目印を正面から使うと道を開けます。`,[['羅針盤の作り方'],['ここに残る']]);
 if(ix===0)return simple(p,'時渡りの羅針盤','作業台でコンパス＋風記の断片＋時の結晶を合わせます。');
}
/** @type {Record<number,[string,string[],number]>} */
const relicPuzzles={
  1:['宝を開ける前にまず見る場所は？',['祭壇の上','足元','空'],1],
  2:['糸を張り、合図に使われたものは？',['鐘','風車','弦'],2],
  3:['石の輪が閉じると、遠くから何が聞こえた？',['駅の鐘','波の音','雷鳴'],0],
  5:['守護像が守っていたものは？',['海の灯り','線路','炉の火'],0],
  6:['火床の鍛冶師はどこから火を運んだ？',['氷河','地底','空'],1],
  7:['無人のホームに残ったものは？',['地図','風車','切符'],2],
  0:['石牢に風を通す目印は？',['松明','風鈴','時計'],0],
  4:['静かな街で残響を覚えていたものは？',['風の記録','赤い砂','暗い炉'],0],
  8:['雪原の地下室で何を試した？',['凍らない薬','飛行船','種の保存'],0],
  9:['屋敷の広間の印は誰の目印だった？',['旅人','鍛冶師','漁師'],0],
  10:['銅の扉でそろった二つの呼吸は？',['水と光','風と土','火と闇'],1],
  11:['坑夫が鉱石と同じ数だけ用意したものは？',['松明','木の支え','レール'],1],
  12:['砦の金色にはどんな役割があった？',['道しるべ','燃料','貯金'],0],
  13:['船は最後に何の光を覚えていた？',['灯台','月','火山'],0],
  14:['丘の見張りより先に谷に届いたものは？',['矢','鐘の音','旗'],1],
 };
const relicDestinations={3:8,6:13,7:8};
async function installRelic(p,i){
 if(i<0||!marked(p,'solved_relic',i))return notice(p,'§e遺跡を調査し、羅針盤の仕掛けを解いてから同じ目印を見てください');
 if(marked(p,'placed_relic',i))return notice(p,'§eこの種類の遺跡の装置は設置済みです');
 const d=p.dimension,b=p.getBlockFromViewDirection({maxDistance:8})?.block;
 if(!b||fieldStructure(p)!==i)return;
 const type=ns+([3,7].includes(i)?'relic_gate_time':i===6?'relic_gate_fire':[2,5,14].includes(i)?'relic_statue':'field_cache');
 const label=type.endsWith('time')?'時渡りの扉':type.endsWith('fire')?'火渡りの扉':type.endsWith('statue')?'古い守護者の像':'風蔵の宝箱';
 const at=b.location,candidates=[];
 for(const r of [2,3,4])for(const [dx,dz] of [[r,0],[0,r],[-r,0],[0,-r]])for(const dy of [0,1,-1]){
   const pt={x:at.x+dx,y:at.y+dy,z:at.z+dz};
   try{if(d.isChunkLoaded(pt)&&safe(d,pt)&&dist(p.location,pt)<7&&dist(p.location,pt)>2&&candidates.length<4)candidates.push(pt);}catch{}
 }
 if(!candidates.length)return notice(p,'§eそばに乾いた空き地がありません。現在は設置できません');
 const pick=await form(p,label,'指定の空きブロックに1つ置きます。既存の地形や建築は変更しません。設置は種類ごとに1回。',['やめる',...candidates.map(l=>`${l.x}, ${l.y}, ${l.z} に設置`)].map(x=>[x]));
 if(!pick||!p.isValid||![GameMode.Survival,GameMode.Creative].includes(p.getGameMode())||p.dimension.id!==d.id||fieldStructure(p)!==i||marked(p,'placed_relic',i))return;
 const pt=candidates[pick-1];if(!pt)return;
 const now=p.getBlockFromViewDirection({maxDistance:8})?.block;
 if(!now||dist(now.location,at)>.01||dist(p.location,pt)>7||!d.isChunkLoaded(pt)||!safe(d,pt)||d.getPlayers({location:pt,maxDistance:1.4,closest:1}).length)return notice(p,'§e設置場所が変わったため中止しました');
 d.getBlock(pt)?.setType(type);
 mark(p,'placed_relic',i);notice(p,`§6${label}を設置した`);
}
async function usePhysicalRelic(p,at,type){
 const d=p.dimension;
 const near=()=>p.isValid&&p.getGameMode()!==GameMode.Spectator&&p.dimension.id===d.id&&dist(p.location,at)<=6&&d.getBlock(at)?.typeId===type;
 if(!near())return;
 const gate=type.endsWith('_time')?8:type.endsWith('_fire')?13:undefined;
 if(gate!==undefined){
   const site=places[gate];
   if(isNaturalSite(site))return notice(p,'§eこの遺跡の先は各界を歩いて探してください');
   if(!isCreative(p)&&!(gate===8?[3,7]:[6]).some(i=>marked(p,'solved_relic',i)))return notice(p,'§e羅針盤で対応する遺跡の仕掛けを解いてください');
   if(await form(p,'遺跡の扉',`${site.name}への道が開きます。`,[['渡る'],['残る']])===0&&near()){
     state(p).arrival=0;return arrive(p,site);
   }
   return;
 }
 const site=currentPlace(p), env=biomeAt(p), index=site?(site.id>=59&&site.id<=68?4096+site.id-59:site.id):59+(env?biomeIndex.get(env.id):0);
 const stamp=type.endsWith('statue')?'statue_prize':'cache_prize';
 if(marked(p,stamp,index))return notice(p,'§eこの土地ではすでに受け取っています');
 const reward=type.endsWith('statue')?`shard_${site?.ore??(site?home[aspect(site)][0]:env?.profile.ore??0)}`:'chronicle_fragment';
 const answer=await form(p,type.endsWith('statue')?'古い守護者の像':'風蔵の宝箱',
  'この土地での初回報酬です。すでに開いた宝箱を別の場所に置き直す必要はありません。',[['受け取る'],['閉じる']]);
 if(answer!==0||!near()||marked(p,stamp,index))return;
 if(give(p,ns+reward)){mark(p,stamp,index);notice(p,'§6風記の宝を手に入れた');}
 else notice(p,'§e持ち物に空きを作ってね');
}
async function openRelic(p){
 const i=fieldStructure(p), puzzle=relicPuzzles[i];
 if(!puzzle||!marked(p,'field_story',i))return notice(p,'§e遺跡の目印をガイド本で調べてから使ってください');
 const valid=()=>p.isValid&&p.getGameMode()!==GameMode.Spectator&&selected(p)?.typeId===ns+'relic_key'&&fieldStructure(p)===i;
 if(!valid())return;
 if(!marked(p,'solved_relic',i)){
   const [question,options,correct]=puzzle;
   const choice=await form(p,fieldChronicles[i][0],question,options.map(s=>[String(s)]));
   if(choice===undefined||!valid())return;
   if(choice!==correct)return notice(p,'§e羅針盤は動かない。遺跡の記録を読み返してみよう');
   if(!give(p,ns+'chronicle_fragment'))return notice(p,'§e報酬を受け取るために持ち物に空きを作ってください');
   mark(p,'solved_relic',i);
   const at=p.getBlockFromViewDirection({maxDistance:8})?.block.location;
   if(at)try{p.dimension.spawnParticle('hakkai:climate_7',{x:at.x+.5,y:at.y+1.1,z:at.z+.5});}catch{}
   notice(p,'§6遺跡の仕掛けが解けた');
 }
 const site=places[relicDestinations[i]];
 if(isNaturalSite(site))return notice(p,'§eこの場所には各界を歩いて向かってください');
 if(site&&await form(p,'時渡りの道',`${site.name}へ渡れます。`,[['渡る'],['ここに残る']])===0&&valid()){
   state(p).arrival=0;return arrive(p,site);
 }
}
async function spellwork(p){
 const pick=await form(p,'醸造と属性刻印','しゃがんで台を使ったときだけ、風記の別画面を開きます。普通に使うとバニラの画面です。',[
   ['醸造台：20秒かけて魔力の薬を作る'],...runes.map(x=>[`${x.name}の属性刻印`])
 ]);
 if(pick===0)return simple(p,'魔力の薬','作業台でガラス瓶＋グロウベリーから薄明の薬液を作り、通常の醸造台の瓶スロットへ。材料は水の結晶、燃料はブレイズパウダーです。しゃがんで台を使う旧方式も使えます。');
 if(pick>0)return simple(p,`${runes[pick-1].name}の属性刻印`,`${runes[pick-1].desc}。対応する結晶2個を用意し、バニラの剣または普通の本を持ってしゃがみ、エンチャント台を使います。刻印書も同じ台で使えます。`);
}
async function brewWork(p,at){
 const near=()=>p.isValid&&p.dimension.id===at.dim&&dist(p.location,at)<6&&p.dimension.getBlock(at)?.typeId==='minecraft:brewing_stand';
 if(!near())return;
 const res=await form(p,'風記の醸造台','魔力の薬：ガラス瓶・グロウベリー・水の結晶・ブレイズパウダーを各1個。\nこの台のそばで20秒待ってください。素材は完成時に消費されます。',[['醸造を始める'],['やめる']]);
 if(res!==0||!near())return;
 const c=space(p), ingredients=['minecraft:glass_bottle','minecraft:glow_berries',ns+'crystal_1','minecraft:blaze_powder'];
 if(!isCreative(p)&&ingredients.some(id=>total(c,id)<1))return notice(p,'§e醸造の素材が足りません');
 const s=state(p);s.workingAt=system.currentTick+410;
 try{
   for(let i=0;i<20;i++){
     if(!near()||p.getGameMode()===GameMode.Spectator)return;
     notice(p,`§b魔力の薬を醸造中… ${20-i}秒`,25);
     await timed(()=>{},20);
   }
   if(!near()||p.getGameMode()===GameMode.Spectator)return;
   const product=new ItemStack(ns+'mana_tonic',1);
   if(!room(c,product)||!isCreative(p)&&ingredients.some(id=>total(c,id)<1))return notice(p,'§e持ち物の空きか素材が足りず中止しました');
   if(!isCreative(p))for(const id of ingredients)debit(c,id,1);
   c.addItem(product);notice(p,'§a魔力の薬ができた');
 }finally{s.workingAt=0;}
}
safeSub('world','before','playerInteractWithBlock',e=>{
 const p=e.player,b=e.block;
 const pick=state(p).villageBarrelPick;
 if(pick&&e.isFirstEvent&&p.isSneaking){
   if(system.currentTick>pick.expires){state(p).villageBarrelPick=undefined;notice(p,'§e樽の登録は時間切れです');return;}
   e.cancel=true;const at={x:b.x,y:b.y,z:b.z},dimension=b.dimension.id,type=b.typeId;
   system.run(()=>{try{
     if(state(p).villageBarrelPick!==pick)return;
     if(type!=='minecraft:barrel'||!p.isValid||p.dimension.id!==dimension||dimension!==pick.town.d.id||dist(p.location,at)>7){state(p).villageBarrelPick=undefined;return notice(p,'§e樽を選んでください。登録を中止しました');}
     const t=townGet(p.dimension,pick.town.l,true);if(t&&pick.town.lifeSiteId)t.lifeSiteId=pick.town.lifeSiteId;
     if(!t||!lifeNear(p,t)||p.dimension.getBlock(at)?.typeId!=='minecraft:barrel'){state(p).villageBarrelPick=undefined;return notice(p,'§e村か樽を確認できません');}
     if(pick.phase===0){pick.phase=1;pick.input=at;pick.town=t;return notice(p,pick.mode==='route'?'§b次に3〜16ブロック先の運搬先樽を選んでください':'§b次に4ブロック以内の出力樽をしゃがんで使ってください',100);}
     state(p).villageBarrelPick=undefined;const setup={input:pick.input,output:at};
     if(!(pick.mode==='route'?validRoute(t,setup):validWorkshop(t,setup))||!p.dimension.isChunkLoaded(setup.input)||p.dimension.getBlock(setup.input)?.typeId!=='minecraft:barrel')return notice(p,pick.mode==='route'?'§e異なる樽を3〜16ブロック離して指定してください':'§e異なる樽を4ブロック以内で指定してください');
     saveVillageLife(t,{...townRecord(t),[pick.mode==='route'?'lifeRoute':'lifeWorkshop']:setup});notice(p,pick.mode==='route'?'§a運搬の樽を登録しました。指定された品を物資係が運びます':'§a共同工房の樽を登録しました。登録樽の中身は住人が加工します',120);
   }catch(err){state(p).villageBarrelPick=undefined;report('共同工房の樽登録',err);}});
   return;
 }

 if(!e.isFirstEvent||!p.isSneaking||p.getGameMode()===GameMode.Spectator)return;
 const type=b.typeId, at={...b.location,dim:b.dimension.id};
 if(type==='minecraft:brewing_stand'){e.cancel=true;menu(p,p=>brewWork(p,at));}
 if(type==='minecraft:enchanting_table'&&vanillaSword(e.itemStack)){e.cancel=true;menu(p,p=>runeForge(p,at));}
 if(type==='minecraft:enchanting_table'&&e.itemStack?.typeId==='minecraft:book'){e.cancel=true;menu(p,p=>inscribeBooks(p,at));}
 const tome=e.itemStack?.typeId.match(/^hakkai:rune_book_([0-3])$/);
 if(type==='minecraft:enchanting_table'&&tome){e.cancel=true;menu(p,p=>transferRuneBook(p,at,Number(tome[1])));}
 if(type==='minecraft:crafting_table'&&(e.itemStack?.typeId==='minecraft:paper'||baseWeapon(e.itemStack))){e.cancel=true;menu(p,p=>details(p,at));}
 if(type==='minecraft:bell'){
   e.cancel=true;menu(p,p=>{
     if(!villagerNear(p,23))return simple(p,'村の鐘','近くに村人がいる鐘を使ってね。');
     const town=townGet(p.dimension,at,true);
     if(town){town.vanilla=true;property(p,'vanilla_bell',JSON.stringify({...at,id:at.dim}));return townMenu(p,town);}
   });
 }
});
async function returnMenu(p){
 const ix=await form(p,'風見の帰還石','安全な足場が確認できる場合だけ移動します。',[
   ['風見台へ',itemTexture('return_stone')],['最後に登録されたベッドへ'],['自分の登録地点へ'],['元の世界へ戻る'],['旅の地図を開く']
 ]);
 if(ix===0)return arrive(p,places[0]);if(ix===1)return returnNatural(p,'bed');
 if(ix===2){if(!parsePoint(p,'home_point'))return notice(p,'§e先にガイド本の設定で位置を登録してね');return returnNatural(p,'home_point');}
 if(ix===3)return returnNatural(p,'overworld_point');
 if(ix===4)return map(p);
}
function menu(p,fn){
 const s=state(p);if(s.menu||s.busy)return;
 s.menu=true;
 system.run(()=>{if(!p.isValid){s.menu=false;return;}
   Promise.resolve().then(()=>fn(p)).catch(err=>{if(p.isValid)p.sendMessage('§e風記の画面を開けなかった。もう一度お試しください。');report('画面',err);}).finally(()=>{s.menu=false;});
 });
}
function use(e){
 const p=e.source,id=e.itemStack?.typeId;
 if(p.typeId!=='minecraft:player'||!id||!p.isValid||p.getGameMode()===GameMode.Spectator)return;
 const s=state(p), t=system.currentTick;
 if(t-s.useTick<7||s.busy||s.menu)return;
 const heldGear=gear.get(id);
 if(p.isSneaking&&heldGear){
  if(isTraceWeapon(heldGear)&&heldGear.kind!=='弓'&&selected(p)?.typeId===id){s.useTick=t;return cast(p,heldGear,true);}
  return;
 }
 s.useTick=t;
 if(id===ns+'guide')menu(p,guide);
 if(id===ns+'industrial_guide')return menu(p,industrialGuide);
 if(id===ns+'warden_sigil')return menu(p,p=>wardenArena?.open(p));
 if(id===ns+'fushi_totem')return menu(p,totemMagicMenu);
 if(id===ns+'resolve_charm')return combatUltimate?.cast(p,s);
 const magicName=id.slice(ns.length),magic=Object.prototype.hasOwnProperty.call(magicItems,magicName)?magicItems[magicName]:undefined;
 if(id.startsWith(ns)&&magic){
   if(!isCreative(p)&&magic.slice(1).some(a=>!visited(p,home.findIndex(x=>x.includes(a))+1)))return notice(p,'§e対応する属性の界を先に訪れてね');
   return castMagic(p,magic[0]);
 }
 if(id===ns+'return_stone')menu(p,returnMenu);
 const pearl=id.match(/^hakkai:pearl_([0-7])$/);
 if(pearl){const realm=Number(pearl[1]);void arrive(p,places[realm===0?0:realm+1]);return;}
 if(id===ns+'island_stone')menu(p,returnMenu);
 if(id===ns+'element_tome'){tomeCrouchTick(p,s,id,()=>advanceTome(p));return castTome(p);}
 if(id===ns+'trail_ration'){s.s=bounds(s.s+35,0,max);notice(p,'§a旅人の携帯食でスタミナが回復した');}
 if(id===ns+'camp_stew'){s.s=bounds(s.s+50,0,max);s.m=bounds(s.m+10,0,max);notice(p,'§a野営の具だくさんスープでスタミナと魔力が少し回復した');}
 if(id===ns+'dried_meat'){s.s=bounds(s.s+18,0,max);notice(p,'§a乾燥肉でスタミナが少し回復した');}
 if(id===ns+'preserved_ration'){s.s=bounds(s.s+35,0,max);s.m=bounds(s.m+5,0,max);notice(p,'§a保存食セットでスタミナと魔力が回復した');}
 const regionalMeals={spring_garden_soup:[25,8,'春庭の山菜スープ'],summer_corn_stew:[30,5,'夏陽のコーンシチュー'],autumn_squash_potage:[28,8,'紅葉カボチャのポタージュ'],frost_blossom_tea:[22,15,'氷花のあたたかい煮込み'],sunflower_trail_bowl:[32,5,'風向きヒマワリの旅人椀']};
 const meal=Object.entries(regionalMeals).find(([key])=>id===ns+key);
 if(meal){s.s=bounds(s.s+meal[1][0],0,max);s.m=bounds(s.m+meal[1][1],0,max);notice(p,`§a${meal[1][2]}でスタミナと魔力が回復した`);}
 const campDrinks={spring_water_flask:[10,4,'湧水の小瓶'],camp_herbal_tea:[14,8,'野営の薬草茶']};
 const drink=Object.entries(campDrinks).find(([key])=>id===ns+key);
 if(drink){s.s=bounds(s.s+drink[1][0],0,max);s.m=bounds(s.m+drink[1][1],0,max);notice(p,`§b${drink[1][2]}で遠征のスタミナと魔力が回復した`);}
 const gatheringMeals={gathered_herb_bundle:[8,4,'野草の採集束'],roasted_root_plate:[24,3,'根菜の焚き火焼き'],forest_trail_meal:[30,12,'森歩きの滋養食']};
 const gatheringMeal=Object.entries(gatheringMeals).find(([key])=>id===ns+key);
 if(gatheringMeal){s.s=bounds(s.s+gatheringMeal[1][0],0,max);s.m=bounds(s.m+gatheringMeal[1][1],0,max);notice(p,`§a${gatheringMeal[1][2]}でスタミナと魔力が回復した`);}
 const campMeals={camp_mushroom_wrap:[26,6,'野営のきのこ包み'],forager_nut_mix:[20,10,'採集者の木の実袋']};
 const campMeal=Object.entries(campMeals).find(([key])=>id===ns+key);
 if(campMeal){s.s=bounds(s.s+campMeal[1][0],0,max);s.m=bounds(s.m+campMeal[1][1],0,max);notice(p,`§a${campMeal[1][2]}で遠征のスタミナと魔力が回復した`);}
 const provisions={dried_sweet_berries:[12,0,'乾燥ベリー'],smoked_fish_strip:[16,2,'燻製魚の切り身'],expedition_bento:[38,8,'遠征用の幕の内弁当'],camp_supply_pack:[44,14,'野営の補給袋']};
 const provision=Object.entries(provisions).find(([key])=>id===ns+key);
 if(provision){s.s=bounds(s.s+provision[1][0],0,max);s.m=bounds(s.m+provision[1][1],0,max);notice(p,`§a${provision[1][2]}で遠征向けの力が回復した`);}
 if(id===ns+'mana_tonic'){
   if(s.m>=max)return notice(p,'§b魔力は満タンです');
   if(isCreative(p)||debit(space(p),id,1)){s.m=bounds(s.m+45,0,max);notice(p,'§b魔力が回復した');}
 }
 if(id===ns+'bandage'){
   const h=p.getComponent('minecraft:health');
   if(!h||h.currentValue>=h.effectiveMax)return notice(p,'§c体力は満タンです');
   if(isCreative(p)||debit(space(p),id,1)){p.addEffect('instant_health',1,{amplifier:0,showParticles:true});notice(p,'§a包帯を使いました');}
 }
 if(id===ns+'relic_key')return menu(p,openRelic);
 const book=id.match(/^hakkai:rune_book_([0-3])$/);
 if(book)return notice(p,'§eエンチャント台で、刻印書を持ってしゃがみながら使ってね');
 const g=gear.get(id);if(g){
  if(isTraceWeapon(g)&&p.isOnGround===false&&selected(p)?.typeId===id)return combatUltimate?.cast(p,s,g);
  cast(p,g);
 }
}
system.runInterval(()=>{
 for(const id of ['minecraft:overworld','minecraft:nether','minecraft:the_end',...Array.from({length:8},(_,i)=>`hakkai:realm_${i}`)])try{cleanKineticVisuals(world.getDimension(id));}catch{}
},100);
function completeFocus({source:p,itemStack:item}){
 const g=gear.get(item?.typeId);
 if(!g||!p?.isValid)return;
 if(isTraceWeapon(g)&&g.kind!=='弓')return;
 if(RELEASE_WEAPON_KINDS.has(g.kind)){combatCharge?.complete(p,item);return;}
 if(g.kind==='弓'||!p.isSneaking||p.getGameMode()===GameMode.Spectator||selected(p)?.typeId!==item.typeId)return;
 const s=state(p),t=system.currentTick;
 if(s.busy||s.menu||t-s.useTick<7)return;
 s.useTick=t;cast(p,g,true);
}
safeSub('world','after','itemStartUse',({source:p,itemStack:item})=>{combatCharge?.start(p,item);});
safeSub('world','after','itemReleaseUse',({source:p,itemStack:item})=>{combatCharge?.release(p,item);});
try{world.afterEvents.itemStopUse?.subscribe(({source:p,itemStack:item})=>{combatCharge?.stop(p,item);});}catch{}

const factoryCycleAt=new Map(),farmCursors=new Map();
async function gantryMenu(player,block){
 const d=block.dimension,pos={x:block.x,y:block.y,z:block.z},id=block.typeId,initial=gantryState(block);if(!initial)return;
 const choice=await form(player,'§6動力移動装置',`位置 ${initial.offset}/8｜状態 ${['停止','連続前進','連続後退','往復前進','往復後退'][initial.mode]}\nフレーム・パネル・接合器と接合先の対応ブロック。人や生物が近いと停止。連続運転は開始後、離れる時間があります。`,[['1歩前進'],['1歩後退'],['連続前進'],['連続後退'],['自動往復'],['停止'],['閉じる']]);
 if(choice===undefined||choice===6||!player.isValid||player.dimension.id!==d.id||[GameMode.Spectator,GameMode.Adventure].includes(player.getGameMode()))return;
 const l=player.location;if(Math.hypot(l.x-pos.x-.5,l.y-pos.y-.5,l.z-pos.z-.5)>6)return notice(player,'§e移動装置から離れすぎました');
 let now;try{if(!d.isChunkLoaded(pos))return;now=d.getBlock(pos);}catch{return;}
 const current=gantryState(now);if(now?.typeId!==id||!current)return notice(player,'§e装置が見つかりません');
 if(choice===5){setGantryMode(now,0);return notice(player,'§e移動装置を停止しました');}
 if(current.offset!==initial.offset||current.mode!==initial.mode)return notice(player,'§e装置の状態が変わりました。もう一度開いてね');
 if(choice===2||choice===3||choice===4){
  const n=kineticNetwork(d,pos);if(n.status!=='running')return notice(player,'§e動力不足または回路を確認してね');
  if(setGantryMode(now,choice===2?1:choice===3?2:3)){armGantry(now,factoryCycleAt,system.currentTick);notice(player,'§a連続運転を予約。構造物から離れてね');}return;
 }
 if(choice!==0&&choice!==1)return;
 if(!setGantryMode(now,0))return notice(player,'§e装置を停止できません');
 const result=gantryStep(now,choice===0?1:-1,{kineticNetwork,ItemStack,factoryTransaction,report});
 const errors={limit:'移動範囲の端です',power:'動力がありません',anchor:'先頭に移動構造ブロックがありません',unsupported:'接合先が対応外です（チェスト等は不可）',size:'構造物が32ブロックを超えています',blocked:'移動先が空いていません',entity:'周囲に人や生物などがいます',unloaded:'周囲を読み込めません',failed:'移動に失敗しました',rollback:'復旧を確認してください',farm_layout:'収穫ヘッドは水平移動・最大8個です',farm_output:'装置の真上に出力樽を置いてください',farm_full:'出力樽が満杯です',farm_unavailable:'農機の準備ができません',farm_after_move:'移動後の収穫に失敗。位置と樽・作物を確認してください'};
 notice(player,result.ok?`§a${result.count}ブロックを移動：${result.offset}/8`:`§e${errors[result.reason]??'移動できません'}`);
}
async function bearingMenu(player,block){
 const d=block.dimension,pos={x:block.x,y:block.y,z:block.z},initial=bearingState(block);if(!initial)return;
 const choice=await form(player,'§6動力回転台',`角度 ${initial.angle*90}°｜状態 ${['停止','連続右回転','連続左回転'][initial.mode]}\n上にフレームなどを置いて接続。人や生物が近いと停止。`,[['右に90度'],['左に90度'],['連続右回転'],['連続左回転'],['停止'],['閉じる']]);
 if(choice===undefined||choice===5||!player.isValid||player.dimension.id!==d.id||[GameMode.Spectator,GameMode.Adventure].includes(player.getGameMode()))return;
 const l=player.location;if(Math.hypot(l.x-pos.x-.5,l.y-pos.y-.5,l.z-pos.z-.5)>6)return notice(player,'§e回転台から離れすぎました');
 let now;try{if(!d.isChunkLoaded(pos))return;now=d.getBlock(pos);}catch{return;}
 const current=bearingState(now);if(!current)return notice(player,'§e回転台が見つかりません');
 if(choice===4){setBearingMode(now,0);return notice(player,'§e回転台を停止しました');}
 if(current.angle!==initial.angle||current.mode!==initial.mode)return notice(player,'§e回転台の状態が変わりました。もう一度開いてね');
 if(choice===2||choice===3){if(kineticNetwork(d,pos).status!=='running')return notice(player,'§e動力不足または回路を確認してね');
  if(setBearingMode(now,choice===2?1:2)){armBearing(now,factoryCycleAt,system.currentTick);notice(player,'§a連続回転を予約。構造物から離れてね');}return;}
 if(choice!==0&&choice!==1)return;if(!setBearingMode(now,0))return notice(player,'§e回転台を停止できません');
 const result=bearingStep(now,choice===0?1:-1,{kineticNetwork,resolve:id=>BlockPermutation.resolve(id),report});
 const errors={power:'動力がありません',anchor:'回転台の上に移動構造ブロックがありません',size:'32ブロックを超えています',unsupported:'接合先が対応外です',blocked:'回転先が空いていません',entity:'周囲に人や生物などがいます',unloaded:'周囲を読み込めません',failed:'回転に失敗しました',rollback:'復旧を確認してください'};
 notice(player,result.ok?`§a${result.count}ブロックを回転：${result.angle*90}°`:`§e${errors[result.reason]??'回転できません'}`);
}
function factoryMeter(player,block){
 if(!player?.isSneaking)return;
 const n=kineticNetwork(block.dimension,{x:block.x,y:block.y,z:block.z});
 const status={running:'稼働',no_source:'動力源なし',incomplete:'未読込または規模上限',conflict:'歯車の矛盾・動力源の回転数不一致',overload:'容量不足',speed_limit:'回転数の許容範囲外'}[n.status]??n.status;
 player.sendMessage(`§b動力 ${status}｜回転 ${n.rpm} RPM｜負荷 ${n.demand} / 容量 ${n.capacity} SU`);
}
function transfer(b){
 const d=b.dimension,x=b.x,y=b.y,z=b.z;
 const t=world.getTimeOfDay(), night=t>=13000&&t<23000, evening=t>=12000&&t<13000;
 const weather=currentWeather.get(d.id?.replace(/^minecraft:/,'')),thunder=weather===WeatherType.Thunder, wet=thunder||weather===WeatherType.Rain;
 if(['shaft','wind_rotor','water_wheel','gear_up','gear_down','gear_up_z','gear_down_z','gear_up_y','gear_down_y','clutch'].some(id=>b.typeId===ns+id)){syncKineticVisual(b,kineticNetwork(d,{x,y,z}));return;}
 const kind=b.typeId.slice(ns.length),visualMachine=['crusher','washer','press','saw','mixer','assembler','fluid_basin','farm_harvester','farm_fertilizer','farm_planter'].includes(kind);
 let kinetic;
 if(visualMachine){kinetic=kineticNetwork(d,{x,y,z});syncKineticVisual(b,kinetic);}
 if(b.typeId===ns+'conveyor'){
   try{
     const thrust=night?.23:thunder?.36:wet?.28:evening?.25:.31;
     for(const e of d.getEntities({type:'minecraft:item',location:{x:x+.5,y:y+1.04,z:z+.5},maxDistance:.75,closest:5})){
       const vel=e.getVelocity(),l=e.location;
       if(l.x>=x&&l.x<x+1&&l.z>=z&&l.z<z+1&&l.y>=y+.9&&vel.x<.60)e.applyImpulse({x:thrust,y:.018,z:0});
     }
   }catch{}
   return;
 }
 // Dedicated agricultural machines scan a small same-height field.
 if(kind==='farm_harvester'||kind==='farm_fertilizer'||kind==='farm_planter'){
   const network=kinetic??kineticNetwork(d,{x,y,z});if(network.status!=='running')return;
   const k=`farm:${d.id}:${x},${y},${z}`,delay=Math.max(10,Math.ceil(40*16/Math.abs(network.rpm)));
   if(system.currentTick-(factoryCycleAt.get(k)??-Infinity)<delay)return;
   if(factoryCycleAt.size>=8192)factoryCycleAt.clear();factoryCycleAt.set(k,system.currentTick);
   try{
    const position=kind==='farm_harvester'?{x,y:y+1,z}:{x:x-1,y,z};
    if(!d.isChunkLoaded(position))return;
    const barrel=d.getBlock(position);if(barrel?.typeId!=='minecraft:barrel')return;
    const c=barrel.getComponent('minecraft:inventory')?.container;if(!c)return;
    if(farmStep({block:b,mode:kind==='farm_harvester'?'harvest':kind==='farm_planter'?'plant':'fertilize',input:c,output:c,ItemStack,factoryTransaction,cursors:farmCursors,resolve:id=>BlockPermutation.resolve(id),report}))production(b,1);
   }catch(err){report('農機',err);}return;
 }
 if(kind==='item_duct')return;
 if(kind==='item_extractor'||kind.startsWith('item_extractor_')){
   const network=kineticNetwork(d,{x,y,z});if(network.status!=='running')return;
   const k=`duct:${d.id}:${x},${y},${z}`,delay=Math.max(10,Math.ceil(40*16/Math.abs(network.rpm)));
   if(system.currentTick-(factoryCycleAt.get(k)??-Infinity)<delay)return;
   if(factoryCycleAt.size>=8192)factoryCycleAt.clear();factoryCycleAt.set(k,system.currentTick);
   itemDuctStep(b,{factoryTransaction,report});return;
 }
 // Water pumps use a bounded, independently connected pipe graph.
 if(kind==='fluid_pipe'||kind==='fluid_tank')return;
 if(kind==='fluid_pump'||kind.startsWith('fluid_pump_')){
   const network=kineticNetwork(d,{x,y,z});if(network.status!=='running')return;
   const k=`${d.id}:${x},${y},${z}`,delay=Math.max(10,Math.ceil(40*16/Math.abs(network.rpm)));
   if(system.currentTick-(factoryCycleAt.get(k)??-Infinity)<delay)return;
   if(factoryCycleAt.size>=8192)factoryCycleAt.clear();factoryCycleAt.set(k,system.currentTick);
   fluidPumpStep(b,report);
   return;
 }
 // Directional pipes are an independent barrel-to-barrel operation.
 const endpoints=pipeEndpoints(kind,{x,y,z});
 if(endpoints){
   let input,output;
   try{if(!d.isChunkLoaded(endpoints.from)||!d.isChunkLoaded(endpoints.to))return;
    input=d.getBlock(endpoints.from);output=d.getBlock(endpoints.to);}catch{return;}
   if(input?.typeId!=='minecraft:barrel'||output?.typeId!=='minecraft:barrel')return;
   const from=input.getComponent('minecraft:inventory')?.container,to=output.getComponent('minecraft:inventory')?.container;
   if(!from||!to)return;
   for(let i=0;i<from.size;i++){
     const item=from.getItem(i);if(!item)continue;
     const product=item.clone();product.amount=1;
     factoryTransaction({input:from,output:to,costs:[{id:item.typeId,count:1}],product,report});
     return;
   }
   return;
 }
 let west,east;
 try{west=d.getBlock({x:x-1,y,z});east=d.getBlock({x:x+1,y,z});}catch{return;}
 if(west?.typeId!=='minecraft:barrel'||east?.typeId!=='minecraft:barrel')return;
 const from=west.getComponent('minecraft:inventory')?.container,to=east.getComponent('minecraft:inventory')?.container;
 if(!from||!to)return;
 const mill={'minecraft:raw_iron':'minecraft:iron_ingot','minecraft:raw_gold':'minecraft:gold_ingot','minecraft:raw_copper':'minecraft:copper_ingot',
  'hakkai:washed_iron':'minecraft:iron_ingot','hakkai:washed_gold':'minecraft:gold_ingot','hakkai:washed_copper':'minecraft:copper_ingot'};
 const kiln={'minecraft:sand':'minecraft:glass','minecraft:red_sand':'minecraft:glass','minecraft:potato':'minecraft:baked_potato',
   'minecraft:beef':'minecraft:cooked_beef','minecraft:porkchop':'minecraft:cooked_porkchop','minecraft:chicken':'minecraft:cooked_chicken',
   'minecraft:cod':'minecraft:cooked_cod','minecraft:salmon':'minecraft:cooked_salmon','minecraft:clay_ball':'minecraft:brick'};
 const cycle=b.typeId===ns+'compressor'?(thunder?2:night?5:evening?4:wet?3:2):
   b.typeId===ns+'sorter'?(wet||night?4:evening?3:2):2;
 if(cycle>2&&Math.floor(system.currentTick/27)%cycle>=2)return;
 let power='',limit=1;
 if(['mill','miner','kiln','crusher','washer','press','saw'].some(id=>b.typeId===ns+id)){
   const l={x:x+.5,y:y+1.01,z:z+.5};
   kinetic=kinetic??kineticNetwork(d,{x,y,z});
   if(kinetic.status!=='running'&&kinetic.status!=='no_source')return;
   let wind=kinetic.status==='running';
   // Preserve the original independent high-altitude mill wind fallback.
   try{wind=wind||d.id.startsWith(ns)&&y>=84&&b.typeId===ns+'mill'&&!d.getBlockFromRay(l,{x:0,y:1,z:0},{maxDistance:22});}catch{}
   if(!wind){
     for(let i=0;i<from.size;i++){
       const f=from.getItem(i)?.typeId;
       const n=({'minecraft:coal':4,'minecraft:charcoal':4,[ns+'shard_0']:3,[ns+'crystal_0']:8,[ns+'crystal_4']:6,[ns+'crystal_1']:5,[ns+'crystal_2']:8})[f]??(f?.endsWith('_planks')||f?.endsWith('_log')?2:0);
       if(n>limit){limit=n;power=f;}
     }
     if(!power)return;
   }else if(thunder)limit=3;
   if(b.typeId===ns+'mill'&&wet&&!thunder&&limit>1)limit--;
   if(b.typeId===ns+'mill'&&thunder&&power)limit++;
   if(night&&limit>1)limit=Math.max(1,Math.floor(limit/2));
 }
 if(['mixer','assembler','filter_router','fluid_basin','fluid_loader'].includes(kind)){
   kinetic=kinetic??kineticNetwork(d,{x,y,z});
   if(kinetic.status!=='running')return;
 }
 if(b.typeId===ns+'compressor'||b.typeId===ns+'sorter'){
   kinetic=kineticNetwork(d,{x,y,z});
   if(kinetic.status!=='running'&&kinetic.status!=='no_source')return;
 }
 const cycleKey=`${d.id}:${x},${y},${z}`;
 const delay=kinetic?.status==='running'?Math.max(10,Math.ceil(40*16/Math.abs(kinetic.rpm))):40;
 if(system.currentTick-(factoryCycleAt.get(cycleKey)??-Infinity)<delay)return;
 const schedule=()=>{if(factoryCycleAt.size>=8192)factoryCycleAt.clear();factoryCycleAt.set(cycleKey,system.currentTick);};
 const worked=n=>{schedule();production(b,n);};
 if(kind==='fluid_loader'){
   if(fluidLoaderStep({dimension:d,p:{x,y,z},input:from,output:to,ItemStack,factoryTransaction,report}))worked(1);
   return;
 }
 if(kind==='fluid_basin'){
   if(fluidBasinStep({dimension:d,p:{x,y,z},input:from,output:to,ItemStack,factoryTransaction,report}))worked(1);
   return;
 }
 if(kind==='filter_router'){
   let north,south;try{north=d.getBlock({x,y,z:z-1});south=d.getBlock({x,y,z:z+1});}catch{return;}
   if(north?.typeId!=='minecraft:barrel'||south?.typeId!=='minecraft:barrel')return;
   const filter=north.getComponent('minecraft:inventory')?.container,reject=south.getComponent('minecraft:inventory')?.container;
   const route=filteredDestination(from,filter,to,reject);if(!route)return;
   // The selected item is the first input stack, preserving its metadata.
   if(factoryTransaction({input:from,output:route.output,costs:[{id:route.id,count:1}],product:route.product,report}))schedule();
   return;
 }
 if(kind==='mixer'||kind==='assembler'){
   const recipe=findLineRecipe(kind,from,total);if(!recipe)return;
   if(factoryTransaction({input:from,output:to,costs:recipe.costs,product:new ItemStack(recipe.output,recipe.amount),report}))worked(recipe.amount);
   return;
 }
 if(b.typeId===ns+'miner'){
   if(night&&Math.floor(system.currentTick/30)%2||wet&&Math.floor(system.currentTick/30)%(thunder?3:4)===0)return;
   for(let step=1;step<=6;step++){
     const l={x,y:y-step,z};if(!d.isChunkLoaded(l))return;
     const stone=d.getBlock(l), id=stone?.typeId;
     if(!stone)return;
     if(id==='minecraft:air'||/^minecraft:(stone|deepslate|tuff|granite|andesite|diorite|netherrack)$/.test(id))continue;
     const special=id.match(/^hakkai:ore_(\d+)$/), normal=id.match(/^minecraft:(?:deepslate_)?(iron|copper|gold)_ore$/);
     const result=special?ns+`crystal_${special[1]}`:normal?`minecraft:raw_${normal[1]}`:undefined;
     if(!result)return;
     const output=new ItemStack(result,1);
     if(!room(to,output)||power&&total(from,power)<1)return;
     const old=stone.permutation;
     if(factoryTransaction({input:from,output:to,costs:power?[{id:power,count:1}]:[],product:output,
       commitExternal:()=>stone.setType('minecraft:air'),rollbackExternal:()=>stone.setPermutation(old),report}))worked(2);
     return;
   }
   return;
 }
 for(let i=0;i<from.size;i++){
   const item=from.getItem(i);if(!item)continue;
   let out,need=1,aux='',outputCount=1;
   const recipe=factoryRecipe(kind,item.typeId);
   let waterTank;
   if(recipe){[out,need,outputCount]=recipe;if(kind==='washer'&&!hasAdjacentWater(d,{x,y,z})){waterTank=adjacentWaterTank(d,{x,y,z});if(!waterTank)return;}}

   if(b.typeId===ns+'mill')out=mill[item.typeId];
   if(b.typeId===ns+'kiln')out=kiln[item.typeId];
   if(b.typeId===ns+'sorter'&&(item.typeId.startsWith(ns+'shard_')||item.typeId.startsWith(ns+'crystal_')))out=item.typeId;
   if(b.typeId===ns+'compressor'&&item.typeId.startsWith(ns+'shard_')){
     out=item.typeId.replace('shard_','crystal_');need=2;aux='minecraft:amethyst_shard';
   }
   if(!out||total(from,item.typeId)<need||aux&&total(from,aux)<1)continue;
   if(b.typeId===ns+'mill'||b.typeId===ns+'kiln'){
     let n=Math.min(limit,total(from,item.typeId));
     while(n>0&&!room(to,new ItemStack(out,n)))n--;
     if(!n)return;
     const costs=[{id:item.typeId,count:n}];if(power)costs.push({id:power,count:1});
     if(factoryTransaction({input:from,output:to,costs,product:new ItemStack(out,n),report}))worked(n);
     return;
   }
   const product=new ItemStack(out,outputCount);if(!room(to,product))return;
   const costs=[{id:item.typeId,count:need}];if(aux)costs.push({id:aux,count:1});if(power)costs.push({id:power,count:1});
   const waterBefore=waterTank?.permutation;
   if(factoryTransaction({input:from,output:to,costs,product,report,
    commitExternal:waterTank?()=>consumeTankWater(waterTank,1):undefined,
    rollbackExternal:waterTank?()=>waterTank.setPermutation(waterBefore):undefined}))worked(outputCount);return;
 }
}
function jobHomeForBlock(block){
 const d=block.dimension,at=block.location,m=/^hakkai:realm_([0-7])$/.exec(d.id);if(!m)return;
 const realm=Number(m[1]),repeat=seededWorlds?.repeatSiteAt(realm,at.x,at.z);
 if(repeat?.id===59)return villageIdentity(repeat);
 const site=places.find(s=>s.dim===realm&&(s.id===59||s.kind==='culture')&&villageBuilt(s,world,num)&&inSite(s,at.x,at.z));
 return site?villageIdentity(site):undefined;
}
safeSub('system','before','startup',({itemComponentRegistry,blockComponentRegistry})=>{
 safeReg(itemComponentRegistry,ns+'use',{onUse:use,onUseOn:use,onCompleteUse:completeFocus});
 safeReg(blockComponentRegistry,ns+'bearing',{
  onTick:({block})=>bearingAutoTick(block,{kineticNetwork,resolve:id=>BlockPermutation.resolve(id),report,cycleAt:factoryCycleAt,tick:system.currentTick}),
  onPlayerInteract:({player,block})=>{if(player?.isValid&&![GameMode.Spectator,GameMode.Adventure].includes(player.getGameMode()))menu(player,p=>bearingMenu(p,block));}
 });
 safeReg(blockComponentRegistry,ns+'gantry',{
  onTick:({block})=>gantryAutoTick(block,{kineticNetwork,ItemStack,factoryTransaction,report,cycleAt:factoryCycleAt,tick:system.currentTick}),
  onPlayerInteract:({player,block})=>{if(player?.isValid&&isGantry(block.typeId)&&![GameMode.Spectator,GameMode.Adventure].includes(player.getGameMode()))menu(player,p=>gantryMenu(p,block));}
 });
 safeReg(blockComponentRegistry,ns+'factory',{onTick:({block})=>transfer(block),onPlayerInteract:({player,block})=>{try{if(!player?.isSneaking)return;if(block.typeId===ns+'fluid_tank'){const s=tankState(block);player.sendMessage(!s?'§e液体タンクの状態を確認できません':`§b液体タンク ${['空','水','溶岩'][s.kind]} ${s.n}/8（1目盛り＝バケツ1/4）`);return;}if(block.typeId===ns+'clutch'){const on=toggleClutch(block);if(on!==undefined)notice(player,on?'§a動力クラッチ：接続':'§e動力クラッチ：切断');return;}factoryMeter(player,block);}catch{}}});
 safeReg(blockComponentRegistry,ns+'workstation',{
  onTick:({block})=>workstationTick(block,world,jobHomeForBlock),
  onPlayerInteract:({block,player})=>{
   if(!player||player.getGameMode()===GameMode.Spectator)return;
   if(player.isSneaking){const released=releaseWorkstation(block.dimension,block.location,world,releaseBuilderWork);notice(player,released?'§e職場の登録を解除しました。再び村人が就職できます。':'§eまだ登録された村人はいません。');}
   else notice(player,'§a近くの大人の村人が追加役割に就きます。通常の交易は維持されます。しゃがんで使用すると登録解除。建築係は八界の村の中で建築します。',120);
  }
 });
 safeReg(blockComponentRegistry,ns+'town',{onTick:({block})=>townTick(block),onPlayerInteract:({player,block})=>{
   if(player&&player.getGameMode()!==GameMode.Spectator)menu(player,p=>townMenu(p,townGet(block.dimension,block.location,true)));
 }});
 safeReg(blockComponentRegistry,ns+'season_plot',{onTick:({block})=>seasonPlot(block)});
 safeReg(blockComponentRegistry,ns+'field_crop',{
   onRandomTick:({block})=>{growGarden(block);},
   onPlayerInteract:({block,player:p})=>{
     if(!p?.isValid||p.getGameMode()===GameMode.Spectator||p.getGameMode()===GameMode.Adventure)return;
     const plant=gardenById.get(block.typeId), held=selected(p), n=block.permutation.getState(gardenAge);
     if(!plant||typeof n!=='number')return;
     if(held?.typeId==='minecraft:bone_meal'){
       if(n<3&&growGarden(block,true)&&!isCreative(p))debit(space(p),'minecraft:bone_meal',1);
       return;
     }
     if(n!==3||held&&!held.typeId.endsWith('_hoe'))return;
     if(give(p,ns+`${plant.id}_produce`,2)){
       block.setPermutation(block.permutation.withState(gardenAge,0));notice(p,`§a${plant.harvest}を収穫した`);
     }else notice(p,'§e持ち物に空きを作ってね');
   }
 });
 safeReg(blockComponentRegistry,ns+'canopy',{onRandomTick:({block})=>{
   const id=ns+`canopy_${seasons.indexOf(era())}`;
   if(block.typeId!==id)block.setType(id);
 }});

 safeReg(blockComponentRegistry,ns+'souvenir_display',{onPlayerInteract:({block,player})=>{
   if(player?.isValid&&player.getGameMode()!==GameMode.Spectator){
     const at={x:block.location.x+.5,y:block.location.y+1,z:block.location.z+.5,dimension:block.dimension.id};
     menu(player,p=>realmShowcaseMenu(p,at));
   }
 }});
 safeReg(blockComponentRegistry,ns+'gallery_monument',{onPlayerInteract:({block,player})=>{
   if(player?.isValid&&player.getGameMode()!==GameMode.Spectator){const at={...block.location};menu(player,p=>realmGalleryMonumentMenu(p,at));}
 }});
 safeReg(blockComponentRegistry,ns+'physical_relic',{onPlayerInteract:({block,player})=>{
   if(player?.isValid&&player.getGameMode()!==GameMode.Spectator){
     const at={...block.location},type=block.typeId;
     menu(player,p=>usePhysicalRelic(p,at,type));
   }
 }});
 safeReg(blockComponentRegistry,ns+'snare',{onStepOn:({entity})=>{
   if(entity?.isValid&&entity.getComponent('minecraft:type_family')?.hasTypeFamily('monster')&&permit(entity,110,'snare')){
     entity.addEffect('slowness',64,{amplifier:2,showParticles:false});
   }
 }});
 safeReg(blockComponentRegistry,ns+'read',{onPlayerInteract:({player,block})=>{
   if(!player)return;
   const site=currentPlace(player),o=site&&origin(site);
   if(!site)return;
   const expected=site.kind==='atlas'?{x:site.x+5,y:expandedY,z:site.z+5}:site.size?{x:site.x+2,y:expandedY,z:site.z+11}:{x:o.x+29,y:o.y+17,z:o.z+23};
   if(block.x!==expected.x||block.z!==expected.z||block.y!==expected.y)return;
   const first=!marked(player,'stories',site.id);
   mark(player,'stories',site.id);
   if(first&&site.id>0&&site.kind!=='atlas'&&site.kind!=='linked'&&give(player,ns+`shard_${home[aspect(site)][0]}`))notice(player,'§a風の記録と、欠片を見つけた');
   menu(player,async p=>{
     if(site.kind==='culture'){
       const ix=await form(p,site.name,tale(site),[['村の暮らしと掲示板'],['閉じる']]);
       if(ix===0&&p.isValid&&currentPlace(p)?.id===site.id)return villageLifeMenu(p,cultureTownForSite(p.dimension,site));
       return;
     }
     if(site.id===10&&!num(p,'library_tome')){
       const i=await form(p,site.name,`${tale(site)}\n\n書架の奥に、八属性の魔導書が残されています。`,[['魔導書を受け取る'],['閉じる']]);
       if(i===0&&p.isValid&&currentPlace(p)?.id===site.id&&!num(p,'library_tome')){
         if(give(p,ns+'element_tome')){property(p,'library_tome',1);notice(p,'§a図書館の魔導書を受け取った');}
         else notice(p,'§e持ち物に空きを作ってね');
       }
       return;
     }
     if(site.kind==='trail'){
       const realm=places[aspect(site)+1];
       const choice=await form(p,site.name,tale(site),[[`対応する界：${realm.name}`],['閉じる']]);
       if(choice===0&&currentPlace(p)?.id===site.id){
         if(!unlocked(p,realm))return notice(p,'§e本界は一つ前の本界を訪れて解放します');
         return arrive(p,realm);
       }
       return;
     }
     if(site.id>=1&&site.id<=8){
       const path=trails[aspect(site)];
       const choice=await form(p,site.name,tale(site),[[`対応する街道：${path.name}`],['閉じる']]);
       if(choice===0&&currentPlace(p)?.id===site.id)return arrive(p,path);
       return;
     }
     return simple(p,site.name,tale(site));
   });
 }});
});

const vanillaDrops={'zombie':0,'skeleton':10,'creeper':2,'enderman':6,'witch':1,'blaze':2,'ghast':15,'piglin':3,
 'drowned':14,'stray':11,'husk':12,'slime':13,'spider':16,'magma_cube':4,'phantom':8,'pillager':17,'ravager':19};
function villagerNear(p,range=17){return p.dimension.getEntities({families:['villager'],location:p.location,maxDistance:range,closest:1})[0];}
const tempCooldown=new Map();
function permit(e,delay,scope='behavior'){
 const t=system.currentTick,key=`${scope}:${e.id}`;
 if((tempCooldown.get(key)??-1)>t)return false;
 if(tempCooldown.size>=512)return false;
 tempCooldown.set(key,t+delay);return true;
}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function along(e,dx,dz,strength=.21,vertical=.02){
 const r=Math.hypot(dx,dz);
 if(r<.001||!e.isOnGround||!e.isValid||e.getVelocity().y>.12)return false;
 dx/=r;dz/=r;
 const l=e.location, d=e.dimension;
 for(const n of [.6,1.2]){
   const f={x:l.x+dx*n,y:l.y,z:l.z+dz*n};
   if(!d.isChunkLoaded(f)||!safe(d,f))return false;
 }
 e.applyImpulse({x:dx*strength,y:vertical,z:dz*strength});return true;
}
function villagerGuardTick(p,t){
 for(const guard of p.dimension.getEntities({families:['villager'],location:p.location,maxDistance:32,closest:24})){
  if(villagerJob(guard,world)!=='guard'||!permit(guard,40,'villager_guard'))continue;
  try{
   const target=p.dimension.getEntities({families:['monster'],location:guard.location,maxDistance:4,closest:12}).find(e=>e.isValid&&e.typeId!=='minecraft:creeper'&&(VANILLA_HOSTILES.has(e.typeId)||wildlifeById.get(e.typeId)?.temper==='hostile')&&visibleFrom(guard,e.location));
   if(target)target.applyDamage(3,{cause:EntityDamageCause.entityAttack,damagingEntity:guard});
  }catch{}
 }
}
function builderWorkTick(p,t){
 const workers=[...p.dimension.getEntities({families:['hakkai_builder'],location:p.location,maxDistance:32,closest:4}),...p.dimension.getEntities({families:['villager'],location:p.location,maxDistance:32,closest:32}).filter(e=>villagerJob(e,world)==='builder')];
 for(const worker of workers){
   if(!worker.isValid||!permit(worker,40,'builder_work')||builderPaused(worker))continue;
   let job=readBuilderProject(worker);
   if(job===undefined){
     const home=builderHome(worker),site=villageSiteByHome(home);
     if(site&&villageBuilt(site,world,num)&&num(world,`builder_stage_${home}_v1`)>0&&num(world,`builder_repair_enabled_${home}_v2`)){
       const i=(Number(worker.getDynamicProperty(ns+'repair_cursor_v1'))||0)%BLUEPRINTS.length,plot=readVillagePlot(site,i);
       if(plot){
         const delta=dist(worker.location,plot.at);
         if(delta>14){
           if(!p.dimension.getEntities({families:['monster'],location:worker.location,maxDistance:9,closest:1}).length)try{along(worker,plot.at.x-worker.location.x,plot.at.z-worker.location.z,.13);}catch{}
           continue;
         }
         const result=repairPlotStep(worker,plot,site,{blueprint,resolve:(id,states)=>BlockPermutation.resolve(id,states),report});
         if(result==='repaired'||result==='occupied')continue;
       }
       worker.setDynamicProperty(ns+'repair_cursor_v1',(i+1)%BLUEPRINTS.length);
     }
     if(!claimBuilderWork(worker,world))continue;
     autoBuilderPlan(worker,{sites:site?.repeatKey?[...places,site]:places,world,num,property});job=readBuilderProject(worker);
     if(!job)releaseBuilderWork(worker,world);
   }
   if(!job||!claimBuilderWork(worker,world))continue;
   const finish=(e,j)=>{
     const home=builderHome(e),site=villageSiteByHome(home);
     if(!site||j.homeId!==home||!Number.isInteger(j.stage)||BLUEPRINTS[j.stage]?.id!==j.kind)return;
     const stageKey=`builder_stage_${home}_v1`,current=num(world,stageKey);
     // Record only verified completed plots. Older unrecorded plots are never guessed.
     property(world,`builder_plot_${home}_${j.stage}_v1`,JSON.stringify({at:j.at,kind:j.kind,stage:j.stage}));
     if(current<=j.stage)property(world,stageKey,j.stage+1);
     const town=site.kind==='culture'?cultureTownForSite(e.dimension,site):townNear(e.dimension,j.at);
     if(town&&(town.lifeSiteId||['minecraft:bell',ns+'town_bell'].includes(town.d.getBlock(town.l)?.typeId))){
       const next=constructionCredit(townRecord(town),j.kind);if(next)saveVillageLife(town,addVillageMemory(next,seasonDay(),`建築係が${BLUEPRINTS[j.stage].name}を完成（備蓄+8）`));
     }
     if(current<=j.stage)for(const player of e.dimension.getPlayers({location:j.at,maxDistance:24,closest:8}))player.sendMessage(`§a建築係が${BLUEPRINTS[j.stage].name}を完成させました。`);
     clearBuilderProject(e);releaseBuilderWork(e,world);
   };
   if(job.done){finish(worker,job);continue;}
   const dx=worker.location.x-(job.at.x+.5),dz=worker.location.z-(job.at.z+.5);
   // Approach a point outside the worksite; do not override monster avoidance.
   if(!p.dimension.getEntities({families:['monster'],location:worker.location,maxDistance:9,closest:1}).length){
     const gx=Math.abs(dx)>=Math.abs(dz)?(dx>=0?5.5:-5.5):0,gz=Math.abs(dx)<Math.abs(dz)?(dz>=0?5.5:-5.5):0;
     if(Math.hypot(dx-gx,dz-gz)>.5)try{along(worker,gx-dx,gz-dz,.13);}catch{}
   }
   for(let n=0;n<3;n++){
     const result=stepBuilderProject(worker,{resolve:(id,states)=>BlockPermutation.resolve(id,states),report,completed:finish});
     if(result!=='placed'&&result!=='recovered')break;
   }
 }
}
function visibleFrom(e,l){
 const h=e.getHeadLocation(),v={x:l.x-h.x,y:l.y-h.y,z:l.z-h.z},len=Math.hypot(v.x,v.y,v.z);
 return len<.4||!e.dimension.getBlockFromRay(h,{x:v.x/len,y:v.y/len,z:v.z/len},{maxDistance:len-.25});
}
// Rare neutral encounters use their own local caps and never alter terrain.
function spawnRealmEnder(p,realm,t){
 return spawnRareEncounter(p,ns+`ender_${realm}`,t,safe,{family:'hakkai_realm_ender'});
}
function spawnFushi(p,t,chief){
 return spawnRareEncounter(p,ns+(chief?'fushi_chief':'fushi'),t,safe,{chief});
}
// Restrict hostile spawns to terrain-like floors; this is not a claim-detection system.
const wildlifeNaturalFloors=new Set(['grass_block','dirt','coarse_dirt','rooted_dirt','podzol','mycelium','moss_block','mud','sand','red_sand','sandstone','gravel','clay','stone','deepslate','tuff','andesite','calcite','snow_block','ice','packed_ice','blue_ice','terracotta','quartz_block'].map(id=>'minecraft:'+id));
for(const id of ['wind_soil','mist_loam','sun_silt','rime_soil','storm_grit','deep_loam','cloud_loam','epoch_soil','red_dune_stone','mirror_ice','thunderstone','copper_slate','glow_moss','moonstone','cloudstone','clockstone','brasswork'])wildlifeNaturalFloors.add('hakkai:'+id);
function hostileSpawnContext(){return {factory:travelSites.get(FACTORY_VILLAGE_ID),world,num,repeatSiteAt:(r,x,z)=>seededWorlds?.repeatSiteAt(r,x,z)};}
function wildlifeTick(p,b,site){
 const s=state(p), t=system.currentTick, d=p.dimension;
 if(num(p,'quiet_wildlife')||s.busy||t<(s.wildAt??0))return;
 if(!(world.gameRules.doMobSpawning))return;
 s.wildAt=t+80+Math.floor(Math.random()*40);
 const realmId=d.id.startsWith(ns+'realm_')?Number(d.id.slice((ns+'realm_').length)):-1;
 const seededBiome=realmId>=0&&realmId<8?seededWorlds?.biomeAt(realmId,p.location):undefined;
 const inRealm=Number.isInteger(realmId)&&realmId>=0&&realmId<8;
 const procedural=Boolean(seededBiome&&b?.id===seededBiome.id);
 const place=site?.id>0&&site.kind!=='era';
 // In the eight void dimensions the reserved areas and unrecognised biomes
 // still need a local wildlife pool. Keep vanilla-world rules unchanged.
 if(!inRealm&&!place&&!procedural&&(!b||b.profile.mode==='water'||b.key==='end'&&Math.hypot(p.location.x,p.location.z)<160))return;
 // 近距離の密度を制限しつつ、遠くの個体が新規出現を永久に塞がないようにする。
 const around=d.getEntities({families:['hakkai_wildlife'],location:p.location,maxDistance:32,closest:16});
 const night=world.getTimeOfDay()>=13000;
 if(realmId===7){
  const grove=seededWorlds?.isGenerated(7,p.location)&&seededWorlds?.isMoonGrove(p.location);
  const roll=Math.random(),chances=fushiThresholds(grove,isMoonlitNight(world));
  if(roll<chances.chief&&spawnFushi(p,t,true))return;
  if(roll<chances.normal&&spawnFushi(p,t,false))return;
 }
 if(realmId>=0&&realmId<8&&Math.random()<(night?.18:.09)&&spawnRealmEnder(p,realmId,t))return;
 if(around.length>=14)return;
 if(site?.kind==='atlas'&&families[site.family].mode==='water')return;
 let m;
 if(site?.kind==='atlas')m=wildlifeById.get(ns+families[site.family].species);
 else if(place){
   m=pickRealmWildlife(wildlife,aspect(site),entry=>marked(p,'sight',wildlifeIndex.get(entry.id))||marked(p,'wild_spawn_seen',wildlifeIndex.get(entry.id)),world.getDifficulty()===Difficulty.Peaceful);
 }else if(procedural){
   // 地形帯ごとの出現を主に保ちつつ、希少な地形帯の生物にも出会える。
   if(Math.random()<.4)m=pickRealmWildlife(wildlife,realmId,entry=>marked(p,'sight',wildlifeIndex.get(entry.id))||marked(p,'wild_spawn_seen',wildlifeIndex.get(entry.id)),world.getDifficulty()===Difficulty.Peaceful);
   const encounterChance=Math.min(.58,(b.profile.rareChance??.24)+(night?.09:0)+(p.location.y>110?.08:0));
   const rare=b.profile.rareSpecies&&Math.random()<encounterChance;
   m??=wildlifeById.get(ns+(rare?b.profile.rareSpecies:b.profile.species));
 }else if(inRealm){
   m=pickRealmWildlife(wildlife,realmId,entry=>marked(p,'sight',wildlifeIndex.get(entry.id))||marked(p,'wild_spawn_seen',wildlifeIndex.get(entry.id)),world.getDifficulty()===Difficulty.Peaceful);
 }else m=wildlifeById.get(ns+b.profile.species);
 const peaceful=world.getDifficulty()===Difficulty.Peaceful;
 if(inRealm&&(!m||m.temper==='hostile'&&peaceful||around.some(e=>e.typeId===ns+m.id&&dist(e.location,p.location)<10))){
   const available=wildlife.filter(entry=>!around.some(e=>e.typeId===ns+entry.id&&dist(e.location,p.location)<10));
   m=pickRealmWildlife(available,realmId,entry=>marked(p,'sight',wildlifeIndex.get(entry.id))||marked(p,'wild_spawn_seen',wildlifeIndex.get(entry.id)),peaceful);
 }
 // Near protected arrival centres a hostile draw cannot spawn at most candidate
 // sites. Prefer an available peaceful species instead of repeatedly failing.
 if(inRealm&&m?.temper==='hostile'&&places.slice(0,9).some(s=>s.dim===realmId&&Math.hypot(p.location.x-s.x,p.location.z-s.z)<20)){
   const available=wildlife.filter(entry=>!around.some(e=>e.typeId===ns+entry.id&&dist(e.location,p.location)<10));
   m=pickRealmWildlife(available,realmId,entry=>marked(p,'sight',wildlifeIndex.get(entry.id))||marked(p,'wild_spawn_seen',wildlifeIndex.get(entry.id)),true);
 }
 if(!m||m.temper==='hostile'&&peaceful)return;
 if(around.some(e=>e.typeId===ns+m.id&&dist(e.location,p.location)<10))return;
 const spawned=spawnWildlife({
  player:p,type:ns+m.id,tick:t,safe,allowNearbyBiome:inRealm,
  avoid:pos=>{
   if(m.temper!=='hostile')return false;
   if(disallowHostileSpawn(d,pos,hostileSpawnContext()))return true;
   // Keep the central arrival areas clear even when the player stands outside.
   if(inRealm&&places.slice(0,9).some(s=>s.dim===realmId&&Math.hypot(pos.x-s.x,pos.z-s.z)<16))return true;
   if(site&&dist(pos,coords(site))<9)return true;
   if(inRealm){const floor=d.getBlock({x:Math.floor(pos.x),y:Math.floor(pos.y)-1,z:Math.floor(pos.z)});return !floor||!wildlifeNaturalFloors.has(floor.typeId);}
   return false;
  },
  preferred:pos=>{
   if(procedural)return seededWorlds?.biomeAt(realmId,pos)?.id===b.id;
   if(inRealm||place)return true;
   return d.getBiome(pos).id.replace(/^minecraft:/,'')===b.id;
  }
 });
 if(spawned){
  // Recording a spawn is separate from observing an entity in the guide.
  mark(p,'wild_spawn_seen',wildlifeIndex.get(m.id));
 }else s.wildAt=t+80; // retry at the next bounded nature scan

}
safeSub('world','after','entityHurt',({hurtEntity:e,damageSource:source,damage})=>{
 if(source.cause===EntityDamageCause.entityAttack&&source.damagingEntity?.typeId==='minecraft:player')try{
   const p=source.damagingEntity;
   if(p.getGameMode()!==GameMode.Spectator){
    const g=gear.get(selected(p)?.typeId);combatResonance?.onHurt(p,e,g,damage);
    weaponTrace?.record(p,e,damage);
    if(!weaponTrace?.enabled()||!isTraceWeapon(g))airStrike?.onHurt(p,e,state(p),g,damage,system.currentTick);
   }
 }catch(err){report('風紋連撃',err);}
 mobSystem?.onHurt({hurtEntity:e,damageSource:source});
 realmEnders?.onHurt({hurtEntity:e,damageSource:source});
 fushiSystem?.onHurt({hurtEntity:e,damageSource:source});
 const by=source.damagingEntity;
 if(e.isValid&&e.typeId==='minecraft:player'&&by?.isValid&&by.typeId!=='minecraft:player'&&
     [EntityDamageCause.entityAttack,EntityDamageCause.projectile].includes(source.cause)&&permit(e,24,'armor')){
   const wearer=/** @type {import('@minecraft/server').Player} */ (e);
   if(wearer.getGameMode()===GameMode.Survival)for(const item of armorItems(wearer))growAffinity(wearer,item,30,'防具');
 }

});
// Suppress newly naturally spawned vanilla hostiles, never loaded entities.
safeSub('world','after','entitySpawn',e=>suppressVanillaSpawn(e,hostileSpawnContext()));
safeSub('world','after','playerBreakBlock',({block,brokenBlockPermutation})=>{if(brokenBlockPermutation.type.id.startsWith(ns+'workstation_'))releaseWorkstation(block.dimension,block.location,world,releaseBuilderWork);});
safeSub('world','after','entityDie',({deadEntity})=>{releaseBuilderWork(deadEntity,world);releaseDeadWorker(deadEntity,world);});
safeSub('world','after','entityDie',({deadEntity,damageSource})=>{
 const killer=/** @type {import('@minecraft/server').Player | undefined} */ (damageSource.damagingEntity);
 if(killer?.typeId!=='minecraft:player'||!killer.isValid)return;
 const t=deadEntity.typeId;
 if(t.startsWith(ns+'guardian_')){
   const d=Number(t.split('_').at(-1));
   const first=(num(killer,'guards')&(1<<d))===0;
   if(first){
    killer.sendMessage(`§6初討伐：${guardians[d]}。守護核を獲得しました。ガイド本の「八界の守護核・収集年鑑」で記録を確認できます。`);
    const core=ns+`guardian_core_${d}`;
    if(!give(killer,core,1)){try{deadEntity.dimension.spawnItem(new ItemStack(core,1),deadEntity.location);}catch{}}
    property(killer,'guardian_core_claims',num(killer,'guardian_core_claims')|(1<<d));
    try{killer.dimension.spawnParticle(`hakkai:climate_${d}`,{x:killer.location.x,y:killer.location.y+1,z:killer.location.z});killer.playSound('random.levelup',{volume:.8,pitch:1.05+d*.03});}catch{}
   }
   property(killer,'guards',num(killer,'guards')|(1<<d));return;
 }
 const a=vanillaDrops[t.replace('minecraft:','')];
 if(a!==undefined&&Math.random()<.25)deadEntity.dimension.spawnItem(new ItemStack(ns+`shard_${a}`),deadEntity.location);
 if(a!==undefined&&villagerNear(killer)){
   property(killer,'trust',Math.min(30,num(killer,'trust')+1));
   const town=townNear(killer.dimension,killer.location), now=world.getAbsoluteTime();
   if(town&&townScore(town)>=2&&now>=num(killer,'last_defense_gift',-5000)+1200&&give(killer,ns+'shard_0')){
     property(killer,'last_defense_gift',now);notice(killer,'§a村人がお礼に風の欠片をくれた');
   }
 }
});
safeSub('world','after','entityDie',e=>{combatParry?.clearAttacker(e.deadEntity.id);try{realmEnders?.onDeath(e);fushiSystem?.onDeath(e);wardenBoss?.onDeath(e);mobSystem?.onDeath(e);}catch(err){report('追加MOBの討伐記録',err);}});
// Optional events clear a stored wind mark promptly; the identity/expiry
// check in the controller still protects older API versions.
try{world.afterEvents.playerHotbarSelectedSlotChange?.subscribe(({player})=>{combatResonance?.clear(player.id);combatGuard?.invalidate(player.id);combatParry?.clear(player.id);combatCharge?.clear(player.id);weaponTrace?.clear(player.id);});}catch{}
try{world.afterEvents.playerDimensionChange?.subscribe(({player})=>{combatResonance?.clear(player.id);combatGuard?.invalidate(player.id);combatRoll?.clear(player.id);combatParry?.clear(player.id);airDash?.clear(player.id);airStrike?.clear(player.id);combatUltimate?.invalidate(player.id);combatCharge?.clear(player.id);weaponTrace?.clear(player.id);bowTrail?.clear(player.id);});}catch{}
safeSub('world','after','entityDie',({deadEntity})=>{if(deadEntity?.typeId==='minecraft:player'){customShield.clear(deadEntity.id);wardenBoss?.clearMusic(deadEntity.id);combatResonance?.clear(deadEntity.id);combatGuard?.clear(deadEntity.id);combatRoll?.clear(deadEntity.id);combatParry?.clear(deadEntity.id);airDash?.clear(deadEntity.id);airStrike?.clear(deadEntity.id);combatUltimate?.clear(deadEntity.id);combatCharge?.clear(deadEntity.id);weaponTrace?.clear(deadEntity.id);bowTrail?.clear(deadEntity.id);}});
safeSub('world','before','playerInteractWithEntity',e=>{
 const p=e.player;
 if(['minecraft:villager','minecraft:villager_v2'].includes(e.target.typeId)&&typeof e.target.nameTag==='string'&&e.target.nameTag.startsWith('§d風記の案内人§r｜')){
   e.cancel=true;
   const match=e.target.nameTag.match(/§d風記の案内人§r｜(\d+)｜/);
   const index=match?Number(match[1]):-1;
   if(index>=0&&index<8)menu(p,async()=>realmNpcConversation(p,index));
   return;
 }
 if(BUILDER_IDS.includes(e.target.typeId)||(p.isSneaking&&villagerJob(e.target,world)==='builder')){
   e.cancel=true;const worker=e.target;
   menu(p,async()=>{
     const near=()=>p.isValid&&worker.isValid&&p.dimension.id===worker.dimension.id&&dist(p.location,worker.location)<6&&[GameMode.Survival,GameMode.Creative].includes(p.getGameMode());
     if(!near())return;
     const job=readBuilderProject(worker),paused=builderPaused(worker),home=builderHome(worker);
     const status=job?`${BLUEPRINTS.find(b=>b.id===job.kind)?.name}：${job.i}/${blueprint(job.kind).length} ${job.done?'完成':'建築中・障害があれば待機'}\n中心 X ${job.at.x} Y ${job.at.y} Z ${job.at.z}`:job===null?'保存された作業を読み取れません。':home===undefined?'この建築係は村に所属していないため、自動建築しません。':num(world,`builder_stage_${home}_v1`)>=BLUEPRINTS.length?'この村の5種類の建築計画は完了しました。':'安全な空き地を探しています。';
     const ix=await form(p,'建築係｜村づくり',`${status}\n自動建築：${paused?'停止中':'有効'}\n\n建築係は村の空き地に小さな家・加工場・農場・交流施設・祭り会場を各1つ目指します。既存ブロックは壊さず、範囲に人や生物がいる間は待機。建築資材は消費しない試作です。停止・中止しても設置済みブロックは残ります。`,[[paused?'自動建築を再開':'自動建築を停止'],['停止して現在の作業記録を消す'],['閉じる']]);
     if(!near())return;
     if(ix===0){setBuilderPaused(worker,!paused);notice(p,paused?'§a建築係を再開しました':'§e建築係を停止しました');}
     if(ix===1){setBuilderPaused(worker,true);clearBuilderProject(worker);releaseBuilderWork(worker,world);notice(p,'§e作業を中止しました。設置済みブロックは残ります');}
   });
   return;
 }
 const resident=friendlyResidentById.get(e.target.typeId);
 if(resident){
   e.cancel=true;const target=e.target;
   menu(p,async()=>{
     const near=()=>p.isValid&&target.isValid&&p.dimension.id===target.dimension.id&&dist(p.location,target.location)<6&&[GameMode.Survival,GameMode.Adventure,GameMode.Creative].includes(p.getGameMode());
     if(!near())return;
     const village=lifeTownForPlayer(p),season=seasonAt(seasonDay());
     const mood=village?`\n今は${season.name}。ここは${villageTier(townRecord(village),lifeBuildings(village)).name}。${festivalAt(season.day,lifeRealm(village)).open?'今日は祭りの日です。':'みんなで暮らしを支えています。'}`:'';
     const body=`${resident.lore}\n\n${resident.description}${mood}\n\nこの住人はバニラ村人ではなく、繁殖・通常交易・就職はしません。`;
     const ix=await form(p,resident.name,`${body}${resident.role==='artisan'?`\n\nエメラルド1個 → ${resident.itemName} ${resident.count}個`:''}`, [...(resident.role==='artisan'?[['交換する'],['運搬中の品を受け取る']]:[]),...(village?[['村の暮らしと掲示板']]:[]),['閉じる']]);
     if(!near())return;
     if(resident.role==='artisan'&&ix===1){if(retrieveCargo(target,space(p),report))notice(p,'§a運搬中の品を受け取りました');else notice(p,'§e運搬中の品がないか持ち物がいっぱいです');return;}
     if(village&&ix===(resident.role==='artisan'?2:0))return villageLifeMenu(p,village);
     if(resident.role!=='artisan'||ix!==0)return;
     if(friendlyTrade(space(p),new ItemStack(resident.item,resident.count),report))notice(p,`§a${resident.itemName}を受け取りました`);
     else notice(p,'§eエメラルド・空き容量を確認してください。処理失敗時は持ち物も確認してください');
   });
   return;
 }
 if(p.isSneaking&&villagerJob(e.target,world)){
  e.cancel=true;const target=e.target,role=villagerJob(target,world);
  menu(p,async()=>{
   const near=()=>p.isValid&&target.isValid&&p.dimension.id===target.dimension.id&&dist(p.location,target.location)<6&&villagerJob(target,world)===role;
   if(!near())return;
   const match=/^hakkai:realm_([0-7])$/.exec(target.dimension.id),realm=match?Number(match[1]):0;
   const resident=FRIENDLY_RESIDENTS[realm*4+Math.max(0,['guide','healer','artisan','guard'].indexOf(role))];
   const text=`村人の追加役割：${JOBS[role]}。${resident.description}\n立ったまま話すと通常の村人の交易です。`;
   const ix=await form(p,JOBS[role],text,role==='artisan'?[[`エメラルド1個 → ${resident.itemName}${resident.count}個`],['閉じる']]:[['閉じる']]);
   if(role==='artisan'&&ix===0&&near()){
    if(friendlyTrade(space(p),new ItemStack(resident.item,resident.count),report))notice(p,`§a${resident.itemName}を受け取りました`);
    else notice(p,'§eエメラルド・空き容量を確認してください');
   }
  });
  return;
 }
 if(p.isSneaking&&['minecraft:villager','minecraft:villager_v2'].includes(e.target.typeId)){
   const identity=cultureResidentIdentity(e.target);
   if(identity){
     e.cancel=true;const target=e.target,person=CULTURE_PEOPLE[identity.realm][identity.index];
     menu(p,async()=>{if(!p.isValid||!target.isValid||target.dimension.id!==p.dimension.id||dist(p.location,target.location)>6)return;
       const phase=world.getTimeOfDay()<12000?'昼':'夜';
       return simple(p,`${person.name}｜${person.role}`,`${person.line}\n\n今は${phase}。この地に残る記録石にも、暮らしの約束が刻まれています。\n立ったまま話しかけると通常の村人の取引です。`);
     });
     return;
   }
 }
 if(e.target.typeId===ns+'fushi'||e.target.typeId===ns+'fushi_chief'){
   e.cancel=true;const target=e.target,chief=target.typeId===ns+'fushi_chief';
   menu(p,async()=>{
    const near=()=>p.isValid&&target.isValid&&target.dimension.id===p.dimension.id&&dist(target.location,p.location)<6;
    if(!near())return;
    if(!chief)return simple(p,'FUSHI','§dふわふわの案内役。第8界をゆっくり歩いています。竹を手に持つと近づいてくることがあります。チーフには竹を届けて、時の欠片を分けてもらえます。');
    const q=fushiQuest.status(p);
    const choice=await form(p,'FUSHIのチーフ',`§d争わずに竹を届けられます。それぞれ1ゲーム日1回。\n§b友好の贈り物：月夜に月竹林で竹を16本採り、2夜を過ごそう。竹 ${q.bamboo}/16・月夜 ${q.nights}/2 ${q.claimed?'（受取済み）':''}\n\n§eトーテムの復活は実機未検証です。`, [['竹8本 → 時の欠片2個'],['竹16本 → FUSHIのトーテム'],['友好の贈り物を受け取る'],['閉じる']]);
    if(!near())return;
    if(choice===2){fushiQuest.claim(p);return;}
    if(choice!==0&&choice!==1)return;
    const now=world.getAbsoluteTime(),key=choice===0?'fushi_gift_at':'fushi_totem_at',last=num(p,key,-24000);
    if(now<last+24000)return notice(p,'§eこの交換は次の日まで待ってね');
    const input=choice===0?8:16,output=choice===0?'shard_7':'fushi_totem',count=choice===0?2:1;
    if(exchange(p,'minecraft:bamboo',input,ns+output,count)){property(p,key,now);notice(p,choice===0?'§d時の欠片を分けてもらった':'§dFUSHIのトーテムを受け取った');}
   });
   return;
 }
 if(p.isSneaking&&wildlifeById.has(e.target.typeId)){
   const target=e.target;e.cancel=true;
   system.run(()=>{try{observe(p,target);}catch{}});
   return;
 }
 if(!p.isSneaking||!['minecraft:villager','minecraft:villager_v2'].includes(e.target.typeId))return;
 e.cancel=true;
 const name=e.target.nameTag;
 const born=num(e.target,'town_born'),elder=born>0&&seasonDay()-born>=8;
 menu(p,async(p)=>{
   const trust=num(p,'trust');
   const villageLine=({crusher:'「石を砕くのは、橋を直す人たちのため。工房に着いたら一緒に働こう。」',saw:'「板は家だけでなく、旅人のための道標にも使うんだ。」',grower:'「畑の実りは、収穫の少ない家にも分けるんだよ。」',keeper:'「灯りは最後に帰る人のために、夜まで残しておくの。」'})[factoryResidentRole(e.target)];
   const seasonalVillageLine=villageLine?`${villageLine} ${era()}の暮らしも皆で支えよう。`:undefined;
   const line=seasonalVillageLine??({'若き駅長ハル':'「いつか風車の力で、町中の工房を回してみせるよ。」','工房見習いミナ':'「選別が終わるまで、いつも手が粉だらけ。機械があれば早く帰れるのに。」','駅村の子':'「線路のむこうって、どんな町なの？」'})[name]??(elder?`「${era()}のような日は、はじめてこの村に灯りがともった日のことを思い出すよ。」`:undefined);
   const ix=await form(p,name||'村人との会話',`${line?line+'\n\n':''}村の信頼度：${trust}\n村人の近くで敵を倒すと信頼度が上がります。立ったまま会話すると通常の交易を使えます。`,[
     [trust>=3?'金のインゴット1個 ↔ 風の欠片2個':'信頼度3で風記の交易を解放'],['剣への属性刻印'],['見回りを頼む'],['村の集落台帳'],['閉じる']
   ]);
   if(ix===0&&trust>=3&&p.isValid&&villagerNear(p,7)&&exchange(p,'minecraft:gold_ingot',1,ns+'shard_0',2))notice(p,'§a風の欠片を受け取った');
   if(ix===1)return runeForge(p);
   if(ix===2)return villageWatch(p);
   if(ix===3)return townMenu(p);
 });
});
safeSub('world','before','entityHurt',e=>{
 try{if(protectsPlayer(e.hurtEntity,e.damageSource)){e.cancel=true;return;}}catch{}
 if(e.cancel)return;
 const victim=/** @type {import('@minecraft/server').Player} */ (e.hurtEntity);
 try{if(fushiTotem?.isReplaying(victim))return;}catch{}
 try{if(e.damageSource?.cause===EntityDamageCause.fall&&airDash?.blocksFall(victim,system.currentTick)){e.cancel=true;return;}}catch{}
 try{if(combatRoll?.blocks(victim,e.damageSource,system.currentTick)||combatUltimate?.blocks(victim,e.damageSource,system.currentTick)){e.cancel=true;return;}}catch{}
 try{if(customShield.blocks(victim,e.damageSource,system.currentTick)&&shieldWear.reserve(victim,customShield.equipped(victim),e.damage)){e.cancel=true;deferShieldArrow({system,player:victim,source:e.damageSource});const broken=customShield.recordBlock(victim,e.damageSource,system.currentTick);try{system.run(()=>{if(victim.isValid){try{victim.playSound(broken?'item.shield.break':'item.shield.block',{volume:.5});}catch{}if(broken)notice(victim,'§e盾の構えが崩れた（約5秒）',60);}});}catch{}return;}}catch{}
 try{if(e.damageSource?.cause===EntityDamageCause.entityAttack&&combatParry?.isStaggered(e.damageSource.damagingEntity,system.currentTick)){e.cancel=true;return;}}catch{}
 try{if(victim?.typeId==='minecraft:player'&&combatParry?.tryHit(victim,gear.get(selected(victim)?.typeId),sessions.get(victim.id),e.damageSource,system.currentTick)){e.cancel=true;return;}}catch{}
 if(victim?.typeId==='minecraft:player'&&!isCreative(victim)&&[EntityDamageCause.entityAttack,EntityDamageCause.projectile].includes(e.damageSource.cause)){
   const worn=armorItems(victim);
   const points=worn.reduce((n,item)=>n+Math.floor(num(victim,`affinity_${item.typeId.slice(10)}`)/30),0);
   if(points>0)e.damage*=1-Math.min(.12,points*.015);
   const g=gear.get(selected(victim)?.typeId);
   try{e.damage=combatGuard?.scale(victim,g,e.damageSource,system.currentTick,e.damage)??e.damage;}catch{}
 }
 const p=e.damageSource.damagingEntity;
 if(p?.typeId==='minecraft:player'&&e.damageSource.cause===EntityDamageCause.entityAttack&&!isCreative(p)){
  const s=state(p);
  if(s.s<=0)e.damage*=.55;
  const id=selected(p)?.typeId;
  if(id?.startsWith('minecraft:')&&(_melee.test(id))){
   e.damage+=Math.min(2,Math.floor(num(p,`affinity_${id.slice(10)}`)/35))*(s.s<=0?.5:1);
  }
 }
 try{fushiTotem?.before(e);}catch{}
});
const _melee=/_(sword|axe)$/;
const armorSlots=[EquipmentSlot.Head,EquipmentSlot.Chest,EquipmentSlot.Legs,EquipmentSlot.Feet];
function armorItems(p){
 const equipment=p.getComponent('minecraft:equippable');
 return armorSlots.map(slot=>equipment?.getEquipment(slot)).filter(item=>/^minecraft:.*_(helmet|chestplate|leggings|boots)$/.test(item?.typeId??''));
}
function growAffinity(p,item,milestone,label){
 const key='affinity_'+item.typeId.slice(10),was=num(p,key);
 if(was<milestone*2){property(p,key,was+1);if((was+1)%milestone===0)notice(p,`§6${label}への愛着度が上がった`);}
 return Math.min(2,Math.floor((was+1)/milestone));
}
const shrineChiefs=setupShrineChiefs({world,report});
safeSub('world','after','entityLoad',({entity})=>shrineChiefs.onLoad(entity));
safeSub('world','after','entityDie',({deadEntity})=>shrineChiefs.onDeath(deadEntity));
safeSub('world','after','entityRemove',({removedEntityId})=>shrineChiefs.onRemove(removedEntityId));
const fushiQuest=setupFushiQuest({give,notice,report});
const moonBamboo=setupMoonBamboo({world,isMoonGrove:at=>Boolean(seededWorlds?.isGenerated(7,at)&&seededWorlds?.isMoonGrove(at)),report,onEligibleBreak:fushiQuest.progress});
safeSub('world','after','playerBreakBlock',e=>moonBamboo.onBreak(e));
safeSub('world','after','playerBreakBlock',({player,brokenBlockPermutation,itemStackBeforeBreak:item})=>{
 if(player.getGameMode()!==GameMode.Survival||!item?.typeId.startsWith('minecraft:'))return;
 const b=brokenBlockPermutation.type.id;
 const good=item.typeId.endsWith('_pickaxe')&&/^minecraft:.*(?:_ore|stone|deepslate|tuff|obsidian)$/.test(b)||
   item.typeId.endsWith('_shovel')&&/^minecraft:(dirt|sand|red_sand|gravel|grass_block|snow)$/.test(b)||
   item.typeId.endsWith('_axe')&&/^minecraft:.*_(log|wood|stem)$/.test(b)||
   item.typeId.endsWith('_hoe')&&cropIds.has(b);
 if(!good)return;
 const level=growAffinity(player,item,item.typeId.endsWith('_axe')?35:30,'道具');
 const s=state(player);
 if(level>0&&(s.cd.get('tools')??0)<=system.currentTick){
   s.cd.set('tools',system.currentTick+160);player.addEffect('haste',level>=2?75:45,{showParticles:false});
 }
});
safeSub('world','after','projectileHitEntity',e=>{
 const p=/** @type {import('@minecraft/server').Player|undefined} */ (e.source);
 if(p?.typeId!=='minecraft:player'||p.getGameMode()!==GameMode.Survival||e.projectile.typeId!=='minecraft:arrow'||e.getEntityHit().entity.typeId==='minecraft:player')return;
 const item=selected(p);
 if(item?.typeId!=='minecraft:bow'&&item?.typeId!=='minecraft:crossbow')return;
 const level=growAffinity(p,item,25,'弓');
 const s=state(p);if(!level||system.currentTick<(s.cd.get('bow_affinity')??0))return;
 s.cd.set('bow_affinity',system.currentTick+80);p.addEffect('speed',40+level*15,{showParticles:false});
});
const ranchFood={cow:['wheat'],sheep:['wheat'],pig:['carrot','potato','beetroot'],chicken:['wheat_seeds','beetroot_seeds','pumpkin_seeds','melon_seeds','torchflower_seeds','pitcher_pod']};
safeSub('world','after','playerInteractWithEntity',({player,target,beforeItemStack,itemStack})=>{
 if(player.getGameMode()!==GameMode.Survival||!target.isValid||!beforeItemStack?.typeId.startsWith('minecraft:'))return;
 if(!ranchFood[target.typeId.slice(10)]?.includes(beforeItemStack.typeId.slice(10))||itemStack?.typeId===beforeItemStack.typeId&&itemStack.amount>=beforeItemStack.amount)return;
 const day=seasonDay();
 if(num(target,'ranch_day',-1)===day)return;
 const reward=target.typeId==='minecraft:sheep'?'farm_fiber':'barn_token';
 if(give(player,ns+reward)){
   property(target,'ranch_day',day);notice(player,reward==='farm_fiber'?'§aヒツジから牧場繊維を受け取った':'§a動物から育てのしるしを受け取った');
 }
});
safeSub('world','after','entityHitEntity',({damagingEntity:p,hitEntity})=>{
 try{weaponTrace?.record(p,hitEntity);}catch{}
 if(p.typeId!=='minecraft:player'||!p.isValid||p.getGameMode()===GameMode.Spectator)return;
 if(protectsPlayer(hitEntity,{damagingEntity:p}))return;
 // Creative can preview the crouching weapon skill without spending stamina
 // or advancing survival-only affinity and boss-parry progression.
 if(isCreative(p)){
  const g=gear.get(selected(p)?.typeId),s=state(p);
  if(g&&(!weaponTrace?.enabled()||!isTraceWeapon(g))&&p.isSneaking&&hitEntity.typeId!=='minecraft:player'&&system.currentTick-s.useTick>=7){s.useTick=system.currentTick;cast(p,g);}
  return;
 }
 let parried=false;try{parried=wardenBoss?.onMeleeParry({damagingEntity:p,hitEntity})??false;}catch(err){report('管理者へのパリィ',err);}
 if(parried)ultimateParryHeal(p);
 const s=state(p),g=gear.get(selected(p)?.typeId);
 let chargedMelee=false;try{chargedMelee=airStrike?.chargeMelee(p,hitEntity,s,g,system.currentTick)??false;}catch{}
 if(!chargedMelee)s.s=Math.max(0,s.s-(['剣','斧','槍'].includes(g?.kind)?3:4));
 const item=selected(p),id=item?.typeId;
 if(id?.startsWith('minecraft:')&&_melee.test(id)&&hitEntity.typeId!=='minecraft:player'){
   const k=`affinity_${id.slice(10)}`,was=num(p,k);
   if(was<70)growAffinity(p,item,35,id.endsWith('_sword')?'剣':'斧');
   else if(p.isSneaking&&(s.cd.get('affinity')??0)<=system.currentTick){
     s.cd.set('affinity',system.currentTick+140);p.addEffect('strength',50,{showParticles:false});notice(p,id.endsWith('_sword')?'§6使い込んだ剣の技：風切り':'§6使い込んだ斧の技：木霊の一撃');
     if(id==='minecraft:diamond_sword')try{p.dimension.spawnParticle('hakkai:climate_4',hitEntity.getHeadLocation());}catch{}
   }
   const rune=selected(p)?.getDynamicProperty(ns+'rune');
   if(typeof rune==='number'&&rune>=0&&rune<4&&hitEntity.isValid&&(s.cd.get('rune')??0)<=system.currentTick){
     s.cd.set('rune',system.currentTick+120);
     if(rune===0){p.addEffect('speed',70,{showParticles:false});notice(p,'§b風の刻印が発動：移動速度上昇');}
     if(rune===1){p.addEffect('regeneration',55,{showParticles:false});notice(p,'§b水の刻印が発動：体力回復');}
     if(rune===2){hitEntity.applyDamage(2,{cause:EntityDamageCause.magic,damagingEntity:p});notice(p,'§e雷の刻印が発動：追加ダメージ');}
     if(rune===3){hitEntity.addEffect('slowness',65,{showParticles:false});notice(p,'§d時の刻印が発動：相手を減速');}
   }
 }
 if(g&&!parried&&(!weaponTrace?.enabled()||!isTraceWeapon(g))&&p.isSneaking&&hitEntity.typeId!=='minecraft:player'&&system.currentTick-s.useTick>=7){s.useTick=system.currentTick;cast(p,g);}
});
safeSub('world','after','playerSpawn',({player:p,initialSpawn})=>{
 system.runTimeout(()=>{
   if(!p.isValid)return;
   const s=state(p);
   if(!initialSpawn){combatResonance?.clear(p.id);s.s=100;s.m=100;persist(p,s);}
   if(!num(p,'onboard')||!initialSpawn){
     if(restore(p)){
       if(!num(p,'onboard'))p.sendMessage('§6【8界風記】風記のガイド本を手に持って使い、旅の地図から風見台へ。');
       property(p,'onboard',1);s.needsRestore=false;
     }else{s.needsRestore=true;p.sendMessage('§e風記の道具を受け取るには、持ち物に空きを作ってください。');}
   }
 },12);
});
safeSub('world','after','playerLeave',({playerId})=>{sessions.delete(playerId);customShield.clear(playerId);shrineChiefs.clearPlayer(playerId);expeditionRecords?.clear(playerId);wardenArena?.clearPlayer(playerId);wardenBoss?.clearMusic(playerId);combatCharge?.clear(playerId);weaponTrace?.clear(playerId);bowTrail?.clear(playerId);combatResonance?.clear(playerId);combatGuard?.clear(playerId);combatRoll?.clear(playerId);combatParry?.clear(playerId);airDash?.clear(playerId);airStrike?.clear(playerId);combatUltimate?.clear(playerId);});
const bar=n=>'■'.repeat(Math.floor(n/20))+'□'.repeat(5-Math.floor(n/20));
function hudLine(p,s,t){
 const pale=num(p,'hud_color'),st=Math.floor(s.s),mana=Math.floor(s.m),show=t<s.until,mode=num(p,'hud_pos');
 const held=gear.get(selected(p)?.typeId),boss=mobSystem?.bossHudLine(p,t),marks=combatResonance?.level(p,held,t)??0,guard=combatGuard?.status(p,held,t);
 const remaining=held?Math.max(0,(s.cd.get(held.id)??0)-t):0;
 const hint=isTraceWeapon(held)?(p.isSneaking?(held.kind==='弓'?'§7溜め撃ち：少し引いて離す':'§7溜め技：使うボタン'):(p.isOnGround?'§7通常技：使う｜必殺：跳んで使う':'§6必殺：使う（スタミナ20・魔力10）')):undefined;
 const extra=[hint,customShield.cooldown(p,t)>0?`§e盾の構え直し ${Math.ceil(customShield.cooldown(p,t)/20)}秒`:undefined,combatCharge?.status(p,t),combatUltimate?.status(p,t),combatParry?.status(p,t),combatRoll?.status(p,t),airDash?.status(p),guard,marks?`§b風紋 ${'◆'.repeat(marks)}${'◇'.repeat(3-marks)}${marks===3?' 解放可能':marks===2?' 溜め終撃可能':''}`:undefined,remaining?`§7武器技 ${Math.ceil(remaining/20)}秒`:undefined,show?s.action:undefined,boss].filter(Boolean).join('\n');
 if(num(p,'hide_hud'))return extra||undefined;
 if(mode===2){
   const line=`${pale?'§f':'§c'}スタミナ ${bar(st)} ${st}§r  ${pale?'§7':'§b'}魔力 ${bar(mana)} ${mana}§r`;
   return extra?`${line}\n${extra}`:line;
 }
 let code=hudTokens.base;
 if(mode===1)code+=hudTokens.right;
 if(num(p,'hud_size'))code+=hudTokens.large;
 if(st<=35)code+=hudTokens.low;
 if(Math.floor(t/10)%(st<=35?2:4)===0)code+=hudTokens.pulse;
 if(mana<=33)code+=hudTokens.dim;else if(mana<=66)code+=hudTokens.small;
 return `${code}${pale?'§f':'§c'}スタミナ ${bar(st)} ${st}§r\n${pale?'§7':'§b'}魔力 ${bar(mana)} ${mana}§r${extra?`\n${extra}`:''}`;
}
let cooldownSweep=0;
system.runInterval(()=>{
 const t=system.currentTick;
 if(t>=cooldownSweep){cooldownSweep=t+60;for(const [id,end] of tempCooldown)if(t>=end)tempCooldown.delete(id);}
 for(const p of world.getAllPlayers()){
   try{
     const s=state(p);
     if(p.getGameMode()===GameMode.Spectator){combatGuard?.clear(p.id);continue;}
     if(t>=s.campCheckAt){
       s.campCheckAt=t+20;
       const v=p.getVelocity(),still=Math.hypot(v.x,v.z)<.04&&Math.abs(v.y)<.04;
       const resting=p.isSneaking&&!p.isSwimming&&!p.isSprinting&&still&&campfireNearby(p);
       if(resting&&!s.campResting)notice(p,'§6焚き火のそばで野営中。スタミナと魔力の回復が速くなった。',50);
       s.campResting=resting;
     }
     if(t%100===0){applyArmorSetBonuses(p);applyArmorSetVisuals(p);applyNightwalkerAwakeningVisual(p);applyRealmAwakenedVisual(p);applyRealmAwakenedEffects(p);
    applyGuardianLegacyEffects(p);}
     if(s.needsRestore&&t>=(s.nextRestore??0)){
       s.nextRestore=t+80;
       if(restore(p)){s.needsRestore=false;property(p,'onboard',1);}
     }
     const shieldHeld=Boolean(customShield.equipped(p));
     const shieldStance=shieldHeld&&p.isSneaking&&!p.isSwimming;
     if(shieldStance)combatGuard?.clear(p.id);
     const guarding=shieldStance?true:(combatGuard?.tick(p,gear.get(selected(p)?.typeId),s,t)??false);
     if(isCreative(p)){s.s=max;s.m=max;}else{
       const finalSet=hasUltimateArmor(p);
       if(!guarding)s.s=bounds(s.s+ultimateRegen(p.isSwimming||p.isSprinting?-1.4:s.campResting?4.5:2.5,finalSet),0,max);
       s.m=bounds(s.m+ultimateRegen(s.campResting?2.2:1.1,finalSet),0,max);
     }
     // The trial dimension is not a normal realm. Keep unrelated wildlife,
     // site and terrain systems out of it, and run the boss independently.
     if(p.dimension.id===ns+'warden_arena'){
       if(t>=(s.wardenAt??0)){s.wardenAt=t+40;persist(p,s);}
       const hud=hudLine(p,s,t);if(hud!==undefined)p.onScreenDisplay.setActionBar(hud);
       continue;
     }
     const site=currentPlace(p);
     if(p.dimension.id===dimID(0)&&num(world,'built_0')&&num(world,'built_1')&&!num(world,meadowTerrainKey)&&!num(world,meadowTerrainSkippedKey)&&!meadowTerrainTask&&t>=meadowTerrainRetryAt){
       void buildMeadowTerrain().catch(err=>report('草原地形生成',err));
     }
     if(p.dimension.id===dimID(1)&&num(world,'built_2')&&num(world,'built_20')&&world.getDynamicProperty(ns+'natural_site_plan_20_v2')===undefined&&!num(world,forestTerrainKey)&&!num(world,forestTerrainSkippedKey)&&!forestTerrainTask&&t>=forestTerrainRetryAt){
       void buildForestTerrain().catch(err=>report('霧の森地形生成',err));
     }
     if(p.dimension.id===dimID(2)&&num(world,'built_3')&&num(world,'built_11')&&world.getDynamicProperty(ns+'natural_site_plan_11_v2')===undefined&&!num(world,desertTerrainKey)&&!num(world,desertTerrainSkippedKey)&&!desertTerrainTask&&t>=desertTerrainRetryAt){
       void buildDesertTerrain().catch(err=>report('砂の回廊地形生成',err));
     }
     if(p.dimension.id===dimID(3)&&num(world,'built_4')&&num(world,'built_12')&&world.getDynamicProperty(ns+'natural_site_plan_12_v2')===undefined&&!num(world,iceTerrainKey)&&!num(world,iceTerrainSkippedKey)&&!iceTerrainTask&&t>=iceTerrainRetryAt){
       void buildIceTerrain().catch(err=>report('氷の鏡湖地形生成',err));
     }
     if(p.dimension.id===dimID(4)&&num(world,'built_5')&&num(world,'built_13')&&world.getDynamicProperty(ns+'natural_site_plan_13_v2')===undefined&&!num(world,cliffTerrainKey)&&!num(world,cliffTerrainSkippedKey)&&!cliffTerrainTask&&t>=cliffTerrainRetryAt){
       void buildCliffTerrain().catch(err=>report('雷の断崖地形生成',err));
     }
     if(p.dimension.id===dimID(4)&&num(world,cliffTerrainKey)&&!num(world,cliffLandmarkKey)&&!num(world,cliffLandmarkSkippedKey)&&!cliffLandmarkTask){
       const d=p.dimension;cliffLandmarkTask=loaded(d,{x:48,y:88,z:10},{x:54,y:98,z:16},async()=>{await ensureCliffLandmarks(d);return true;}).catch(err=>report('雷の断崖ランドマーク',err)).finally(()=>{cliffLandmarkTask=undefined;});
     }
     if(p.dimension.id===dimID(5)&&num(world,'built_6')&&num(world,'built_14')&&world.getDynamicProperty(ns+'natural_site_plan_14_v2')===undefined&&!num(world,caveTerrainKey)&&!num(world,caveTerrainSkippedKey)&&!caveTerrainTask&&t>=caveTerrainRetryAt){
       void buildCaveTerrain().catch(err=>report('闇の地下庭園地形生成',err));
     }
     if(p.dimension.id===dimID(5)&&num(world,caveTerrainKey)&&!num(world,caveLandmarkKey)&&!num(world,caveLandmarkSkippedKey)&&!caveLandmarkTask){
       const d=p.dimension;caveLandmarkTask=loaded(d,{x:48,y:88,z:-19},{x:54,y:104,z:-13},async()=>{await ensureCaveLandmarks(d);return true;}).catch(err=>report('地下庭園ランドマーク',err)).finally(()=>{caveLandmarkTask=undefined;});
     }
     if(p.dimension.id===dimID(6)&&num(world,'built_7')&&num(world,'built_15')&&world.getDynamicProperty(ns+'natural_site_plan_15_v2')===undefined&&!num(world,skyTerrainKey)&&!num(world,skyTerrainSkippedKey)&&!skyTerrainTask&&t>=skyTerrainRetryAt){
       void buildSkyTerrain().catch(err=>report('空の浮島群地形生成',err));
     }
     if(p.dimension.id===dimID(7)&&num(world,'built_8')&&num(world,'built_16')&&world.getDynamicProperty(ns+'natural_site_plan_16_v2')===undefined&&!num(world,timeTerrainKey)&&!num(world,timeTerrainSkippedKey)&&!timeTerrainTask&&t>=timeTerrainRetryAt){
       void buildTimeTerrain().catch(err=>report('時の終着駅地形生成',err));
     }
     if(p.dimension.id===dimID(6)&&num(world,skyTerrainKey)&&!num(world,skyLandmarkKey)&&!num(world,skyLandmarkSkippedKey)&&!skyLandmarkTask){
       const d=p.dimension;skyLandmarkTask=loaded(d,{x:42,y:100,z:12},{x:48,y:110,z:16},async()=>ensureSkyLandmarks(d)).catch(err=>report('空の浮島群ランドマーク',err)).finally(()=>{skyLandmarkTask=undefined;});
     }
     if(p.dimension.id===dimID(7)&&num(world,timeTerrainKey)&&!num(world,timeLandmarkKey)&&!num(world,timeLandmarkSkippedKey)&&!timeLandmarkTask){
       const d=p.dimension;timeLandmarkTask=loaded(d,{x:29,y:95,z:16},{x:33,y:106,z:20},async()=>ensureTimeLandmarks(d)).catch(err=>report('時の終着駅ランドマーク',err)).finally(()=>{timeLandmarkTask=undefined;});
     }
     realmDiscoveryTick(p,site);
     naturalSiteTick(p,site,t);
     if(site?.kind==='culture')foundCultureResident({site,world,dimension:p.dimension,num,property,findFloor:safeNear,report});
     // Boss timers run on the ten-tick loop; nature scans remain at forty ticks.
     try{mobSystem?.tickBosses(p,t);}catch(err){if(t%200===0)report('八界王',err);}
     try{fushiSystem?.tickChiefs(p,t);}catch(err){if(t%200===0)report('チーフ',err);}
     shrineChiefs.tick(p,t);
     frontierWorlds?.tick(p,t);
     expeditionRecords?.tick(p,t);
     realmTrialTick(p,site);
     realmRuinTick(p,site);
     realmMemoryTick(p,site);
     realmEchoTick(p,site);
     realmSeasonalEventTick(p,site);
     realmHiddenRouteTick(p,site);
     trailTick(p,site,s);
     atlasTick(p,site,s);
     linkedTick(p,site,s);
     if(p.dimension.id.startsWith(ns+'realm_')&&p.location.y<(p.dimension.id===ns+'realm_5'?-52:40)&&!s.busy&&!isCreative(p)&&t>=(s.rescueAt??0)){
       s.rescueAt=t+100;
       s.arrival=0;
       const last=travelSites.get(num(p,'last_site')),destination=isNaturalSite(last)?places[last.dim+1]:(last??places[0]);
       void arrive(p,destination).then(ok=>{
         if(ok===false&&p.isValid)return returnNatural(p,'overworld_point');
       }).catch(err=>report('救出',err));
     }
     if(t-s.lastMove>=40){
       s.lastMove=t;persist(p,s);soundtrack(p,site,s);
       if(site&&site.id!==0){try{updateWeather(site);}catch{}}
       climate(p,site,s);
       const oldBell=parsePoint(p,'vanilla_bell');
       let activeBell=false;
       if(oldBell&&oldBell.id===p.dimension.id&&dist(p.location,oldBell)<39)try{
         const b=p.dimension.getBlock(oldBell);
         if(b?.typeId==='minecraft:bell'){
           activeBell=true;
           const town=townGet(p.dimension,oldBell,true);
           if(town&&t>=(town.bellTick??0)){town.vanilla=true;town.bellTick=t+37;gatherTown(town);townRoutine(town);}
         }
       }catch{}
       if(!activeBell&&!s.busy)discoverTown(p,s);
     }
     if(t>=(s.natureAt??0)){
       s.natureAt=t+40;
       if(/^hakkai:realm_[0-7]$/.test(p.dimension.id)){
         const repeatFactory=seededWorlds?.repeatSiteAt(Number(p.dimension.id.slice((ns+'realm_').length)),p.location.x,p.location.z);
         const factorySite=repeatFactory?.id===59?repeatFactory:site?.id===59?site:undefined;
         if(factorySite){
           const town={factoryVillage:true,d:p.dimension,l:{x:factorySite.x,y:expandedY,z:factorySite.z},repeatSiteKey:factorySite.repeatKey};
           foundFactoryResident({town,world,num,property,findFloor:safeNear,report});
           foundFriendlyResident({site:factorySite,world,dimension:p.dimension,num,property,findFloor:safeNear,report});
           foundBuilder({site:factorySite,world,dimension:p.dimension,num,property,findFloor:safeNear,report});
         }
         if(site?.kind==='culture')foundFriendlyResident({site,world,dimension:p.dimension,num,property,findFloor:safeNear,report});
         if(site?.kind==='culture'||site?.id===59)foundBuilder({site,world,dimension:p.dimension,num,property,findFloor:safeNear,report});
         builderWorkTick(p,t);
         lifeTick(p,site,t);
         villageCarryTick(p,site,t);
         villageGameTick(p,t);
       }
       villagerGuardTick(p,t);
       if([GameMode.Survival,GameMode.Adventure].includes(p.getGameMode()))friendlySupportTick(p,s,t,e=>villagerJob(e,world));
       let profile;try{profile=survey(p);}catch{}
       // Allow observing realm wildlife in creative too; keep vanilla-world behavior unchanged.
       if(!isCreative(p)||/^hakkai:realm_[0-7]$/.test(p.dimension.id))try{wildlifeTick(p,profile,site);}catch(err){if(t%200===0)report('生き物の出現',err);}
     try{mobSystem?.tick(p,t);realmEnders?.tick(p,t);fushiSystem?.tick(p,t);}catch{}
     }
     const hud=hudLine(p,s,t);
     if(hud!==undefined)p.onScreenDisplay.setActionBar(hud);
   }catch(err){if(p.isValid&&t%200===0)report('定期処理',err);}
 }
},10);

// Terrain queue pump: scans remain throttled to once a second per player,
// while the next single adaptive job can start as soon as the previous ends.
system.runInterval(()=>{
 const t=system.currentTick;
 for(const p of world.getAllPlayers())try{seededWorlds?.tick(p,t);}catch(err){if(t%200===0)report('シード地形',err);}
},1);

// Fast input sampling is isolated from the heavier half-second world loop.
system.runInterval(()=>{
 const t=system.currentTick,players=world.getAllPlayers();
 for(const p of players)try{
  const s=state(p);
  try{tomeCrouchTick(p,s,selected(p)?.typeId,()=>advanceTome(p));}catch{}
  // Isolate optional input/API failures so one feature can't disable others.
  try{customShield.tick(p,t);}catch{}
  try{combatRoll?.tick(p,s,t);}catch{}
  try{airDash?.tick(p,s,t);}catch{}
  try{airStrike?.tick(p,t);}catch{}
  try{combatParry?.tick(p,gear.get(selected(p)?.typeId),s,t);}catch{}
 }catch{}
 // Update every player's input before resolving the shared boss attack. This
 // avoids denying later-listed players a parry on the same server tick.
 for(const p of players)try{
  wardenArena?.rescuePlayer(p,t);
  wardenBoss?.tick(p,t);
  if(wardenBoss?.musicActive(p.id)){const s=state(p);if(s.sound){try{s.sound.stop();}catch{}s.sound=undefined;}s.lastMusic=undefined;s.musicAt=0;}
 }catch(err){if(t%200===0)report('時空の管理者',err);}
 combatParry?.flush(t);
},1);

// v5.2.0: integrate the non-combat frontier terrain and 72 expedition records.
frontierWorlds=setupFrontierWorlds({ns,world,system,num,property,report});
expeditionRecords=setupExpeditionRecords({ns,world,places,num,property,notice,form,give,drop:(d,id,n,l)=>{try{d.spawnItem(new ItemStack(id,n),l);}catch{}},paged,simple,frontierWorlds});

// World.seed and dynamic properties are unavailable during early execution.
// Never silently plan with a fallback seed if initialization fails.
safeSub('world','after','worldLoad',()=>{
 try{
  const seed=world.seed;
  if(typeof seed!=='string')throw Error('ワールドシードを取得できません');
  initializeNaturalSitePlans({places,seed,world,num,property,ns});
  seededWorlds=setupSeededWorlds({ns,world,system,num,property,report,places,biomes,families,buildSite:buildSeededSite,buildRepeatSite:site=>placeRepeatSite({site,world,dimension:world.getDimension(dimID(site.dim)),num,property,loaded,BlockVolume}),onShrineChief:shrineChiefs.created});
 }catch(err){report('シード地形の初期化',err);}
});
combatRoll=setupCombatRoll({notice,safe});
airDash=setupAirDash({notice});
airStrike=setupAirStrike({notice,visibleFrom});
fushiTotem=setupFushiTotem({system,notice});
combatUltimate=setupCombatUltimate({system,notice,visibleFrom});
combatCharge=setupCombatCharge({system,gear,selected,state,cast,tapMode:true});
let weaponSwingAvailable=false;
try{const signal=world.afterEvents.playerSwingStart;if(signal){signal.subscribe(e=>weaponTrace?.swing(e));weaponSwingAvailable=true;}}catch(err){report('武器の振りイベント',err);}
weaponTrace=setupWeaponTrace({system,gear,selected,state,visibleFrom,airAttack:(p,s,g,t)=>airStrike?.beginSwing(p,s,g,t)??false,enabled:weaponSwingAvailable,report});
bowTrail=setupBowTrail({system,gear,selected,state,airAttack:(p,s,g,t)=>airStrike?.beginSwing(p,s,g,t)??false});
safeSub('world','after','entitySpawn',({entity})=>bowTrail?.spawned(entity));
combatGuard=setupCombatGuard({notice});
combatParry=setupCombatParry({guard:combatGuard,onSuccess:({p,attacker,near,at})=>{
 ultimateParryHeal(p);
 notice(p,near?'§bパリィ成功！ 近くの敵をひるませた':'§bパリィ成功！',45);
 try{p.playSound('random.anvil_land',{volume:.35,pitch:1.7});}catch{}
 try{p.playAnimation('animation.hakkai.parry_rebound',{blendOutTime:.12,stopExpression:'query.any_animation_finished'});}catch{}
 for(let i=0;i<8;i++)try{const a=i*Math.PI/4;p.dimension.spawnParticle('hakkai:wind_burst',{x:p.location.x+Math.cos(a),y:p.location.y+1,z:p.location.z+Math.sin(a)});}catch{}
 if(near){
  // Suppress scripted boss actions without moving knockback-immune bosses.
  try{wardenBoss?.stagger(attacker,at);mobSystem?.stagger(attacker,at);realmEnders?.stagger(attacker,at);fushiSystem?.stagger(attacker,at);}catch{}
  // Ordinary engine AI is slowed; the hurt hook suppresses its melee hits.
  try{attacker.addEffect('slowness',40,{amplifier:4,showParticles:false});}catch{}
 }
}});
const tryScriptParry=(p,attacker)=>{try{return combatParry?.tryHit(p,gear.get(selected(p)?.typeId),sessions.get(p.id),{cause:EntityDamageCause.entityAttack,damagingEntity:attacker},system.currentTick)??false;}catch{return false;}};
const isEvading=p=>Boolean(combatRoll?.evading(p,system.currentTick)||combatUltimate?.active(p,system.currentTick));
mobSystem=setupMobSystem({ns,world,system,num,property,report,isEvading,tryParry:tryScriptParry});
realmEnders=setupRealmEnders({world,system,report,safe,isEvading,tryParry:tryScriptParry});
fushiSystem=setupFushiSystem({world,system,report,isEvading,tryParry:tryScriptParry});
wardenArena=setupWardenArena({world,system,num,property,notice,report,loaded,safe,safeNear,point,parsePoint,returnNatural,form,total,space});
wardenBoss=setupWardenBoss({world,system,property,report,musicMuted:p=>Boolean(num(p,'mute')),isEvading,tryParry:tryScriptParry,spendParry:(p,cost)=>{const s=state(p);if(s.s<cost){notice(p,'§eパリィに必要なスタミナが足りない');return false;}s.s-=cost;return true;}});
combatResonance=setupCombatResonance({system,notice});
