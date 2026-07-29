# Robotaxi 已批准作品媒体

本目录是唯一允许供外部作品页受控引用的 Robotaxi 媒体边界。它与 `media/evidence-drafts/` 完全分离：草稿始终是 `draft/internal`，不得直接被外部消费。

- 只有 `manifest.json` 中同时为 `approvalStatus: "approved"`、`reviewStatus: "approved"`、`publicStatus: "public"`，并通过 `node scripts/verify-approved-evidence-media.mjs` 的 PNG 可对外引用。
- 每项资产保留来源草稿 ID、SHA-256、Robotaxi 版本、commit、中文 alt、媒体角色、事实边界与授权记录。
- 当前授权严格限于：网格仿真当前模拟运行、城市空间迭代进行中语境、经营模型、经营总览的模拟经营语境。
- 城市图不是城市运营证据；网格图不是城市商业运营；经营总览不是实际商业运营绩效。
- 当前四项旧截图均已停止公开：城市图为 `revoked`；网格、经营模型和经营总览为 `paused/pending_review`。PNG 与哈希只为追溯保留，不构成对外授权。
- 撤销、暂停、未批准、角色为 `rejected` 或哈希不匹配的资产必须被验证器拒绝，不能重新进入公开清单。

执行 `node scripts/promote-evidence-media.mjs` 必须先逐项取得新的 `approved/public` 审核记录；它不会继承历史 `approvalRecord`、修改草稿 schema 或将草稿标记为 public。
