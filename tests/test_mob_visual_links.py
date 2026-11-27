"""Cross-check 139 realm and patrol prototypes (excluding the eight-realm king and protected characters); not a Bedrock render or visual review."""
import copy
import json
import math
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RP = ROOT / 'Hakkai_v7.1.0/ResourcePack'
NAMES = ([f'foe_{r}_{i}' for r in range(8) for i in range(12)]
         + [f'wild_{r}_{i}' for r in range(8) for i in range(3)]
         + [f'guardian_{i}' for i in range(8)]
         + [f'ender_{i}' for i in range(8)]
         + ['village_archer', 'village_mage', 'village_watch'])
FACES = {'north', 'south', 'east', 'west', 'up', 'down'}


def visual_errors(model, client, image, animations):
    errors = []
    desc = model['description']
    size = (desc['texture_width'], desc['texture_height'])
    if image.size != size:
        errors.append('texture size')
    bones = {b['name'] for b in model['bones']}
    if client['geometry']['default'] != desc['identifier']:
        errors.append('geometry id')
    for bone in model['bones']:
        for cube in bone.get('cubes', []):
            uv = cube.get('uv')
            if not isinstance(uv, dict) or set(uv) != FACES:
                errors.append('non-face UV')
                continue
            for face in uv.values():
                u, v = face['uv']
                du, dv = face['uv_size']
                x0, x1 = min(u, u+du), max(u, u+du)
                y0, y1 = min(v, v+dv), max(v, v+dv)
                if not du or not dv or x0 < 0 or y0 < 0 or x1 > size[0] or y1 > size[1]:
                    errors.append('UV range')
                    continue
                crop = image.getchannel('A').crop((math.floor(x0), math.floor(y0), math.ceil(x1), math.ceil(y1)))
                if crop.getextrema()[1] == 0:
                    errors.append('transparent face')
    for alias, aid in client.get('animations', {}).items():
        if aid not in animations:
            errors.append(f'missing animation {alias}: {aid}')
        else:
            missing = set(animations[aid].get('bones', {})) - bones
            if missing:
                errors.append(f'animation bones {alias}: {sorted(missing)}')
    return errors


animations = {}
for path in sorted((RP / 'animations').glob('*.json')):
    for key, value in json.loads(path.read_text(encoding='utf8')).get('animations', {}).items():
        assert key not in animations, ('duplicate animation identifier', key)
        animations[key] = value

face_count = alias_count = 0
for name in NAMES:
    model = json.loads((RP / 'models/entity' / f'{name}.geo.json').read_text(encoding='utf8'))['minecraft:geometry'][0]
    client = json.loads((RP / 'entity' / f'{name}.entity.json').read_text(encoding='utf8'))['minecraft:client_entity']['description']
    texture = RP / (client['textures']['default'] + '.png')
    with Image.open(texture) as src:
        image = src.convert('RGBA')
    errors = visual_errors(model, client, image, animations)
    assert not errors, (name, errors)
    face_count += sum(len(c['uv']) for b in model['bones'] for c in b.get('cubes', []))
    alias_count += len(client.get('animations', {}))
    # Resolve the actual texture-set names, not merely same-name files. File
    # existence and dimensions do not prove that the engine enables PBR.
    texset_path = texture.with_suffix('.texture_set.json')
    texset = json.loads(texset_path.read_text(encoding='utf8'))['minecraft:texture_set']
    for key in ('color', 'normal', 'metalness_emissive_roughness'):
        with Image.open(texset_path.parent / (texset[key] + '.png')) as im:
            assert im.size == image.size, (name, key, im.size, image.size)

# Fault injection on an in-memory copy exercises each reported class; it does
# not mutate pack assets or claim exhaustive format validation.
model = json.loads((RP / 'models/entity/guardian_0.geo.json').read_text(encoding='utf8'))['minecraft:geometry'][0]
client = json.loads((RP / 'entity/guardian_0.entity.json').read_text(encoding='utf8'))['minecraft:client_entity']['description']
with Image.open(RP / 'textures/entity/guardian_0.png') as im:
    image = im.convert('RGBA')
assert not visual_errors(model, client, image, animations)
broken = copy.deepcopy(model); broken['bones'][0]['cubes'][0]['uv']['north']['uv'] = [-1, 0]
assert 'UV range' in visual_errors(broken, client, image, animations)
empty = Image.new('RGBA', image.size, (0, 0, 0, 0))
assert 'transparent face' in visual_errors(model, client, empty, animations)
broken = copy.deepcopy(client); broken['animations']['test'] = 'animation.missing'
assert any(e.startswith('missing animation') for e in visual_errors(model, broken, image, animations))
broken = copy.deepcopy(animations); aid = next(iter(client['animations'].values())); broken[aid]['bones']['missing_bone'] = {}
assert any(e.startswith('animation bones') for e in visual_errors(model, client, image, broken))
print(f'{len(NAMES)} realm and patrol models (excluding king and protected characters): {face_count} UV faces, {alias_count} animation aliases checked; PBR file sizes checked (static only)')
