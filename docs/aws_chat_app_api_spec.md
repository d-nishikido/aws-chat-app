# AWS チャットアプリ API仕様書

## 1. 概要

### API基本情報
- **プロトコル**: HTTPS
- **ベースURL**: 
  - 開発環境: `https://dev-api.chat-app.example.com`
  - 本番環境: `https://api.chat-app.example.com`
- **認証方式**: Amazon Cognito JWT Token
- **レスポンス形式**: JSON
- **文字エンコーディング**: UTF-8

### バージョン管理
- **現在のバージョン**: v1
- **APIパス**: `/api/v1`

### 使用技術
- **REST API**: Amazon API Gateway
- **GraphQL**: AWS AppSync
- **リアルタイム通信**: AppSync Subscriptions
- **認証**: Amazon Cognito User Pools
- **バックエンド**: AWS Lambda (Python 3.11)

---

## 2. 認証

### 認証ヘッダー
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### トークン取得例
```javascript
// AWS Amplify使用例
import { Auth } from 'aws-amplify';

const token = (await Auth.currentSession()).getIdToken().getJwtToken();
```

---

## 3. REST API エンドポイント

### 3.1 認証関連

#### POST /api/v1/auth/login
ユーザーログイン（Cognito認証後の追加処理）

**リクエスト**
```json
{
  "cognito_user_id": "us-east-1:12345678-1234-1234-1234-123456789012",
  "email": "user@example.com",
  "username": "john_doe"
}
```

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "display_name": "John Doe",
      "email": "user@example.com",
      "avatar_url": null,
      "last_login_at": "2025-01-15T10:30:00Z"
    },
    "session": {
      "session_token": "session_abc123",
      "expires_at": "2025-01-15T18:30:00Z"
    }
  }
}
```

**エラーレスポンス**
```json
{
  "status": "error",
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid credentials"
  }
}
```

#### POST /api/v1/auth/logout
ユーザーログアウト

**リクエスト**
```json
{
  "session_token": "session_abc123"
}
```

**レスポンス**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

### 3.2 ユーザー管理

#### GET /api/v1/users/me
現在のユーザー情報取得

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "display_name": "John Doe",
    "email": "user@example.com",
    "avatar_url": "https://cdn.example.com/avatars/john_doe.jpg",
    "last_login_at": "2025-01-15T10:30:00Z",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

#### PUT /api/v1/users/me
現在のユーザー情報更新

**リクエスト**
```json
{
  "display_name": "John Smith",
  "avatar_url": "https://cdn.example.com/avatars/new_avatar.jpg"
}
```

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "display_name": "John Smith",
    "email": "user@example.com",
    "avatar_url": "https://cdn.example.com/avatars/new_avatar.jpg",
    "updated_at": "2025-01-15T10:35:00Z"
  }
}
```

#### GET /api/v1/users/search
ユーザー検索

**クエリパラメータ**
- `q`: 検索クエリ（ユーザー名、表示名）
- `limit`: 取得件数（デフォルト: 10、最大: 50）

**リクエスト例**
```
GET /api/v1/users/search?q=john&limit=10
```

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "john_doe",
        "display_name": "John Doe",
        "avatar_url": "https://cdn.example.com/avatars/john_doe.jpg"
      }
    ],
    "total": 1,
    "has_more": false
  }
}
```

### 3.3 チャットルーム管理

#### GET /api/v1/rooms
ユーザーが参加しているルーム一覧取得

**クエリパラメータ**
- `limit`: 取得件数（デフォルト: 20、最大: 100）
- `offset`: オフセット（デフォルト: 0）
- `type`: ルームタイプフィルタ（public/private/direct）

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "rooms": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "一般チャット",
        "description": "誰でも参加できるチャットルーム",
        "room_type": "public",
        "max_members": 100,
        "member_count": 25,
        "last_message": {
          "id": "770e8400-e29b-41d4-a716-446655440000",
          "content": "こんにちは！",
          "user": {
            "username": "alice",
            "display_name": "Alice"
          },
          "created_at": "2025-01-15T10:25:00Z"
        },
        "unread_count": 3,
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "total": 5,
    "has_more": false
  }
}
```

#### POST /api/v1/rooms
新しいチャットルーム作成

**リクエスト**
```json
{
  "name": "プロジェクトA",
  "description": "プロジェクトAに関する議論",
  "room_type": "private",
  "max_members": 50
}
```

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "name": "プロジェクトA",
    "description": "プロジェクトAに関する議論",
    "room_type": "private",
    "max_members": 50,
    "member_count": 1,
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

#### GET /api/v1/rooms/{room_id}
特定のチャットルーム情報取得

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "一般チャット",
    "description": "誰でも参加できるチャットルーム",
    "room_type": "public",
    "max_members": 100,
    "member_count": 25,
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "members": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "john_doe",
        "display_name": "John Doe",
        "role": "owner",
        "joined_at": "2025-01-01T00:00:00Z"
      }
    ],
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

#### PUT /api/v1/rooms/{room_id}
チャットルーム情報更新

**リクエスト**
```json
{
  "name": "一般チャット（更新）",
  "description": "新しい説明文",
  "max_members": 150
}
```

#### DELETE /api/v1/rooms/{room_id}
チャットルーム削除（論理削除）

**レスポンス**
```json
{
  "status": "success",
  "message": "Room deleted successfully"
}
```

