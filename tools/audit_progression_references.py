#!/usr/bin/env python3
"""Cross-check explicit custom progression references, not survival reachability.

Only declared item/block IDs, four JSON recipe types, explicit item loot entries,
loot links, block placers, Japanese names and custom icon paths are inspected.
Vanilla IDs, tags, dynamic JS, components outside these fields, recipe matching,
engine schemas and whether a route is reachable in-game are not validated.
"""
import argparse
import collections
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'Hakkai_v7.1.0'


def load(path):
    return json.loads(path.read_text(encoding='utf8'))


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def safe_path(root, text):
    path = Path(text)
    if path.is_absolute() or '..' in path.parts:
        return None
    return root / path


def audit(pack):
    bp, rp = pack/'BehaviorPack', pack/'ResourcePack'
    errors, ignored, defs = [], [], {}
    counts = collections.Counter()
    def problem(path, message):
        errors.append(f'{path.relative_to(pack)}: {message}')
    def custom_item(value, path, where):
        if isinstance(value, str) and value.startswith('hakkai:') and value not in defs:
            problem(path, f'{where}: undeclared custom item/block {value}')
    names = {line.split('=',1)[0] for line in (rp/'texts/ja_JP.lang').read_text(encoding='utf8').splitlines() if '=' in line and not line.startswith('#')}
    atlas = load(rp/'textures/item_texture.json')['texture_data']
    for directory, component in [('items','minecraft:item'), ('blocks','minecraft:block')]:
        for path in sorted((bp/directory).glob('*.json')):
            body=load(path)[component]; ident=body['description']['identifier'];counts[directory]+=1
            if ident in defs: problem(path, f'duplicate identifier {ident}')
            defs[ident]=(directory,body)
            prefix='item.' if directory=='items' else 'tile.'
            if prefix+ident+'.name' not in names:problem(path, f'missing Japanese name {ident}')
            if directory=='items':
                icon=body.get('components',{}).get('minecraft:icon')
                if isinstance(icon,dict):icon=icon.get('textures',{}).get('default')
                if isinstance(icon,str) and icon.startswith('hakkai_'):
                    if icon not in atlas:problem(path, f'missing custom item atlas key {icon}')
                    else:
                        textures=atlas[icon].get('textures')
                        # Current atlas stores plain paths; reject unrecognised shapes
                        # instead of silently accepting a missing resource.
                        if isinstance(textures,str):paths=[textures]
                        elif isinstance(textures,list) and all(isinstance(v,str) for v in textures):paths=textures
                        else:ignored.append(f'{path.relative_to(pack)}: icon atlas shape for {icon}') ;paths=[]
                        for name in paths:
                            base=safe_path(rp,name)
                            if not base or not any(Path(str(base)+ext).is_file() for ext in ('.png','.tga','.jpg','.jpeg')):
                                problem(path,f'missing icon file {name}')
    for directory, component in [('items','minecraft:item'),('blocks','minecraft:block'),('entities','minecraft:entity')]:
        for path in sorted((bp/directory).glob('*.json')):
            body=load(path)[component]
            if directory=='items':
                placer=body.get('components',{}).get('minecraft:block_placer')
                if isinstance(placer,dict) and isinstance(placer.get('block'),str):
                    block=placer['block']
                    if block.startswith('hakkai:') and (block not in defs or defs[block][0]!='blocks'):problem(path,f'block placer target missing {block}')
            for obj in walk(body):
                loot=obj.get('minecraft:loot')
                if loot is None:continue
                loc=loot if isinstance(loot,str) else loot.get('table') if isinstance(loot,dict) else None
                if not isinstance(loc,str):ignored.append(f'{path.relative_to(pack)}: unknown loot component');continue
                counts['loot_links']+=1
                target=safe_path(bp,loc)
                if not target or not target.is_file():problem(path,f'missing loot table {loc}')
    for path in sorted((bp/'loot_tables').rglob('*.json')):
        counts['loot_tables']+=1
        for obj in walk(load(path)):
            if obj.get('type')=='item':
                if not isinstance(obj.get('name'),str):problem(path,'item loot entry has no name')
                else:custom_item(obj['name'],path,'loot')
                counts['loot_item_entries']+=1
            elif obj.get('type')=='loot_table':
                loc=obj.get('name');target=safe_path(bp,loc) if isinstance(loc,str) else None
                if not target or not target.is_file():problem(path,f'missing nested loot table {loc}')
    for path in sorted((bp/'recipes').glob('*.json')):
        data=load(path); keys=[k for k in data if k.startswith('minecraft:recipe_')];counts['recipes']+=1
        if len(keys)!=1:problem(path,'expected one recipe');continue
        kind=keys[0].removeprefix('minecraft:recipe_');r=data[keys[0]]
        if kind not in ('shaped','shapeless','furnace','brewing_mix'):
            ignored.append(f'{path.relative_to(pack)}: recipe type {kind}');continue
        values=[r.get('result',r.get('output'))]
        if kind=='shaped':values+=list(r.get('key',{}).values())
        elif kind=='shapeless':values+=r.get('ingredients',[])
        else:
            values.append(r.get('input'))
            if kind=='brewing_mix':values.append(r.get('reagent'))
        for value in values:
            if isinstance(value,str):custom_item(value,path,'recipe')
            elif isinstance(value,dict) and isinstance(value.get('item'),str):custom_item(value['item'],path,'recipe')
            else:ignored.append(f'{path.relative_to(pack)}: unsupported recipe ingredient/output {value!r}')
    return counts, errors, ignored


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--pack',type=Path,default=ROOT);args=parser.parse_args()
    counts, errors, ignored=audit(args.pack)
    for error in errors: print('ERROR',error)
    for entry in ignored: print('UNCHECKED',entry)
    print('Static custom references:',', '.join(f'{k}={counts[k]}' for k in ('items','blocks','recipes','loot_tables','loot_links','loot_item_entries')),f'errors={len(errors)}, unchecked={len(ignored)}')
    print('Vanilla IDs, dynamic scripts, obtainability, matching and Bedrock execution are NOT verified.')
    if errors or ignored:raise SystemExit(1)

if __name__=='__main__':main()
