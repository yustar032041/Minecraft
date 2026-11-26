"""Shared material costs for ranked weapons and armor recipes."""

def tier_material(rank):
    return {1: None, 2: 'minecraft:diamond', 3: 'minecraft:netherite_ingot'}[rank]


def with_tier_material(ingredients, rank):
    material = tier_material(rank)
    return [*ingredients, *([material] if material else [])]
