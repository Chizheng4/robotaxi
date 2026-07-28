# Robotaxi 证据媒体草稿

本目录只保存本地审核用的 Robotaxi 页面证据。它不是发布目录，也不代表任何真实商业运营绩效。

- 采集入口：`bash scripts/capture-evidence-media.sh`
- 固定视口：`1280×800`，PNG 不含浏览器外框。
- 当前交接草稿有四行：运营中控台下的“当前模拟运行（网格仿真）”与“城市空间迭代（真实城市底图与规划入口）”，以及经营模型、经营总览。网格图仅证明当前可运行的网格模拟；城市图仅为城市空间基底/规划入口的进行中语境，未进入城市模拟运行，不能作运营能力证据。
- 媒体角色只允许 `current_system_evidence`、`in_progress_context`、`rejected`。角色不等同于审核或公开授权，所有资产仍是 `draft/internal`。
- `xingbuild-handoff.draft.json` 是留在本仓库、供人工审核后消费的四行字段化交接草稿；它不写入 xingbuild、不提供深链，也不构成发布。
- `manifest.json` 只能使用 `reviewStatus: "draft"` 和 `publicStatus: "internal"`；校验脚本会拒绝其他值。
- 资产与元数据一一对应，以 PNG 的 SHA-256 绑定。人工审核、批准或对外使用不在本节点范围内。

采集脚本会临时启动本地静态服务，并在退出时关闭服务、Chrome 与临时 profile。
