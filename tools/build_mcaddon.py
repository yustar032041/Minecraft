#!/usr/bin/env python3
"""Build an explicitly labelled test addon. Completion requires in-game QA."""
import argparse
import json
import pathlib
import sys
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
PACK_ROOT = ROOT / 'Hakkai_v7.1.0'
PACKS = ('BehaviorPack', 'ResourcePack')


def build(destination):
    destination = pathlib.Path(destination).resolve()
    if destination.suffix.lower() != '.mcaddon':
        raise ValueError('output must end in .mcaddon')
    if destination.is_relative_to(PACK_ROOT.resolve()):
        raise ValueError('output must be outside the pack directories')
    manifests = [json.loads((PACK_ROOT / name / 'manifest.json').read_text(encoding='utf-8-sig')) for name in PACKS]
    for manifest in manifests:
        if manifest['header']['version'] != [7, 1, 2]:
            raise ValueError('unexpected pack version')
    if not any(dep.get('uuid') == manifests[1]['header']['uuid'] and dep.get('version') == [7, 1, 2]
               for dep in manifests[0]['dependencies']):
        raise ValueError('resource pack dependency mismatch')
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
    parser.add_argument('--allow-unfinished', action='store_true', help='acknowledge that this is an unverified test build')
    args = parser.parse_args()
    if not args.allow_unfinished:
        parser.error('the addon is unfinished; pass --allow-unfinished for a test build')
    count = build(args.output)
    print(f'Unfinished test build: {args.output} ({count} files); Bedrock import and gameplay have not been verified')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        print(f'Build failed: {exc}', file=sys.stderr)
        raise SystemExit(1)
