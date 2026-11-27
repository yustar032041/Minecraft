"""Selected secondary joints for the redesigned enemy rigs.

These are restrained provisional keyframes, not finished bespoke animation.
The explicit selection avoids moving every decorative bone automatically.
Existing authored secondary tracks always take precedence.
"""
# Order is foe index 0..11 within each realm. These names are local (unprefixed)
# joints in the corresponding individual model, not legacy model families.
SELECTED = (
 ('tail shin_0 shin_1 shin_2 shin_3','','','','tail','wing_l_tip wing_r_tip tail','','tail','shin_0 shin_1 shin_2 shin_3 tail','wing_l_tip wing_r_tip tail','','tail'),
 ('tail tail_fan','wing_l_tip wing_r_tip','forearm_l forearm_r','shell_l shell_r','tail_mid tail_tip','wing_l_tip wing_r_tip','leg_tip_0 leg_tip_1 leg_tip_2 leg_tip_3 leg_tip_4 leg_tip_5 leg_tip_6 leg_tip_7','ear_l ear_r','forearm_l forearm_r','wing_l_tip wing_r_tip','tail_blade hock_0 hock_1 hock_2 hock_3','leg_tip_0 leg_tip_1 leg_tip_2 leg_tip_3 leg_tip_4 leg_tip_5 leg_tip_6 leg_tip_7'),
 ('shell_l shell_r drill','ear_l ear_r','forearm_l forearm_r','shell_l shell_r','tail_mid tail_tip','wing_l_tip wing_r_tip','leg_tip_0 leg_tip_1 leg_tip_2 leg_tip_3 leg_tip_4 leg_tip_5 leg_tip_6 leg_tip_7','ear_l ear_r','shell_l shell_r','tail_tip','wing_l_tip wing_r_tip','forearm_l forearm_r'),
 ('wing_l_tip wing_r_tip','wing_l_tip wing_r_tip','fist_l fist_r','shell_l shell_r','tail_mid tail_tip','wing_l_tip wing_r_tip','leg_tip_0 leg_tip_1 leg_tip_2 leg_tip_3 leg_tip_4 leg_tip_5 leg_tip_6 leg_tip_7','ear_l ear_r','forearm_l forearm_r','wing_l_tip wing_r_tip','tail_tip paw_0 paw_1 paw_2 paw_3','shell_l shell_r'),
 ('fist_l fist_r','wing_l_tip wing_r_tip','fist_l fist_r','shell_l shell_r','tail_tip paw_0 paw_1 paw_2 paw_3','wing_l_tip wing_r_tip','leg_tip_0 leg_tip_1 leg_tip_2 leg_tip_3 leg_tip_4 leg_tip_5 leg_tip_6 leg_tip_7','ear_l ear_r','forearm_l forearm_r','wing_l_tip wing_r_tip','forearm_l forearm_r shield','wing_l_tip wing_r_tip tail_tip'),
 ('tip_0 tip_1 tip_2 tip_3 tip_4 tip_5','tip_0 tip_1 tip_2 tip_3 tip_4 tip_5 tip_6 tip_7','fist_l fist_r','shell_l shell_r','tail_mid tail_tip','wing_l_tip wing_r_tip','tip_0 tip_1 tip_2 tip_3 tip_4 tip_5 tip_6 tip_7','ear_l ear_r','jaw_l jaw_r','tip_0 tip_1 tip_2 tip_3 tip_4 tip_5 tip_6 tip_7','fist_l fist_r','wing_l_tip wing_r_tip'),
 ('wing_l_tip wing_r_tip tail_fan','wing_l_tip wing_r_tip','fist_l fist_r','shell_l shell_r','tail_tip','wing_l_tip wing_r_tip','foot_0 foot_1 foot_2 foot_3 foot_4 foot_5 foot_6 foot_7','ear_l ear_r','wing_l_tip wing_r_tip','tail_mid tail_tip','fist_l fist_r shield','tail'),
 ('piston_0 piston_1 piston_2 piston_3','hand_l hand_r','fist_l fist_r','shell_l shell_r','tail_mid tail_tip','wing_l_tip wing_r_tip','foot_0 foot_1 foot_2 foot_3 foot_4 foot_5 foot_6 foot_7','ear_l ear_r','hand_l hand_r shield','ear_l ear_r hock_0 hock_1 hock_2 hock_3','piston_0 piston_1 piston_2 piston_3','wing_l_tip wing_r_tip'),
)

