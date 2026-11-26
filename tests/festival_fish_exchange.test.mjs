import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=src.indexOf('async function harvestMarket('),b=src.indexOf('const runes=',a);assert.ok(a>0&&b>a);
function fixture(choices,items={}){
 const p={isValid:true},exchanges=[],notices=[],forms=[],inv=new Map(Object.entries(items));let near=true;
 const ctx={villagerNear:()=>near,simple:async()=>{},era:()=> '夏',seasonDay:()=>10,seasonAt:()=>({dayInSeason:1}),num:()=>-1,ns:'hakkai:',space:()=>inv,total:(c,id)=>c.get(id)||0,form:async(_p,title,body,rows)=>{forms.push({title,body,rows});const action=choices.shift();if(typeof action==='function')return action();return action;},exchange:(_p,id,n,out,count=1)=>{exchanges.push([id,n,out,count]);if((inv.get(id)||0)<n)return false;inv.set(id,inv.get(id)-n);return true;},notice:(_,text)=>notices.push(text),property:()=>{}};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);return {p,ctx,exchanges,notices,forms,inv,setNear:v=>near=v};
}
for(let season=0;season<4;season++)test(`fish ${season} can be exchanged independently of the current season`,async()=>{
 const id=`hakkai:festival_fish_${season}`,f=fixture([2,season],{[id]:1});await f.ctx.harvestMarket(f.p);
 assert.equal(f.forms[1].rows[season][0].includes('所持 1匹'),true);assert.deepEqual(f.exchanges,[[id,1,'hakkai:crystal_19',1]]);assert.equal(f.inv.get(id),0);assert.ok(f.notices[0].includes('交換した'));
});
test('missing fish, cancellation and walking away do not silently spend or exchange',async()=>{
 const f=fixture([2,0]);await f.ctx.harvestMarket(f.p);assert.ok(f.notices[0].includes('足りません'));
 const g=fixture([2,4]);await g.ctx.harvestMarket(g.p);assert.equal(g.exchanges.length,0);
 const h=fixture([]);h.ctx.form=async()=>{if(h.exchanges.length)throw Error();if(!h._shown){h._shown=true;return 2;}h.setNear(false);return 0;};await h.ctx.harvestMarket(h.p);assert.equal(h.exchanges.length,0);
});
