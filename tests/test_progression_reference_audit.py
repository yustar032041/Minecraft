"""Synthetic faults for the scoped cross-reference audit, not Bedrock validation."""
import json
import sys
import tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from audit_progression_references import audit

def write(p,value):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value,ensure_ascii=False),encoding='utf8')

with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp);bp=root/'BehaviorPack';rp=root/'ResourcePack'
 for folder in ('items','blocks','entities','recipes','loot_tables'): (bp/folder).mkdir(parents=True,exist_ok=True)
 (rp/'texts').mkdir(parents=True);(rp/'textures').mkdir(parents=True)
 (rp/'texts/ja_JP.lang').write_text('item.hakkai:seed.name=種\ntile.hakkai:crop.name=作物\n',encoding='utf8')
 write(rp/'textures/item_texture.json',{'texture_data':{'hakkai_seed':{'textures':'textures/items/seed'}}})
 (rp/'textures/items').mkdir();(rp/'textures/items/seed.png').write_bytes(b'not parsed')
 item={'minecraft:item':{'description':{'identifier':'hakkai:seed'},'components':{'minecraft:icon':'hakkai_seed','minecraft:block_placer':{'block':'hakkai:crop'}}}}
 block={'minecraft:block':{'description':{'identifier':'hakkai:crop'},'components':{'minecraft:loot':'loot_tables/crop.json'}}}
 loot={'pools':[{'entries':[{'type':'item','name':'hakkai:seed'}]}]}
 recipe={'minecraft:recipe_shapeless':{'ingredients':[{'item':'minecraft:wheat_seeds'}],'result':{'item':'hakkai:seed'}}}
 paths=[bp/'items/seed.json',bp/'blocks/crop.json',bp/'loot_tables/crop.json',bp/'recipes/seed.json']
 for p,v in zip(paths,[item,block,loot,recipe]):write(p,v)
 counts,errors,unchecked=audit(root);assert not errors and not unchecked,(errors,unchecked);assert counts['loot_links']==1
 # Each fault must be independently visible, not hidden by a missing file.
 recipe['minecraft:recipe_shapeless']['ingredients']=[{'item':'hakkai:missing'}];write(paths[3],recipe)
 assert any('undeclared custom item/block hakkai:missing' in e for e in audit(root)[1]);recipe['minecraft:recipe_shapeless']['ingredients']=[{'tag':'minecraft:any'}];write(paths[3],recipe)
 assert any('unsupported recipe' in e for e in audit(root)[2]);recipe['minecraft:recipe_shapeless']['ingredients']=[{'item':'minecraft:wheat_seeds'}];write(paths[3],recipe)
 loot['pools'][0]['entries'][0]['name']='hakkai:missing';write(paths[2],loot);assert any('loot:' in e for e in audit(root)[1])
 loot['pools'][0]['entries'][0]={'type':'loot_table','name':'../outside'};write(paths[2],loot);assert any('nested loot' in e for e in audit(root)[1]);write(paths[2],{'pools':[]})
 block['minecraft:block']['components']['minecraft:loot']='loot_tables/missing.json';write(paths[1],block);assert any('missing loot table' in e for e in audit(root)[1])
 item['minecraft:item']['components']['minecraft:block_placer']['block']='hakkai:missing';write(paths[0],item);assert any('block placer target' in e for e in audit(root)[1])
 item['minecraft:item']['components']['minecraft:icon']='hakkai_missing';write(paths[0],item);assert any('atlas key' in e for e in audit(root)[1])
 item['minecraft:item']['components']['minecraft:icon']='hakkai_seed';write(paths[0],item);(rp/'textures/items/seed.png').unlink();assert any('missing icon file' in e for e in audit(root)[1])
 (rp/'texts/ja_JP.lang').write_text('',encoding='utf8');assert len([e for e in audit(root)[1] if 'Japanese name' in e])==2

counts,errors,unchecked=audit(ROOT/'Hakkai_v7.1.0')
assert not errors and not unchecked,(errors,unchecked)
assert counts['items']==405 and counts['blocks']==164 and counts['recipes']>=412
print('Progression reference audit: live pack and injected missing recipe, loot, placer, name and icon faults OK (static only)')
