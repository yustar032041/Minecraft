import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root='Hakkai_v7.1.0/';
const source=fs.readFileSync(root+'BehaviorPack/scripts/main.js','utf8');
const start=source.indexOf('async function returnMenu(p){');
const end=source.indexOf('\nfunction menu(p,fn)',start);
assert.ok(start>=0&&end>start);
let selection,hasHome=true,rows=[],calls=[];
const player={isValid:true};
const ctx={form:async(_p,_title,_body,r)=>{rows=r;return selection},
 itemTexture:id=>'textures/items/hakkai_'+id,places:['hub'],
 arrive:(_p,place)=>calls.push(['arrive',place]),returnNatural:(_p,point)=>calls.push(['return',point]),
 parsePoint:()=>hasHome,notice:(_p,msg)=>calls.push(['notice',msg]),map:()=>calls.push(['map'])};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
for(const [choice,expected] of [[0,['arrive','hub']],[1,['return','bed']],[2,['return','home_point']],[3,['return','overworld_point']],[4,['map']],[undefined,undefined]]){
 selection=choice;calls=[];await ctx.returnMenu(player);
 assert.deepEqual(calls[0],expected);
 assert.equal(calls.length,expected?1:0);
 assert.equal(rows.length,5);
 for(const [,path] of rows)assert.ok(fs.existsSync(root+'ResourcePack/'+path+'.png'),path);
}
hasHome=false;selection=2;calls=[];await ctx.returnMenu(player);
assert.equal(calls.length,1);assert.equal(calls[0][0],'notice');
const atlas=JSON.parse(fs.readFileSync(root+'ResourcePack/textures/item_texture.json','utf8')).texture_data;
for(const kind of ['guide','return_stone'])for(let i=0;i<8;i++)assert.equal(atlas[`hakkai_realm_${kind}_${i}`],undefined);
console.log('Return menu icons, five routes, cancellation and unset home OK (mocked)');
