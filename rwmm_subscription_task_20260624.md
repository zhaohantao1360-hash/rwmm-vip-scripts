# 让我喵喵脚本改订阅模式

## 任务
将原版 SVIP 脚本改为订阅模式

## 关键改动
- `vipLevel`: SVIP → SUBSCRIPTION
- 新增 `subscription` 对象，包含订阅状态、自动续费、产品类型等字段
- 到期时间从 +10年 改为 +1年（符合订阅逻辑）
- 新增 `autoRenew` 标识在 member 对象中

## 输出文件
`rwmm_subscription.js`

## 时间
2026-06-24 22:00 GMT+8
