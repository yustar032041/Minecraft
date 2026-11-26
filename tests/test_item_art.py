"""Check that finished item icons contain visible detail and transparent margins.

These checks cannot judge whether an image looks good or matches its name.
"""
import hashlib
import json
from pathlib import Path
import struct
import zlib

root = Path(__file__).resolve().parents[1]
progress = json.loads((root / 'texture_progress.json').read_text(encoding='utf-8'))
directory = root / 'Hakkai_v7.1.0/ResourcePack/textures/items'


def pixels(path):
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise AssertionError(f'{path}: not a PNG')
    width, height, depth, color, compression, filtering, interlace = struct.unpack_from('>IIBBBBB',data,16)
    bespoke_drops = {f'hakkai_drop_element_{p.stem}.png' for p in (root / 'art_sources/mob_drop_elements').glob('*.png') if p.stem.isdigit()}
    expected = 1024 if path.name in {'hakkai_guide.png', 'hakkai_industrial_guide.png', 'hakkai_return_stone.png'} else 512 if path.name in bespoke_drops else 128
    assert (width,height,depth,color,compression,filtering,interlace) == (expected,expected,8,6,0,0,0), path
    offset, compressed = 8, bytearray()
    while offset < len(data):
        size = struct.unpack_from('>I',data,offset)[0]
        kind = data[offset+4:offset+8]
        if kind == b'IDAT':
            compressed.extend(data[offset+8:offset+8+size])
        offset += 12 + size
        if kind == b'IEND':
            break
    raw = zlib.decompress(compressed)
    stride, cursor, prev = width*4, 0, bytearray(width*4)
    rows = []
    for _ in range(height):
        filt = raw[cursor]
        cursor += 1
        row = bytearray(raw[cursor:cursor+stride]); cursor += stride
        for i in range(stride):
            left = row[i-4] if i>=4 else 0
            up = prev[i]
            upper_left = prev[i-4] if i>=4 else 0
            if filt == 1: value = left
            elif filt == 2: value = up
            elif filt == 3: value = (left+up)//2
            elif filt == 4:
                p = left+up-upper_left
                pa,pb,pc = abs(p-left),abs(p-up),abs(p-upper_left)
                value = left if pa<=pb and pa<=pc else up if pb<=pc else upper_left
            elif filt == 0: value = 0
            else: raise AssertionError(f'{path}: invalid PNG filter {filt}')
            row[i] = (row[i]+value)&255
        rows.append(row)
        prev = row
    assert cursor == len(raw), path
    return rows

seen = {}
for name in progress['redrawn_existing'] + progress.get('derived_existing', []) + progress.get('derived_extra_existing', []) + progress.get('refined_misc_existing', []) + progress.get('provisional_misc_existing', []) + progress['planned_art_only']:
    path = directory / ('hakkai_'+name+'.png')
    rows = pixels(path)
    visible = [(row[i],row[i+1],row[i+2]) for row in rows for i in range(0,len(row),4) if row[i+3]>=128]
    scale = len(rows) // 128
    assert 400*scale*scale <= len(visible) < 14000*scale*scale, f'{name}: bad visible area {len(visible)}'
    assert len(set(visible)) > 60, f'{name}: insufficient detail'
    assert all(rows[y][x*4+3] == 0 for x,y in ((0,0),(len(rows)-1,0),(0,len(rows)-1),(len(rows)-1,len(rows)-1))), f'{name}: opaque corners'
    digest = hashlib.sha256(path.read_bytes()).digest()
    assert digest not in seen, f'duplicate art: {name} and {seen.get(digest)}'
    seen[digest] = name
print(f'{len(seen)} tracked item icons: 128px or specified HD RGBA, transparency, detail and distinct files OK')
