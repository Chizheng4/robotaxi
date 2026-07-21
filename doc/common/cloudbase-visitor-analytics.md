# CloudBase 访问记录设计与配置

## 1. 目标与边界

公开网站继续使用 `https://chizheng4.github.io/robotaxi/`。GitHub Pages 负责静态网站，腾讯云 CloudBase 仅提供 HTTP 云函数和访问记录存储，不承载 Robotaxi 业务数据。

- 输入“金星”并成功进入平台后，才创建一条访问记录。
- 输入“访问”时不计入普通访问；密码验证成功后只显示访问记录。
- 记录登录时间、有效时长、设备、浏览器、来源类型、网站版本和匿名访客标识。
- 不记录原始 IP、精确位置、页面轨迹、点击行为、输入内容或业务数据。
- CloudBase 不可用时不得阻止普通登录，不得导致网站白屏。

## 2. 数据与安全合同

前端在浏览器本地生成随机访客种子。云函数使用 `VISIT_TOKEN_SECRET` 做 HMAC，只保存不可逆匿名标识，不上传或保存原始 IP。

访问记录密码只保存在云函数环境变量 `VISIT_ADMIN_PASSWORD`。验证成功后返回 15 分钟短期令牌；刷新、退出或令牌到期后必须重新验证。

数据库集合固定为 `visitor_sessions`。浏览器不能直接读写集合，全部操作必须经过 `visitorAnalytics` 云函数。

## 3. 部署配置

环境 ID：`robotaxi-visit-records-d8e34876e`。

当前免费体验版不能增加 GitHub Pages 安全域名，因此不使用 Web SDK 匿名登录。正式链路固定为：GitHub Pages `fetch` → CloudBase 默认 HTTP 域名 → `visitorAnalytics` HTTP 云函数 → `visitor_sessions`。

1. 创建集合 `visitor_sessions`，客户端权限保持关闭。
2. 使用 CloudBase CLI 将 `cloudfunctions/visitorAnalytics` 部署为 Node.js 20 HTTP 云函数，并绑定默认域名路径。
3. HTTP 网关关闭安全域名跨域校验，由云函数只放行 GitHub Pages 正式域名和本地验证域名。
4. 为云函数配置环境变量：

|变量名|要求|
|---|---|
|`VISIT_ADMIN_PASSWORD`|只在控制台设置，不写入代码或文档|
|`VISIT_TOKEN_SECRET`|至少 24 位随机字符串，只在控制台设置|

5. 将生成的 HTTPS 地址写入 `index.html` 的 `robotaxi-visit-api-base` 元数据。
6. 部署后使用 GitHub Pages 正式地址分别验证“金星”和“访问”入口。

当前已部署 HTTP 地址：`https://robotaxi-visit-records-d8e34876e.service.tcloudbase.com/visitor-analytics`。云函数、集合、跨域、密码验证、写入和查询已通过真实 API 验证，验收产生的临时记录已清理。

查看密码由 `visitorAnalytics` 云函数的环境变量 `VISIT_ADMIN_PASSWORD` 唯一控制。修改时进入 CloudBase 环境的云函数列表，打开 `visitorAnalytics` 的函数配置并更新该环境变量，然后重新部署函数；密码不得写入仓库、网页或数据库。

## 4. 本地与线上行为

- `localhost` 或 `127.0.0.1` 且未配置 HTTPS API 地址时使用本机预览记录。
- 配置 HTTPS API 地址后，正式网站只通过 HTTP 云函数读写 CloudBase。
- CloudBase 异常只显示访问记录服务不可用，不影响平台。

## 5. 验收

- 打开登录页但未登录时，数据库没有新增记录。
- 输入“访问”查看记录时，数据库没有新增普通访问。
- 输入“金星”成功进入平台后，新增一条记录并周期更新有效时长。
- 手机和桌面均可查看近 1 日、7 日和 30 日记录。
- 数据库中不存在原始 IP、页面路径、点击或业务数据。
- 云函数或数据库不可用时，普通平台仍可进入和运行。
