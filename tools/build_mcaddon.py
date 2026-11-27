#!/usr/bin/env python3
"""Build a deterministic addon archive. In-game operation is not verified."""
import argparse
import hashlib
import io
import json
import pathlib
import sys
import tempfile
import zipfile

from sync_crafting_unlocks import run as check_crafting_unlocks

ROOT = pathlib.Path(__file__).resolve().parents[1]
PACK_ROOT = ROOT / 'Hakkai_v7.1.0'
PACKS = ('BehaviorPack', 'ResourcePack')
PUBLISHED = ROOT / 'downloads/Hakkai-v7.1.64.mcaddon'
PUBLISHED_SHA256 = '8095fd7a501c670514895b23093ea93284742b840b7ee0a53c896498e80dcfb5'
PUBLISHED_IDENTITIES = {
    'BehaviorPack': ('3bf93d37-1da0-4832-acf2-051c3a37898a', (7, 1, 64)),
    'ResourcePack': ('264d2bb6-d9e8-4ed4-9e39-96c2307a7a04', (7, 1, 64)),
}


def digest_file(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.digest()


def verify_published_identity(manifests):
    """Reject different source bytes under an already-published UUID/version.

    This guards packaging identity; it does not inspect a client's cache or
    validate rendering. The pinned release is treated as read-only.
    """
    matching = [pack for pack, manifest in zip(PACKS, manifests)
                if (manifest['header']['uuid'], tuple(manifest['header']['version'])) == PUBLISHED_IDENTITIES[pack]]
    if not matching:
        return
    if not PUBLISHED.is_file() or digest_file(PUBLISHED).hex() != PUBLISHED_SHA256:
        raise ValueError('cannot verify published v7.1.64 archive; refusing to reuse its UUID/version')
    with zipfile.ZipFile(PUBLISHED) as bundle:
        for pack in matching:
            with zipfile.ZipFile(io.BytesIO(bundle.read(pack + '.mcpack'))) as published:
                names = published.namelist()
                if len(names) != len(set(names)) or any(info.is_dir() for info in published.infolist()):
                    raise ValueError(f'invalid published {pack} archive')
                source_root = PACK_ROOT / pack
                source_paths = {p.relative_to(source_root).as_posix(): p for p in source_root.rglob('*') if p.is_file()}
                if set(names) != set(source_paths):
                    raise ValueError(f'{pack} differs from published v7.1.64; assign a new pack version before building')
                for name in names:
                    digest = hashlib.sha256()
                    with published.open(name) as source:
                        for chunk in iter(lambda: source.read(1024 * 1024), b''):
                            digest.update(chunk)
                    if digest.digest() != digest_file(source_paths[name]):
                        raise ValueError(f'{pack}/{name} differs from published v7.1.64; assign a new pack version before building')


def build(destination, *, _test_allow_published_mismatch=False):
    destination = pathlib.Path(destination).resolve()
    if destination.suffix.lower() != '.mcaddon':
        raise ValueError('output must end in .mcaddon')
    if destination.is_relative_to(PACK_ROOT.resolve()):
        raise ValueError('output must be outside the pack directories')
    if destination == PUBLISHED.resolve():
        raise ValueError('refusing to overwrite the published v7.1.64 archive')
    if not check_crafting_unlocks():
        raise ValueError('crafting recipes are missing unlock data; run tools/sync_crafting_unlocks.py --apply')
    manifests = [json.loads((PACK_ROOT / name / 'manifest.json').read_text(encoding='utf-8-sig')) for name in PACKS]
    version = manifests[0]['header']['version']
    if (not isinstance(version, list) or len(version) != 3
            or any(type(number) is not int or number < 0 for number in version)):
        raise ValueError('invalid pack version')
    for manifest in manifests:
        if manifest['header']['version'] != version:
            raise ValueError('behavior/resource pack versions must match')
        if any(module.get('version') != version for module in manifest['modules']):
            raise ValueError('pack module versions must match their header')
    if not any(dep.get('uuid') == manifests[1]['header']['uuid'] and dep.get('version') == version
               for dep in manifests[0]['dependencies']):
        raise ValueError('resource pack dependency mismatch')
    if not _test_allow_published_mismatch:
        verify_published_identity(manifests)
    paths = []
    for pack in PACKS:
        for path in sorted((PACK_ROOT / pack).rglob('*')):
            if path.is_symlink():
                raise ValueError(f'symlinks are not supported: {path}')
            if path.is_file():
                if destination == path.resolve():
                    raise ValueError('output would overwrite an input file')
                paths.append((path, path.relative_to(PACK_ROOT).as_posix()))
    destination.parent.mkdir(parents=True, exist_ok=True)
    # A .mcaddon bundles actual .mcpack archives; each inner archive has its
    # manifest at its own root. Keep the intermediate files outside pack dirs.
    with tempfile.TemporaryDirectory(dir=destination.parent, prefix='.hakkai-') as tmp:
        tmp = pathlib.Path(tmp)
        packs = []
        for pack in PACKS:
            file = tmp / f'{pack}.mcpack'
            pack_paths = [(path, name[len(pack)+1:]) for path, name in paths if name.startswith(pack+'/')]
            with zipfile.ZipFile(file, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
                for path, name in pack_paths:
                    info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.external_attr = 0o100644 << 16
                    with archive.open(info, 'w') as out, path.open('rb') as source:
                        while chunk := source.read(1024 * 1024):
                            out.write(chunk)
            with zipfile.ZipFile(file) as archive:
                if archive.testzip() is not None or set(archive.namelist()) != {name for _, name in pack_paths}:
                    raise ValueError(f'{pack} archive verification failed')
            packs.append(file)
        temporary = tmp / 'bundle.mcaddon'
        # Avoid recompressing the already-compressed inner archives.
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_STORED) as archive:
            for file in packs:
                info = zipfile.ZipInfo(file.name, date_time=(2020, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_STORED
                info.external_attr = 0o100644 << 16
                with archive.open(info, 'w') as out, file.open('rb') as source:
                    while chunk := source.read(1024 * 1024):
                        out.write(chunk)
        with zipfile.ZipFile(temporary) as archive:
            if archive.testzip() is not None or set(archive.namelist()) != {p.name for p in packs}:
                raise ValueError('bundle verification failed')
        temporary.replace(destination)
    return len(paths)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, help='destination ending in .mcaddon')
    parser.add_argument('--allow-unfinished', action='store_true', help='legacy compatibility flag; runtime remains unverified')
    args = parser.parse_args()
    count = build(args.output)
    print(f'Addon built: {args.output} ({count} files); Bedrock import and gameplay have not been verified')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        print(f'Build failed: {exc}', file=sys.stderr)
        raise SystemExit(1)
