#!/usr/bin/env python3
"""Add Bedrock recipe-book unlocks without changing ingredients or results.

Recipe generators may recreate files; run --apply after generating recipes and
--check before packaging. Existing nonempty unlock rules are left untouched.
"""
import argparse
import json
from pathlib import Path

RECIPES = Path(__file__).resolve().parents[1] / 'Hakkai_v7.1.0/BehaviorPack/recipes'
TYPES = ('minecraft:recipe_shaped', 'minecraft:recipe_shapeless')
UNLOCK = [{'context': 'AlwaysUnlocked'}]


def run(apply=False):
    count = 0
    missing = []
    for path in sorted(RECIPES.glob('*.json')):
        text = path.read_text(encoding='utf8')
        data = json.loads(text)
        keys = [key for key in TYPES if key in data]
        if not keys:
            continue
        if len(keys) != 1:
            raise ValueError(f'{path.name}: more than one crafting definition')
        recipe = data[keys[0]]
        if 'crafting_table' not in recipe.get('tags', []):
            continue
        count += 1
        if recipe.get('unlock'):
            continue
        missing.append(path.name)
        if apply:
            # Insert at the top of the recipe body; preserve all other text.
            marker = f'  "{keys[0]}": {{\n'
            if text.count(marker) != 1 or 'unlock' in recipe:
                raise ValueError(f'{path.name}: cannot insert unlock safely')
            addition = '    "unlock": [\n      {\n        "context": "AlwaysUnlocked"\n      }\n    ],\n'
            updated = text.replace(marker, marker + addition, 1)
            check = json.loads(updated)
            actual = check[keys[0]].pop('unlock')
            if actual != UNLOCK or check != data:
                raise ValueError(f'{path.name}: unexpected recipe change')
            path.write_text(updated, encoding='utf8')
    print(f'{count} crafting recipes; {len(missing)} missing unlocks' + (' (added)' if apply else ''))
    return not missing or apply


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--apply', action='store_true')
    group.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if not run(args.apply):
        raise SystemExit('Run tools/sync_crafting_unlocks.py --apply after regenerating recipes')


if __name__ == '__main__':
    main()
