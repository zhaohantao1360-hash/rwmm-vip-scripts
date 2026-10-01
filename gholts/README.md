# gholts Surge 插件移植

来源：`gholts/surge`（2026-10-01 移植），脚本原样未改，仅把 `.sgmodule` 里的 `script-path` 改成指向本仓库，方便自托管。

| 模块 | 文件 | 用途 |
|---|---|---|
| AWS Lightsail Bandwidth Panel | `modules/aws-lightsail-bandwidth-panel.sgmodule` | 两个 AWS Lightsail 实例的月流量面板（需填实例名 + AWS 密钥） |
| Feather Fully Local Manifest | `modules/feather-fully-local.sgmodule` | Feather 侧载本地 manifest 生成（需 Surge CA 信任 + MITM/Rewrite/Scripting） |
| JMS Bandwidth Panel | `modules/jms-bandwidth-panel.sgmodule` | Just My Socks 流量面板（需填 service 和 id） |
| Sub Info Panel | `modules/sub-info-panel.sgmodule` | 订阅流量/到期面板（读 Subscription-Userinfo） |
| YouTube Enhance | `modules/youtube-enhance.sgmodule` | 去广告、后台播放、画中画、最高 4x 速（基于 Maasea 代码，Apache-2.0） |

安装：在 Surge「模块」里粘贴对应 `.sgmodule` 的 raw 链接，例如：

`https://raw.githubusercontent.com/zhaohantao1360-hash/rwmm-vip-scripts/refs/heads/main/gholts/modules/youtube-enhance.sgmodule`
