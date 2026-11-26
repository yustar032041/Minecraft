// Update guardian client animation references only, preserving model/texture data.
import fs from 'node:fs';
const rp='Hakkai_v7.1.0/ResourcePack',base=`${rp}/entity`;let changed=0;
for(let realm=0;realm<8;realm++){
 const file=`${base}/guardian_${realm}.entity.json`,raw=fs.readFileSync(file,'utf8'),obj=JSON.parse(raw),desc=obj['minecraft:client_entity'].description;
 const model=JSON.parse(fs.readFileSync(`${rp}/models/entity/guardian_${realm}.geo.json`,'utf8'))['minecraft:geometry'].find(g=>g.description.identifier===desc.geometry.default);
 const bones=new Set(model?.bones.map(b=>b.name)),required=realm===6?['body','head','wing_l','wing_r']:['body','head','leg_0','leg_1','leg_2','leg_3'];
 if(required.some(b=>!bones.has(`g${realm}_${b}`)))throw Error(`Guardian ${realm} has changed geometry`);
 desc.animations.walk=`animation.hakkai.guardian_${realm}_walk`;
 for(const phase of ['windup','strike'])desc.animations[`creature_${phase}`]=`animation.hakkai.guardian_${realm}_${phase}`;
 for(const style of ['brace','lunge','cast'])for(const phase of ['windup','strike'])desc.animations[`guardian_${style}_${phase}`]=`animation.hakkai.guardian_${realm}_${style}_${phase}`;
 let text=JSON.stringify(obj,null,2)+'\n';if(raw.includes('\r\n'))text=text.replaceAll('\n','\r\n');
 if(text!==raw){changed++;if(!process.argv.includes('--check'))fs.writeFileSync(file,text);}
}
if(process.argv.includes('--check')&&changed){console.error(`${changed} guardian clients out of sync`);process.exit(1);}
console.log(`Eight guardian clients: ${changed} ${process.argv.includes('--check')?'out of sync':'updated'}`);
