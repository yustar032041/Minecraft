#!/usr/bin/env python3
"""Generate the 20 attribute material -> two matching shards recipes."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BP=ROOT/'Hakkai_v7.1.0/BehaviorPack'

def main():
    for attr in range(20):
        name=f'recycle_drop_element_{attr}'
        data={'format_version':'1.21.90','minecraft:recipe_shapeless':{
            'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],
            'ingredients':[{'item':f'hakkai:drop_element_{attr}'}],
            'result':{'item':f'hakkai:shard_{attr}','count':2}}}
        path=BP/'recipes'/f'{name}.json'
        if path.exists() and json.loads(path.read_text(encoding='utf8'))!=data:
            raise ValueError(f'conflicting recipe {path}')
        if not path.exists():path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print('20 attribute material recipes validated')
if __name__=='__main__':main()
