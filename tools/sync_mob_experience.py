#!/usr/bin/env python3
"""Sync only experience components; do not regenerate textures/other assets."""
import argparse
import json
from pathlib import Path
from mob_experience import experience_reward, xp_for

ENTITIES = Path(__file__).resolve().parents[1] / 'Hakkai_v7.1.0/BehaviorPack/entities'
EXCLUDED = {'kinetic_visual', 'shore_ferry', 'time_train'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    updates = []
    for path in sorted(ENTITIES.glob('*.json')):
        doc = json.loads(path.read_text(encoding='utf8'))
        entity = doc['minecraft:entity']
        name = entity['description']['identifier'].removeprefix('hakkai:')
        if name in EXCLUDED:
            assert 'minecraft:experience_reward' not in entity.get('components', {}), name
            continue
        if xp_for(name) is None:
            raise ValueError(f'Unclassified entity {name}; update the XP policy explicitly')
        components = entity['components']
        expected = experience_reward(name)
        if components.get('minecraft:experience_reward') == expected:
            continue
        components['minecraft:experience_reward'] = expected
        updates.append((path, doc))
    if args.check:
        if updates:
            raise SystemExit('Out of sync: ' + ', '.join(p.name for p, _ in updates))
        print('All living entity XP components match the policy; vehicles and display excluded')
        return
    for path, doc in updates:
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(f'Updated {len(updates)} entity definitions')


if __name__ == '__main__':
    main()
