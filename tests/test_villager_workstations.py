"""Static linkage checks; these do not simulate Bedrock block ticks or crafting."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1] / 'Hakkai_v7.1.0'
bp, rp = root / 'BehaviorPack', root / 'ResourcePack'
atlas = json.loads((rp / 'textures/terrain_texture.json').read_text())['texture_data']
for role, ingredient in [('guide','compass'),('healer','golden_apple'),('artisan','chest'),('guard','shield'),('builder','iron_ingot')]:
    ident = 'hakkai:workstation_' + role
    tex = 'hakkai_workstation_' + role
    block = json.loads((bp / 'blocks' / f'workstation_{role}.json').read_text())['minecraft:block']
    recipe = json.loads((bp / 'recipes' / f'workstation_{role}.json').read_text())['minecraft:recipe_shapeless']
    loot = json.loads((bp / 'loot_tables/hakkai/blocks' / f'workstation_{role}.json').read_text())
    assert block['description']['identifier'] == ident
    c = block['components']
    assert c['hakkai:workstation'] == {} and c['minecraft:tick']['looping']
    assert c['minecraft:material_instances']['*']['texture'] == tex
    assert atlas[tex]['textures'] == 'textures/blocks/' + tex
    assert (rp / f'textures/blocks/{tex}.png').is_file()
    assert recipe['result']['item'] == ident
    assert {x['item'] for x in recipe['ingredients']} == {'minecraft:oak_planks','minecraft:crafting_table','minecraft:'+ingredient}
    assert loot['pools'][0]['entries'][0]['name'] == ident
    for language in ('ja_JP','en_US'):
        assert f'tile.{ident}.name=' in (rp / f'texts/{language}.lang').read_text()
print('Five workstation blocks, roles, recipes, loot and localised textures linked (static only)')
