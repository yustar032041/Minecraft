"""Custom fallback cubes must retain a complete, unpermuted collision box."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack'
s=(root/'scripts/full_cube_floor.js').read_text()
names=re.search(r"const custom=new Set\('([^']+)'",s).group(1).split()+[f'ore_{i}' for i in range(20)]
for name in names:
    b=json.loads((root/'blocks'/f'{name}.json').read_text())['minecraft:block']
    c=b['components']
    assert c['minecraft:geometry']=='minecraft:geometry.full_block',name
    assert 'minecraft:collision_box' not in c and not b.get('permutations'),name
print(f'{len(names)} custom floor fallback blocks use default full-cube collision')
