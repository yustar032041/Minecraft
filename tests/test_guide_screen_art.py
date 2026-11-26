"""Static guide/return art references and reproducibility; not Bedrock rendering."""
import json
from pathlib import Path
import subprocess
import sys
from PIL import Image
root=Path(__file__).resolve().parents[1]
rp=root/'Hakkai_v7.1.0/ResourcePack/textures'
subprocess.run([sys.executable,str(root/'tools/build_guide_screen_art.py'),'--check'],check=True)
for name in ('industrial_guide','return_stone'):
    path=rp/'items'/f'hakkai_{name}.png'
    im=Image.open(path).convert('RGBA')
    assert im.size==(1024,1024)
    alpha=im.getchannel('A')
    assert alpha.getextrema()==(0,255)
    spec=json.loads(path.with_suffix('.texture_set.json').read_text())['minecraft:texture_set']
    for key in ('normal','metalness_emissive_roughness'):
        image=Image.open(path.parent/(spec[key]+'.png')).convert('RGBA')
        assert image.size==im.size and image.getchannel('A').tobytes()==alpha.tobytes()
for name in ('bed','home','world','map'):
    image=Image.open(rp/'ui'/f'hakkai_return_{name}.png').convert('RGBA')
    assert image.size==(256,256) and image.getchannel('A').getextrema()==(0,255)
for kind in ('guide','return_stone'):
    assert not list((rp/'items').glob(f'hakkai_realm_{kind}_*'))
assert not (root/'tools/render_planned_travel_icons.py').exists()
assert "if name!='industrial_guide':icon.save" in (root/'tools/build_industry_assets.py').read_text()
print('Guide/return image, alpha, neutral PBR, UI references and obsolete cleanup OK')