### 3.4 ルームメンバー管理

#### POST /api/v1/rooms/{room_id}/members
ルームにメンバー追加

**リクエスト**
```json
{
  "user_id": "990e8400-e29b-41d4-a716-446655440000",
  "role": "member"
}
```

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "user_id": "990e8400-e29b-41d4-a716-446655440000",
    "username": "alice",
    "display_name": "Alice",
    "role": "member",
    "joined_at": "2025-01-15T10:30:00Z"
  }
}
```

#### DELETE /api/v1/rooms/{room_id}/members/{user_id}
ルームからメンバー削除

**レスポンス**
```json
{
  "status": "success",
  "message": "Member removed successfully"
}
```

#### PUT /api/v1/rooms/{room_id}/members/{user_id}/role
メンバーロール変更

**リクエスト**
```json
{
  "role": "admin"
}
```

### 3.5 メッセージ管理

#### GET /api/v1/rooms/{room_id}/messages
メッセージ履歴取得

**クエリパラメータ**
- `limit`: 取得件数（デフォルト: 50、最大: 100）
- `before`: 指定日時より前のメッセージ（ISO 8601形式）
- `after`: 指定日時より後のメッセージ（ISO 8601形式）

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "messages": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "content": "こんにちは！",
        "message_type": "text",
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "username": "john_doe",
          "display_name": "John Doe",
          "avatar_url": "https://cdn.example.com/avatars/john_doe.jpg"
        },
        "reply_to": null,
        "file_upload": null,
        "is_edited": false,
        "created_at": "2025-01-15T10:25:00Z",
        "updated_at": "2025-01-15T10:25:00Z"
      }
    ],
    "total": 150,
    "has_more": true
  }
}
```

#### POST /api/v1/rooms/{room_id}/messages
新しいメッセージ送信

**リクエスト（テキストメッセージ）**
```json
{
  "content": "こんにちは、皆さん！",
  "message_type": "text",
  "reply_to_id": null
}
```

**リクエスト（ファイル付きメッセージ）**
```json
{
  "content": "ファイルを共有します",
  "message_type": "file",
  "file_upload_id": "aa0e8400-e29b-41d4-a716-446655440000"
}
```

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440000",
    "content": "こんにちは、皆さん！",
    "message_type": "text",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "display_name": "John Doe"
    },
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

#### PUT /api/v1/rooms/{room_id}/messages/{message_id}
メッセージ編集

**リクエスト**
```json
{
  "content": "編集されたメッセージ内容"
}
```

#### DELETE /api/v1/rooms/{room_id}/messages/{message_id}
メッセージ削除（論理削除）

**レスポンス**
```json
{
  "status": "success",
  "message": "Message deleted successfully"
}
```

### 3.6 ファイルアップロード

#### POST /api/v1/upload/presigned-url
ファイルアップロード用のPresigned URL取得

**リクエスト**
```json
{
  "file_name": "document.pdf",
  "file_size": 1048576,
  "mime_type": "application/pdf"
}
```

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "upload_id": "cc0e8400-e29b-41d4-a716-446655440000",
    "presigned_url": "https://s3.amazonaws.com/bucket/path?AWSAccessKeyId=...",
    "fields": {
      "key": "uploads/cc0e8400-e29b-41d4-a716-446655440000/document.pdf",
      "policy": "eyJ...",
      "x-amz-algorithm": "AWS4-HMAC-SHA256",
      "x-amz-credential": "...",
      "x-amz-date": "20250115T103000Z",
      "x-amz-signature": "..."
    },
    "expires_at": "2025-01-15T11:30:00Z"
  }
}
```

#### POST /api/v1/upload/{upload_id}/complete
ファイルアップロード完了通知

**リクエスト**
```json
{
  "etag": "\"9bb58f26192e4ba00f01e2e7b136bbd8\""
}
```

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "id": "cc0e8400-e29b-41d4-a716-446655440000",
    "original_name": "document.pdf",
    "file_name": "cc0e8400-e29b-41d4-a716-446655440000.pdf",
    "file_size": 1048576,
    "mime_type": "application/pdf",
    "file_path": "uploads/cc0e8400-e29b-41d4-a716-446655440000/document.pdf",
    "thumbnail_path": null,
    "upload_status": "completed",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### 3.7 オンライン状態管理

#### POST /api/v1/sessions/heartbeat
セッションハートビート（オンライン状態維持）

**リクエスト**
```json
{
  "room_id": "660e8400-e29b-41d4-a716-446655440000",
  "status": "online"
}
```

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "session_updated": true,
    "expires_at": "2025-01-15T18:30:00Z"
  }
}
```

