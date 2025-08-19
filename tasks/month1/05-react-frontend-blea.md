# Task: React フロントエンド開発 + BLEA監視統合

**実施期間**: Month 1 Week 3 (Day 1-2)  
**推定工数**: 7時間  
**優先度**: 高  

## 概要

React + TypeScriptでフロントエンド開発環境を構築し、BLEA監視システムとCloudFrontセキュリティヘッダー、WAF統合を実装する。

## 学習目標

- Modern React開発環境の構築
- TypeScript + React のベストプラクティス
- BLEA監視統合フロントエンド実装
- セキュリティヘッダーとWAF連携

## 前提条件

- BLEA基盤構築完了
- Lambda + API Gateway実装完了
- Aurora Database構築完了

## タスク詳細

### Day 1: React開発環境構築

#### 1. React + TypeScript環境構築 (3時間)
- [ ] Create React App with TypeScript
- [ ] 必要なライブラリのインストール
- [ ] プロジェクト構造設計
- [ ] 開発環境設定（ESLint, Prettier）

#### 2. AWS統合設定 (2時間)
- [ ] AWS Amplify設定
- [ ] Cognito認証統合
- [ ] API Client設定
- [ ] 環境変数管理

#### 3. 基本UIコンポーネント作成 (2時間)
- [ ] Material-UI/Tailwindセットアップ
- [ ] レイアウトコンポーネント
- [ ] 認証画面の基本実装
- [ ] ルーティング設定

### Day 2: BLEA監視統合とセキュリティ

#### 1. BLEA WAF連携確認 (2時間)
- [ ] WAFルールテスト
- [ ] セキュリティヘッダー確認
- [ ] アクセスログ検証
- [ ] 攻撃パターンテスト

#### 2. セキュリティヘッダー実装 (2時間)
- [ ] Content Security Policy設定
- [ ] セキュリティヘッダー検証
- [ ] XSS対策実装
- [ ] CSRF対策設定

#### 3. フロントエンド監視設定 (1時間)
- [ ] CloudWatch RUM統合
- [ ] エラー監視設定
- [ ] パフォーマンス監視
- [ ] ユーザー行動分析

### MCP サーバ活用

```
💬 "ReactでAWSチャットアプリを開発し、BLEA監視システムとCloudFrontセキュリティヘッダー、
WAF統合を実装してください。TypeScript、Material-UI、AWS Amplifyを使用してください。"
```

## 成果物

### 1. プロジェクト構造

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/         # 再利用可能コンポーネント
│   │   ├── common/
│   │   ├── auth/
│   │   ├── chat/
│   │   └── security/
│   ├── pages/             # ページコンポーネント
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   └── ChatRoom.tsx
│   ├── hooks/             # カスタムフック
│   ├── services/          # API サービス
│   ├── store/             # 状態管理
│   ├── types/             # TypeScript型定義
│   ├── utils/             # ユーティリティ
│   └── config/            # 設定ファイル
├── package.json
├── tsconfig.json
├── .eslintrc.js
└── .prettierrc
```

### 2. 主要コンポーネント実装

#### App.tsx（メインアプリケーション）
```typescript
// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { SecurityProvider } from './contexts/SecurityContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChatRoom from './pages/ChatRoom';
import SecurityDashboard from './pages/SecurityDashboard';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SecurityProvider>
          <ChatProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/room/:roomId"
                  element={
                    <ProtectedRoute>
                      <ChatRoom />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/security"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <SecurityDashboard />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </ChatProvider>
        </SecurityProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
```

#### AuthContext（認証コンテキスト）
```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Auth } from 'aws-amplify';
import { CognitoUser } from '@aws-amplify/auth';
import { SecurityService } from '../services/SecurityService';

interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const cognitoUser = await Auth.currentAuthenticatedUser();
      const userData = await transformCognitoUser(cognitoUser);
      setUser(userData);
    } catch (error) {
      console.log('User is not authenticated');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const cognitoUser = await Auth.signIn(username, password);
      
      // セキュリティイベント記録
      await SecurityService.logAuthenticationEvent({
        event_type: 'login_success',
        user_identifier: username,
        source_ip: await getClientIP(),
        user_agent: navigator.userAgent
      });

      const userData = await transformCognitoUser(cognitoUser);
      setUser(userData);
    } catch (error) {
      // 失敗イベント記録
      await SecurityService.logAuthenticationEvent({
        event_type: 'login_failed',
        user_identifier: username,
        error_details: error.message,
        source_ip: await getClientIP(),
        user_agent: navigator.userAgent
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await SecurityService.logAuthenticationEvent({
        event_type: 'logout',
        user_identifier: user?.username || 'unknown',
        source_ip: await getClientIP()
      });

      await Auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const getCurrentUser = async (): Promise<User | null> => {
    try {
      const cognitoUser = await Auth.currentAuthenticatedUser();
      return await transformCognitoUser(cognitoUser);
    } catch (error) {
      return null;
    }
  };

  const transformCognitoUser = async (cognitoUser: CognitoUser): Promise<User> => {
    const session = await Auth.currentSession();
    const payload = session.getIdToken().payload;

    return {
      id: payload.sub,
      username: payload['cognito:username'],
      email: payload.email,
      displayName: payload.name,
      roles: payload['cognito:groups'] || []
    };
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    getCurrentUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

#### SecurityService（セキュリティサービス）
```typescript
// src/services/SecurityService.ts
import { API } from 'aws-amplify';
import { CloudWatchRUM } from 'aws-sdk';

interface SecurityEvent {
  event_type: string;
  user_identifier?: string;
  source_ip?: string;
  user_agent?: string;
  error_details?: string;
  resource_accessed?: string;
  additional_data?: Record<string, any>;
}

export class SecurityService {
  private static rum: CloudWatchRUM.CloudWatchRUM;

  static async initialize() {
    // CloudWatch RUM 初期化
    this.rum = new CloudWatchRUM.CloudWatchRUM({
      region: process.env.REACT_APP_AWS_REGION,
    });
  }

  static async logAuthenticationEvent(event: SecurityEvent) {
    try {
      // API経由でセキュリティイベント送信
      await API.post('chatapp', '/api/v1/security/events/report', {
        body: {
          event_type: event.event_type,
          event_category: 'authentication',
          severity: this.getSeverityByEventType(event.event_type),
          source_service: 'frontend',
          event_details: {
            user_identifier: event.user_identifier,
            source_ip: event.source_ip,
            user_agent: event.user_agent,
            error_details: event.error_details,
            timestamp: new Date().toISOString()
          }
        }
      });

      // CloudWatch RUM にメトリクス送信
      await this.recordRUMEvent(event);

    } catch (error) {
      console.error('Failed to log security event:', error);
      // ローカルストレージに保存（後で送信）
      this.storeEventLocally(event);
    }
  }

  static async logUserActivity(activity: {
    action: string;
    resource: string;
    user_id: string;
    additional_data?: Record<string, any>;
  }) {
    await this.logAuthenticationEvent({
      event_type: 'user_activity',
      user_identifier: activity.user_id,
      resource_accessed: activity.resource,
      additional_data: {
        action: activity.action,
        ...activity.additional_data
      }
    });
  }

  static async checkSecurityHeaders(): Promise<boolean> {
    try {
      // セキュリティヘッダーの検証
      const headers = [
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Strict-Transport-Security'
      ];

      // 現在のページのレスポンスヘッダーを確認
      const response = await fetch(window.location.href, { method: 'HEAD' });
      
      const missingHeaders = headers.filter(header => 
        !response.headers.has(header)
      );

      if (missingHeaders.length > 0) {
        await this.logAuthenticationEvent({
          event_type: 'security_header_missing',
          additional_data: {
            missing_headers: missingHeaders,
            url: window.location.href
          }
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Security header check failed:', error);
      return false;
    }
  }

  private static getSeverityByEventType(eventType: string): string {
    const severityMap: Record<string, string> = {
      'login_failed': 'medium',
      'login_success': 'info',
      'logout': 'info',
      'user_activity': 'low',
      'security_header_missing': 'high',
      'xss_attempt': 'critical',
      'csrf_attempt': 'high'
    };

    return severityMap[eventType] || 'low';
  }

  private static async recordRUMEvent(event: SecurityEvent) {
    try {
      await this.rum.putRumEvents({
        AppMonitorName: process.env.REACT_APP_RUM_APP_MONITOR_NAME!,
        BatchId: crypto.randomUUID(),
        Events: [{
          timestamp: new Date(),
          type: 'security_event',
          details: JSON.stringify(event)
        }]
      }).promise();
    } catch (error) {
      console.error('RUM event recording failed:', error);
    }
  }

  private static storeEventLocally(event: SecurityEvent) {
    try {
      const storedEvents = JSON.parse(
        localStorage.getItem('pending_security_events') || '[]'
      );
      storedEvents.push({
        ...event,
        stored_at: new Date().toISOString()
      });
      localStorage.setItem('pending_security_events', JSON.stringify(storedEvents));
    } catch (error) {
      console.error('Failed to store event locally:', error);
    }
  }

  static async syncPendingEvents() {
    try {
      const storedEvents = JSON.parse(
        localStorage.getItem('pending_security_events') || '[]'
      );

      for (const event of storedEvents) {
        await this.logAuthenticationEvent(event);
      }

      localStorage.removeItem('pending_security_events');
    } catch (error) {
      console.error('Failed to sync pending events:', error);
    }
  }
}
```

### 3. セキュリティ設定

#### CSP設定（public/index.html）
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  
  <!-- セキュリティヘッダー -->
  <meta http-equiv="Content-Security-Policy" 
        content="
          default-src 'self';
          script-src 'self' 'unsafe-inline' https://cognito-idp.ap-northeast-1.amazonaws.com;
          style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
          font-src 'self' https://fonts.gstatic.com;
          img-src 'self' data: https:;
          connect-src 'self' https://*.amazonaws.com https://*.amplifyapp.com;
          frame-ancestors 'none';
        ">
  <meta http-equiv="X-Frame-Options" content="DENY">
  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  
  <title>Chat App - BLEA Secure</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

## 検証項目

- [ ] React アプリケーションが正常に起動する
- [ ] TypeScript コンパイルエラーがない
- [ ] Cognito認証が機能する
- [ ] AWS API呼び出しが成功する
- [ ] セキュリティヘッダーが適用される
- [ ] CSP違反が発生しない
- [ ] セキュリティイベントが記録される
- [ ] CloudWatch RUM が動作する

## セキュリティ考慮事項

- [ ] XSS対策実装
- [ ] CSRF対策設定
- [ ] セキュアなデータ保存
- [ ] 機密情報の適切な取り扱い
- [ ] エラー情報の適切なマスキング
- [ ] セッション管理の適切な実装

## 次のタスクへの引き継ぎ事項

- React アプリケーション構造
- 認証システム実装状況
- セキュリティサービス設定
- 監視・ログ統合状況

## 参考資料

- [React TypeScript](https://react-typescript-cheatsheet.netlify.app/)
- [AWS Amplify React](https://docs.amplify.aws/lib/auth/getting-started/q/platform/js/)
- [Material-UI](https://mui.com/material-ui/getting-started/overview/)
- [CloudWatch RUM](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html)