def vector(name):
    if name.startswith(('wing_','shell_','jaw_')):
        return [0,0,7 if '_l' in name else -7]
    if name.startswith(('leg_tip_','tip_','foot_')):
        return [0,0,5 if int(name.rsplit('_',1)[1])%2==0 else -5]
    if name.startswith(('tail','tail_mid','tail_tip','tail_blade','tail_fan')):
        return [0,7,0]
    if name == 'shield': return [0,0,6]
    if name == 'drill': return [6,0,0]
    if name.startswith(('ear_','forearm_','fist_','hand_','piston_','paw_','hock_','shin_')):
        return [-7,0,0]
    raise ValueError('unclassified secondary joint '+name)

def add_details(anims, prefixed_bones, prefix, realm, index):
    """Add selected attack tracks without replacing any pre-existing track."""
    names=SELECTED[realm][index].split()
    if len(names)!=len(set(names)):raise ValueError('duplicate joint selection')
    if not all(prefix+n in prefixed_bones for n in names):
        raise ValueError(f'{prefix}: selected missing joints {set(prefix+n for n in names)-prefixed_bones}')
    for name in names:
        if name in anims['windup']['bones'] or name in anims['strike']['bones']:continue
        end=vector(name);rebound=[round(-v*.6,2) for v in end]
        anims['windup']['bones'][name]={'rotation':{'0.0':[0,0,0],'1.9':end}}
        anims['strike']['bones'][name]={'rotation':{'0.0':end,'0.12':rebound,'0.38':[0,0,0]}}


def align_strike_start(anims):
    """Join selected provisional tracks without changing their later poses.

    Only numeric rotation keys common to both phases are adjusted. This is an
    offline approximation; Bedrock animation blending remains to be tested.
    """
    from copy import deepcopy
    for name,wind in anims['windup']['bones'].items():
        strike=anims['strike']['bones'].get(name)
        if not strike:continue
        a=wind.get('rotation');b=strike.get('rotation')
        if isinstance(a,dict) and isinstance(b,dict) and '1.9' in a and '0.0' in b:
            if not (isinstance(a['1.9'],list) and len(a['1.9'])==3 and all(isinstance(n,(int,float)) for n in a['1.9'])):
                raise ValueError('unexpected final pose '+name)
            b['0.0']=deepcopy(a['1.9'])


def neutral_wild_contact(strike, bones, prefix, realm):
    """Neutral-start native contact for the eight retaliating wild species.

    Preserve the previous body/head impact and recovery exactly; the extra
    legs and tail or antennae are restrained cosmetic motion only. No claim is
    made about Bedrock's runtime animation layering.
    """
    from copy import deepcopy
    contact = deepcopy(strike)
    for track in contact['bones'].values():
        rotation = track.get('rotation')
        if not isinstance(rotation, dict) or '0.0' not in rotation:
            raise ValueError('unexpected neutral wildlife contact track')
        rotation['0.0'] = [0, 0, 0]
    children = ('tail', 'tail_tip', 'antenna_l antenna_r', 'tail',
                'tail', 'antenna_l antenna_r', 'tail', 'tail_plate')[realm].split()
    for n in range(6 if realm in (2, 5) else 4):
        name = f'leg_{n}'
        if prefix + name not in bones or name in contact['bones']:
            raise ValueError(f'missing or duplicate contact joint {prefix+name}')
        peak = -5 if n % 2 == 0 else 5
        contact['bones'][name] = {'rotation': {'0.0': [0, 0, 0], '0.12': [peak, 0, 0], '0.38': [0, 0, 0]}}
    for n, name in enumerate(children):
        if prefix + name not in bones or name in contact['bones']:
            raise ValueError(f'missing or duplicate contact joint {prefix+name}')
        peak = 6 if n % 2 == 0 else -6
        contact['bones'][name] = {'rotation': {'0.0': [0, 0, 0], '0.12': [0, peak, 0], '0.38': [0, 0, 0]}}
    return contact

