# EdgeOne 轻量访问概览

## 1. 目标与边界

本能力只回答两个公开站点是否存在真实外部有效访问，以及各站和合计的大致情况：

- `XINGBUILD`：xingbuild 网站，正式域名 `https://xingbuild.top/`；
- `ROBOTAXI`：Robotaxi 运营平台，正式域名 `https://robotaxi.xingbuild.top/`。

它不是网站运营分析，不进入 Robotaxi 业务数据池或模拟运行。不得记录或推导 IP、地区、页面路径、点击、来源、输入、业务数据、精确停留时长、会话心跳或结束事件。

Robotaxi 只在正式域名输入“金星”成功进入平台后调用 `QUALIFY_VISIT`。登录页、失败登录和“访问”管理员入口不记录。localhost、127.0.0.1、EdgeOne preview、`verifyBrowserLoad` 等自动 QA 和非正式域名均排除。

## 2. 共享匿名与幂等合同

每个站点在自身 origin 的 `localStorage` 生成独立随机 `visitor_seed`，格式为 16–100 位字母、数字或连字符。两个站点不得通过父域 Cookie、统一种子或服务端网络信息建立跨站身份。

Edge Function 使用 `HMAC-SHA-256(visitHashSecret, site_code + "|" + visitor_seed)`，取前 24 位小写十六进制作为 `visitor_identifier`。原始种子不写入 KV。

KV key 固定为：

`visit_<SITE_CODE>_<YYYYMMDD>_<visitor_identifier>`

key 只含字母、数字和下划线。同一匿名访客、同一站点、同一自然日最多一个 KV 对象；重复访问只更新 `last_qualified_at`。

KV 对象只允许以下字段：

- `site_code`
- `qualified_date`
- `visitor_identifier`
- `first_qualified_at`
- `last_qualified_at`
- `device_type`
- `website_version`

## 3. 同域接口

Robotaxi 责任端实现：

- `POST /api/visits/qualify`
- `POST /api/visits/auth`
- `GET /api/visits/records?period=1D|7D|30D&site=ALL|XINGBUILD|ROBOTAXI`

`ALL` 的匿名访客数为两个站点分别去重后的数量加总，不宣称跨站去重。查询返回 `generated_at`；EdgeOne KV 最终一致性可能造成约 60 秒显示延迟。

管理员验证使用 15 分钟短期令牌。验证后可以写入或清除父域 Cookie `xingbuild_visit_excluded=1`，有效期一年；该 Cookie 只表达本设备排除，不能作为匿名身份。

## 4. EdgeOne 外部配置门禁

发布前必须在 EdgeOne 控制台完成：

1. 创建并绑定变量名固定为 `visitKv` 的 KV；
2. 配置 Secret `visitAdminPassword`；
3. 配置至少 24 位随机 Secret `visitHashSecret`；
4. 配置非秘密环境修订标识 `visitEnvRevision`，用于确认新部署取得最新 Production 环境配置；
5. 确认两个站点各自部署同源 `/api/visits/*`；
6. 分别验证正式域名写入、管理员查询、父域排除和约 60 秒最终一致性；
7. 确认 preview 与自动 QA 不写入。

管理员认证失败只允许返回 `ADMIN_PASSWORD_MISSING`、`ADMIN_PASSWORD_HAS_INVISIBLE_CHARS` 或 `ADMIN_PASSWORD_MISMATCH`，并可原样返回非秘密 `env_revision`。不得返回或记录密码、长度、哈希、局部字符或其他可用于猜测密码的信息。

Secrets 不得进入仓库。当前本地实现不要求真实 KV 写入；未完成上述配置时不得声称公网访问概览可用。

CloudBase 旧函数、集合和历史数据不再被生产前端引用，但外部实例与数据保留，等待后续单独授权处理。

## 5. 提供给 xingbuild Engineering 的最小接口

xingbuild 只需复用本文件第 2、3 节合同：

1. 在 `xingbuild.top` 自身 origin 生成并保存独立 `visitor_seed`；
2. 仅在正式页面完成约定的有效访问条件后，以 `site_code: "XINGBUILD"` 调用同域 `POST /api/visits/qualify`；
3. 若父域 Cookie `xingbuild_visit_excluded=1`、自动 QA、preview 或非正式域名成立，不调用；
4. Edge Function 必须校验请求域名与 `site_code` 一致，复用完全相同的 HMAC、KV key、字段白名单、30 天清理和管理员查询合同；
5. 不复制 Robotaxi 页面，不修改 Robotaxi 业务数据。
