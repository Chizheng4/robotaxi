# v026 设计 QA

- source visual truth path: `doc/common/iteration-history/major/v026-visual-reference.png`
- implementation screenshot path: `doc/common/iteration-history/major/v026-implementation.png`
- comparison evidence path: `doc/common/iteration-history/major/v026-design-comparison.png`
- viewport: `1440 x 1024`
- state: Robotaxi 列表，RTX-001 已选中，右侧基础信息详情展开

## Full-view Comparison Evidence

已将视觉方案 3 与本地实现按相同比例并排合成比较。实现保持了参考图的核心视觉语言：中性白灰表面、克制蓝色强调、单行工作台页签、紧凑筛选、细分隔线表格、状态点、选中行和固定右侧详情。

参考图中的全局搜索、模拟概览摘要和账户区没有直接照搬。它们属于当前产品尚未定义的业务能力；本版本保留现有信息架构，避免添加不可用控件或虚构数据。地图场景另按已选方案 2 的空间画布方向实现。

## Focused Region Comparison Evidence

- 导航与页签：层级、选中态、展开态、间距和底部选中线与参考方向一致；根菜单聚焦粗蓝框已移除，键盘聚焦下沉到具体菜单项。
- 筛选与表格：控件高度、表头、行高、选中行、状态语义点、分页与横向滚动保持统一，字段仍来自真实业务数据。
- 详情栏：固定宽度、标题栏、Tab、字段标签和值的对齐与参考方向一致，内容过长时独立滚动。
- 地图与事件区：工具悬浮、图例、道路与区域语义色、事件区分隔条和上下边界均完成独立截图检查。

## Required Fidelity Surfaces

### Fonts And Typography

通过。统一使用 Inter / SF Pro Text / PingFang SC / Microsoft YaHei / 系统无衬线回退；页面字号保持 12–16px，字间距为 0，数字使用等宽数字特性。未出现超大标题、异常换行或文字遮挡。

### Spacing And Layout Rhythm

通过。顶部栏 52px、工作台页签 38px、菜单项与表格行 36px、详情标题 44px；主内容、事件区和详情区边界对齐。1280 x 720 与 1440 x 900 均无页面级横向溢出。

### Colors And Visual Tokens

通过。颜色集中到 `src/styles.css` 根令牌；主色只用于选中和主操作，成功、警告、危险、进行中和中性状态使用统一语义色并保留中文文案。无装饰渐变、光斑或大面积高饱和色。

### Image Quality And Asset Fidelity

通过。本产品界面没有参考图要求的照片、插画或品牌位图资产；地图继续使用现有业务 SVG 数据层，不新增伪造资产。参考图和实现截图清晰，无拉伸、裁切或压缩伪影。

### Copy And Content

通过。所有表格列、状态、筛选、按钮、详情和事件文案保持中文；未新增英文枚举或内部字段暴露。参考图中未落地的全局能力没有以静态假控件替代。

## Findings

无可执行的 P0、P1 或 P2 问题。

## Open Questions

无阻塞问题。全局搜索、导航图标体系、运营摘要和账户区可在未来具备真实业务定义与图标依赖时作为独立能力迭代，不属于本次视觉统一的缺陷。

## Implementation Checklist

- [x] 全局视觉令牌与基础控件统一
- [x] 导航、顶部栏与工作台页签统一
- [x] 状态、筛选、表格、分页与详情统一
- [x] 地图工具、语义色与图例统一
- [x] 模拟运行表格与事件区统一
- [x] 查询、重置、表格选择、详情折叠与展开验证
- [x] 模拟创建、启动、事件生成、停止与刷新持久化验证
- [x] 控制台无新增错误或警告
- [x] 设计系统规则加入模型强制读取入口

## Patches Made Since Previous QA Pass

- 移除根菜单聚焦时覆盖整块侧栏的粗蓝色轮廓，保留菜单项级键盘焦点。
- 为状态字段增加统一语义点和中文状态文案。
- 为样式表增加 v026 缓存版本，确保服务重启后加载最新视觉令牌。
- 增加窄桌面摘要收敛与详情栏宽度规则。

## Follow-up Polish

- P3：未来引入正式图标库后，可为一级导航和地图工具补充统一线性图标。
- P3：全局搜索形成真实跨对象检索能力后，可接入顶部工作栏。

final result: passed

---

# v026.1 设计 QA

- 1280 x 720：`doc/common/iteration-history/minor/v026.1-1280x720.png`
- 1440 x 900：`doc/common/iteration-history/minor/v026.1-1440x900.png`
- 三级菜单状态：`doc/common/iteration-history/minor/v026.1-three-level-menu.png`

## Focused Findings

- 菜单一级、二级、三级实测缩进为 `14px / 34px / 54px`，字重保持 `500 / 400 / 400`；选中三级菜单仅提升至 `600`。
- 选中态实测为 `rgb(226, 236, 255)` 背景和 `rgb(32, 93, 204)` 文字，并有左侧内嵌标记；悬停态为中性灰，二者辨识明确。
- 平台名称、菜单收展与详情收展控件均无 `title` 原生气泡；悬停不产生玻璃浮层。
- 左侧导航可在 `60px / 232px` 间收展，右侧详情可隐藏并恢复。
- 两个目标桌面尺寸均无页面级横向或纵向溢出；清晰度主要由颜色和层级建立，字体轻盈，无重叠与遮挡。
- 视觉验收以精致和轻为首要感受，比例、留白、细边界、对齐和状态差异保持克制，没有通过粗大字体或厚重色块强化界面。
- 页面请求无 4xx/5xx，控制台无新增错误或警告。

## Rule Consolidation

- 前端结构、视觉令牌、组件状态、交互和模型接入标准已统一收录于 `04-frontend-ux-rules.md`。
- 删除活动规则 `07-frontend-design-system.md`，历史归档保持不变。
- `AGENTS.md` 是唯一任务分流入口，其他索引只负责说明文件职责。

final result: passed
