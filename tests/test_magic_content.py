"""Retired magic item cleanup and live tome wiring (static only)."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
retired=['island_stone','magic_hikari','magic_kaze','magic_mizu','magic_homura','magic_kizuna']
atlas=json.loads((rp/'textures/item_texture.json').read_text())['texture_data']
for name in retired:
 assert not (bp/'items'/f'{name}.json').exists()
 assert not (bp/'recipes'/f'{name}.json').exists()
 assert 'hakkai_'+name not in atlas
 for suffix in ('.png','_normal.png','_mer.png','.texture_set.json'):
  assert not (rp/'textures/items'/f'hakkai_{name}{suffix}').exists()
 for lang in ('ja_JP','en_US'):
  assert f'item.hakkai:{name}.name=' not in (rp/'texts'/f'{lang}.lang').read_text()
# Catch stale references in all loadable pack text, not just the item registry.
for pack in (bp,rp):
 for file in pack.rglob('*'):
  if not file.is_file() or file.suffix not in ('.json','.js','.lang'):continue
  text=file.read_text(encoding='utf-8-sig')
  for name in retired:
   assert 'hakkai:'+name not in text and 'hakkai_'+name not in text,(file,name)
for name in ('element_tome','fushi_totem'):
 assert 'hakkai:use' in json.loads((bp/'items'/f'{name}.json').read_text())['minecraft:item']['components']
main=(bp/'scripts/main.js').read_text()
for token in ('totemMagicMenu',"castMagic(p,'moon')",'staggerTarget(enemy','castTome','月のまどろみ'):
 assert token in main,token
for name in retired:assert name not in main
print('Six retired items and assets removed; tome and totem spell wiring retained (static only)')
