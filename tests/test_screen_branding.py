"""Static contract against pinned Mojang UI; not a rendered client test."""
import json
from pathlib import Path
from PIL import Image
rp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
ui=json.loads((rp/'ui/progress_screen.json').read_text())
assert set(ui)=={'namespace','overworld_loading_background','nether_loading_background','theend_loading_background'}
assert ui['namespace']=='progress'
for key in set(ui)-{'namespace'}:assert ui[key]=={'texture':'textures/ui/hakkai_loading_background'}
# Progress labels, bindings, buttons and gradient controls are deliberately not replaced.
logo=Image.open(rp/'textures/ui/title.png');assert logo.mode=='RGBA' and logo.size==(1024,194) and logo.getchannel('A').getextrema()==(0,255)
back=Image.open(rp/'textures/ui/hakkai_loading_background.png');assert back.size==(256,256)
print('Static title and three dimension-background overrides checked; live client UI not tested')
