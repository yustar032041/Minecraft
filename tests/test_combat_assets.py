"""References and wiring only; cannot verify Bedrock visuals or animations."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';rp=root/'ResourcePack';bp=root/'BehaviorPack'
for name in ('wind_trace','wind_burst'):
 effect=json.loads((rp/'particles'/f'{name}.json').read_text())['particle_effect']
 assert effect['description']['identifier']==f'hakkai:{name}'
 assert effect['components']['minecraft:emitter_rate_instant']['num_particles']==1
 texture=effect['description']['basic_render_parameters']['texture']
 assert (rp/(texture+'.png')).is_file()
animations=json.loads((rp/'animations/wind_trace.animation.json').read_text())['animations']
assert {'animation.hakkai.wind_trace_a','animation.hakkai.wind_trace_b','animation.hakkai.guard_enter','animation.hakkai.dodge_roll','animation.hakkai.parry_rebound','animation.hakkai.air_dash','animation.hakkai.air_strike','animation.hakkai.magic_cast'}<=set(animations)
main=(bp/'scripts/main.js').read_text(encoding='utf8');combat=(bp/'scripts/combat_resonance.js').read_text(encoding='utf8')
for token in ['combatResonance?.onHurt','combatResonance?.consume','combatResonance?.level','combatResonance?.clear','combatEnemies(p,r,cap)','applyCombatHit(p,e,str,a,mod,push)','風紋連撃・戦闘の試作']:
 assert token in main,token
assert main.index("s.m<cost||s.s<effort")<main.index('combatResonance?.consume(p,g)')
assert 'g&&!parried&&(!weaponTrace?.enabled()||!isTraceWeapon(g))&&p.isSneaking' in main
for token in ('combatGuard?.tick','combatGuard?.scale','combatGuard?.invalidate','combatGuard?.clear','spendParry:', 'prepareWindRay(p,g)', 'renderWindRay(p,beam)', 'combatResonance?.consumeCombo(p,g)', '二連終撃', 'combatRoll?.tick', 'combatRoll?.blocks', 'combatRoll?.clear', 'combatParry?.tick', 'combatParry?.tryHit', 'combatParry?.isStaggered', 'combatParry?.flush', 'animation.hakkai.parry_rebound', 'airDash?.tick', 'airDash?.clear', 'setupAirDash({notice})','airStrike?.tick','airStrike?.onHurt','airStrike?.chargeMelee','airStrike?.clear','castNewMagic({p,s:state(p)' ):
 assert token in main,token
assert main.index('prepareWindRay(p,g)')<main.index('s.m-=cost')<main.index('combatResonance?.consume(p,g)')
assert 'combatResonance?.clear(playerId)' in main and 'combatResonance?.clear(p.id)' in main
roll=animations['animation.hakkai.dodge_roll']
assert roll['animation_length']==0.5 and 'root' in roll['bones']
assert roll['bones']['root']['rotation']['0.5']==[360,0,0]
assert 'hakkai:wind_trace' in combat and 'hakkai:wind_burst' in main
assert 'ph:' not in combat and 'ph:' not in main
print('Original wind-trace particle, animation and event wiring OK (static only)')
