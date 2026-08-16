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

## インストール (未パッケージ)

### Firefox

1. `about:debugging#/runtime/this-firefox` を開く
2. 「一時的なアドオンを読み込む…」で `manifest.json` を選択

### Chrome

1. `chrome://extensions`を開く
2. デベロッパーモードを有効化
3. 「パックされていない拡張機能を読み込む」でこのフォルダを選択

## ショートカットの変更

- **Firefox**: `about:addons` → 歯車アイコン → 「拡張機能のショートカットを管理」
- **Chrome / Vivaldi**: `chrome://extensions/shortcuts`

## アイコンの再生成

```sh
python3 tools/make_icons.py
```

(Pillow が必要: `pip install pillow`)

## ライセンス

[MIT](LICENSE)
