# EdgeOne 访问记录设计与上线配置

## 1. 目标与边界

公开地址继续使用 `https://chizheng4.github.io/robotaxi/`。GitHub Pages 负责静态前端和版本发布，EdgeOne Makers 只提供访问记录 API、密码验证和持久化 KV，不复制 Robotaxi 业务事实，也不影响现有业务闭环。

- 输入“金星”：按既有流程进入经营模拟平台。
- 输入“访问”：每次弹出密码输入框，验证后只进入访问记录页面。
- 访问记录页面不加载业务菜单，只提供近 24 小时、近 7 日、近 30 日的匿名访问摘要和记录。
- EdgeOne API、KV 或网络异常时，普通登录和平台运行必须继续可用。

## 2. 数据与隐私合同

每个浏览器标签页创建一条独立访问记录，页面可见时每 30 秒更新一次有效时长。服务端使用密钥对 IP 与 User-Agent 做不可逆 HMAC，只保存 12 位匿名标识，不保存原始 IP、精确地址、输入内容或业务数据。

EdgeOne KV 采用 60 秒最终一致。访问记录使用日期分区独立 Key `visit:{YYYYMMDD}:{visit_id}`，不在请求链路更新共享总计数；查看时只读取目标周期内的日期前缀并聚合，既避免并发覆盖共享计数器，也避免数据长期积累后扫描全部历史记录。

## 3. EdgeOne 审核通过后的配置

1. 创建 KV 命名空间：`robotaxi-visit-records`。
2. 在 EdgeOne Makers 项目绑定该命名空间，变量名必须为 `visitKv`。
3. 配置环境变量：

|变量名|类型|内容|
|---|---|---|
|visitAdminPassword|Secret|访问记录密码，只在 EdgeOne 控制台填写|
|visitHashSecret|Secret|至少 16 位随机密钥，只在 EdgeOne 控制台填写|
|visitAllowedOrigin|String|`https://chizheng4.github.io`|

4. EdgeOne 项目连接 GitHub 仓库 `Chizheng4/robotaxi`，生产分支 `main`。
5. 构建命令：`node scripts/build-github-pages.mjs`；输出目录：`dist`。
6. EdgeOne 部署完成后，将项目域名写入 `index.html` 的 `robotaxi-visit-api-base` meta，例如 `https://example.edgeone.app`，再按正常版本流程提交和发布。

密钥不得写入 Git、README、前端代码或聊天。访问密码验证成功后返回 15 分钟短期令牌，令牌只保存在当前页面内存中，退出或刷新后必须重新验证。

## 4. 审核期间的本地验证

访问记录服务通过同一个存储适配器区分运行环境：

- `localhost`、`127.0.0.1`：启用本地预览适配器，记录只保存在当前浏览器，预览密码为“金星”。
- 配置了 `robotaxi-visit-api-base` 的正式页面：只调用 EdgeOne Functions 和 KV。
- 未配置 API 的非本地域名：访问记录保持关闭，不生成看似有效的本地假数据，也不影响普通平台登录。

本地预览用于检查入口、密码、记录、周期汇总和手机布局，不能替代 EdgeOne 的跨访客持久化验收。

## 5. 验收

- “金星”登录、退出和 12 小时会话保持既有行为。
- “访问”每次要求密码；错误密码不给出记录；退出后令牌立即从前端内存消失。
- 手机与桌面均可查看周期摘要和记录列表。
- KV 未绑定、审核中或 EdgeOne 暂时不可用时，网站不白屏，普通平台功能不受影响。
- 存储值中不存在原始 IP；跨域只允许 GitHub Pages 正式来源和 EdgeOne 同源请求。
- 执行 `node scripts/verify-v048-visitor-analytics.mjs`、`bash scripts/check-before-commit.sh` 和真实浏览器加载验证。
