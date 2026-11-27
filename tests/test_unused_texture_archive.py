"""Keep unused source artwork recoverable; static references only, no rendering test."""
import hashlib
from pathlib import Path

root = Path(__file__).resolve().parents[1]
archive = root / 'art_sources/unused_block_texture_sets'
expected = {
    'hakkai_moon_bamboo.png': '18b73888cde0d9e5f2345960ba18680aa582a53f9b7b1f40beaf9fc1440e45f6',
    'hakkai_moon_bamboo.texture_set.json': 'edbb8e1bbfee176cf4c3934efeea1f62d1f914493df3344a205583d4411cad90',
    'hakkai_moon_bamboo_mer.png': '3ca197dd2db6eec8763db0e2b8c0cf10d9965a49dad142b598f2c81200fd072a',
    'hakkai_moon_bamboo_n.png': '3ca197dd2db6eec8763db0e2b8c0cf10d9965a49dad142b598f2c81200fd072a',
    'hakkai_warden_brick.png': 'b2a2178c8dbd845ae090530eaec81d8140565e7c4faffdbdb41a9a3f84164fc9',
    'hakkai_warden_brick.texture_set.json': '91502bdc15c1e4a89724c9994d4daadbf5bc58b45d52afa5b149c327c371bfcc',
    'hakkai_warden_brick_mer.png': '7110ce5edf7121e4a41d6cafc27021dcde58f8f3e98e9be373becc7dfe1d72dd',
    'hakkai_warden_brick_n.png': '3ca197dd2db6eec8763db0e2b8c0cf10d9965a49dad142b598f2c81200fd072a',
    'hakkai_warden_lamp.png': '6985463fb708fabecae0629072c1d8fe9021e47be1b92a6d68255543aa6882e5',
    'hakkai_warden_lamp.texture_set.json': '344d111f1771ebded810a4a8d41e4271214810b6843c36670a09529946efa937',
    'hakkai_warden_lamp_mer.png': 'c07c9267c6afd233fec0d06ece32f83094501820045c9b6d772bd07128cecf14',
    'hakkai_warden_lamp_n.png': '3ca197dd2db6eec8763db0e2b8c0cf10d9965a49dad142b598f2c81200fd072a',
}
assert {p.name for p in archive.iterdir() if p.is_file()} == set(expected)
for name, digest in expected.items():
    assert hashlib.sha256((archive / name).read_bytes()).hexdigest() == digest, name

stems = ('hakkai_moon_bamboo', 'hakkai_warden_brick', 'hakkai_warden_lamp')
for pack in ('BehaviorPack', 'ResourcePack'):
    for path in (root / 'Hakkai_v7.1.0' / pack).rglob('*'):
        if not path.is_file():
            continue
        assert not any(name in path.name.casefold() for name in stems), path
        if path.suffix.lower() in {'.json', '.js', '.lang', '.txt'}:
            text = path.read_text(encoding='utf8').casefold()
            assert not any(name in text for name in stems), path
print('12 unreferenced legacy assets preserved byte-for-byte outside packs; static references only')
