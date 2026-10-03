# React + TypeScript + Vite

![Deploy Status](https://github.com/[username]/parfait-sardine-run/actions/workflows/deploy.yml/badge.svg)

パフェ × イワシの世界観で作るゲームプロトタイプです。

現在は **横スクロールアクション** を新しいコアゲームとして検証しています。

## Documentation

- [パフェイワ ゲーム仕様書](./doc/Game-Specification.md)
- [ADR-0001: 横スクロールアクションへコアゲームを転換](./docs/adr/0001-side-scrolling-action-pivot.md)
- [Database Schema](./doc/Database-Schema.md)

## Controls

- `← / →` または `A / D`: 移動
- `↑ / W / Space`: ジャンプ
- `J / K / X`: 攻撃
- モバイル: 画面下部の操作ボタン

## Deployment

This project is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

### Setup GitHub Pages

1. Go to your repository Settings > Pages
2. Under "Build and deployment", set Source to **GitHub Actions**
3. Push to the `main` branch to trigger deployment
4. Your site will be available at `https://[username].github.io/parfait-sardine-run/`

### Local Development

```bash
npm install
npm run dev
```

### Build for Production

```bash
npm run build
```

### Test

```bash
npm run test:run
```