#### GET /api/v1/rooms/{room_id}/online-users
ルームのオンラインユーザー一覧

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "online_users": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "john_doe",
        "display_name": "John Doe",
        "status": "online",
        "last_activity": "2025-01-15T10:29:00Z"
      }
    ],
    "total": 3
  }
}
```

### 3.8 BLEA統合セキュリティ機能（高優先度）

#### GET /api/v1/security/events
セキュリティイベント一覧取得

**クエリパラメータ**
- `limit`: 取得件数（デフォルト: 50、最大: 100）
- `offset`: オフセット（デフォルト: 0）
- `severity`: 重要度フィルタ（info/low/medium/high/critical）
- `event_type`: イベントタイプフィルタ
- `start_date`: 開始日時（ISO 8601形式）
- `end_date`: 終了日時（ISO 8601形式）

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "id": "ee0e8400-e29b-41d4-a716-446655440000",
        "event_type": "authentication_failure",
        "event_category": "authentication",
        "severity": "high",
        "source_service": "api_gateway",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "source_ip": "192.168.1.100",
        "user_agent": "Mozilla/5.0...",
        "resource_type": "api_endpoint",
        "resource_id": "/api/v1/auth/login",
        "action_performed": "failed_login_attempt",
        "event_details": {
          "failed_attempts": 5,
          "time_window": "5 minutes",
          "blocked_ip": true
        },
        "security_hub_id": "arn:aws:securityhub:ap-northeast-1:123456789012:finding/12345",
        "remediation_status": "open",
        "created_at": "2025-01-15T10:25:00Z"
      }
    ],
    "total": 150,
    "has_more": true
  }
}
```

#### GET /api/v1/security/events/{event_id}
特定のセキュリティイベント詳細取得

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "id": "ee0e8400-e29b-41d4-a716-446655440000",
    "event_type": "brute_force_detected",
    "event_category": "authentication",
    "severity": "critical",
    "source_service": "security_monitor",
    "user_id": null,
    "source_ip": "192.168.1.100",
    "event_details": {
      "failed_attempts": 15,
      "time_window": "10 minutes",
      "affected_users": ["user1", "user2"],
      "detection_rules": ["rule_001", "rule_002"],
      "correlation_id": "corr_12345"
    },
    "security_hub_id": "arn:aws:securityhub:ap-northeast-1:123456789012:finding/67890",
    "remediation_status": "in_progress",
    "remediation_notes": "IP blocked via WAF, investigating source",
    "created_at": "2025-01-15T10:20:00Z",
    "resolved_at": null
  }
}
```

#### PUT /api/v1/security/events/{event_id}/remediation
セキュリティイベント対応状況更新

**リクエスト**
```json
{
  "remediation_status": "resolved",
  "remediation_notes": "False positive - legitimate user with VPN. Added to whitelist."
}
```

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "id": "ee0e8400-e29b-41d4-a716-446655440000",
    "remediation_status": "resolved",
    "remediation_notes": "False positive - legitimate user with VPN. Added to whitelist.",
    "resolved_at": "2025-01-15T10:35:00Z",
    "resolved_by": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### GET /api/v1/security/audit-logs
BLEA監査ログ取得

**クエリパラメータ**
- `table_name`: テーブル名フィルタ
- `operation`: 操作タイプフィルタ（INSERT/UPDATE/DELETE）
- `user_id`: ユーザーIDフィルタ
- `start_date`: 開始日時
- `end_date`: 終了日時
- `limit`: 取得件数（デフォルト: 50、最大: 200）

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "audit_logs": [
      {
        "id": "ff0e8400-e29b-41d4-a716-446655440000",
        "table_name": "messages",
        "operation": "INSERT",
        "record_id": "770e8400-e29b-41d4-a716-446655440000",
        "old_values": null,
        "new_values": {
          "content": "Hello, world!",
          "room_id": "660e8400-e29b-41d4-a716-446655440000",
          "user_id": "550e8400-e29b-41d4-a716-446655440000"
        },
        "changed_fields": ["content", "room_id", "user_id"],
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "cognito_user_id": "us-east-1:12345678-1234-1234-1234-123456789012",
        "ip_address": "192.168.1.50",
        "user_agent": "Mozilla/5.0...",
        "api_endpoint": "/api/v1/rooms/660e8400-e29b-41d4-a716-446655440000/messages",
        "request_id": "req_abcdef123456",
        "compliance_context": {
          "data_classification": "internal",
          "retention_period": 2555,
          "compliance_tags": ["chat_data", "user_content"]
        },
        "created_at": "2025-01-15T10:25:00Z"
      }
    ],
    "total": 5000,
    "has_more": true
  }
}
```

#### GET /api/v1/security/compliance-summary
BLEA準拠性サマリー取得

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "compliance_status": "compliant",
    "last_assessment": "2025-01-15T09:00:00Z",
    "next_assessment": "2025-01-22T09:00:00Z",
    "compliance_score": 98.5,
    "findings_summary": {
      "passed": 45,
      "failed": 1,
      "not_available": 0,
      "warning": 2
    },
    "config_rules": [
      {
        "rule_name": "s3-bucket-public-read-prohibited",
        "compliance_status": "COMPLIANT",
        "last_evaluation": "2025-01-15T08:30:00Z"
      },
      {
        "rule_name": "rds-storage-encrypted",
        "compliance_status": "COMPLIANT",
        "last_evaluation": "2025-01-15T08:30:00Z"
      },
      {
        "rule_name": "lambda-function-public-access-prohibited",
        "compliance_status": "NON_COMPLIANT",
        "last_evaluation": "2025-01-15T08:30:00Z",
        "annotation": "Lambda function has public access - investigating"
      }
    ],
    "security_standards": [
      {
        "standard_name": "AWS Foundational Security Standard",
        "compliance_score": 96.8,
        "enabled_controls": 28,
        "failed_controls": 1
      },
      {
        "standard_name": "CIS AWS Foundations Benchmark",
        "compliance_score": 100.0,
        "enabled_controls": 20,
        "failed_controls": 0
      }
    ]
  }
}
```

#### GET /api/v1/security/security-hub/findings
Security Hub統合所見取得

**クエリパラメータ**
- `severity`: 重要度フィルタ（LOW/MEDIUM/HIGH/CRITICAL）
- `workflow_state`: ワークフロー状態（NEW/ASSIGNED/IN_PROGRESS/RESOLVED）
- `product_name`: 製品名フィルタ
- `limit`: 取得件数

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "findings": [
      {
        "id": "arn:aws:securityhub:ap-northeast-1:123456789012:finding/12345",
        "aws_account_id": "123456789012",
        "created_at": "2025-01-15T10:20:00Z",
        "updated_at": "2025-01-15T10:25:00Z",
        "severity": {
          "label": "HIGH",
          "normalized": 70
        },
        "title": "Suspicious Login Activity Detected",
        "description": "Multiple failed login attempts from suspicious IP address",
        "product_name": "GuardDuty",
        "generator_id": "aws-guardduty",
        "workflow_state": "NEW",
        "record_state": "ACTIVE",
        "resources": [
          {
            "type": "AwsApiGatewayRestApi",
            "id": "arn:aws:apigateway:ap-northeast-1::/restapis/abcdef123456",
            "region": "ap-northeast-1"
          }
        ],
        "source_url": "https://console.aws.amazon.com/guardduty/home#/findings?search=..."
      }
    ],
    "total": 25,
    "has_more": true
  }
}
```