# Secondary bones introduced by the subsequent static anatomy pass. Explicit
# per-rig mapping avoids giving decorative parts the wrong motion. Angles are
# deliberately small; the pre-existing limb animations remain authoritative.
REFINED_JOINTS = {
 (0,10):'forearm_l forearm_r',
 (1,3):'foot_0 foot_1 foot_2 foot_3 foot_4 foot_5',
 (1,7):'hock_2 hock_3', (1,11):'fang_l fang_r',
 (2,1):'hock_2 hock_3', (2,4):'pad_0 pad_1 pad_2 pad_3',
 (2,6):'jaw_l jaw_r', (2,7):'hock_2 hock_3', (2,8):'jaw',
 (2,9):'paw_0 paw_1 paw_2 paw_3', (3,0):'talon_0 talon_1',
 (3,3):'chisel', (3,6):'jaw_l jaw_r', (3,7):'hock_2 hock_3',
 (4,0):'foot_0 foot_1', (4,6):'electrode', (4,7):'hock_2 hock_3',
 (4,9):'talon_0 talon_1', (4,11):'hock_2 hock_3',
 (5,3):'mandible_l mandible_r', (5,7):'hock_2 hock_3',
 (5,11):'talon_0 talon_1', (6,0):'hock_2 hock_3',
 (6,7):'hock_2 hock_3', (6,11):'hock_2 hock_3', (7,7):'hock_2 hock_3',
}

def add_refined_joints(anims, prefixed_bones, prefix, realm, index):
    """Add explicit small walk/attack tracks for the newly articulated parts.

    Strikes start at the windup endpoint; separate native-contact copies start
    at zero because they have no warning phase. These tracks do not alter AI,
    collision, damage, or claim to model Bedrock's animation blending.
    """
    names=REFINED_JOINTS.get((realm,index),'').split()
    for name in names:
        if prefix+name not in prefixed_bones:
            raise ValueError(f'missing refined joint {prefix+name}')
        if any(name in anims[p]['bones'] for p in ('walk','windup','strike')):
            raise ValueError(f'pre-authored refined joint {prefix+name}')
        if name.startswith(('foot_','hock_','pad_','paw_','talon_')):
            n=int(name.rsplit('_',1)[1]);sign=1 if n%2==0 else -1
            anims['walk']['bones'][name]={'rotation':[f'math.cos(query.anim_time * 300 + {n%2*180}) * 3',0,0]}
            end=[-4*sign,0,0]
        elif name.startswith('forearm_'):
            phase=0 if name.endswith('_l') else 180
            anims['walk']['bones'][name]={'rotation':[f'math.cos(query.anim_time * 300 + {phase}) * 3',0,0]}
            end=[-5,0,0]
        elif name.startswith(('jaw_','fang_','mandible_')):
            end=[0,0,5 if name.endswith('_l') else -5]
        elif name in ('jaw','chisel'):
            end=[-5,0,0]
        elif name=='electrode':
            end=[0,0,4]
        else:raise ValueError(f'unknown refined joint {name}')
        impact=[round(-x*.6,2) for x in end]
        anims['windup']['bones'][name]={'rotation':{'0.0':[0,0,0],'1.9':end}}
        anims['strike']['bones'][name]={'rotation':{'0.0':end,'0.12':impact,'0.38':[0,0,0]}}

def neutral_refined_contact(anims, realm, index):
    for name in REFINED_JOINTS.get((realm,index),'').split():
        anims['contact']['bones'][name]['rotation']['0.0']=[0,0,0]
