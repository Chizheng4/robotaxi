# 空间模型字段字典迁移说明

空间模型字段字典已合并到统一字段字典：

```text
doc/common/field-dictionary.md
```

后续不再在空间模型目录下维护独立字段字典。

空间模型对象文档仍可定义对象属性，但字段英文名、中文名、字段性质和前端显示规则应以统一字段字典为准。

新增或修改 Map、Cell、Road、RoadNode、RoadSegment、Place、ServiceArea、Zone、Route 等相关字段时，应同步更新：

1. 对应业务对象文档；
2. `doc/common/field-dictionary.md`；
3. 初始化数据；
4. 校验规则；
5. 前端字段映射。