#### PUT /api/v1/security/security-hub/findings/{finding_id}/workflow
Security Hub所見ワークフロー更新

**リクエスト**
```json
{
  "workflow_state": "IN_PROGRESS",
  "note": "Investigating the source of suspicious activity. Initial analysis suggests automated scanning."
}
```

#### POST /api/v1/security/events/report
カスタムセキュリティイベント報告

**リクエスト**
```json
{
  "event_type": "suspicious_file_upload",
  "event_category": "data_access",
  "severity": "medium",
  "source_service": "application",
  "resource_type": "file",
  "resource_id": "file_12345.exe",
  "action_performed": "file_upload_blocked",
  "event_details": {
    "file_name": "suspicious.exe",
    "file_size": 5242880,
    "mime_type": "application/x-executable",
    "virus_scan_result": "threat_detected",
    "threat_type": "malware"
  }
}
```

**レスポンス**
```json
{
  "status": "success",
  "data": {
    "event_id": "gg0e8400-e29b-41d4-a716-446655440000",
    "security_hub_finding_id": "arn:aws:securityhub:ap-northeast-1:123456789012:finding/78901",
    "created_at": "2025-01-15T10:30:00Z",
    "automatic_response": {
      "actions_taken": [
        "file_quarantined",
        "user_notified",
        "security_team_alerted"
      ]
    }
  }
}
```

---

## 4. GraphQL API (AppSync)

### エンドポイント
- **GraphQL Endpoint**: `https://graphql.chat-app.example.com/graphql`
- **Subscription Endpoint**: `wss://graphql.chat-app.example.com/graphql`

### 4.1 GraphQL Schema

