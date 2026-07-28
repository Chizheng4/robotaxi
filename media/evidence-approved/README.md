# Robotaxi 已批准作品媒体

本目录是唯一允许供外部作品页受控引用的 Robotaxi 媒体边界。它与 `media/evidence-drafts/` 完全分离：草稿始终是 `draft/internal`，不得直接被外部消费。

- 只有 `manifest.json` 中列出的四项、并通过 `node scripts/verify-approved-evidence-media.mjs` 的 PNG 可对外引用。
- 每项资产保留来源草稿 ID、SHA-256、Robotaxi 版本、commit、中文 alt、媒体角色、事实边界与授权记录。
- 当前授权严格限于：网格仿真当前模拟运行、城市空间迭代进行中语境、经营模型、经营总览的模拟经营语境。
- 城市图不是城市运营证据；网格图不是城市商业运营；经营总览不是实际商业运营绩效。
- 撤销、未批准、角色为 `rejected` 或哈希不匹配的资产必须被验证器拒绝，不能写入已批准清单。

执行 `node scripts/promote-evidence-media.mjs` 仅可从通过本地草稿合同的指定四项生成该边界；它不会修改草稿 schema 或将草稿标记为 public。
