"""Static crafting-grid and unlock checks; this is not a Bedrock runtime test."""
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'tools'))
from sync_crafting_unlocks import run

recipes = root / 'Hakkai_v7.1.0/BehaviorPack/recipes'
assert run(), 'Crafting recipe unlock is missing; run tools/sync_crafting_unlocks.py --apply'
ids = set()
total = 0
for path in recipes.glob('*.json'):
    data = json.loads(path.read_text(encoding='utf8'))
    kinds = [kind for kind in ('minecraft:recipe_shaped', 'minecraft:recipe_shapeless') if kind in data]
    assert len(kinds) <= 1, path
    if not kinds:
        continue
    kind = kinds[0]
    recipe = data[kind]
    if 'crafting_table' not in recipe.get('tags', []):
        continue
    total += 1
    assert recipe.get('unlock'), path
    identifier = recipe['description']['identifier']
    assert identifier not in ids, (path, identifier)
    ids.add(identifier)
    if kind.endswith('shapeless'):
        assert 1 <= len(recipe['ingredients']) <= 9, path
        assert all(isinstance(v, dict) and isinstance(v.get('item'), str) for v in recipe['ingredients']), path
    else:
        pattern = recipe['pattern']
        assert 1 <= len(pattern) <= 3 and all(1 <= len(row) <= 3 for row in pattern), path
        assert len({len(row) for row in pattern}) == 1, path
        chars = set(''.join(pattern)) - {' '}
        assert chars and chars == set(recipe['key']), path
    result = recipe['result']
    assert isinstance(result.get('item'), str) and isinstance(result.get('count', 1), int) and result.get('count', 1) >= 1, path
for name in ('guide', 'return_stone', 'crusher', 'element_tome', 'warden_sigil'):
    data = json.loads((recipes / f'{name}.json').read_text(encoding='utf8'))
    assert data['minecraft:recipe_shapeless']['unlock'] == [{'context': 'AlwaysUnlocked'}]
assert total > 0
print(f'{total} crafting-table recipes have unlock data, unique IDs and fit a 3x3 grid (static only)')