```graphql
type Query {
  # ユーザー情報
  me: User
  user(id: ID!): User
  searchUsers(query: String!, limit: Int = 10): UserSearchResult
  
  # ルーム情報
  rooms(limit: Int = 20, offset: Int = 0, type: RoomType): RoomConnection
  room(id: ID!): Room
  roomMembers(roomId: ID!): [RoomMember]
  
  # メッセージ
  messages(roomId: ID!, limit: Int = 50, before: AWSDateTime, after: AWSDateTime): MessageConnection
  message(id: ID!): Message
  
  # オンライン状態
  onlineUsers(roomId: ID!): [OnlineUser]
  
  # BLEA統合セキュリティ機能
  securityEvents(limit: Int = 50, severity: SecuritySeverity, eventType: String, startDate: AWSDateTime, endDate: AWSDateTime): SecurityEventConnection
  securityEvent(id: ID!): SecurityEvent
  auditLogs(tableName: String, operation: AuditOperation, userId: ID, startDate: AWSDateTime, endDate: AWSDateTime, limit: Int = 50): AuditLogConnection
  complianceSummary: ComplianceSummary
  securityHubFindings(severity: SecuritySeverity, workflowState: WorkflowState, limit: Int = 50): SecurityHubFindingConnection
}

type Mutation {
  # ユーザー管理
  updateProfile(input: UpdateProfileInput!): User
  
  # ルーム管理
  createRoom(input: CreateRoomInput!): Room
  updateRoom(roomId: ID!, input: UpdateRoomInput!): Room
  deleteRoom(roomId: ID!): Boolean
  
  # メンバー管理
  joinRoom(roomId: ID!): RoomMember
  leaveRoom(roomId: ID!): Boolean
  addMember(roomId: ID!, userId: ID!, role: MemberRole = MEMBER): RoomMember
  removeMember(roomId: ID!, userId: ID!): Boolean
  updateMemberRole(roomId: ID!, userId: ID!, role: MemberRole!): RoomMember
  
  # メッセージ
  sendMessage(input: SendMessageInput!): Message
  editMessage(messageId: ID!, content: String!): Message
  deleteMessage(messageId: ID!): Boolean
  
  # セッション管理
  updateStatus(status: UserStatus!, roomId: ID): Session
  
  # BLEA統合セキュリティ機能
  updateSecurityEventRemediation(eventId: ID!, input: RemediationUpdateInput!): SecurityEvent
  updateSecurityHubFindingWorkflow(findingId: ID!, input: WorkflowUpdateInput!): SecurityHubFinding
  reportCustomSecurityEvent(input: CustomSecurityEventInput!): SecurityEvent
}

type Subscription {
  # メッセージ更新
  messageAdded(roomId: ID!): Message
    @aws_subscribe(mutations: ["sendMessage"])
  
  messageUpdated(roomId: ID!): Message
    @aws_subscribe(mutations: ["editMessage"])
  
  messageDeleted(roomId: ID!): MessageDeleted
    @aws_subscribe(mutations: ["deleteMessage"])
  
  # ユーザー状態更新
  userJoined(roomId: ID!): RoomMemberEvent
    @aws_subscribe(mutations: ["joinRoom", "addMember"])
  
  userLeft(roomId: ID!): RoomMemberEvent
    @aws_subscribe(mutations: ["leaveRoom", "removeMember"])
  
  userStatusChanged(roomId: ID!): OnlineUser
    @aws_subscribe(mutations: ["updateStatus"])
  
  # ルーム更新
  roomUpdated(roomId: ID!): Room
    @aws_subscribe(mutations: ["updateRoom"])
  
  # BLEA統合セキュリティ機能
  securityEventAdded: SecurityEvent
    @aws_subscribe(mutations: ["reportCustomSecurityEvent"])
  
  securityEventUpdated(eventId: ID!): SecurityEvent
    @aws_subscribe(mutations: ["updateSecurityEventRemediation"])
  
  complianceStatusChanged: ComplianceSummary
}

# 型定義
type User {
  id: ID!
  username: String!
  displayName: String
  email: AWSEmail!
  avatarUrl: AWSURL
  lastLoginAt: AWSDateTime
  isActive: Boolean!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type Room {
  id: ID!
  name: String!
  description: String
  roomType: RoomType!
  maxMembers: Int!
  memberCount: Int!
  createdBy: User
  lastMessage: Message
  unreadCount: Int
  members: [RoomMember]
  isActive: Boolean!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type Message {
  id: ID!
  content: String!
  messageType: MessageType!
  user: User
  room: Room!
  replyTo: Message
  fileUpload: FileUpload
  isEdited: Boolean!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type RoomMember {
  id: ID!
  user: User!
  room: Room!
  role: MemberRole!
  joinedAt: AWSDateTime!
  leftAt: AWSDateTime
  isActive: Boolean!
}

type Session {
  id: ID!
  user: User!
  room: Room
  status: UserStatus!
  deviceType: String
  lastActivity: AWSDateTime!
  expiresAt: AWSDateTime!
}

type FileUpload {
  id: ID!
  originalName: String!
  fileName: String!
  fileSize: AWSTimestamp!
  mimeType: String!
  filePath: String!
  thumbnailPath: String
  uploadStatus: UploadStatus!
  createdAt: AWSDateTime!
}

# BLEA統合セキュリティ型
type SecurityEvent {
  id: ID!
  eventType: String!
  eventCategory: String!
  severity: SecuritySeverity!
  sourceService: String!
  user: User
  sourceIp: String
  userAgent: String
  resourceType: String
  resourceId: String
  actionPerformed: String
  eventDetails: AWSJSON!
  securityHubId: String
  remediationStatus: RemediationStatus!
  remediationNotes: String
  createdAt: AWSDateTime!
  resolvedAt: AWSDateTime
  resolvedBy: User
}

type AuditLog {
  id: ID!
  tableName: String!
  operation: AuditOperation!
  recordId: ID!
  oldValues: AWSJSON
  newValues: AWSJSON
  changedFields: [String]
  user: User
  cognitoUserId: String
  ipAddress: String
  userAgent: String
  apiEndpoint: String
  requestId: String
  complianceContext: AWSJSON
  dataClassification: String!
  createdAt: AWSDateTime!
}

type ComplianceSummary {
  complianceStatus: String!
  lastAssessment: AWSDateTime!
  nextAssessment: AWSDateTime!
  complianceScore: Float!
  findingsSummary: ComplianceFindingsSummary!
  configRules: [ConfigRule]!
  securityStandards: [SecurityStandard]!
}

type ComplianceFindingsSummary {
  passed: Int!
  failed: Int!
  notAvailable: Int!
  warning: Int!
}

type ConfigRule {
  ruleName: String!
  complianceStatus: String!
  lastEvaluation: AWSDateTime!
  annotation: String
}

type SecurityStandard {
  standardName: String!
  complianceScore: Float!
  enabledControls: Int!
  failedControls: Int!
}

type SecurityHubFinding {
  id: ID!
  awsAccountId: String!
  title: String!
  description: String!
  severity: SecurityHubSeverity!
  productName: String!
  generatorId: String!
  workflowState: WorkflowState!
  recordState: String!
  resources: [SecurityHubResource]!
  sourceUrl: String
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type SecurityHubSeverity {
  label: String!
  normalized: Float!
}

type SecurityHubResource {
  type: String!
  id: String!
  region: String
}

# 列挙型
enum RoomType {
  PUBLIC
  PRIVATE
  DIRECT
}

enum MessageType {
  TEXT
  IMAGE
  FILE
  SYSTEM
}

enum MemberRole {
  OWNER
  ADMIN
  MEMBER
}

enum UserStatus {
  ONLINE
  AWAY
  OFFLINE
}

enum UploadStatus {
  PROCESSING
  COMPLETED
  FAILED
}

# BLEA統合セキュリティ列挙型
enum SecuritySeverity {
  INFO
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum RemediationStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  SUPPRESSED
}

enum AuditOperation {
  INSERT
  UPDATE
  DELETE
}

enum WorkflowState {
  NEW
  ASSIGNED
  IN_PROGRESS
  RESOLVED
  SUPPRESSED
}

# 入力型
input CreateRoomInput {
  name: String!
  description: String
  roomType: RoomType = PUBLIC
  maxMembers: Int = 100
}

input UpdateRoomInput {
  name: String
  description: String
  maxMembers: Int
}

input SendMessageInput {
  roomId: ID!
  content: String!
  messageType: MessageType = TEXT
  replyToId: ID
  fileUploadId: ID
}

input UpdateProfileInput {
  displayName: String
  avatarUrl: AWSURL
}

# BLEA統合セキュリティ入力型
input RemediationUpdateInput {
  remediationStatus: RemediationStatus!
  remediationNotes: String
}

input WorkflowUpdateInput {
  workflowState: WorkflowState!
  note: String
}

input CustomSecurityEventInput {
  eventType: String!
  eventCategory: String!
  severity: SecuritySeverity!
  sourceService: String!
  resourceType: String
  resourceId: String
  actionPerformed: String
  eventDetails: AWSJSON!
}

# 接続型
type RoomConnection {
  items: [Room]
  total: Int!
  hasMore: Boolean!
}

type MessageConnection {
  items: [Message]
  total: Int!
  hasMore: Boolean!
}

type UserSearchResult {
  users: [User]
  total: Int!
  hasMore: Boolean!
}

# BLEA統合セキュリティ接続型
type SecurityEventConnection {
  items: [SecurityEvent]
  total: Int!
  hasMore: Boolean!
}

type AuditLogConnection {
  items: [AuditLog]
  total: Int!
  hasMore: Boolean!
}

type SecurityHubFindingConnection {
  items: [SecurityHubFinding]
  total: Int!
  hasMore: Boolean!
}

# イベント型
type RoomMemberEvent {
  user: User!
  room: Room!
  action: String! # "joined" | "left"
  timestamp: AWSDateTime!
}

type MessageDeleted {
  messageId: ID!
  roomId: ID!
  deletedBy: User!
  deletedAt: AWSDateTime!
}

type OnlineUser {
  user: User!
  status: UserStatus!
  lastActivity: AWSDateTime!
}
```

