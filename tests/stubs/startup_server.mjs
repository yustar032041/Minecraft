export * from './minecraft_server.mjs';
export const WeatherType={Rain:'rain',Thunder:'thunder'};
export const LiquidType={Water:'water'};
const listeners=new Map();
const events=(prefix)=>new Proxy({}, {get:(_target,key)=>({subscribe:fn=>{listeners.set(prefix+'.'+key,fn);}})});
let ready=false;const data=new Map();
export const world={
 beforeEvents:events('world.before'),afterEvents:events('world.after'),
 get seed(){if(!ready)throw Error('seed unavailable before world load');return '123456';},
 getDynamicProperty(k){if(!ready)throw Error('properties unavailable before world load');return data.get(k);},
 setDynamicProperty(k,v){if(!ready)throw Error('properties unavailable before world load');data.set(k,v);},
 getAllPlayers:()=>[],getAbsoluteTime:()=>0,getTimeOfDay:()=>6000,gameRules:{doMobSpawning:true},getDifficulty:()=> 'normal'
};
export const system={beforeEvents:events('system.before'),afterEvents:events('system.after'),currentTick:0,
 runInterval:(fn,n)=>{intervals.push({fn,n});return intervals.length;},runTimeout:()=>1,run:fn=>1};
export const intervals=[];
export function emit(name,value){if(name==='world.after.worldLoad')ready=true;const fn=listeners.get(name);if(!fn)throw Error('missing listener: '+name);return fn(value);}
export function hasListener(name){return listeners.has(name);}
