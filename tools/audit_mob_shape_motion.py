#!/usr/bin/env python3
"""Generate a static review queue, never modify gameplay or infer hitboxes.

Pillow is needed by the approximate preview geometry collector. Neither model
rotation conventions nor origin/collision alignment have been verified in game.
"""
import argparse
import json
from collections import Counter
from pathlib import Path
from preview_mob_geometry import collect, ROOT, RP
from preview_mob_prototypes import GROUPS

BP = ROOT / 'Hakkai_v7.1.0/BehaviorPack'
OUTPUT = ROOT / '追加MOB判定と動作の確認表.md'

def selected(components):
    keys = ('minecraft:collision_box', 'minecraft:movement', 'minecraft:can_fly',
            'minecraft:jump.', 'minecraft:navigation.', 'minecraft:behavior.')
    return {k: v for k, v in components.items() if k == keys[0] or k == keys[1] or k == keys[2] or k.startswith(keys[3:])}

def measure(model):
    points = [v for quad, _ in collect(model) for v in quad]
    return [(min(p[i] for p in points)/16, max(p[i] for p in points)/16) for i in range(3)]

def row(name, group):
    model = json.loads((RP/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]
    entity = json.loads((BP/f'entities/{name}.json').read_text())['minecraft:entity']
    comp = entity.get('components', {})
    groups = {k: selected(v) for k, v in entity.get('component_groups', {}).items() if selected(v)}
    bounds = measure(model)
    collision = comp.get('minecraft:collision_box')
    labels = []
    if collision and isinstance(collision.get('width'), (int,float)) and isinstance(collision.get('height'), (int,float)):
        w,h = collision['width'], collision['height']
        # Approximation only: extent from model origin, not proof of engine overlap.
        if max(abs(bounds[0][0]),abs(bounds[0][1]),abs(bounds[2][0]),abs(bounds[2][1])) > w/2 + .1: labels.append('水平はみ出し')
        if bounds[1][1] > h + .1: labels.append('上方はみ出し')
        if bounds[1][1] < h - .25: labels.append('上方余白')
        if bounds[1][0] < -.1: labels.append('下方はみ出し')
    else: labels.append('基本判定未指定')
    nav = [k.removeprefix('minecraft:navigation.') for k in comp if k.startswith('minecraft:navigation.')]
    movement = [k.removeprefix('minecraft:movement.') for k in comp if k.startswith('minecraft:movement.')]
    speed = comp.get('minecraft:movement', {}).get('value', '—')
    behaviors = [k.removeprefix('minecraft:behavior.') for k in comp if k.startswith('minecraft:behavior.')]
    client_path = RP/f'entity/{name}.entity.json'
    client = json.loads(client_path.read_text())['minecraft:client_entity']['description']
    aliases = client.get('animations', {})
    walk = aliases.get('walk','—')
    attack = '/'.join(k for k in ('creature_windup','creature_strike','native_contact','talent_windup','talent_strike') if k in aliases) or '—'
    fmt = lambda x: f'{x:.3f}'
    extent = ' / '.join(fmt(hi-lo) for lo,hi in bounds)
    y = f'{fmt(bounds[1][0])}～{fmt(bounds[1][1])}'
    box = f"{collision['width']} × {collision['height']}" if collision and 'width' in collision and 'height' in collision else '未指定'
    return {'group':group,'name':name,'extent':extent,'y':y,'box':box,'flags':labels,
            'nav':','.join(nav) or '—','movement':','.join(movement) or '—','speed':str(speed),
            'fly':'有' if 'minecraft:can_fly' in comp else '未指定', 'behavior':','.join(behaviors) or '—',
            'conditional':json.dumps(groups,ensure_ascii=False,separators=(',',':')) if groups else '—',
            'walk':walk,'attack':attack}

def report():
    rows=[row(name,group) for group,items in GROUPS.items() for name,_ in items]
    assert len(rows)==140 and len({x['name'] for x in rows})==140
    counts=Counter(flag for x in rows for flag in x['flags'])
    lines=['# 追加MOB：形・判定・移動・動作の確認表', '',
           '生成: `python tools/audit_mob_shape_motion.py --write`。140候補、保護3種は対象外。これは優先確認のための静的棚卸しであり、自動修正や実機での当たり判定の証明ではない。',
           'モデル頂点は近似静止姿勢（骨・箱の回転とinflateを含む）でブロック単位。幅・高さ・奥行は装飾や翼も含む外形。下端・上端はモデル座標原点からの値。判定はBehavior Packの基本 `collision_box` 幅×高さ。モデル原点と実機の判定原点が一致すると仮定して比較した参考値で、姿勢・モデルオフセット・回転・透明部・アニメーション時の形や実際の被弾範囲を保証しない。',
           '「水平はみ出し」はX/Z各軸の絶対最大が基本判定の半幅+0.1を超える場合。「上方はみ出し」は上端が高さ+0.1超、「上方余白」は上端が高さ−0.25未満、「下方はみ出し」は下端−0.1未満。幅だけでなく長い尾・翼・角も含み、意図的な差を不具合として数えない。判定を外形に機械的に合わせない。',
           '基本移動欄はBPの navigation/movement/can_fly と movement.value、動作欄はclientのaliasの存在のみ。aliasは再生成功や演出の一致を意味せず、スクリプトの移動・突進・飛び道具・攻撃範囲、条件付きイベント、稼働中の変化は推定しない。条件付き欄は該当component groupの全文で、実際の発火は未解析。判定値はゲーム性・ブロック通過・AI・マルチプレイも確認して個別に決める。', '',
           '## 機械的フラグ件数（重複あり）', '', ' / '.join(f'{k}: {v}' for k,v in sorted(counts.items())) or 'なし', '',
           '## 個別一覧', '', '| グループ | ID | 外形 W/H/D | 上下 | 基本判定 W/H | 概算フラグ | nav / movement / 速度 / can_fly | walk alias | 攻撃alias | behavior | 条件付きコンポーネント |', '|---|---|---|---|---|---|---|---|---|---|---|']
    for x in rows:
        fields=[x['group'],x['name'],x['extent'],x['y'],x['box'],', '.join(x['flags']) or '—', f"{x['nav']} / {x['movement']} / {x['speed']} / {x['fly']}",x['walk'],x['attack'],x['behavior'],x['conditional']]
        lines.append('| '+' | '.join(str(v).replace('|','\\|').replace('\n',' ') for v in fields)+' |')
    lines += ['', '## 実機での優先確認', '', '1. 正面・横・背面から停止と歩行を確認し、接地、翼・手足の分離、壁や狭路の通行と被弾位置を検証。', '2. 予備動作から攻撃、突進・飛び道具・効果発生までの位置とタイミング、実ダメージ範囲、同期を確認。脚本の射程や移動はこの表からは分からない。', '3. 空中移動に見える種は実際のAIと地形で確認。飛行を有効化すると挙動や湧きに大きく影響するため見た目だけで変更しない。', '4. 同一個体を複数プレイヤー・各描画設定・Switchで確認し、判定と演出の調整を個別に行う。']
    return '\n'.join(lines)+'\n'

def main():
    p=argparse.ArgumentParser(description=__doc__);g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');args=p.parse_args()
    text=report()
    if args.write: OUTPUT.write_text(text,encoding='utf8')
    elif not OUTPUT.exists() or OUTPUT.read_text(encoding='utf8')!=text: raise SystemExit('shape/motion audit is stale')
    print('140 shape, collision, movement and animation alias entries '+('written' if args.write else 'verified')+' (static only)')
if __name__=='__main__': main()