### 4.2 GraphQL クエリ例

#### セキュリティイベント履歴取得
```graphql
query GetSecurityEvents($limit: Int, $severity: SecuritySeverity, $startDate: AWSDateTime) {
  securityEvents(limit: $limit, severity: $severity, startDate: $startDate) {
    items {
      id
      eventType
      eventCategory
      severity
      sourceService
      user {
        id
        username
        displayName
      }
      sourceIp
      resourceType
      resourceId
      actionPerformed
      eventDetails
      remediationStatus
      remediationNotes
      createdAt
      resolvedAt
    }
    total
    hasMore
  }
}
```

#### 監査ログ取得
```graphql
query GetAuditLogs($tableName: String, $operation: AuditOperation, $startDate: AWSDateTime, $limit: Int) {
  auditLogs(tableName: $tableName, operation: $operation, startDate: $startDate, limit: $limit) {
    items {
      id
      tableName
      operation
      recordId
      oldValues
      newValues
      changedFields
      user {
        username
        displayName
      }
      cognitoUserId
      ipAddress
      apiEndpoint
      requestId
      complianceContext
      dataClassification
      createdAt
    }
    total
    hasMore
  }
}
```

#### コンプライアンス状況取得
```graphql
query GetComplianceSummary {
  complianceSummary {
    complianceStatus
    lastAssessment
    complianceScore
    findingsSummary {
      passed
      failed
      warning
      notAvailable
    }
    configRules {
      ruleName
      complianceStatus
      lastEvaluation
      annotation
    }
    securityStandards {
      standardName
      complianceScore
      enabledControls
      failedControls
    }
  }
}
```

#### Security Hub所見取得
```graphql
query GetSecurityHubFindings($severity: SecuritySeverity, $workflowState: WorkflowState, $limit: Int) {
  securityHubFindings(severity: $severity, workflowState: $workflowState, limit: $limit) {
    items {
      id
      title
      description
      severity {
        label
        normalized
      }
      productName
      workflowState
      recordState
      resources {
        type
        id
        region
      }
      sourceUrl
      createdAt
      updatedAt
    }
    total
    hasMore
  }
}
```
```graphql
query GetMessages($roomId: ID!, $limit: Int, $before: AWSDateTime) {
  messages(roomId: $roomId, limit: $limit, before: $before) {
    items {
      id
      content
      messageType
      user {
        id
        username
        displayName
        avatarUrl
      }
      replyTo {
        id
        content
        user {
          username
          displayName
        }
      }
      fileUpload {
        id
        originalName
        filePath
        thumbnailPath
      }
      isEdited
      createdAt
    }
    total
    hasMore
  }
}
```

#### セキュリティイベント対応状況更新
```graphql
mutation UpdateSecurityEventRemediation($eventId: ID!, $input: RemediationUpdateInput!) {
  updateSecurityEventRemediation(eventId: $eventId, input: $input) {
    id
    remediationStatus
    remediationNotes
    resolvedAt
    resolvedBy {
      username
      displayName
    }
  }
}
```

