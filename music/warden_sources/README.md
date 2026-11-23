# 時空の管理者のBGM素材

ユーザー提供のStrudel REPL用ソースを、番号順に第一〜第五形態に対応させて保存しています。
`tools/render_warden_music.py` は、各ファイルの旋律・和音・テンポ・拍子を抽出し、シンセ音色と新しいドラムで短いループに再編します。Strudel本来の音色、音響処理、長い曲構成をそのまま再現するものではありません。

生成にはPythonの `numpy` とVorbis対応の `soundfile` が必要です。ゲーム内に同梱するOGGはResourcePackの `sounds/hakkai/warden_phase_*.ogg` にあります。
