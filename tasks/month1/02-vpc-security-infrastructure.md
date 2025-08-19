# Task: VPCとセキュリティ基盤構築（BLEA準拠）

**実施期間**: Month 1 Week 1 (Day 3-4)  
**推定工数**: 8時間  
**優先度**: 高  

## 概要

BLEA要件を満たすネットワークとセキュリティ基盤を構築し、チャットアプリケーション用の適切なセグメンテーションを実装する。

## 学習目標

- BLEA準拠のVPC設計パターン
- セキュリティグループとNACLの設定
- 多層防御ネットワーク設計

## 前提条件

- BLEAガバナンスベース構築完了
- CDK開発環境の準備完了

## タスク詳細

### Day 3: BLEA準拠VPC設計

#### 1. BLEA準拠VPC設計 (4時間)
- [ ] VPCアーキテクチャの設計
- [ ] サブネット分割設計（Public/Private/Isolated）
- [ ] アベイラビリティゾーン構成の決定
- [ ] CIDR設計とIPアドレス設計

#### 2. セキュリティグループ実装 (2時間)
- [ ] Lambda用セキュリティグループ
- [ ] RDS用セキュリティグループ
- [ ] ALB用セキュリティグループ
- [ ] セキュリティグループ間の通信許可設定

#### 3. NACL・ルーティング設定 (2時間)
- [ ] Network ACLsの設定
- [ ] ルートテーブルの設定
- [ ] NAT Gateway設定

### MCP サーバ活用

```
💬 "BLEAのネットワークセキュリティ要件に従って、CDKでVPC、セキュリティグループ、
NACLを実装してください。チャットアプリケーション用の適切なセグメンテーションを含めて。"
```

## 成果物

### 1. VPCスタック実装
```typescript
// lib/network/vpc-stack.ts
export class BLEAVPCStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly securityGroups: { [key: string]: ec2.SecurityGroup };

  constructor(scope: Construct, id: string, props: BLEAVPCStackProps) {
    super(scope, id, props);

    // BLEA準拠VPC
    this.vpc = new ec2.Vpc(this, 'ChatAppVPC', {
      cidr: '10.0.0.0/16',
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
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        }
      ]
    });

    // BLEA セキュリティグループ
    this.securityGroups = this.createBLEASecurityGroups();
  }

  private createBLEASecurityGroups(): { [key: string]: ec2.SecurityGroup } {
    // Lambda用セキュリティグループ
    const lambdaSg = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // RDS用セキュリティグループ
    const rdsSg = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS Aurora',
      allowAllOutbound: false,
    });

    // ALB用セキュリティグループ
    const albSg = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Application Load Balancer',
    });

    // セキュリティグループ間の通信許可
    rdsSg.addIngressRule(lambdaSg, ec2.Port.tcp(5432), 'Lambda to RDS');
    lambdaSg.addIngressRule(albSg, ec2.Port.tcp(80), 'ALB to Lambda');

    return {
      lambda: lambdaSg,
      rds: rdsSg,
      alb: albSg,
    };
  }
}
```

### 2. ネットワーク設定
- **VPC**: 10.0.0.0/16
- **Public Subnet**: 10.0.1.0/24, 10.0.2.0/24
- **Private Subnet**: 10.0.11.0/24, 10.0.12.0/24  
- **Isolated Subnet**: 10.0.21.0/24, 10.0.22.0/24

### 3. セキュリティグループ設計
- **Lambda SG**: API Gateway、RDS通信許可
- **RDS SG**: LambdaからのPostgreSQL通信のみ許可
- **ALB SG**: HTTPS/HTTPのインバウンド許可

## 検証項目

- [ ] VPCが正常に作成される
- [ ] サブネットが適切に配置される
- [ ] セキュリティグループルールが正しく設定される
- [ ] NAT Gatewayが動作する
- [ ] DNS解決が機能する
- [ ] インターネット接続が適切に制限される

## セキュリティ考慮事項

- [ ] 最小権限原則の適用
- [ ] Defense in Depth の実装
- [ ] ネットワーク分離の確認
- [ ] ログとモニタリング設定
- [ ] フローログ有効化

## 次のタスクへの引き継ぎ事項

- VPCとセキュリティグループのリソース情報
- サブネット構成とCIDR情報
- セキュリティグループID一覧

## 参考資料

- [VPC セキュリティベストプラクティス](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-best-practices.html)
- [BLEA ネットワークアーキテクチャ](https://github.com/aws-samples/baseline-environment-on-aws/tree/main/doc)
- [CDK VPC Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html)