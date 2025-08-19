# Task: 本番環境構築とパフォーマンステスト

**実施期間**: Month 3 Week 2 (Day 1-2)  
**推定工数**: 8時間  
**優先度**: 高  

## 概要

BLEA統合本番環境の構築を完了し、本番レベルのセキュリティ設定、パフォーマンステスト、負荷テストを実施して本番運用準備を整える。

## 学習目標

- 本番環境でのBLEA統合最適化
- パフォーマンステストとボトルネック解析
- 負荷テストによるスケーラビリティ検証
- 本番監視システムの最終確認

## 前提条件

- CI/CD パイプライン構築完了
- 開発・ステージング環境での動作確認完了
- 全セキュリティテスト通過

## タスク詳細

### Day 1: 本番環境BLEA設定最適化

#### 1. 本番用BLEA設定強化 (4時間)
- [ ] 本番用セキュリティポリシー適用
- [ ] 本番レベル監視設定
- [ ] 災害復旧設定強化
- [ ] コンプライアンス設定最終確認

#### 2. 本番セキュリティ強化 (3時間)
- [ ] WAF ルール最適化
- [ ] 暗号化設定強化
- [ ] アクセス制御最終確認
- [ ] セキュリティログ設定確認

#### 3. 本番監視設定 (1時間)
- [ ] CloudWatch 詳細監視有効化
- [ ] カスタムメトリクス設定
- [ ] アラート閾値調整
- [ ] 通知設定最終確認

### Day 2: パフォーマンステストと最適化

#### 1. BLEA統合負荷テスト (4時間)
- [ ] ベースライン性能測定
- [ ] 段階的負荷テスト
- [ ] ピーク負荷テスト
- [ ] セキュリティ機能への影響測定

#### 2. ボトルネック解析と最適化 (2時間)
- [ ] パフォーマンス分析
- [ ] リソース使用率確認
- [ ] 最適化実装
- [ ] 改善効果測定

#### 3. 本番デプロイ最終確認 (2時間)
- [ ] デプロイリハーサル
- [ ] ロールバック手順確認
- [ ] 本番デプロイ実行
- [ ] デプロイ後検証

### MCP サーバ活用

```
💬 "本番環境でのBLEA統合最適化とパフォーマンステストを実施してください。
セキュリティ機能を維持しながら最適なパフォーマンスを実現する設定を提案してください。"
```

## 成果物

### 1. 本番環境BLEA設定

