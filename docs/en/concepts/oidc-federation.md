> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/concepts/oidc-federation.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/oidc-federation.md)

[← Back to README](../../../README.md)

# GitHub Actions → AWS via OIDC

How the lab's pipeline talks to AWS without a long-lived key. Read once; you'll spot the pattern in every `assume-role` call after Lab 3.

## The flow in 6 steps

![GitHub Actions → AWS OIDC handshake](../../diagrams/images/oidc-flow.png)

<details>
<summary>Text fallback (ASCII)</summary>

```
┌──────────────────┐                            ┌─────────────────────┐
│ GitHub Actions   │   (1) request OIDC token   │ token.actions.      │
│ workflow runs    │ ─────────────────────────▶ │ githubusercontent   │
│                  │ ◀───────────────────────── │ .com (issuer)       │
└──────┬───────────┘   (2) signed JWT           └─────────────────────┘
       │
       │ (3) aws-actions/configure-aws-credentials
       ▼
┌──────────────────┐                            ┌─────────────────────┐
│ AWS STS          │   (4) verify signature vs  │ IAM OIDC Provider   │
│                  │ ─────────────────────────▶ │ (account-singleton) │
│                  │ ◀───────────────────────── │                     │
└──────┬───────────┘                            └─────────────────────┘
       │ (5) role trust policy check:
       │     Principal.Federated == <provider ARN>  ✓
       │     sub claim matches allowed repo + ref   ✓
       │     aud claim == "sts.amazonaws.com"       ✓
       ▼
┌──────────────────┐
│ short-lived      │   (6) valid for ≤1h; scoped to role's permissions
│ creds returned   │         (S3 PutObject / ECR PutImage / etc.)
│ to workflow      │
└──────────────────┘
```

</details>

1. Workflow asks GitHub's OIDC issuer for a token (free, built-in).
2. GitHub returns a JWT signed by its key; the JWT's `sub` claim encodes `repo:<owner>/<repo>:ref:<ref>`.
3. `aws-actions/configure-aws-credentials` calls STS `AssumeRoleWithWebIdentity` with the JWT + target role ARN.
4. STS validates the JWT's signature against the OIDC provider's JWKS, which it knows because the provider resource registers GitHub's issuer URL + thumbprint.
5. STS then evaluates the role's trust policy: the `Principal.Federated` must be this provider's ARN, the `sub` claim must match the allowed repo pattern, the `aud` claim must be `sts.amazonaws.com`.
6. If all checks pass, STS hands the workflow short-lived credentials (1h max). The role's permissions policy governs what those creds can do.

No secret ever leaves GitHub. No access key ever sits in your repo or Actions variables. If a workflow is compromised, the attacker has at most 1h of scoped access before credentials expire — and they can't touch anything outside the role's permissions.

## The OIDC provider is a singleton per AWS account

AWS enforces **one** IAM OIDC Provider per issuer URL per account. You cannot create a second `token.actions.githubusercontent.com` provider — the `CreateOpenIDConnectProvider` API returns `EntityAlreadyExists`.

**Why**: the provider is the trust anchor. If two providers existed for the same issuer, which one's thumbprint list would STS trust? The answer has to be "one", so AWS makes it one.

**Consequence for this lab**: if your AWS account already has a GitHub OIDC provider (from another project, a prior lab run, a colleague's earlier work), `bootstrap-shared.yaml` cannot create one. The stack would fail with `EntityAlreadyExists`.

## How `setup_repo.py` handles it

Before the first `apply`, the wizard calls `detect_github_oidc_provider_arn()`:

```python
# scripts/setup_repo.py
aws iam list-open-id-connect-providers
  → look for any ARN ending in "/token.actions.githubusercontent.com"
  → if found: pass the ARN as ExistingGitHubOidcProviderArn param
  → if not found: leave the param empty, let CFN create one
```

Then the CFN template does:

```yaml
Conditions:
  CreateGitHubOidcProvider: !Equals [!Ref ExistingGitHubOidcProviderArn, ""]

Resources:
  GitHubOidcProvider:
    Condition: CreateGitHubOidcProvider   # skipped if one already exists
    Type: AWS::IAM::OIDCProvider
    ...

  ReleaseRole / StaticDeployRole / EcsDeployRole:
    AssumeRolePolicyDocument:
      Statement:
        - Principal:
            Federated: !If
              - CreateGitHubOidcProvider
              - !Ref GitHubOidcProvider              # we just created it
              - !Ref ExistingGitHubOidcProviderArn   # reuse the detected one
```

Net result: your roles trust the right provider whether it existed already or this stack created it. Multiple lab students sharing one AWS account will all share the same provider.

## Where to see it

- **AWS Console**: IAM → Identity providers → one named `token.actions.githubusercontent.com`.
- **CLI**: `aws iam list-open-id-connect-providers --profile <profile>`.
- **Your roles**: IAM → Roles → `resume-shared-iam-gh-*-<resource-identifier>` → Trust relationships tab → `Principal.Federated` points to the provider's ARN.

## If federation fails

Check these in order:

1. **Provider exists**: `aws iam list-open-id-connect-providers` returns your URL. If missing, re-run Lab 3 (the apply will create it).
2. **Role trusts the right provider**: `aws iam get-role --role-name <role> --query 'Role.AssumeRolePolicyDocument.Statement[0].Principal.Federated'` — should match the provider ARN.
3. **Workflow's `sub` matches**: the role's trust policy has `StringLike` on `token.actions.githubusercontent.com:sub`. If your workflow runs on a tag but the trust policy only allows `refs/heads/*`, the assume-role call is denied. Check the role's trust conditions.
4. **`aud` claim**: must be `sts.amazonaws.com` — `configure-aws-credentials` sets this automatically, but a custom workflow might pass a different audience and get rejected.
5. **GitHub token not granted**: the workflow needs `permissions: id-token: write`. Without it, GitHub refuses to issue the OIDC token.

## Teardown

The provider is created by `bootstrap-shared.yaml` **only** if the account didn't already have one (see the `CreateGitHubOidcProvider` condition above). So on `./scripts/setup_repo.py destroy`:

- If the stack created the provider: destroy removes it cleanly.
- If the stack reused an existing one: destroy leaves it alone (another project may depend on it).

This is the correct behavior — you don't want Lab 10 to break unrelated projects in the same account.
