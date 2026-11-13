# じゃんけんゲーム

ブラウザで遊べるじゃんけんゲーム。`index.html` をダブルクリックして開くだけで遊べる。

## 画像・音の差し替え

下のファイル名で置くと、自動でそのファイルが使われる。
置いていないものは、絵文字（✊✌️✋）とブラウザで作った音で代わりに動く。

| 種類 | ファイル |
|---|---|
| グー | `images/gu.png` |
| チョキ | `images/choki.png` |
| パー | `images/pa.png` |
| BGM（ループ） | `sounds/bgm.mp3` |
| ぽん！ | `sounds/pon.mp3` |
| 勝ち | `sounds/win.mp3` |
| 負け | `sounds/lose.mp3` |
| あいこ | `sounds/draw.mp3` |

ファイル名や形式（`.jpg`、`.wav` など）を変えたいときは、`script.js` の一番上にある `HANDS` と `SOUNDS` を書き換える。

## ファイル構成

- `index.html` … 画面
- `style.css` … 見た目
- `script.js` … ゲームの動き
