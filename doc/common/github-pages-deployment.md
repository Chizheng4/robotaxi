# GitHub Pages 公开演示发布

## 1. 发布目标

Robotaxi 经营闭环模拟平台通过 GitHub Pages 发布为公开静态演示站点。GitHub Pages 只承担静态资源托管，不改变业务单据、模拟运行和浏览器运行态结构。

多人可以同时访问站点；每位访客的模拟数据保存在自己的浏览器中，彼此独立。当前版本不提供账号、共享数据库或多人协同编辑。

## 2. 发布结构

```mermaid
flowchart LR
  A[本地开发与验证] --> B[版本提交和标签]
  B --> C[双击一键发布]
  C --> D[推送 main 和标签]
  D --> E[GitHub Actions]
  E --> F[生成并检查生产站点]
  F --> G[GitHub Pages]
  G --> H[校验公网版本和提交]
```

- 本地入口：`start-robotaxi.command`，继续使用本地并发静态服务。
- 生产构建：`node scripts/build-github-pages.mjs`。
- 产物检查：`node scripts/verify-github-pages-build.mjs`。
- 自动部署：`.github/workflows/deploy-pages.yml`。
- 一键发布：`publish-robotaxi.command`。
- 发布网络：命令优先探测并使用 Clash Verge 本地代理 `127.0.0.1:7897`，代理不可用时自动回退直连；连接检查、Git 推送和公网验收使用同一网络路径。可通过 `ROBOTAXI_GITHUB_PROXY` 临时覆盖代理地址，不修改 Git 全局配置。
- 发布目录：`dist/`，为生成目录，不提交 Git。

生产构建只复制页面运行需要的 `index.html`、`vendor` 和运行时 `src`。设计文档、验证脚本、本地日志和 JSX 入口不会进入公开站点。

入口资源和动态模块统一使用 Git 提交哈希作为缓存版本。每次提交发布后，浏览器会请求本次版本资源，避免旧 bundle 与新模块混用导致白屏。

## 3. 首次启用

1. 在 GitHub 创建仓库并把当前项目推送到仓库的 `main` 分支。
2. 免费账户使用 GitHub Pages 时，将仓库设为公开。
3. 打开仓库 `Settings` → `Pages`。
4. 在 `Build and deployment` 的 `Source` 中选择 `GitHub Actions`。
5. 完成版本提交和标签后，双击 `publish-robotaxi.command`。
6. 部署完成后，通过 `https://<用户名>.github.io/<仓库名>/` 访问。

若仓库名称为 `<用户名>.github.io`，访问地址为 `https://<用户名>.github.io/`。

## 4. 持续更新与回退

- 正式更新：Codex 完成本地验证、版本提交和标签后，只需双击 `publish-robotaxi.command`；不要再次点击 Commit。
- 自动验收：发布命令等待 Actions 成功，并校验公网部署清单的版本与提交一致后才报告上线完成。
- 网络选择：保持 Clash Verge 运行即可直接双击发布；无需在 Terminal 手工输入代理变量。
- Contribution：版本提交进入 `main` 后形成贡献记录；提交邮箱必须是 GitHub 账号已验证邮箱或 GitHub noreply 邮箱。
- 回退：将需要恢复的稳定提交重新发布到 `main`，或在 GitHub Pages 部署记录中重新运行对应版本。不得删除历史标签。

## 5. 手机与桌面

- 桌面继续使用完整左侧导航、中间工作区和右侧详情。
- 手机首屏自动收起导航，展开导航时覆盖内容；选择菜单后自动收起。
- 手机详情默认收起，展开时作为右侧覆盖层显示。
- 状态、筛选和表格保留横向操作能力，不隐藏必要业务字段。

发布前使用仓库子路径预览，避免只在域名根路径验证：

```bash
node scripts/build-github-pages.mjs
node scripts/serve-github-pages-preview.mjs
```

默认预览地址：`http://127.0.0.1:4174/Robotaxi/`。

## 6. 中国大陆访问边界

GitHub Pages 默认域名可以作为零成本公开演示地址，但不提供中国大陆节点和大陆网络质量承诺。上线后需要分别使用移动、电信、联通网络进行实际访问验证。

如实测无法满足演示需要，后续版本再增加自定义域名和 EdgeOne。使用中国大陆加速节点前，需要按服务商要求完成域名备案；该扩展不改变当前 GitHub 自动发布和静态产物结构。
