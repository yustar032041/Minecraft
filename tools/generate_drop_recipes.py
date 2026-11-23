#!/usr/bin/env python3
"""Generate 120 one-way creature-material -> realm shard recipes.

Existing items and recipes are unchanged; this uses data.js as the source of
truth. Matching display information is calculated in drop_recycling.js.
"""
import json
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
BP=ROOT/'Hakkai_v7.1.0/BehaviorPack'

def exported(name):
    for line in (BP/'scripts/data.js').read_text(encoding='utf8').splitlines():
        prefix=f'export const {name}='
        if line.startswith(prefix):return json.loads(line[len(prefix):].removesuffix(';'))
    raise ValueError(f'missing export {name}')

def main():
    home=exported('home');wildlife=exported('wildlife');out=BP/'recipes'
    assert len(wildlife)==120 and len(home)==8
    names=set()
    for mob in wildlife:
        match=re.fullmatch(r'(wild|foe)_(\d+)_(\d+)',mob['id'])
        if not match:raise ValueError(mob['id'])
        realm,index=int(match[2]),int(match[3])
        assert realm==mob['dim'] and 0<=realm<len(home) and home[realm]
        attr=home[realm][index%len(home[realm])]
        drop='drop_'+mob['id'];name='recycle_'+drop
        assert name not in names and (BP/'items'/f'{drop}.json').is_file()
        assert (BP/'items'/f'shard_{attr}.json').is_file()
        names.add(name)
        data={'format_version':'1.21.90','minecraft:recipe_shapeless':{
            'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],
            'ingredients':[{'item':'hakkai:'+drop}],
            'result':{'item':'hakkai:shard_'+str(attr),'count':2}}}
        path=out/(name+'.json')
        # Do not silently replace an unrelated user-authored recipe.
        if path.exists():
            old=json.loads(path.read_text(encoding='utf8'))
            if old!=data:raise ValueError(f'conflicting recipe {path}')
        else:path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(f'{len(names)} creature material recipes validated')
if __name__=='__main__':main()
