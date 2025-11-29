# データベース設計仕様書

## 1. 概要
本プロジェクト（Parfait & Sardine RUN!）で使用するデータベースのテーブル定義です。
WordPressのデータベースを使用し、接頭辞 `wp_` を持つカスタムテーブルと、WordPress標準テーブルの組み合わせで構成されています。

## 2. カスタムテーブル定義

### 2.1. ユーザー情報 / ランキング (`wp_psr_users`)
ユーザーごとの最新ステータスとベストスコアを管理するマスターテーブルです。`RunSaving-API` のUPSERTモデルに基づきます。

| 項目名 | 論理名 | データ型 | NULL | Key | Default | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **id** | ID | `bigint(20) unsigned` | NO | PRI | NULL | レコードID (AUTO_INCREMENT) |
| **fingerprint_hash** | ユーザーハッシュ | `varchar(128)` | NO | UNI | NULL | ユーザー識別用ハッシュ値 |
| **nickname** | ニックネーム | `tinytext` | NO | | NULL | プレイヤー名 |
| **score_best** | ベストスコア | `bigint(20)` | NO | | 0 | 過去最高の獲得スコア (ランキング集計用) |
| **runs_count** | プレイ回数 | `int(11)` | NO | | 0 | 累計プレイ回数 |
| **last_run_id** | 最終ランID | `char(36)` | YES | | NULL | 最終プレイ時のUUID |
| **last_score** | 最終スコア | `bigint(20)` | YES | | NULL | 直近プレイ時のスコア |
| **last_stage** | 最終ステージ | `varchar(50)` | YES | | NULL | 直近プレイ時の到達ステージ |
| **device** | デバイス情報 | `varchar(32)` | YES | | NULL | プレイ環境 (例: `PC_Web`) |
| **build** | ビルド情報 | `varchar(32)` | YES | | NULL | アプリケーションバージョン |
| **created_at** | 初回プレイ日時 | `datetime` | NO | | `current_timestamp()` | 作成日時 |
| **updated_at** | 最終更新日時 | `datetime` | NO | | `current_timestamp()` | 更新日時 (`ON UPDATE current_timestamp()`) |

### 2.2. プレイ履歴 (`wp_psr_runs`)
ゲームプレイごとの詳細ログを記録するテーブルです（`PSR_KEEP_RUNS: true`設定時）。

| 項目名 | 論理名 | データ型 | NULL | Key | Default | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **id** | ID | `bigint(20) unsigned` | NO | PRI | NULL | レコードID (AUTO_INCREMENT) |
| **run_id** | ランID | `char(36)` | NO | UNI | NULL | プレイ固有のUUID |
| **fingerprint** | ユーザー識別子 | `varchar(128)` | NO | MUL | NULL | ユーザーハッシュ (`psr_users`紐付け用) |
| **score** | スコア | `bigint(20)` | NO | | 0 | 獲得スコア |
| **stage** | ステージ | `varchar(50)` | NO | | NULL | 到達ステージ名 |
| **duration_ms** | プレイ時間 | `int(11)` | NO | | 0 | プレイ時間(ms) |
| **distance** | 距離 | `int(11)` | NO | | 0 | 走行距離 |
| **coins** | コイン | `int(11)` | NO | | 0 | 獲得コイン数 |
| **result** | 結果 | `varchar(20)` | YES | | NULL | `clear`, `lose`, `quit` |
| **extras** | 追加データ | `longtext` | YES | | NULL | 詳細スタッツ等のJSONデータ |
| **created_at** | 作成日時 | `datetime` | NO | | `current_timestamp()` | プレイ日時 |

### 2.3. リーダーボード (`wp_psrun_leaderboard`)
Leaderboard API v2で使用される、ランキング専用の軽量テーブルです。

| 項目名 | 論理名 | データ型 | NULL | Key | Default | 説明 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **id** | ID | `bigint(20) unsigned` | NO | PRI | NULL | レコードID (AUTO_INCREMENT) |
| **time** | 登録日時 | `datetime` | NO | | `current_timestamp()` | スコア登録日時 |
| **name** | プレイヤー名 | `tinytext` | NO | | NULL | プレイヤー名 |
| **score** | スコア | `int(11)` | NO | | NULL | スコア |
| **level** | レベル | `int(11)` | NO | | NULL | 到達レベル |
| **coins** | コイン | `int(11)` | NO | | NULL | 獲得コイン数 |
| **char** | 使用キャラ | `tinytext` | NO | | NULL | キャラクター識別子 |

---

## 3. WordPress標準テーブルの使用について

### 3.1. コメント (`wp_comments`)
ゲーム内の応援コメント機能に使用します。

* **`comment_post_ID`**: ゲーム用記事ID（デフォルト: 103）に固定。
* **`comment_author`**: ユーザーのニックネーム。
* **`comment_approved`**: API設定により原則即時承認（`1`）。

### 3.2. コメントメタデータ (`wp_commentmeta`)
「いいね」機能の実装に使用します。

| Meta Key | 説明 |
| :--- | :--- |
| `_psr_liked_{CLIENT_HASH}` | クライアントごとのいいね状態（値: `1`） |
| `_psr_like_count` | いいね総数のキャッシュ（値: 整数） |