#!/usr/bin/env python3
"""Generate isolated HUD A/A/B diagnostics from the pinned published addon.

This is a controlled pack comparison, NOT a Switch emulator or a fix. Never use
its packs on a valuable world: they have new identities and are diagnostic only.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import shutil
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'downloads/Hakkai-v7.1.64.mcaddon'
PIN = '8095fd7a501c670514895b23093ea93284742b840b7ee0a53c896498e80dcfb5'
NAMESPACE = uuid.UUID('fd1211fc-e097-4e56-ae48-829cb3538f5d')
SCHEMA = 'hud-repro-v1'
CASES = ('A_control', 'A2_identity_control', 'B_without_hud_ui')
PACKS = ('BehaviorPack', 'ResourcePack')
HUD = 'ui/hud_screen.json'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def identity(case, role):
    # Any change to the generator's pack contents requires a new SCHEMA.
    return str(uuid.uuid5(NAMESPACE, f'{SCHEMA}:{PIN}:{case}:{role}'))


def read_zip(data):
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        names = z.namelist()
        if len(names) != len(set(names)) or z.testzip() is not None:
            raise ValueError('duplicate names or corrupt zip')
        for n in names:
            if n.startswith('/') or '\\' in n or '..' in n.split('/') or n.endswith('/'):
                raise ValueError('unexpected archive path: ' + n)
        return {name: z.read(name) for name in names}


def zip_bytes(files, compressed=True):
    result = io.BytesIO()
    with zipfile.ZipFile(result, 'w', compression=zipfile.ZIP_DEFLATED if compressed else zipfile.ZIP_STORED, compresslevel=6 if compressed else None) as z:
        for name in sorted(files):
            info = zipfile.ZipInfo(name, (2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED if compressed else zipfile.ZIP_STORED
            info.external_attr = 0o100644 << 16
            z.writestr(info, files[name])
    return result.getvalue()


def make_case(source_packs, case):
    if case not in CASES:
        raise ValueError('unknown case')
    result = {pack: dict(files) for pack, files in source_packs.items()}
    if HUD not in result['ResourcePack']:
        raise ValueError('source HUD missing')
    manifests = {pack: json.loads(result[pack]['manifest.json']) for pack in PACKS}
    old_rp_uuid = manifests['ResourcePack']['header']['uuid']
    for pack in PACKS:
        manifest = manifests[pack]
        manifest['header']['uuid'] = identity(case, pack + ':header')
        manifest['header']['name'] = f'DIAGNOSTIC {case} {pack}'
        manifest['header']['description'] = 'TEST ONLY - use on a copied test world, not for normal play.'
        for i, module in enumerate(manifest['modules']):
            module['uuid'] = identity(case, pack + f':module:{i}')
    deps = manifests['BehaviorPack'].get('dependencies', [])
    matches = [d for d in deps if d.get('uuid') == old_rp_uuid]
    if len(matches) != 1:
        raise ValueError('expected exactly one resource dependency')
    matches[0]['uuid'] = manifests['ResourcePack']['header']['uuid']
    for pack in PACKS:
        result[pack]['manifest.json'] = (json.dumps(manifests[pack], ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    if case == 'B_without_hud_ui':
        del result['ResourcePack'][HUD]
    return result


def verify_case(source, candidate, case):
    """Check EVERY non-manifest byte, paths, and the exact allowed metadata edits."""
    try:
        _verify_case(source, candidate, case)
    except (KeyError, TypeError, json.JSONDecodeError) as exc:
        raise ValueError(f'{case}: malformed pack or manifest') from exc


def _verify_case(source, candidate, case):
    for pack in PACKS:
        expected = set(source[pack])
        if case == 'B_without_hud_ui' and pack == 'ResourcePack':
            expected.remove(HUD)
        if set(candidate[pack]) != expected:
            raise ValueError(f'{case}: unexpected {pack} files')
        for name in expected - {'manifest.json'}:
            if candidate[pack][name] != source[pack][name]:
                raise ValueError(f'{case}: changed file {pack}/{name}')
        # Independently normalize the allowed metadata fields back to the source.
        # This catches accidental changes to capabilities, dependencies, versions,
        # minimum engine, module types, and other manifest data.
        actual = json.loads(candidate[pack]['manifest.json'])
        baseline = json.loads(source[pack]['manifest.json'])
        header = actual['header']
        if (header['uuid'] != identity(case, pack + ':header') or
            header['name'] != f'DIAGNOSTIC {case} {pack}' or
            header['description'] != 'TEST ONLY - use on a copied test world, not for normal play.'):
            raise ValueError(f'{case}: incorrect diagnostic header')
        for key in ('uuid', 'name', 'description'):
            if key in baseline['header']:
                header[key] = baseline['header'][key]
            else:
                header.pop(key, None)
        if len(actual['modules']) != len(baseline['modules']):
            raise ValueError(f'{case}: module count changed')
        for i, module in enumerate(actual['modules']):
            if module['uuid'] != identity(case, pack + f':module:{i}'):
                raise ValueError(f'{case}: module identity changed')
            module['uuid'] = baseline['modules'][i]['uuid']
        if pack == 'BehaviorPack':
            matches = [d for d in actual['dependencies'] if d.get('uuid') == identity(case, 'ResourcePack:header')]
            if len(matches) != 1:
                raise ValueError(f'{case}: incorrect resource dependency')
            matches[0]['uuid'] = json.loads(source['ResourcePack']['manifest.json'])['header']['uuid']
        if actual != baseline:
            raise ValueError(f'{case}: unexpected {pack} manifest change')


def load_source(path, expected_sha=PIN):
    data = path.read_bytes()
    if sha(data) != expected_sha:
        raise ValueError('source archive does not match the pinned v7.1.64 SHA-256')
    outer = read_zip(data)
    if set(outer) != {p + '.mcpack' for p in PACKS}:
        raise ValueError('unexpected source archive layout')
    return {p: read_zip(outer[p + '.mcpack']) for p in PACKS}


def build(output, source_path=SOURCE):
    output = Path(output).resolve()
    pack_root = (ROOT / 'Hakkai_v7.1.0').resolve()
    if output == ROOT or output == pack_root or output.is_relative_to(pack_root):
        raise ValueError('output must be a new directory outside source packs')
    # Exclusive creation prevents overwriting release or user files.
    output.mkdir(parents=False, exist_ok=False)
    try:
        original = load_source(Path(source_path))
        report = {'source_sha256': PIN, 'schema': SCHEMA,
                  'warning': 'Diagnostic only. Not an emulator, not a rendering test or a fix.', 'cases': {}}
        for case in CASES:
            packs = make_case(original, case)
            verify_case(original, packs, case)
            raw = zip_bytes({p + '.mcpack': zip_bytes(packs[p]) for p in PACKS}, compressed=False)
            # Verify the actual serialized result, not only the inputs.
            packed = read_zip(raw)
            roundtrip = {p: read_zip(packed[p + '.mcpack']) for p in PACKS}
            verify_case(original, roundtrip, case)
            path = output / f'{case}.mcaddon'
            path.write_bytes(raw)
            report['cases'][case] = {'file': path.name, 'sha256': sha(raw), 'bytes': len(raw),
                                     'bp_uuid': identity(case, 'BehaviorPack:header'),
                                     'rp_uuid': identity(case, 'ResourcePack:header'),
                                     'removed': [HUD] if case == 'B_without_hud_ui' else []}
        (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
        return report
    except BaseException:
        shutil.rmtree(output)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True, help='new, nonexistent output directory')
    args = parser.parse_args()
    result = build(args.output)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
