"""NBT-level checks for culture sites; requires the optional nbtlib generator dependency."""
from pathlib import Path
import nbtlib
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/structures/hakkai'
for realm in range(8):
    s=nbtlib.load(root/f'site_{61+realm}.mcstructure',byteorder='little')
    assert list(s['size'])==[65,46,65]
    palette=s['structure']['palette']['default']['block_palette']
    layers=s['structure']['block_indices']
    assert len(layers)==2 and all(len(layer)==65*46*65 for layer in layers)
    assert all(-1<=i<len(palette) for layer in layers for i in layer)
    def at(x,y,z):
        idx=int(layers[0][(x+32)*46*65+y*65+z+32])
        return str(palette[idx]['name']) if idx>=0 else None
    assert at(2,16,11)=='hakkai:chronicle'
    assert at(3,16,13)=='minecraft:barrel'
    assert at(0,15,0) not in (None,'minecraft:water') and at(0,16,0) is None and at(0,17,0) is None
    if realm==3:
        for x in range(-15,16):
            for z in range(-24,-3):
                assert at(x,14,z) not in (None,'minecraft:water')
                if abs(x)>=14 or z in (-24,-23,-5,-4):
                    assert at(x,15,z) not in (None,'minecraft:water') and at(x,16,z) not in (None,'minecraft:water')
                else:
                    assert at(x,15,z)=='minecraft:water'
                    assert at(x,16,z) in ('minecraft:water','minecraft:packed_ice')
print('Eight structure NBT bounds, read stone, inventory, arrival and enclosed lake OK (static)')
