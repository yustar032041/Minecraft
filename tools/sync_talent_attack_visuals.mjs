// Synchronize only two client animation aliases, never textures or geometry.
import fs from 'node:fs';
import {mobContent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {creatureVisualStyle,creatureVisualAnimation} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_visual_styles.js';
const base='Hakkai_v7.1.0/ResourcePack/entity';let count=0,changed=0;
for(const [id,profile] of mobContent){
 if(!creatureVisualStyle(profile))continue;
 const file=`${base}/${id.slice('hakkai:'.length)}.entity.json`,raw=fs.readFileSync(file,'utf8'),parsed=JSON.parse(raw);
 const aliases=parsed['minecraft:client_entity'].description.animations;
 for(const phase of ['windup','strike'])aliases[`talent_${phase}`]=creatureVisualAnimation(profile,phase);
 let desired=JSON.stringify(parsed,null,2)+'\n';if(raw.includes('\r\n'))desired=desired.replaceAll('\n','\r\n');
 count++;if(raw!==desired){changed++;if(!process.argv.includes('--check'))fs.writeFileSync(file,desired);}
}
if(process.argv.includes('--check')&&changed){console.error(`${changed} clients out of sync`);process.exit(1);}
console.log(`${count} hostile clients; ${changed} ${process.argv.includes('--check')?'out of sync':'updated'}`);
