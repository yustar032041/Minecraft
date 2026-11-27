"""Static coverage and policy consistency. Actual XP is Bedrock engine behavior."""
import collections
import importlib.util
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
bp = root/'Hakkai_v7.1.0/BehaviorPack'
spec = importlib.util.spec_from_file_location('mob_experience', root/'tools/mob_experience.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)
counts = collections.Counter()
# King summons deliberately yield no XP and must not count as a normal boss.
excluded = {'kinetic_visual', 'shore_ferry', 'time_train'} | {f'king_guardian_{i}' for i in range(8)} | {f'warden_sword_{i}' for i in range(8)}
for path in (bp/'entities').glob('*.json'):
    data = json.loads(path.read_text(encoding='utf8'))['minecraft:entity']
    name = path.stem
    assert data['description']['identifier'] == f'hakkai:{name}'
    components = data['components']
    amount = policy.xp_for(name)
    if name in excluded:
        assert amount is None and 'minecraft:experience_reward' not in components
        continue
    assert amount is not None, f'New entity needs explicit XP classification: {name}'
    assert components.get('minecraft:experience_reward') == policy.experience_reward(name), name
    assert all('minecraft:experience_reward' not in group for group in data.get('component_groups', {}).values()), name
    counts[amount] += 1
assert counts == {2:20, 5:112, 12:8, 15:1, 50:1, 100:1}, counts
for name in ['create_realm_endermen.py','create_fushi_content.py','create_warden_content.py']:
    source=(root/'tools'/name).read_text(encoding='utf8')
    assert 'from mob_experience import experience_reward' in source
    assert "['minecraft:experience_reward']=experience_reward(" in source
print('143 living entities: player-last-hit XP policy; vehicles/visual excluded (static only)')
