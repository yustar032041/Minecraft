#!/usr/bin/env python3
"""Inventory reference index, NOT proof of obtainability or actual use.

Lists declared items and blocks and exact static JSON/JS references. Dynamic JS
identifiers, game mechanics, conditions and executable behaviour require manual
review. Regenerate after asset changes; --check verifies freshness.
"""
import argparse,collections,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BP=ROOT/'Hakkai_v7.1.0/BehaviorPack';RP=ROOT/'Hakkai_v7.1.0/ResourcePack';OUT=ROOT/'アイテム参照棚卸し.md'
def read(p):return json.loads(p.read_text(encoding='utf8'))
def item_id(x):return x if isinstance(x,str) else x.get('item') if isinstance(x,dict) else None
def render():
 declared={}
 for folder,component in [('items','minecraft:item'),('blocks','minecraft:block')]:
  for p in sorted((BP/folder).glob('*.json')):
   obj=read(p)[component];ident=obj['description']['identifier'];declared.setdefault(ident,set()).add(folder)
 names={}
 for line in (RP/'texts/ja_JP.lang').read_text(encoding='utf8').splitlines():
  if '=' in line:
   key,value=line.split('=',1)
   for prefix in ('item.','tile.'):
    if key.startswith(prefix) and key.endswith('.name'):names[key[len(prefix):-5]]=value
 produced=collections.defaultdict(set);used=collections.defaultdict(set);drops=collections.defaultdict(set);mentioned=collections.defaultdict(set)
 for p in sorted((BP/'recipes').glob('*.json')):
  data=read(p);recipe=next((v for k,v in data.items() if k.startswith('minecraft:recipe_')),None)
  if recipe is None:continue
  out=item_id(recipe.get('result',recipe.get('output')))
  if out in declared:produced[out].add(p.stem)
  inputs=recipe.get('ingredients',list(recipe.get('key',{}).values()))
  if 'input' in recipe:inputs=[*inputs,recipe['input']]
  if 'reagent' in recipe:inputs=[*inputs,recipe['reagent']]
  for entry in inputs:
   ident=item_id(entry)
   if ident in declared:used[ident].add(p.stem)
 def visit(obj,path):
  if isinstance(obj,dict):
   if obj.get('type')=='item' and obj.get('name') in declared:drops[obj['name']].add(path)
   for value in obj.values():visit(value,path)
  elif isinstance(obj,list):
   for value in obj:visit(value,path)
 for p in sorted((BP/'loot_tables').rglob('*.json')):visit(read(p),str(p.relative_to(BP/'loot_tables')).removesuffix('.json'))
 # Lexical matches deliberately exclude large generated indexes/catalogs: a
 # name appearing in a catalogue is not evidence of runtime behaviour.
 skip={'recipe_index','factory_line_recipes','machine_recipe_guide','data','guide_navigation'}
 word_re=re.compile(r'(?<![A-Za-z0-9_])(?:hakkai:)?([A-Za-z][A-Za-z0-9_]*)(?![A-Za-z0-9_])')
 by_short={ident.removeprefix('hakkai:'):ident for ident in declared if ident.startswith('hakkai:')}
 for p in sorted((BP/'scripts').glob('*.js')):
  if p.stem in skip:continue
  for word in set(word_re.findall(p.read_text(encoding='utf8'))):
   if word in by_short:mentioned[by_short[word]].add(p.stem)
 def fmt(seq):
  seq=sorted(seq)
  return ', '.join('`'+x+'`' for x in seq) if seq else '—'
 lines=['# 追加アイテム・ブロックの参照棚卸し（静的・自動生成）','',
 '実機での入手・用途を保証する監査ではありません。レシピはJSONの完成品／材料、ルートはlootテーブル中のitem参照、JSは単語の完全一致です。JS参照は図鑑・テキスト・処理以外も含み、使用や入手の証拠とは限りません。テンプレート文字列などの動的ID、生成・報酬・村・ブロック設置やプレイヤー操作は漏れるため「—」は未使用・入手不能を意味しません。クリエイティブ／コマンド限定の区別も未検査。','',
 f'対象：定義されたアイテムとブロック {len(declared)} ID。再生成：`python3 tools/audit_item_references.py`。個別の進行条件・用途・実機を別途点検すること。','',
 '| ID | 名前 | 種別 | JSON完成品 | JSON材料 | loot候補 | JS完全一致候補 |','|---|---|---|---|---|---|---|']
 for ident in sorted(declared):
  name=names.get(ident,'（未登録）').replace('|','\\|').replace('\n',' ')
  lines.append(f'| `{ident}` | {name} | {fmt(declared[ident])} | {fmt(produced[ident])} | {fmt(used[ident])} | {fmt(drops[ident])} | {fmt(mentioned[ident])} |')
 return '\n'.join(lines)+'\n'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true');args=ap.parse_args();text=render()
 if args.check:
  if not OUT.exists() or OUT.read_text(encoding='utf8')!=text:raise SystemExit('Item reference inventory is stale')
 else:OUT.write_text(text,encoding='utf8')
 print(f'Item reference inventory: {len(text.splitlines())-8} entries; exact static references only')
if __name__=='__main__':main()
