# baisoku

ブラウザ動画の再生速度を 0.1x〜16x で制御する軽量拡張機能。
Firefox / Chrome / Vivaldi に対応 (Manifest V3)。

## 特徴

- **速度範囲**: 0.1x〜16x、0.1 ステップ
- **3つの操作方法**
    - キーボードショートカット: `Ctrl+Shift+↑` / `Ctrl+Shift+↓` / `Ctrl+Shift+0` (リセット)
    - ポップアップUI: 対数スライダー + ±ボタン
    - ホバーオーバーレイ: 動画にマウスを乗せると `− 2.0x + 1x` パネルを表示 (フルスクリーン対応)
- **ピッチ補正**: 高倍速でも音の高さを維持 (`preservesPitch`)
- **高倍速ミュート**: しきい値以上の速度で自動ミュート (しきい値は設定可能)
- **OSD表示**: 速度変更時に一瞬だけ現在の速度を表示
- **全タブ同期**: あるタブで変更すると全タブに即時反映
- **SPA対応**: YouTube 等の動画切替・動的追加にも追従

## 軽量性

- バニラJSのみ・フレームワークなし (コアは約15KB)
- バックグラウンドはショートカット押下時のみ起動
- オーバーレイ/OSDのDOMは使用時に生成 (Shadow DOMでCSS競合なし)

## インストール

[Releases](https://github.com/TarouZirou/baisoku/releases) から配布パッケージをダウンロードできます。

| ファイル | 用途 |
|---|---|
| `baisoku-<ver>.zip` | Chrome Web Store / AMO へのアップロード用・「パッケージ化されていない拡張機能」として読み込み |
| `baisoku-<ver>.crx` | Vivaldi / Edge 等へのドラッグ&ドロップ永続インストール用 |
| `updates.xml` | Chrome の企業ポリシーによる配布 (自動更新マニフェスト) |

### Vivaldi / Edge (CRX ドラッグ&ドロップ・永続)

1. `baisoku-<ver>.crx` をダウンロード
2. `vivaldi://extensions` (Edge は `edge://extensions`) を開きデベロッパーモードを有効化
3. CRX ファイルをページにドラッグ&ドロップ → 確認ダイアログで「追加」

### Chrome

Chrome はストア外 CRX のインストールをブロックしています。次のいずれかを使用します:

- **Chrome Web Store で公開** (推奨): デベロッパー登録 (初回$5) 後、`baisoku-<ver>.zip` を[ダッシュボード](https://chrome.google.com/webstore/devconsole)からアップロード
- **企業ポリシーで配布**: CRX と `updates.xml` をHTTPSでホストし、`ExtensionInstallForcelist` ポリシーに `拡張ID;https://.../updates.xml` を指定 ([ポリシー詳細](https://chromeenterprise.google/policies/#ExtensionInstallForcelist))

### Firefox

Firefox の正規版は署名なし拡張の永続インストールを許可していません。`baisoku-<ver>.zip` を[addons.mozilla.org](https://addons.mozilla.org/developers/) から提出すると無料で署名され、公開 (listed) または非公開配布 (unlisted) が可能です:

```sh
# 非公開配布用に自分で署名する場合 (要AMO APIキー)
npx web-ext sign --api-key=... --api-secret=... --source-dir .
```

開発中の一時的な読み込みは `about:debugging#/runtime/this-firefox` → 「一時的なアドオン」で `manifest.json` を選択。

## ショートカットの変更

- **Firefox**: `about:addons` → 歯車アイコン → 「拡張機能のショートカットを管理」
- **Chrome / Vivaldi**: `chrome://extensions/shortcuts`

## アイコンの再生成

```sh
python3 tools/make_icons.py
```

(Pillow が必要: `pip install pillow`)

## 配布パッケージのビルド

```sh
./tools/package.sh
```

`dist/` に zip / crx / updates.xml が生成されます。CRX の署名鍵は `.keys/crx3.pem` (git管理外) — 同一拡張IDで更新配布し続けるには同一鍵での署名が必要です (鍵を失うと拡張IDが変わり、ポリシー配布が壊れます)。

## ライセンス

[MIT](LICENSE)
