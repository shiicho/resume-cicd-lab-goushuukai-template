> 🌐 [English](../en/lab-06-first-artifacts.md) &nbsp;·&nbsp; [日本語](../ja/lab-06-first-artifacts.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../README.cn-zh.md) &nbsp;·&nbsp; [← Lab 5](./lab-05-first-release-tag.md)

# Lab 6 — First Artifacts (S3 + ECR)

⏱ 10 分钟 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; 构建一次,部署多次

## 为什么

Lab 5 的 tag 刚刚并行产出了两样东西:S3 上的静态站点 zip 和 ECR 上的容器镜像 —— 同一次发布,两种形态。这个 lab 里你把两个都打开、确认它们真的存在,并学会按名字指向它们。从此以后每一次部署都引用这两个产物,没有按环境重新构建。

- **静态 `site.zip`** 上传到共享 S3 产物 bucket(给 CloudFront/S3 部署目标用)
- **容器镜像** 推到 ECR,打两个 tag(release tag 和 commit SHA)(给 ECS/Fargate 部署目标用)

Lab 7 你把两种都部署一次,亲身感受取舍。这就是「build once, deploy many」原则 —— 和按环境重新构建完全相反。

> vs _按环境分别构建_ —— 每一次重构建都可能带来环境漂移(node 版本不同、时间戳不同、lockfile 解析不同)。Build-once 强制不变性 —— 在 dev 上跑的那一份字节,就是 prod 上会跑的那一份字节。

## 做什么

1. **看着 build 自动跑起来**。release PR 一合并,`release-please.yml` 就跑完,检测到新 tag,然后通过 `gh workflow run` 显式地把 `release-assets.yml` 派发出去(看 `.github/workflows/release-please.yml` 末尾的 `dispatch-release-assets` 这个 job)。一共 ~3–4 分钟。列一下然后跟踪:
   ```
   gh run list --workflow="Build Release Assets" --limit 1
   ```
   ```
   gh run watch
   ```
   > 💡 `gh run list` 即使只有 1 行也会进分页器 —— 按 `q` 退出。持久修复见 [`tools/pager-config.md`](./tools/pager-config.md)。

   > **为什么能自动派发**:GitHub 的安全规则禁止 `GITHUB_TOKEN` 推的 tag 再去触发下游 `push: tags` workflow(避免 bot 互相触发成环)。但同一个 token 发出的 `workflow_dispatch` 事件是明确允许的。所以 Release Please 照样推 tag,同一个 workflow 里再加一个 job,用 `gh workflow run release-assets.yml --ref $tag` 把接力棒交出去。不需要 PAT、不需要 GitHub App、也不需要额外的 secret。
   >
   > 列表空了(比如 repo 设置被关了,或者 `actions: write` 权限被剥了),退回手动 dispatch:
   > ```
   > latest_tag=$(git ls-remote --tags origin 'web-v*' | awk -F'refs/tags/' '{print $2}' | sort -V | tail -1)
   > ```
   > ```
   > gh workflow run release-assets.yml --ref "${latest_tag}" -f version="${latest_tag#web-v}"
   > ```

2. **检查 S3 产物** —— 列出新 zip:
   ```
   ARTIFACT_BUCKET=$(jq -r .artifactBucket deploy/shared/delivery.json)
   ```
   ```
   aws s3 ls "s3://${ARTIFACT_BUCKET}/web/releases/" --recursive
   ```
   你会看到类似 `web/releases/web-v0.2.0+<short_sha>/site.zip` 的路径。key 里同时带 tag 和 SHA,所以一次 replay 绝不可能冲突。

3. **检查 ECR 镜像** —— 列出仓库里的镜像。`[?imageTags != null]` 过滤掉重试时留下的无 tag 镜像。`imageTags` 本身是列表(一个镜像两个 tag),所以在喂给 `--output table` 之前要用逗号拼成标量 —— 不然 AWS CLI 的表格化会报 "Row should have 2 elements, instead it has 1":
   ```
   ECR_REPO=$(jq -r .ecrRepositoryUri deploy/shared/delivery.json | sed 's|.*/||')
   ```
   ```
   aws ecr describe-images --repository-name "${ECR_REPO}" \
     --query 'imageDetails[?imageTags != null].{tags:join(`,`, imageTags), digest:imageDigest}' \
     --output table --no-cli-pager
   ```
   你会看到指向同一 digest 的 **两个 tag**:
   - `web-v0.2.0`(release tag)
   - `sha-<short_sha>`(commit SHA)

4. **记下 digest** —— `sha256:...`。这是镜像的密码学身份,Lab 7 的部署会用它来 pin。复制一下;下个 lab 你会在 `deploy/ecs/development/task-definition.json` 里看到同一个值。

5. **打开 Lab 6 的 claim PR,然后把它合上。**
   ```
   ./scripts/claim.py lab-6
   ```
   脚本会打印 PR 编号。CI 绿了就合:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

## 验证

- S3 列表里能看到你 release tag 路径下的 `site.zip`。
- ECR 列表里两个 tag(`web-v*` 和 `sha-*`)指向同一 digest。
- 在 Build Release Assets 的 GitHub Actions 日志里,`Update development release state` 这一步成功了(这一步会触发 Lab 7 的 PR)。
- 👀 **控制台肉眼确认**。`.local/console-links.md`(向导生成)里有 S3 产物 bucket + ECR 仓库的直接链接 —— 新的 zip 和两个镜像 tag 在控制台那一侧能看见,正好和上面 CLI 输出并排对比。

## 你刚刚做到的

从一个 release tag 产出了两个不可变产物。同一份字节现在可以用两种方式寻址(S3 key + ECR digest)。Lab 7 和 Lab 9 里每个环境都会引用这一份具体产物 —— 不重构建、不漂移。

> ☕ 那个 `sha256:...` digest 就是 Docker 在本地会算出来的同一个 hash。用 `docker pull <ecr-uri>@<digest>` 把它拉下来,亲手感受一下 build-once-deploy-many 的主张。

## 下一个

[Lab 7 — First Deploy](./lab-07-first-deploy.md)
