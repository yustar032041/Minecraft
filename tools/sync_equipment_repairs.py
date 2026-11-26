#!/usr/bin/env python3
"""Add material repair to the 250 durable equipment items.

One ingredient restores ceil(25% of max durability). Preserve all other item
components and the existing line-ending convention. This generates definitions,
not proof that a particular Bedrock client will allow a given anvil operation.
"""
import argparse,json,math,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BP=ROOT/'Hakkai_v7.1.0/BehaviorPack';ITEMS=BP/'items'

def repair_material(ident):
    m=re.fullmatch(r'gear_(\d{3})',ident)
    if m:
        n=int(m[1])
        if 1<=n<=80:return 'minecraft:iron_ingot'
        if 81<=n<=160 or 187<=n<=195:return 'minecraft:diamond'
        if 161<=n<=186 or 196<=n<=213:return 'minecraft:netherite_scrap'
    m=re.fullmatch(r'series_leggings_(\d{2})',ident)
    if m:
        n=int(m[1])
        if n<5:return 'minecraft:iron_ingot'
        if n<10:return 'minecraft:diamond'
        if n==10:return 'minecraft:netherite_scrap'
    if re.fullmatch(r'guardian_armor_[0-7]_(helmet|leggings|boots)',ident) or re.fullmatch(r'nightwalker_armor_(helmet|leggings|boots)',ident):return 'minecraft:diamond'
    if re.fullmatch(r'united_armor_(helmet|leggings|boots)',ident) or ident in {'ult_helmet','ult_chest','ult_leggings','ult_boots','ult_sword','ult_axe','ult_pickaxe'}:return 'minecraft:netherite_scrap'
    raise ValueError(f'durable item has no reviewed repair policy: {ident}')

def main():
    parser=argparse.ArgumentParser();mode=parser.add_mutually_exclusive_group(required=True);mode.add_argument('--write',action='store_true');mode.add_argument('--check',action='store_true');args=parser.parse_args()
    checked=0;materials={}
    for path in sorted(ITEMS.glob('*.json')):
        raw=path.read_bytes();obj=json.loads(raw);item=obj['minecraft:item'];comp=item.get('components',{});dur=comp.get('minecraft:durability')
        if not dur:continue
        ident=item['description']['identifier'];assert ident==f'hakkai:{path.stem}'
        maximum=dur['max_durability'];assert isinstance(maximum,int) and maximum>0
        material=repair_material(path.stem);amount=math.ceil(maximum/4)
        repair={'repair_items':[{'items':[material],'repair_amount':amount}]}
        if args.check:
            if comp.get('minecraft:repairable')!=repair:raise SystemExit(f'repair definition stale: {ident}')
        elif comp.get('minecraft:repairable')!=repair:
            comp['minecraft:repairable']=repair
            # Item files were authored both with CRLF and LF. Do not normalize.
            newline='\r\n' if b'\r\n' in raw else '\n'
            path.write_bytes((json.dumps(obj,ensure_ascii=False,indent=2)+'\n').replace('\n',newline).encode())
        checked+=1;materials[material]=materials.get(material,0)+1
    assert checked==250,(checked,'expected 250 reviewed durable equipment items')
    print(f'{checked} durable items '+('written' if args.write else 'verified')+f': {materials} (static; anvil not tested)')
if __name__=='__main__':main()
