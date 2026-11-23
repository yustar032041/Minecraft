# 8界風記 v7.1.0 — Git登録インデックス

このリポジトリは、8界風記 v7.1.0 のアドオン一式を保管する場所です。

## 現在の登録状態

- [展開・登録用ZIP](https://d2ol7oe51mr4n9.cloudfront.net/user_3Ji8roHXxNleqfmoEPE7eWzIIiu/6f9b224d-8cb3-4710-8af1-d7a5bc4c4208.zip) は外部転送ストレージに保管済みです。
- **ZIP本体は、まだこのGitリポジトリのGitオブジェクトとして登録されていません。**
- GitHub Actionsの利用上限に達したため、リポジトリ内のインポートワークフロー（`.github/workflows/import-expanded-hakkai.yml`）による展開・コミットが未実行です。
- 元の単独MDファイルは削除済みです。

## パッケージ確認情報

| 項目 | 値 |
|---|---|
| ファイル名 | `8界風記_GitHub投入用.zip` |
| サイズ | 15,625,763 bytes |
| SHA-256 | `05f9ae0bc3c12060fd8c9295761b478ed2b896cff96b89154f392b7b7219903d` |
| ZIP整合性 | OK |
| ZIP内ファイル数 | 4,326 |
| Behavior Pack | 1,467 files |
| Resource Pack | 2,858 files |
| 設計書 | 1 file |

## 登録後の配置予定

```text
Hakkai_v7.1.0/
├── BehaviorPack/
└── ResourcePack/
8界風記完成設計書.md
```

## インポート

GitHub Actionsの利用枠が回復した後、Actionsから `Import expanded Hakkai addon` を手動実行すると、上記ZIPを取得して展開し、パッケージと設計書をリポジトリへコミットするよう設定されています。

> 注意：このインデックスは登録状況と検証情報を記録するものです。ZIP本体や展開済みファイルがすでにGitに入っていることを意味しません。
