#!/usr/bin/env python3
"""Synchronize just equipment recipe JSONs; never regenerate artwork."""
import argparse, json, re
from pathlib import Path
from material_progression import with_tier_material

ROOT = Path(__file__).resolve().parents[1]
BP = ROOT/'Hakkai_v7.1.0/BehaviorPack'
KINDS={'剣','斧','弓','杖','ハンマー','槍','盾','扇','指輪','首飾り','本','石'}
BASE={'剣':['minecraft:iron_sword'],'斧':['minecraft:iron_axe'],'弓':['minecraft:bow'],'杖':['minecraft:stick'],'ハンマー':['minecraft:iron_pickaxe'],'槍':['minecraft:stick','minecraft:flint'],'盾':['minecraft:shield'],'扇':['minecraft:feather'],'指輪':['minecraft:gold_nugget'],'首飾り':['minecraft:string'],'本':['minecraft:book'],'石':['minecraft:stone']}


def expected():
    result={}
    data=(BP/'scripts/data.js').read_text(encoding='utf8')
    catalog=json.loads(re.search(r'^export const catalog=(\[.*\]);\r?$',data,re.M)[1])
    for row in catalog:
        if row['kind'] not in KINDS: continue
        inputs=([f"hakkai:{row['prev']}"] if row['prev'] else BASE[row['kind']])+[f"hakkai:crystal_{row['a']}",f"hakkai:shard_{row['modifier']}"]
        result[row['id']]=with_tier_material(inputs,row['rank'])
    for i in range(11):
        for part,offset,base in [('head',11,'iron_helmet'),('chest',10,'iron_chestplate'),('legs',None,'iron_leggings'),('feet',12,'iron_boots')]:
            ident=f'gear_{offset+16*i:03}' if offset is not None else f'series_leggings_{i:02}'
            previous=(f'gear_{offset+16*(i-5):03}' if offset is not None else f'series_leggings_{i-5:02}') if i>=5 else None
            result[ident]=with_tier_material([f'hakkai:{previous}' if previous else f'minecraft:{base}',f'hakkai:crystal_{[10,6,2,3,4][i%5]}',f'hakkai:shard_{[10,6,2,3,4][i%5]}'],i//5+1)
    result['gear_186']=['hakkai:gear_106','hakkai:crystal_6','hakkai:shard_18','minecraft:emerald','minecraft:netherite_scrap']
    for part in ('helmet','leggings','boots'):
        for i in range(8):result[f'guardian_armor_{i}_{part}']=[f'minecraft:diamond_{part}',f'hakkai:crystal_{i}',f'hakkai:shard_{i}','minecraft:emerald']
        result[f'nightwalker_armor_{part}']=[f'minecraft:diamond_{part}','hakkai:crystal_6','hakkai:shard_18','minecraft:emerald']
        result[f'united_armor_{part}']=[f'minecraft:netherite_{part}','hakkai:crystal_7','hakkai:chronicle_fragment','minecraft:emerald']
    return result


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();updates=[]
    for ident,items in expected().items():
        path=BP/'recipes'/f'{ident}.json';doc=json.loads(path.read_text(encoding='utf8'));recipe=doc['minecraft:recipe_shapeless'];assert recipe['result']['item']==f'hakkai:{ident}'
        desired=[{'item':x} for x in items]
        if recipe['ingredients']!=desired:recipe['ingredients']=desired;updates.append((path,doc))
    if args.check:
        if updates:raise SystemExit('Out of sync: '+', '.join(x.name for x,_ in updates))
        print(f'{len(expected())} equipment recipes match the material policy')
    else:
        for path,doc in updates:path.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        print(f'Updated {len(updates)} recipes (artwork unchanged)')

if __name__=='__main__':main()
