#!/usr/bin/env python3
"""Render the current appearance prototypes into an offline HTML gallery.

Requires Pillow. Each image is an approximate static rest pose, not Bedrock.
The explicitly specified output directory must be outside the resource pack.
"""
import argparse
import html
import json
from pathlib import Path
from PIL import Image
from preview_mob_geometry import RP, render

GROUPS = {
    '草原の敵': [(f'foe_0_{i}', f'foe_0_{i}') for i in range(12)],
    '霧の森の敵': [(f'foe_1_{i}', f'foe_1_{i}') for i in range(12)],
    '砂の回廊の敵': [(f'foe_2_{i}', f'foe_2_{i}') for i in range(12)],
    '氷の鏡湖の敵': [(f'foe_3_{i}', f'foe_3_{i}') for i in range(12)],
    '雷の断崖の敵': [(f'foe_4_{i}', f'foe_4_{i}') for i in range(12)],
    '闇の地下庭園の敵': [(f'foe_5_{i}', f'foe_5_{i}') for i in range(12)],
    '空の浮島群の敵': [(f'foe_6_{i}', f'foe_6_{i}') for i in range(12)],
    '時の終着駅の敵': [(f'foe_7_{i}', f'foe_7_{i}') for i in range(12)],
    '終焉の八界王': [('eclipse_colossus','eclipse_colossus')],
    '村の見回り': [(n,n) for n in ('village_archer','village_mage','village_watch')],
    '守護獣': [(f'guardian_{i}', f'guardian_{i}') for i in range(8)],
    '界渡り': [(f'ender_{i}', f'hakkai_ender_r{i}') for i in range(8)],
    '草原の野生': [(f'wild_0_{i}', f'wild_0_{i}') for i in range(3)],
    '霧の森の野生': [(f'wild_1_{i}', f'wild_1_{i}') for i in range(3)],
    '砂の回廊の野生': [(f'wild_2_{i}', f'wild_2_{i}') for i in range(3)],
    '氷の鏡湖の野生': [(f'wild_3_{i}', f'wild_3_{i}') for i in range(3)],
    '雷の断崖の野生': [(f'wild_4_{i}', f'wild_4_{i}') for i in range(3)],
    '闇の地下庭園の野生': [(f'wild_5_{i}', f'wild_5_{i}') for i in range(3)],
    '空の浮島群の野生': [(f'wild_6_{i}', f'wild_6_{i}') for i in range(3)],
    '時の終着駅の野生': [(f'wild_7_{i}', f'wild_7_{i}') for i in range(3)],
}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',required=True,type=Path)
    parser.add_argument('--panel',type=int,default=240)
    args=parser.parse_args()
    if args.panel<100 or args.panel>800: parser.error('panel must be between 100 and 800')
    target=args.output_dir.resolve()
    if target==RP.resolve() or target.is_relative_to(RP.resolve()): parser.error('output must be outside the resource pack')
    target.mkdir(parents=True,exist_ok=True)
    groups=[]
    for label,items in GROUPS.items():
        cards=[]
        for name,stem in items:
            data=json.loads((RP/f'models/entity/{name}.geo.json').read_text(encoding='utf8'))
            models=data['minecraft:geometry']
            if len(models)!=1: raise ValueError(f'{name}: expected one geometry')
            texture=Image.open(RP/f'textures/entity/{stem}.png').convert('RGBA')
            desc=models[0]['description']
            if texture.size!=(desc['texture_width'],desc['texture_height']): raise ValueError(f'{name}: texture dimensions do not match geometry')
            render(models[0],texture,args.panel).save(target/f'{name}.png')
            cards.append(f'<figure><figcaption>{html.escape(name)}</figcaption><img loading="lazy" alt="{html.escape(name)} rest pose" src="{html.escape(name)}.png"></figure>')
        groups.append(f'<section><h2>{html.escape(label)}</h2><div class="grid">{"".join(cards)}</div></section>')
    page='''<!doctype html><html lang="ja"><meta charset="utf-8"><title>MOB簡易プレビュー</title>
<style>body{font-family:sans-serif;background:#16191d;color:#eee;max-width:1500px;margin:auto;padding:1em} .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1em} figure{margin:0;background:#222831;padding:.6em} img{width:100%;height:auto} figcaption{padding:.3em}</style>
<h1>追加MOBの簡易プレビュー</h1><p>静止姿勢の近似。Bedrockの描画ではありません。回転・UVの向き・重なり・透明部分・アニメーション・PBR・実機負荷は要確認。</p>'''+''.join(groups)+'</html>\n'
    (target/'index.html').write_text(page,encoding='utf8')
    print(f'{sum(len(items) for items in GROUPS.values())} approximate rest-pose previews: {target}/index.html (not Bedrock)')

if __name__=='__main__': main()