#### カスタムセキュリティイベント報告
```graphql
mutation ReportCustomSecurityEvent($input: CustomSecurityEventInput!) {
  reportCustomSecurityEvent(input: $input) {
    id
    eventType
    severity
    eventDetails
    securityHubId
    createdAt
  }
}
```

#### Security Hub所見ワークフロー更新
```graphql
mutation UpdateSecurityHubFindingWorkflow($findingId: ID!, $input: WorkflowUpdateInput!) {
  updateSecurityHubFindingWorkflow(findingId: $findingId, input: $input) {
    id
    workflowState
    updatedAt
  }
}
```
```graphql
mutation SendMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
    id
    content
    messageType
    user {
      id
      username
      displayName
      avatarUrl
    }
    createdAt
  }
}
```

#### リアルタイムセキュリティイベント受信
```graphql
subscription SecurityEventAdded {
  securityEventAdded {
    id
    eventType
    eventCategory
    severity
    sourceService
    user {
      username
      displayName
    }
    sourceIp
    resourceType
    actionPerformed
    eventDetails
    createdAt
  }
}
```

#### セキュリティイベント更新通知
```graphql
subscription SecurityEventUpdated($eventId: ID!) {
  securityEventUpdated(eventId: $eventId) {
    id
    remediationStatus
    remediationNotes
    resolvedAt
    resolvedBy {
      username
      displayName
    }
  }
}
```

#### コンプライアンス状況変更通知
```graphql
subscription ComplianceStatusChanged {
  complianceStatusChanged {
    complianceStatus
    complianceScore
    lastAssessment
    findingsSummary {
      passed
      failed
      warning
      notAvailable
    }
  }
}
```
```graphql
subscription MessageAdded($roomId: ID!) {
  messageAdded(roomId: $roomId) {
    id
    content
    messageType
    user {
      id
      username
      displayName
      avatarUrl
    }
    replyTo {
      id
      content
    }
    fileUpload {
      id
      originalName
      filePath
      thumbnailPath
    }
    createdAt
  }
}
```

#### オンラインユーザー状態変更
```graphql
subscription UserStatusChanged($roomId: ID!) {
  userStatusChanged(roomId: $roomId) {
    user {
      id
      username
      displayName
      avatarUrl
    }
    status
    lastActivity
  }
}
```

---

## 5. WebSocket API (AppSync Subscriptions)

### 接続設定
```javascript
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const httpLink = new HttpLink({
  uri: 'https://graphql.chat-app.example.com/graphql',
  headers: {
    authorization: `Bearer ${jwt_token}`,
  },
});

const wsLink = new GraphQLWsLink(createClient({
  url: 'wss://graphql.chat-app.example.com/graphql',
  connectionParams: {
    authorization: `Bearer ${jwt_token}`,
  },
}));

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

### サブスクリプション例
```javascript
// メッセージ受信
const messageSubscription = client.subscribe({
  query: MESSAGE_ADDED_SUBSCRIPTION,
  variables: { roomId: 'room-123' }
}).subscribe({
  next: ({ data }) => {
    console.log('New message:', data.messageAdded);
    // UIにメッセージを追加
  },
  error: (err) => {
    console.error('Subscription error:', err);
  }
});

// ユーザー状態変更
const statusSubscription = client.subscribe({
  query: USER_STATUS_CHANGED_SUBSCRIPTION,
  variables: { roomId: 'room-123' }
}).subscribe({
  next: ({ data }) => {
    console.log('User status changed:', data.userStatusChanged);
    // オンラインユーザーリストを更新
  }
});
```

---

## 6. エラーハンドリング

### エラーレスポンス形式
```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional error details"
    },
    "request_id": "req_123456789"
  }
}
```

### エラーコード一覧

#### 認証エラー (4xx)
| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| AUTHENTICATION_FAILED | 401 | 認証に失敗 |
| AUTHORIZATION_FAILED | 403 | 認可に失敗 |
| TOKEN_EXPIRED | 401 | トークンの有効期限切れ |
| INVALID_TOKEN | 401 | 無効なトークン |

#### バリデーションエラー (4xx)
| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| VALIDATION_ERROR | 400 | 入力値検証エラー |
| MISSING_REQUIRED_FIELD | 400 | 必須フィールドが不足 |
| INVALID_FORMAT | 400 | フォーマットが無効 |
| DUPLICATE_ENTRY | 409 | 重複データ |

#### リソースエラー (4xx)
| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| RESOURCE_NOT_FOUND | 404 | リソースが見つからない |
| ROOM_NOT_FOUND | 404 | ルームが見つからない |
| MESSAGE_NOT_FOUND | 404 | メッセージが見つからない |
| USER_NOT_FOUND | 404 | ユーザーが見つからない |

#### BLEA統合エラー (4xx)
| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| SECURITY_EVENT_NOT_FOUND | 404 | セキュリティイベントが見つからない |
| INSUFFICIENT_SECURITY_PERMISSIONS | 403 | セキュリティ操作の権限が不足 |
| COMPLIANCE_CHECK_FAILED | 400 | コンプライアンスチェックに失敗 |
| AUDIT_LOG_ACCESS_DENIED | 403 | 監査ログへのアクセスが拒否 |
| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| ROOM_FULL | 400 | ルームが満員 |
| NOT_ROOM_MEMBER | 403 | ルームメンバーではない |
| INSUFFICIENT_PERMISSIONS | 403 | 権限が不足 |
| FILE_TOO_LARGE | 413 | ファイルサイズが上限を超過 |

#### サーバーエラー (5xx)
| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| INTERNAL_SERVER_ERROR | 500 | 内部サーバーエラー |
| DATABASE_ERROR | 500 | データベースエラー |
| EXTERNAL_SERVICE_ERROR | 502 | 外部サービスエラー |
| SERVICE_UNAVAILABLE | 503 | サービス利用不可 |

### GraphQLエラー例
```json
{
  "data": null,
  "errors": [
    {
      "message": "Room not found",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "room"
      ],
      "extensions": {
        "code": "ROOM_NOT_FOUND",
        "details": {
          "roomId": "invalid-room-id"
        }
      }
    }
  ]
}
```

---

## 7. レート制限

### 制限値
| エンドポイント | 制限 | 時間窓 |
|----------------|------|--------|
| 認証API | 5回 | 1分 |
| メッセージ送信 | 30回 | 1分 |
| ファイルアップロード | 10回 | 1分 |
| その他API | 100回 | 1分 |
| GraphQL | 1000回 | 1分 |

### レート制限ヘッダー
```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1642248000
Retry-After: 60
```

### 制限超過時のレスポンス
```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again later.",
    "details": {
      "limit": 30,
      "remaining": 0,
      "reset_at": "2025-01-15T10:31:00Z"
    }
  }
}
```

---

## 8. ページネーション

### カーソルベースページネーション
```javascript
// 初回取得
GET /api/v1/rooms/room-123/messages?limit=50

