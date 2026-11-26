"""Experience balance for living 8界風記 entities (not vehicles/visuals).

Bedrock emits ordinary shared XP orbs using its last-hit query, independently of
our scripted per-participant item rewards. This is a tuning baseline, not an
assurance of Bedrock/Android event ordering or balance.
"""
import re


def xp_for(name):
    if re.fullmatch(r'foe_[0-7]_(?:[0-9]|1[01])', name):
        return 5
    if match := re.fullmatch(r'wild_[0-7]_([0-2])', name):
        return 5 if match[1] == '2' else 2
    if re.fullmatch(r'ender_[0-7]', name):
        return 5
    if re.fullmatch(r'guardian_[0-7]', name):
        return 12
    return {'fushi': 2, 'fushi_chief': 15, 'eclipse_colossus': 50,
            'time_warden': 100, 'village_archer': 2, 'village_mage': 2,
            'village_watch': 2}.get(name)


def experience_reward(name):
    amount = xp_for(name)
    if amount is None:
        raise ValueError(f'No experience policy for {name}')
    return {'on_death': f'query.last_hit_by_player ? {amount} : 0'}
