"""Pinned vanilla key/path collision guard, not an engine or network test."""
import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
rp=root/'Hakkai_v7.1.0/ResourcePack'
vanilla=json.loads((root/'tests/fixtures/vanilla_resource_keys.json').read_text(encoding='utf8'))
assert vanilla['revision']=='15701fa9c13923f12662984c32c124327e40e3d3'

# JSON atlas registries are intentionally merged with vanilla. New identifiers
# must not overwrite vanilla entries, including under case-insensitive lookup.
for filename,fixture in (('terrain_texture.json','terrain_keys'),('item_texture.json','items_keys')):
    atlas=json.loads((rp/'textures'/filename).read_text(encoding='utf8'))
    addon=atlas['texture_data']
    common={k.casefold() for k in addon}&{k.casefold() for k in vanilla[fixture]}
    assert not common,(filename,common)
    # These are shared atlas-level settings, rather than namespaced entries.
    # Keep the observed 26.0–26.60 vanilla values; this does not simulate
    # the engine's pack merging or prove a rendering bug is fixed.
    if filename == 'terrain_texture.json':
        assert atlas.get('texture_name') == 'atlas.terrain'
        assert atlas.get('padding') == 8 and atlas.get('num_mip_levels') == 4
    else:
        assert atlas.get('texture_name') == 'atlas.items'
        assert 'padding' not in atlas and 'num_mip_levels' not in atlas

# The addon language keys should not silently replace vanilla translations.
for lang in ('ja_JP','en_US'):
    lines=(rp/'texts'/f'{lang}.lang').read_text(encoding='utf8').splitlines()
    keys={line.split('=',1)[0] for line in lines if '=' in line and not line.lstrip().startswith('#')}
    common=keys.intersection(vanilla[lang+'_keys'])
    assert not common,(lang,common)

# These conventional pack files are deliberately shared or merged. No vanilla
# PNG/font/flipbook file or other path may be silently overwritten.
allowed={'manifest.json','pack_icon.png','sounds/sound_definitions.json','texts/en_US.lang',
         'texts/ja_JP.lang','texts/languages.json','textures/item_texture.json',
         'textures/terrain_texture.json','ui/hud_screen.json'}
vanilla_paths={p.casefold() for p in vanilla['resource_paths']}
files=[p.relative_to(rp).as_posix() for p in rp.rglob('*') if p.is_file()]
folded=[p.casefold() for p in files]
assert len(folded)==len(set(folded)),'case-insensitive resource path collision'
overlap={p for p in files if p.casefold() in vanilla_paths}
assert overlap <= allowed,sorted(overlap-allowed)
print(f'Pinned vanilla snapshot: no language/atlas key collisions, {len(overlap)} expected shared paths; rendering unverified')
