> 🌐 [English](../../en/concepts/oidc-federation.md) &nbsp;·&nbsp; [日本語](../../ja/concepts/oidc-federation.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md)

# GitHub Actions → AWS,用 OIDC 对上号

本 lab 的流水线如何不靠长期密钥就和 AWS 对话。读一次,Lab 3 之后每一次 `assume-role` 调用你都能认出这个模式。

## 6 步流程

![GitHub Actions → AWS OIDC 握手](../../diagrams/images/oidc-flow.png)

<details>
<summary>文本版(ASCII)</summary>

```
┌──────────────────┐                            ┌─────────────────────┐
│ GitHub Actions   │   (1) 申请 OIDC token      │ token.actions.      │
│ workflow 在跑    │ ─────────────────────────▶ │ githubusercontent   │
│                  │ ◀───────────────────────── │ .com (issuer)       │
└──────┬───────────┘   (2) 签名后的 JWT         └─────────────────────┘
       │
       │ (3) aws-actions/configure-aws-credentials
       ▼
┌──────────────────┐                            ┌─────────────────────┐
│ AWS STS          │   (4) 对照签名验证         │ IAM OIDC Provider   │
│                  │ ─────────────────────────▶ │ (账号内唯一)        │
│                  │ ◀───────────────────────── │                     │
└──────┬───────────┘                            └─────────────────────┘
       │ (5) role trust policy 检查:
       │     Principal.Federated == <provider ARN>  ✓
       │     sub claim 匹配允许的 repo + ref        ✓
       │     aud claim == "sts.amazonaws.com"       ✓
       ▼
┌──────────────────┐
│ 短期凭据返回给    │   (6) 最长 1 小时;只在 role 权限范围内
│ workflow         │        (S3 PutObject / ECR PutImage 等)
└──────────────────┘
```

</details>

1. workflow 向 GitHub 的 OIDC issuer 申请 token(免费,内置)
2. GitHub 用自己的密钥签发 JWT;`sub` claim 包含 `repo:<owner>/<repo>:ref:<ref>`
3. `aws-actions/configure-aws-credentials` 用 JWT + 目标 role ARN 调 STS `AssumeRoleWithWebIdentity`
4. STS 用 OIDC provider 的 JWKS 验证 JWT 的签名;provider 预先注册了 GitHub 的 issuer URL 和 thumbprint
5. STS 评估 role 的 trust policy:`Principal.Federated` 必须是这个 provider 的 ARN、`sub` claim 必须匹配允许的 repo 模式、`aud` claim 必须是 `sts.amazonaws.com`
6. 全部通过,STS 把短期凭据(最长 1 小时)交给 workflow。凭据能做什么由 role 的权限策略决定

没有秘密离开 GitHub。repo 里、Actions 变量里都不会塞 access key。workflow 被攻破,攻击者最多得到 1 小时、受限范围内的访问,完全碰不到 role 权限之外的东西。

## OIDC provider 在 AWS 账号里是单例

AWS 硬性规定每个 issuer URL 在一个账号里 **只能** 有一个 IAM OIDC Provider。你想再建一个 `token.actions.githubusercontent.com` 的 provider,`CreateOpenIDConnectProvider` API 会返回 `EntityAlreadyExists`。

**为什么**:provider 是信任的锚点。如果同一个 issuer 有两个 provider,STS 到底该信哪个 thumbprint?这个模糊性必须消除,所以 AWS 只允许一个。

**对这个 lab 的影响**:如果你的 AWS 账号里已经有 GitHub OIDC provider(来自另一个项目、之前的 lab 运行、同事之前的工作),`bootstrap-shared.yaml` 就建不出新的。栈会以 `EntityAlreadyExists` 失败。

## `setup_repo.py` 怎么处理

第一次 `apply` 之前,wizard 会调 `detect_github_oidc_provider_arn()`:

```python
# scripts/setup_repo.py
aws iam list-open-id-connect-providers
  → 找以 "/token.actions.githubusercontent.com" 结尾的 ARN
  → 找到:把 ARN 传给 ExistingGitHubOidcProviderArn 参数
  → 没找到:参数留空,让 CFN 去建
```

CFN 模板这样写:

```yaml
Conditions:
  CreateGitHubOidcProvider: !Equals [!Ref ExistingGitHubOidcProviderArn, ""]

Resources:
  GitHubOidcProvider:
    Condition: CreateGitHubOidcProvider   # 已存在就跳过
    Type: AWS::IAM::OIDCProvider
    ...

  ReleaseRole / StaticDeployRole / EcsDeployRole:
    AssumeRolePolicyDocument:
      Statement:
        - Principal:
            Federated: !If
              - CreateGitHubOidcProvider
              - !Ref GitHubOidcProvider              # 我们刚创建的
              - !Ref ExistingGitHubOidcProviderArn   # 用检测到的那个
```

最终效果:不管 provider 原本在不在,你的 role 都会信任正确的那个。多个学生共用同一个 AWS 账号时,大家会共享同一个 provider。

## 去哪里看

- **AWS 控制台**:IAM → 身份提供商 → 有一个叫 `token.actions.githubusercontent.com`
- **CLI**:`aws iam list-open-id-connect-providers --profile <profile>`
- **你的 role**:IAM → 角色 → `resume-shared-iam-gh-*-<resource-identifier>` → 信任关系标签 → `Principal.Federated` 指向 provider 的 ARN

## 如果 federation 失败

按顺序排查:

1. **provider 是否存在**:`aws iam list-open-id-connect-providers` 有没有你的 URL。没有就重新跑 Lab 3,apply 会重建
2. **role 信任的 provider 是否正确**:`aws iam get-role --role-name <role> --query 'Role.AssumeRolePolicyDocument.Statement[0].Principal.Federated'` 应等于 provider ARN
3. **workflow 的 `sub` 是否匹配**:role 的 trust policy 在 `token.actions.githubusercontent.com:sub` 上有 `StringLike`。如果你的 workflow 在 tag 上跑、但 trust policy 只允许 `refs/heads/*`,assume-role 会被拒
4. **`aud` claim**:必须是 `sts.amazonaws.com`。`configure-aws-credentials` 会自动设置,但自定义 workflow 如果传了别的 audience 就会被拒
5. **GitHub token 没授予**:workflow 需要 `permissions: id-token: write`。没有的话 GitHub 拒绝发 OIDC token

## 拆除

provider 是 `bootstrap-shared.yaml` 在账号里原本没有时才创建(见上面的 `CreateGitHubOidcProvider` 条件)。`./scripts/setup_repo.py destroy` 时:

- 如果栈创建了 provider:destroy 干净地删掉它
- 如果栈复用了已有的 provider:destroy 不碰它(另一个项目可能依赖它)

这是正确的行为。Lab 10 不应该把同一个账号里无关的项目搞坏。
