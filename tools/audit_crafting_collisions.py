#!/usr/bin/env python3
"""Detect exact custom crafting conflicts, including horizontal mirrors.

This is not a full Bedrock recipe matcher: tags, item aliases/data matching,
vanilla or other packs, unlock conditions, and engine precedence are not
simulated. Report unhandled inputs rather than silently treating them as safe.
"""
import collections
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECIPES = ROOT / 'Hakkai_v7.1.0/BehaviorPack/recipes'


def item(entry):
    if isinstance(entry, str):
        return entry
    if isinstance(entry, dict) and set(entry) == {'item'} and isinstance(entry['item'], str):
        return entry['item']
    return None


def shaped_variants(recipe):
    pattern = recipe['pattern']
    width = max(map(len, pattern))
    grid = [[None if ch == ' ' else item(recipe['key'][ch]) for ch in row.ljust(width)] for row in pattern]
    if any(ch != ' ' and item(recipe['key'][ch]) is None for row in pattern for ch in row):
        return None
    # Empty outer rows/columns do not affect the matching position.
    while grid and all(cell is None for cell in grid[0]): grid.pop(0)
    while grid and all(cell is None for cell in grid[-1]): grid.pop()
    if not grid: raise ValueError('empty crafting pattern')
    while all(row[0] is None for row in grid): grid = [row[1:] for row in grid]
    while all(row[-1] is None for row in grid): grid = [row[:-1] for row in grid]
    original = tuple(tuple(row) for row in grid)
    return {original, tuple(tuple(reversed(row)) for row in grid)}


def scan(directory=RECIPES):
    recipes, skipped = [], []
    for path in sorted(directory.glob('*.json')):
        data = json.loads(path.read_text(encoding='utf8'))
        kind = next((kind for kind in ('shaped','shapeless') if f'minecraft:recipe_{kind}' in data), None)
        if not kind: continue
        r = data[f'minecraft:recipe_{kind}']
        if 'crafting_table' not in r.get('tags', []): continue
        variants = shaped_variants(r) if kind == 'shaped' else None
        inputs = [item(x) for x in r['ingredients']] if kind == 'shapeless' else None
        if (kind == 'shaped' and variants is None) or (kind == 'shapeless' and any(x is None for x in inputs)):
            skipped.append(path.name)
            continue
        if kind == 'shaped':
            first = next(iter(variants))
            counts = collections.Counter(x for row in first for x in row if x is not None)
        else:
            counts = collections.Counter(inputs)
        result = r['result']
        if isinstance(result, str): result = {'item': result, 'count': 1}
        else: result = {'count': 1, **result}
        output = json.dumps(result, sort_keys=True, ensure_ascii=False)
        recipes.append((path.name, kind, variants, counts, output))
    collisions = []
    for i, a in enumerate(recipes):
        for b in recipes[i+1:]:
            if a[4] == b[4] or a[3] != b[3]: continue
            if a[1] == 'shapeless' or b[1] == 'shapeless' or a[2] & b[2]:
                collisions.append((a[0], b[0]))
    return recipes, skipped, collisions


def main():
    recipes, skipped, collisions = scan()
    for a, b in collisions: print(f'CONFLICT {a} / {b}')
    for name in skipped: print(f'UNCHECKED {name}')
    print(f'{len(recipes)} custom crafting recipes checked; {len(collisions)} conflicts; {len(skipped)} unchecked')
    if collisions or skipped: raise SystemExit(1)


if __name__ == '__main__': main()
