"""Exact custom recipes only, not Bedrock's full recipe matcher."""
import collections
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from audit_crafting_collisions import RECIPES, scan

recipes, skipped, collisions = scan()
assert len(recipes) >= 400  # 100 duplicate creature-material recipes were consolidated
assert not skipped, skipped
assert not collisions, collisions

# Eleven distinct gallery results retain their previous quantities and
# materials; even a horizontal reflection or rotation cannot merge the eight.
def recipe(name):
    return json.loads((RECIPES / (name + '.json')).read_text(encoding='utf8'))['minecraft:recipe_shaped']

def counts(r):
    return collections.Counter(r['key'][c]['item'] for row in r['pattern'] for c in row if c != ' ')

def orbit(g):
    g = tuple(g)
    result = set()
    for _ in range(4):
        result.add(g)
        result.add(tuple(row[::-1] for row in g))
        g = tuple(''.join(g[len(g)-1-j][i] for j in range(len(g))) for i in range(len(g[0])))
    return result

wall = ['gallery_floor', 'gallery_wall', 'gallery_ceiling']
realm = ['realm_gallery_' + n for n in ('meadow','mist','dune','frost','thunder','garden','cloud','time')]
for name in wall:
    r = recipe(name)
    assert counts(r) == {'hakkai:brasswork': 2, 'hakkai:clockstone': 2}
    assert r['result'] == {'item': 'hakkai:' + name, 'count': 4}
for i, name in enumerate(realm):
    r = recipe(name)
    assert counts(r) == {'hakkai:brasswork': 4, 'hakkai:chronicle_fragment': 4, 'hakkai:relic_statue': 1}
    assert r['result'] == {'item': 'hakkai:' + name, 'count': 2}
    for other in realm[:i]:
        assert tuple(recipe(other)['pattern']) not in orbit(r['pattern']), (name, other)

index_text = (ROOT / 'Hakkai_v7.1.0/BehaviorPack/scripts/recipe_index.js').read_text(encoding='utf8')
index = json.loads(index_text.split('export const RECIPE_INDEX=', 1)[1].split(';\n', 1)[0])
for name in wall + realm:
    r = recipe(name)
    row = next(row for row in index if 'レシピID：hakkai:' + name + '\n' in row[2])
    assert '\n'.join(r['pattern']) in row[2], name
    assert '完成：' in row[2] and '×' + str(r['result']['count']) in row[2]

# Exercise the detector itself: mirrors, translations, shapeless-vs-shaped,
# different output counts, unsupported tag ingredients and non-crafting tags.
def shaped(pattern, result='hakkai:out', tags=None):
    return {'minecraft:recipe_shaped': {'tags': tags or ['crafting_table'], 'pattern': pattern,
      'key': {'A': {'item': 'minecraft:stone'}, 'B': {'item': 'minecraft:dirt'}}, 'result': {'item': result, 'count': 1}}}
def put(root, name, data):
    (root / (name + '.json')).write_text(json.dumps(data), encoding='utf8')
with tempfile.TemporaryDirectory() as tmp:
    d = Path(tmp)
    put(d, 'a', shaped(['AB']))
    put(d, 'b', shaped([' BA'], 'hakkai:other'))
    put(d, 'c', {'minecraft:recipe_shapeless': {'tags': ['crafting_table'], 'ingredients': [{'item':'minecraft:stone'}, {'item':'minecraft:dirt'}], 'result': {'item':'hakkai:third'}}})
    put(d, 'ignored', shaped(['AB'], 'hakkai:ignored', ['other_station']))
    put(d, 'unsupported', {'minecraft:recipe_shapeless': {'tags': ['crafting_table'], 'ingredients': [{'tag':'minecraft:is_plank'}], 'result': {'item':'hakkai:tag'}}})
    _, unknown, conflicts = scan(d)
    assert set(conflicts) == {('a.json','b.json'), ('a.json','c.json'), ('b.json','c.json')}
    assert unknown == ['unsupported.json']
with tempfile.TemporaryDirectory() as tmp:
    d = Path(tmp)
    a = shaped(['AB'])
    b = shaped(['AB'])
    b['minecraft:recipe_shaped']['result']['count'] = 2
    put(d, 'a', a); put(d, 'b', b)
    assert scan(d)[2] == [('a.json', 'b.json')]
print(f'{len(recipes)} exact-item crafting recipes: no conflicting custom outputs; gallery 11 recipes keep ingredients and counts')
