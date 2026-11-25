# レスキューメカ・バトル

働く車のパーツでロボットを組み立てて、3体のCPUロボットと戦う、横向きのiPhone向け3Dゲームです。文字が読めなくても、パーツの絵、大きな方向ボタン、攻撃と必殺ボタンで進められます。

[仕様](SPEC.md) · [実際のゲーム画面](docs/screenshots/README.md) · [テスト報告](docs/TEST_REPORT.md)

## あそびかた

1. **あそぶ**を押して、あたま・からだ・うで・あし・ぶきを選びます。ロボットの上をドラッグするか、回転ボタンを押すと反対側を見られます。
2. **かんせい！ → スタート！**でバトルへ進みます。十字ボタンで移動し、オレンジの**こうげき**を押すと相手を自動で狙います。押したままで連射できます。
3. ゲージがたまって青い**ひっさつ**が光ったら、タップで大技を使えます。全3戦です。各戦のHPとゲージはスタート時に戻り、同じ戦いで2回負けると再挑戦に補助が入ります。

横向きに戻すと、縦向きになる直前の画面から再開します。保護者用の停止ボタンから再挑戦やタイトルへの移動ができます。タイトルの **おと** からBGM・効果音・日本語音声を個別に切り替えられます。日本語音声は端末で日本語の合成音声が利用できる場合に再生します。

デスクトップで試す場合は方向キー、スペース、Xキーでも操作できます。装備と音の設定をブラウザ内に保存します。ゲームにはログイン、広告、解析、外部APIはありません。

## 開発

Node.js 22.12 以降の22系、またはNode.js 24以降が必要です。CIはNode.js 24を使います。

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

Viteの表示URLの `/robot_batl/` を開きます。`dist/` が公開用の静的ビルドです。Three.jsを含む必要ファイルはビルドに同梱します。3Dモデル、ループBGM、効果音はプロジェクト内のコードで生成します。承認されたコンセプト画像は `docs/reference/` に収録しています。

### ブラウザ試験

```sh
npx playwright install chromium
npm run test:e2e
```

ブラウザ試験は `npm run build` の成果物を `/robot_batl/` から読み込みます。公開URLを使う場合は `GAME_URL` に実際のURLを設定します。Linux版WebKitを使う場合は `npx playwright install --with-deps webkit` の後、`WEBKIT=1 npm run test:e2e` を実行します。全3戦を通して操作し、実際のゲーム画面を撮る場合は `CAPTURE=1 CAPTURE_CAMPAIGN=1 npm run test:e2e -- tests/battle.spec.ts` を実行します。

## GitHub Pages に公開する

1. 対象リポジトリの **Settings → Pages → Build and deployment** で **Source** を **GitHub Actions** に設定します。
2. `main` への反映で **Deploy to GitHub Pages** が起動します。設定した時点ですでに `main` にコードがある場合は **Actions → Deploy to GitHub Pages → Run workflow** から `main` を選んで実行します。
3. デプロイ成功後、実行結果の **github-pages** 環境に表示されるURLを開きます。新たなリポジトリ名に変更する場合は `vite.config.ts` の `base` も合わせて変更します。

## iPhone 実機での確認

1. Safariで公開URLを開きます。縦向きの案内を確認してから横向きにします。Safariの上下バーが出た状態も確認します。
2. パーツを変えて1本指で回転します。再読込して同じパーツが表示されることと、音の設定が保存されることを確認します。
3. バトルで左手の方向ボタンと右手の攻撃ボタンを同時に押し、片方ずつ離します。プレイ中に横→縦→横に回転し、ホーム画面や別タブから戻って入力が残っていないことを確認します。
4. HPの変化、3武器の必殺技、すべての勝敗画面、同ラウンドの再戦、3戦クリアを確認します。機種、iOSの版、Safariの表示状態、結果を [テスト報告](docs/TEST_REPORT.md) に記録します。

## コード

- `src/robots/` は交換用モデル、ジョイント、サムネイルとCPUの造形を管理します。
- `src/battle/` は時間ベースの戦闘、CPUの状態、進行、3Dエフェクトを管理します。難易度は `src/battle/battleBalance.ts` で調整します。
- `src/core/stage.ts` は共通の3D画面、カメラ、描画解像度を管理します。 `src/input/` は複数ポインター、`src/audio/` は音、`src/ui/` は画面UIを担当します。