// 次のページ
GET /api/v1/rooms/room-123/messages?limit=50&before=2025-01-15T10:25:00Z
```

### GraphQLページネーション
```graphql
query GetMessages($roomId: ID!, $limit: Int, $before: AWSDateTime) {
  messages(roomId: $roomId, limit: $limit, before: $before) {
    items {
      id
      content
      createdAt
    }
    total
    hasMore
  }
}
```

---

## 9. フィルタリング・検索

### ユーザー検索
```
GET /api/v1/users/search?q=john&limit=10
```

### メッセージ検索（将来実装予定）
```
GET /api/v1/search/messages?q=keyword&room_id=room-123&date_from=2025-01-01
```

### GraphQL検索
```graphql
query SearchUsers($query: String!, $limit: Int) {
  searchUsers(query: $query, limit: $limit) {
    users {
      id
      username
      displayName
      avatarUrl
    }
    total
    hasMore
  }
}
```

---

## 10. キャッシュ戦略

### HTTPキャッシュヘッダー
```http
# ユーザー情報（短期キャッシュ）
Cache-Control: private, max-age=300

# メッセージ履歴（長期キャッシュ）
Cache-Control: private, max-age=3600, immutable

# リアルタイムデータ（キャッシュ無効）
Cache-Control: no-cache, no-store, must-revalidate
```

### ETagサポート
```http
# リクエスト
If-None-Match: "abc123"

# レスポンス（変更なし）
HTTP/1.1 304 Not Modified
ETag: "abc123"

# レスポンス（変更あり）
HTTP/1.1 200 OK
ETag: "def456"
```

---

## 11. セキュリティ

### CORS設定
```http
Access-Control-Allow-Origin: https://chat-app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
```

### セキュリティヘッダー
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### リクエスト署名（将来実装予定）
```http
X-Signature: sha256=hash_value
X-Timestamp: 1642248000
```

---

## 12. モニタリング・ログ

### リクエストログ形式
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "request_id": "req_123456789",
  "method": "POST",
  "path": "/api/v1/rooms/room-123/messages",
  "user_id": "user-456",
  "status_code": 200,
  "response_time": 150,
  "user_agent": "Mozilla/5.0...",
  "ip_address": "192.168.1.1"
}
```

### メトリクス
- リクエスト数（RPM）
- レスポンス時間（平均、P95、P99）
- エラー率
- アクティブユーザー数
- 同時接続数

---

## 13. SDKサンプル

### JavaScript/TypeScript
```javascript
import { ChatAPI } from '@chat-app/api-client';

const api = new ChatAPI({
  baseURL: 'https://api.chat-app.example.com',
  token: 'your-jwt-token'
});

// メッセージ送信
const message = await api.sendMessage('room-123', {
  content: 'Hello, world!',
  messageType: 'text'
});

// リアルタイム接続
const subscription = api.subscribeToMessages('room-123', (message) => {
  console.log('New message:', message);
});
```

### React Hook例
```javascript
import { useMessages, useSendMessage } from '@chat-app/react-hooks';

function ChatRoom({ roomId }) {
  const { messages, loading, hasMore, loadMore } = useMessages(roomId);
  const sendMessage = useSendMessage(roomId);
  
  const handleSend = (content) => {
    sendMessage({ content, messageType: 'text' });
  };
  
  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>{message.content}</div>
      ))}
    </div>
  );
}
```

---

この API仕様書により、フロントエンド開発者は効率的にチャットアプリケーションを実装できます。REST API、GraphQL、WebSocketの3つのプロトコルを適切に使い分けることで、高性能でリアルタイムなチャットアプリケーションを構築できます。