```typescript
// lib/environments/production-config.ts
export const productionConfig = {
  // BLEA本番設定
  blea: {
    governance: {
      // 本番レベルセキュリティ統制
      securityNotifyEmail: 'security-team@company.com',
      emergencyContactEmail: 'emergency@company.com',
      enableAdvancedThreatProtection: true,
      enableRealTimeMonitoring: true,
      
      // GuardDuty本番設定
      guardDuty: {
        findingPublishingFrequency: 'FIFTEEN_MINUTES',
        enableS3Protection: true,
        enableKubernetesProtection: true,
        enableMalwareProtection: true
      },
      
      // Security Hub本番設定
      securityHub: {
        enableCISStandard: true,
        enableAWSFoundationalStandard: true,
        enablePCIDSSStandard: true,
        autoRemediationEnabled: true
      },
      
      // Config本番設定
      config: {
        includeGlobalResourceTypes: true,
        enableConfigurationHistory: true,
        enableCompliancePackDeployment: true,
        customRulesEnabled: true
      }
    },
    
    // 本番監視設定
    monitoring: {
      cloudWatch: {
        detailedMonitoring: true,
        customMetrics: true,
        logRetentionDays: 365,
        enableInsights: true
      },
      
      alerts: {
        // 重要度別アラート設定
        critical: {
          responseTime: '< 5 minutes',
          channels: ['email', 'slack', 'pagerduty']
        },
        high: {
          responseTime: '< 15 minutes',
          channels: ['email', 'slack']
        },
        medium: {
          responseTime: '< 1 hour',
          channels: ['slack']
        }
      }
    }
  },
  
  // アプリケーション本番設定
  application: {
    scaling: {
      lambda: {
        reservedConcurrency: 100,
        provisionedConcurrency: 20,
        timeout: 30,
        memorySize: 1024
      },
      
      aurora: {
        serverlessV2: {
          minCapacity: 2,
          maxCapacity: 16,
          autoPause: false
        },
        performanceInsights: {
          enabled: true,
          retentionPeriod: 7
        }
      },
      
      apiGateway: {
        throttling: {
          rateLimit: 10000,
          burstLimit: 5000
        },
        caching: {
          enabled: true,
          ttl: 300,
          encrypted: true
        }
      }
    },
    
    security: {
      waf: {
        rules: [
          'AWSManagedRulesCommonRuleSet',
          'AWSManagedRulesKnownBadInputsRuleSet',
          'AWSManagedRulesSQLiRuleSet',
          'AWSManagedRulesLinuxRuleSet',
          'AWSManagedRulesAmazonIpReputationList'
        ],
        rateBasedRules: {
          enabled: true,
          limit: 2000,
          action: 'BLOCK'
        }
      },
      
      encryption: {
        kmsKeyRotation: true,
        s3DefaultEncryption: true,
        efsEncryption: true,
        rdsEncryption: true
      }
    }
  }
};

// 本番環境CDKスタック
export class ProductionChatAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 本番用タグ設定
    cdk.Tags.of(this).add('Environment', 'production');
    cdk.Tags.of(this).add('CostCenter', 'engineering');
    cdk.Tags.of(this).add('Owner', 'chatapp-team');
    cdk.Tags.of(this).add('Compliance', 'required');
    cdk.Tags.of(this).add('BackupSchedule', 'daily');

    // BLEA本番ガバナンス
    const governance = new BLEAGovernanceStack(this, 'ProductionGovernance', {
      ...productionConfig.blea.governance,
      environment: 'production'
    });

    // 本番VPC（可用性重視）
    const vpc = new ec2.Vpc(this, 'ProductionVPC', {
      cidr: '10.1.0.0/16',
      maxAzs: 3,  // 本番は3AZ構成
      enableDnsHostnames: true,
      enableDnsSupport: true,
      
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        }
      ],
      
      // 本番用NAT Gateway（各AZに配置）
      natGateways: 3,
      
      // フローログ有効化
      flowLogs: {
        's3': {
          destination: ec2.FlowLogDestination.toS3(),
          trafficType: ec2.FlowLogTrafficType.ALL
        }
      }
    });

    // 本番Aurora（高可用性設定）
    const productionAurora = new rds.DatabaseCluster(this, 'ProductionAurora', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_9
      }),
      
      // 本番レプリカ設定
      writer: rds.ClusterInstance.serverlessV2('writer', {
        scaleWithWriter: true
      }),
      readers: [
        rds.ClusterInstance.serverlessV2('reader1', {
          scaleWithWriter: true
        }),
        rds.ClusterInstance.serverlessV2('reader2', {
          scaleWithWriter: true
        })
      ],
      
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      
      // 本番バックアップ設定
      backup: {
        retention: cdk.Duration.days(30),
        preferredWindow: '03:00-04:00'
      },
      
      // 本番セキュリティ設定
      storageEncrypted: true,
      monitoringInterval: cdk.Duration.seconds(60),
      performanceInsightRetention: rds.PerformanceInsightRetention.LONG_TERM,
      
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: logs.RetentionDays.ONE_YEAR,
      
      deletionProtection: true
    });

    // 本番CloudFront（パフォーマンス最適化）
    const distribution = new cloudfront.Distribution(this, 'ProductionDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        
        // キャッシュ最適化
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        
        // 圧縮有効化
        compress: true,
        
        // セキュリティヘッダー
        responseHeadersPolicy: this.createSecurityHeadersPolicy()
      },
      
      // 複数オリジン設定
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(this.apiDomain),
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        }
      },
      
      // 本番用設定
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      
      // ログ設定
      enableLogging: true,
      logBucket: this.logsBucket,
      logFilePrefix: 'cloudfront-logs/',
      
      // SSL証明書
      certificate: this.sslCertificate,
      domainNames: ['chat.company.com']
    });

    // 本番監視ダッシュボード
    this.createProductionDashboard(productionAurora, distribution);
  }

  private createSecurityHeadersPolicy(): cloudfront.ResponseHeadersPolicy {
    return new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'",
          override: true
        },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true
        },
        contentTypeOptions: {
          override: true
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.seconds(31536000),
          includeSubDomains: true,
          preload: true,
          override: true
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true
        }
      }
    });
  }

  private createProductionDashboard(
    aurora: rds.DatabaseCluster,
    distribution: cloudfront.Distribution
  ) {
    const dashboard = new cloudwatch.Dashboard(this, 'ProductionDashboard', {
      dashboardName: 'ChatApp-Production-Dashboard',
      widgets: [
        // アプリケーションメトリクス
        [
          new cloudwatch.GraphWidget({
            title: 'API Response Times',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/ApiGateway',
                metricName: 'Latency',
                dimensionsMap: {
                  ApiName: 'ChatApp-Production-API'
                },
                statistic: 'Average'
              })
            ]
          })
        ],
        
        // データベースメトリクス
        [
          new cloudwatch.GraphWidget({
            title: 'Aurora Performance',
            left: [
              aurora.metricCPUUtilization(),
              aurora.metricDatabaseConnections()
            ]
          })
        ],
        
        // セキュリティメトリクス
        [
          new cloudwatch.GraphWidget({
            title: 'Security Events',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/WAF',
                metricName: 'BlockedRequests',
                statistic: 'Sum'
              })
            ]
          })
        ]
      ]
    });
    
    return dashboard;
  }
}
```

