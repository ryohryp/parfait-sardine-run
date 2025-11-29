# データベース設計仕様書 (Rev 2.0)

## 1. 概要
本プロジェクト（Parfait & Sardine RUN!）で使用するデータベースのテーブル定義です。
WordPressのデータベースを使用し、接頭辞 `wp_` を持つカスタムテーブルと、WordPress標準テーブルの組み合わせで構成されています。

## 2. カスタムテーブル定義

### 2.1. ユーザー情報 / ランキング (`wp_psr_users`)
ユーザーごとの最新ステータスとベストスコアを管理するマスターテーブルです。
`RunSaving-API` のUPSERTモデルに基づき、常に最新の状態を保持します。

| 項目名 | 論理名 | データ型 | Key | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| **fp_hash** | ユーザーハッシュ | `char(64)` | **PRI** | ユーザー識別用ハッシュ値 (SHA-256) |
| **nickname** | ニックネーム | `varchar(64)` | | プレイヤー名 |
| **device** | デバイス情報 | `varchar(32)` | | プレイ環境 (例: `PC_Web`) |
| **build** | ビルド情報 | `varchar(32)` | | アプリケーションバージョン |
| **last_run_uuid** | 最終ランID | `char(36)` | **UNI** | 最終プレイ時のUUID |
| **nonce** | ノンス | `char(32)` | | 不正防止用トークン |
| **last_started_gmt** | 初回プレイ日時 | `datetime` | | 作成日時相当 |
| **last_finished_gmt** | 最終完了日時 | `datetime` | | 最終プレイ完了日時 |
| **runs_count** | プレイ回数 | `bigint(20) unsigned` | | 累計プレイ回数 (Default: 0) |
| **score_last** | 最終スコア | `bigint(20)` | | 直近プレイ時のスコア |
| **score_best** | ベストスコア | `bigint(20)` | MUL | 過去最高の獲得スコア |
| **stage_last** | 最終ステージ | `varchar(64)` | | 直近プレイ時の到達ステージ |
| **duration_last** | 最終時間 | `int(11)` | | 直近プレイ時間(ms) |
| **distance_last** | 最終距離 | `int(11)` | | 直近走行距離 |
| **coins_last** | 最終コイン | `int(11)` | | 直近獲得コイン |
| **result_last** | 最終結果 | `enum(...)` | | `clear`, `lose`, `quit` |
| **updated_gmt** | 最終更新日時 | `datetime` | MUL | 更新日時 |

---

### 2.2. プレイ履歴 (`wp_psr_runs`)
ゲームプレイごとの詳細ログを記録するテーブルです（`PSR_KEEP_RUNS: true`設定時）。

| 項目名 | 論理名 | データ型 | Key | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | ID | `bigint(20) unsigned` | **PRI** | レコードID (AUTO_INCREMENT) |
| **run_uuid** | ランID | `char(36)` | **UNI** | プレイ固有のUUID |
| **nonce** | ノンス | `char(32)` | | 不正防止用トークン |
| **fp_hash** | ユーザーID | `char(64)` | MUL | `psr_users.fp_hash` との紐付け用 |
| **nickname** | ニックネーム | `varchar(64)` | | プレイ時の名前（任意） |
| **score** | スコア | `bigint(20)` | | 獲得スコア |
| **stage** | ステージ | `varchar(64)` | | 到達ステージ名 |
| **duration_ms** | プレイ時間 | `int(11)` | | プレイ時間(ms) |
| **distance** | 距離 | `int(11)` | | 走行距離 |
| **coins** | コイン | `int(11)` | | 獲得コイン数 |
| **result** | 結果 | `enum(...)` | | `clear`, `lose`, `quit` |
| **device** | デバイス | `varchar(32)` | | |
| **build** | ビルド | `varchar(32)` | | |
| **extras** | 追加データ | `longtext` | | 詳細スタッツ等のJSONデータ |
| **started_gmt** | 開始日時 | `datetime` | | |
| **finished_gmt** | 終了日時 | `datetime` | MUL | |
| **fingerprint_hash** | (予備)ユーザーハッシュ | `varchar(128)` | MUL | API v1.1改修で追加。`fp_hash`と同義。 |

---

### 2.3. リーダーボード (`wp_psrun_leaderboard`)
Leaderboard API v2で使用される、ランキング専用のテーブルです。

| 項目名 | 論理名 | データ型 | Key | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | ID | `bigint(20) unsigned` | **PRI** | レコードID (AUTO_INCREMENT) |
| **name** | プレイヤー名 | `varchar(64)` | | 登録時のプレイヤー名 |
| **score** | スコア | `int(11)` | MUL | ランキング基準スコア |
| **level** | レベル | `int(11)` | | 到達レベル |
| **coins** | コイン | `int(11)` | | 獲得コイン数 |
| **character_name** | 使用キャラ | `varchar(32)` | | キャラクター識別子 (APIでは `char` として扱う) |
| **time** | 登録日時 | `datetime` | | スコア登録日時 |
| **fingerprint_hash** | ユーザーハッシュ | `varchar(128)` | MUL | ユーザー紐付け用 (API v1.1改修で追加) |

> **実装ノート:**
> * APIレスポンスでは `character_name` カラムを `char` キーに変換して返します。
> * `fingerprint_hash` を利用して `wp_psr_users` とJOINし、最新のニックネームを表示することが可能です。

---

## 3. WordPress標準テーブルの使用について

### 3.1. コメント (`wp_comments`)
* **`comment_post_ID`**: ゲーム用記事ID（デフォルト: 103）
* **`comment_approved`**: `1` (即時承認)

### 3.2. コメントメタデータ (`wp_commentmeta`)
* **`_psr_liked_{CLIENT_HASH}`**: いいね状態
* **`_psr_like_count`**: いいね総数キャッシュ