### 2. パフォーマンステストスクリプト

```python
# scripts/performance-test.py
"""
本番環境パフォーマンステスト
"""

import asyncio
import aiohttp
import time
import json
import argparse
import boto3
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import dataclass
import statistics

@dataclass
class TestResult:
    endpoint: str
    method: str
    response_time: float
    status_code: int
    success: bool
    timestamp: datetime
    error_message: str = None

class PerformanceTestSuite:
    def __init__(self, base_url: str, cognito_config: Dict[str, str]):
        self.base_url = base_url
        self.cognito_config = cognito_config
        self.auth_token = None
        self.test_results: List[TestResult] = []
        
    async def setup_authentication(self):
        """Cognito認証セットアップ"""
        import boto3
        from botocore.exceptions import ClientError
        
        try:
            client = boto3.client('cognito-idp', region_name='ap-northeast-1')
            
            # テスト用ユーザーでログイン
            response = client.admin_initiate_auth(
                UserPoolId=self.cognito_config['user_pool_id'],
                ClientId=self.cognito_config['client_id'],
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': self.cognito_config['test_username'],
                    'PASSWORD': self.cognito_config['test_password']
                }
            )
            
            self.auth_token = response['AuthenticationResult']['IdToken']
            print(f"Authentication successful for user: {self.cognito_config['test_username']}")
            
        except ClientError as e:
            print(f"Authentication failed: {e}")
            raise
    
    async def run_endpoint_test(
        self, 
        session: aiohttp.ClientSession, 
        endpoint: str, 
        method: str = 'GET',
        payload: Dict = None,
        headers: Dict = None
    ) -> TestResult:
        """単一エンドポイントテスト"""
        start_time = time.time()
        
        # 認証ヘッダー追加
        if headers is None:
            headers = {}
        if self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            async with session.request(method, url, json=payload, headers=headers) as response:
                await response.text()  # レスポンス読み取り
                response_time = time.time() - start_time
                
                result = TestResult(
                    endpoint=endpoint,
                    method=method,
                    response_time=response_time,
                    status_code=response.status,
                    success=200 <= response.status < 300,
                    timestamp=datetime.utcnow()
                )
                
        except Exception as e:
            response_time = time.time() - start_time
            result = TestResult(
                endpoint=endpoint,
                method=method,
                response_time=response_time,
                status_code=0,
                success=False,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
        
        self.test_results.append(result)
        return result
    
    async def run_load_test(
        self, 
        endpoint: str, 
        concurrent_users: int, 
        duration_seconds: int
    ) -> List[TestResult]:
        """負荷テスト実行"""
        print(f"Starting load test: {concurrent_users} concurrent users for {duration_seconds}s")
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            end_time = time.time() + duration_seconds
            
            # 並行リクエスト実行
            for _ in range(concurrent_users):
                task = asyncio.create_task(
                    self.continuous_requests(session, endpoint, end_time)
                )
                tasks.append(task)
            
            # 全タスク完了待機
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
        # エラー結果を除外
        successful_results = [r for r in results if isinstance(r, list)]
        flattened_results = [item for sublist in successful_results for item in sublist]
        
        return flattened_results
    
    async def continuous_requests(
        self, 
        session: aiohttp.ClientSession, 
        endpoint: str, 
        end_time: float
    ) -> List[TestResult]:
        """継続的リクエスト送信"""
        results = []
        
        while time.time() < end_time:
            result = await self.run_endpoint_test(session, endpoint)
            results.append(result)
            
            # 短い間隔で次のリクエスト
            await asyncio.sleep(0.1)
        
        return results
    
    def analyze_results(self, results: List[TestResult]) -> Dict[str, Any]:
        """結果分析"""
        if not results:
            return {'error': 'No test results available'}
        
        successful_results = [r for r in results if r.success]
        response_times = [r.response_time for r in successful_results]
        
        if not response_times:
            return {'error': 'No successful requests'}
        
        analysis = {
            'total_requests': len(results),
            'successful_requests': len(successful_results),
            'failed_requests': len(results) - len(successful_results),
            'success_rate': len(successful_results) / len(results) * 100,
            
            'response_times': {
                'min': min(response_times),
                'max': max(response_times),
                'mean': statistics.mean(response_times),
                'median': statistics.median(response_times),
                'p95': self.percentile(response_times, 95),
                'p99': self.percentile(response_times, 99)
            },
            
            'throughput': {
                'requests_per_second': len(successful_results) / (max(response_times) if response_times else 1)
            },
            
            'status_codes': self.count_status_codes(results),
            'errors': [r.error_message for r in results if not r.success and r.error_message]
        }
        
        return analysis
    
    def percentile(self, data: List[float], percentile: float) -> float:
        """パーセンタイル計算"""
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def count_status_codes(self, results: List[TestResult]) -> Dict[int, int]:
        """ステータスコード集計"""
        status_counts = {}
        for result in results:
            status_counts[result.status_code] = status_counts.get(result.status_code, 0) + 1
        return status_counts
    
    async def run_comprehensive_test(self):
        """包括的パフォーマンステスト"""
        print("Starting comprehensive performance test...")
        
        # 認証セットアップ
        await self.setup_authentication()
        
        # テストシナリオ
        test_scenarios = [
            {'name': 'Light Load', 'users': 10, 'duration': 60},
            {'name': 'Medium Load', 'users': 50, 'duration': 120},
            {'name': 'Heavy Load', 'users': 100, 'duration': 180},
            {'name': 'Peak Load', 'users': 200, 'duration': 300}
        ]
        
        test_endpoints = [
            '/api/v1/rooms',
            '/api/v1/users/me',
            '/api/v1/rooms/test-room/messages'
        ]
        
        comprehensive_results = {}
        
        for scenario in test_scenarios:
            print(f"\n--- Running {scenario['name']} ---")
            scenario_results = {}
            
            for endpoint in test_endpoints:
                print(f"Testing endpoint: {endpoint}")
                
                results = await self.run_load_test(
                    endpoint=endpoint,
                    concurrent_users=scenario['users'],
                    duration_seconds=scenario['duration']
                )
                
                analysis = self.analyze_results(results)
                scenario_results[endpoint] = analysis
                
                print(f"Success rate: {analysis.get('success_rate', 0):.2f}%")
                print(f"Mean response time: {analysis.get('response_times', {}).get('mean', 0):.3f}s")
                print(f"P95 response time: {analysis.get('response_times', {}).get('p95', 0):.3f}s")
            
            comprehensive_results[scenario['name']] = scenario_results
        
        return comprehensive_results
    
    def generate_report(self, results: Dict[str, Any], output_file: str):
        """パフォーマンスレポート生成"""
        report = {
            'test_timestamp': datetime.utcnow().isoformat(),
            'test_environment': 'production',
            'base_url': self.base_url,
            'results': results,
            'recommendations': self.generate_recommendations(results)
        }
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"Performance report saved to: {output_file}")
    
    def generate_recommendations(self, results: Dict[str, Any]) -> List[str]:
        """最適化推奨事項生成"""
        recommendations = []
        
        for scenario_name, scenario_results in results.items():
            for endpoint, analysis in scenario_results.items():
                success_rate = analysis.get('success_rate', 0)
                mean_response_time = analysis.get('response_times', {}).get('mean', 0)
                p95_response_time = analysis.get('response_times', {}).get('p95', 0)
                
                if success_rate < 95:
                    recommendations.append(
                        f"{endpoint}: Low success rate ({success_rate:.1f}%) in {scenario_name} - investigate error handling"
                    )
                
                if mean_response_time > 1.0:
                    recommendations.append(
                        f"{endpoint}: High mean response time ({mean_response_time:.2f}s) in {scenario_name} - consider optimization"
                    )
                
                if p95_response_time > 2.0:
                    recommendations.append(
                        f"{endpoint}: High P95 response time ({p95_response_time:.2f}s) in {scenario_name} - investigate outliers"
                    )
        
        return recommendations

async def main():
    parser = argparse.ArgumentParser(description='Production Performance Test')
    parser.add_argument('--base-url', required=True, help='API base URL')
    parser.add_argument('--user-pool-id', required=True, help='Cognito User Pool ID')
    parser.add_argument('--client-id', required=True, help='Cognito Client ID')
    parser.add_argument('--test-username', required=True, help='Test user username')
    parser.add_argument('--test-password', required=True, help='Test user password')
    parser.add_argument('--output', default='performance-report.json', help='Output report file')
    
    args = parser.parse_args()
    
    cognito_config = {
        'user_pool_id': args.user_pool_id,
        'client_id': args.client_id,
        'test_username': args.test_username,
        'test_password': args.test_password
    }
    
    test_suite = PerformanceTestSuite(args.base_url, cognito_config)
    
    try:
        results = await test_suite.run_comprehensive_test()
        test_suite.generate_report(results, args.output)
        print("\nPerformance test completed successfully!")
        
    except Exception as e:
        print(f"Performance test failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
```

### 3. 本番デプロイスクリプト

```python
# scripts/production-deployment.py
"""
本番デプロイメントスクリプト
"""

import boto3
import json
import time
import subprocess
from datetime import datetime
from typing import Dict, List, Any

class ProductionDeployer:
    def __init__(self, region='ap-northeast-1'):
        self.region = region
        self.cloudformation = boto3.client('cloudformation', region_name=region)
        self.codepipeline = boto3.client('codepipeline', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        
    def pre_deployment_checks(self) -> Dict[str, bool]:
        """デプロイ前チェック"""
        checks = {
            'pipeline_healthy': self.check_pipeline_health(),
            'staging_tests_passed': self.check_staging_tests(),
            'security_scan_passed': self.check_security_scans(),
            'blea_compliance': self.check_blea_compliance(),
            'database_backup': self.verify_database_backup()
        }
        
        print("Pre-deployment checks:")
        for check, status in checks.items():
            print(f"  {check}: {'✅ PASS' if status else '❌ FAIL'}")
        
        return checks
    
    def check_pipeline_health(self) -> bool:
        """パイプライン健全性確認"""
        try:
            response = self.codepipeline.get_pipeline_state(
                name='ChatApp-BLEA-Pipeline'
            )
            
            # 最新実行が成功していることを確認
            stage_states = response['stageStates']
            for stage in stage_states:
                if stage['stageName'] == 'Dev':
                    return stage['latestExecution']['status'] == 'Succeeded'
                    
            return False
        except Exception as e:
            print(f"Pipeline health check failed: {e}")
            return False
    
    def check_staging_tests(self) -> bool:
        """ステージング環境テスト結果確認"""
        try:
            # CodeBuildプロジェクトの最新実行結果を確認
            codebuild = boto3.client('codebuild', region_name=self.region)
            
            response = codebuild.list_builds_for_project(
                projectName='ChatApp-Staging-Tests'
            )
            
            if response['ids']:
                build_details = codebuild.batch_get_builds(ids=[response['ids'][0]])
                latest_build = build_details['builds'][0]
                return latest_build['buildStatus'] == 'SUCCEEDED'
            
            return False
        except Exception as e:
            print(f"Staging tests check failed: {e}")
            return False
    
    def check_security_scans(self) -> bool:
        """セキュリティスキャン結果確認"""
        # Security Hub から最新の所見を確認
        try:
            securityhub = boto3.client('securityhub', region_name=self.region)
            
            response = securityhub.get_findings(
                Filters={
                    'ProductName': [{'Value': 'ChatApp', 'Comparison': 'EQUALS'}],
                    'RecordState': [{'Value': 'ACTIVE', 'Comparison': 'EQUALS'}],
                    'SeverityLabel': [{'Value': 'HIGH', 'Comparison': 'EQUALS'}, 
                                    {'Value': 'CRITICAL', 'Comparison': 'EQUALS'}]
                },
                MaxResults=1
            )
            
            # 高重要度の所見がないことを確認
            return len(response['Findings']) == 0
            
        except Exception as e:
            print(f"Security scan check failed: {e}")
            return False
    
    def check_blea_compliance(self) -> bool:
        """BLEA準拠性確認"""
        try:
            config = boto3.client('config', region_name=self.region)
            
            # Config Rules の準拠状況確認
            response = config.describe_compliance_by_config_rule()
            
            non_compliant_rules = [
                rule for rule in response['ComplianceByConfigRules']
                if rule['Compliance']['ComplianceType'] == 'NON_COMPLIANT'
            ]
            
            return len(non_compliant_rules) == 0
            
        except Exception as e:
            print(f"BLEA compliance check failed: {e}")
            return False
    
    def verify_database_backup(self) -> bool:
        """データベースバックアップ確認"""
        try:
            rds = boto3.client('rds', region_name=self.region)
            
            # 最新のスナップショット確認
            response = rds.describe_db_cluster_snapshots(
                DBClusterIdentifier='chatapp-production-cluster',
                SnapshotType='automated',
                MaxRecords=1
            )
            
            if response['DBClusterSnapshots']:
                latest_snapshot = response['DBClusterSnapshots'][0]
                snapshot_time = latest_snapshot['SnapshotCreateTime']
                
                # 24時間以内のバックアップがあることを確認
                time_diff = datetime.utcnow().replace(tzinfo=None) - snapshot_time.replace(tzinfo=None)
                return time_diff.total_seconds() < 86400  # 24 hours
            
            return False
            
        except Exception as e:
            print(f"Database backup check failed: {e}")
            return False
    
    def deploy_to_production(self) -> bool:
        """本番デプロイ実行"""
        try:
            print("Starting production deployment...")
            
            # CDK デプロイ実行
            cmd = [
                'npx', 'cdk', 'deploy', 'ChatApp-Production-Stack',
                '--require-approval', 'never',
                '--context', 'environment=production',
                '--context', 'blea-enabled=true'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("Production deployment successful!")
                return True
            else:
                print(f"Production deployment failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"Deployment failed: {e}")
            return False
    
    def post_deployment_verification(self) -> Dict[str, bool]:
        """デプロイ後検証"""
        checks = {
            'stack_status': self.verify_stack_status(),
            'health_checks': self.verify_health_checks(),
            'monitoring_active': self.verify_monitoring(),
            'api_response': self.verify_api_endpoints()
        }
        
        print("Post-deployment verification:")
        for check, status in checks.items():
            print(f"  {check}: {'✅ PASS' if status else '❌ FAIL'}")
        
        return checks
    
    def verify_stack_status(self) -> bool:
        """CloudFormationスタック状態確認"""
        try:
            response = self.cloudformation.describe_stacks(
                StackName='ChatApp-Production-Stack'
            )
            
            stack = response['Stacks'][0]
            return stack['StackStatus'] == 'CREATE_COMPLETE' or stack['StackStatus'] == 'UPDATE_COMPLETE'
            
        except Exception as e:
            print(f"Stack status check failed: {e}")
            return False
    
    def verify_health_checks(self) -> bool:
        """ヘルスチェック確認"""
        try:
            # API Gateway health check
            import requests
            
            response = requests.get('https://api.chatapp.com/health', timeout=10)
            return response.status_code == 200
            
        except Exception as e:
            print(f"Health check failed: {e}")
            return False
    
    def verify_monitoring(self) -> bool:
        """監視システム動作確認"""
        try:
            # CloudWatch アラーム状態確認
            response = self.cloudwatch.describe_alarms(
                StateValue='ALARM'
            )
            
            # アラーム状態のアラームがないことを確認
            return len(response['MetricAlarms']) == 0
            
        except Exception as e:
            print(f"Monitoring verification failed: {e}")
            return False
    
    def verify_api_endpoints(self) -> bool:
        """API エンドポイント動作確認"""
        try:
            import requests
            
            endpoints = [
                'https://api.chatapp.com/api/v1/health',
                'https://api.chatapp.com/api/v1/rooms'
            ]
            
            for endpoint in endpoints:
                response = requests.get(endpoint, timeout=10)
                if response.status_code not in [200, 401]:  # 401 is expected for protected endpoints
                    return False
            
            return True
            
        except Exception as e:
            print(f"API endpoint verification failed: {e}")
            return False
    
    def create_deployment_report(self, pre_checks: Dict, post_checks: Dict) -> str:
        """デプロイレポート作成"""
        report = {
            'deployment_timestamp': datetime.utcnow().isoformat(),
            'environment': 'production',
            'pre_deployment_checks': pre_checks,
            'post_deployment_checks': post_checks,
            'overall_success': all(pre_checks.values()) and all(post_checks.values())
        }
        
        report_file = f"deployment-report-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.json"
        
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        return report_file

def main():
    deployer = ProductionDeployer()
    
    print("=== Production Deployment Process ===")
    
    # デプロイ前チェック
    pre_checks = deployer.pre_deployment_checks()
    
    if not all(pre_checks.values()):
        print("❌ Pre-deployment checks failed. Aborting deployment.")
        return False
    
    # 本番デプロイ実行
    deployment_success = deployer.deploy_to_production()
    
    if not deployment_success:
        print("❌ Production deployment failed.")
        return False
    
    # デプロイ後検証
    time.sleep(60)  # サービス起動待機
    post_checks = deployer.post_deployment_verification()
    
    # レポート作成
    report_file = deployer.create_deployment_report(pre_checks, post_checks)
    
    overall_success = all(post_checks.values())
    
    if overall_success:
        print("✅ Production deployment completed successfully!")
        print(f"📊 Deployment report: {report_file}")
    else:
        print("⚠️  Production deployment completed with issues.")
        print(f"📊 Deployment report: {report_file}")
    
    return overall_success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
```

## 検証項目

- [ ] 本番環境BLEAスタックが正常にデプロイされる
- [ ] 本番レベルのセキュリティ設定が適用される
- [ ] パフォーマンステストが実行される
- [ ] 負荷テストで目標性能を達成する
- [ ] 監視ダッシュボードが機能する
- [ ] アラートシステムが動作する
- [ ] バックアップ機能が動作する
- [ ] 災害復旧機能が確認される
- [ ] SSL証明書が正しく設定される
- [ ] CDN配信が最適化されている

## パフォーマンス目標

- [ ] API レスポンス時間: 平均 < 500ms
- [ ] P95 レスポンス時間: < 1秒
- [ ] 同時接続ユーザー数: 1000ユーザー
- [ ] スループット: 10,000 req/min
- [ ] 可用性: 99.9% 以上
- [ ] データベースレプリケーション遅延: < 1秒

## 次のタスクへの引き継ぎ事項

- 本番環境設定詳細
- パフォーマンステスト結果
- 最適化実施状況
- 監視・アラート設定完了状況

## 参考資料

- [AWS Well-Architected Performance Efficiency](https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/)
- [Aurora Performance Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.BestPractices.html)
- [CloudFront Performance Optimization](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/optimization.html)