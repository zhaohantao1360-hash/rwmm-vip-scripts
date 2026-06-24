/*
#!name=让我喵喵 - 会员解锁(订阅版)
#!desc=解锁让我喵喵App会员权益 - 订阅模式
#!author=自定义
#!update=2026-06-24
*/

// URL 过滤 - 只处理目标请求
const url = $request.url;
if (url.indexOf("www.pdreamer.com") === -1) {
    $done({});
    return;
}
if (url.indexOf("getUserInfo") === -1 && url.indexOf("userInfo") === -1) {
    $done({});
    return;
}

const body = getSubscriptionVipResponse();
$done({ body: body });

function getSubscriptionVipResponse() {
    const now = new Date();
    // 订阅模式：设置为自动续费订阅
    const expireTime = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const expireTimeStr = expireTime.toISOString().replace('T', ' ').substring(0, 19);
    const currentTime = now.toISOString().replace('T', ' ').substring(0, 19);
    
    return JSON.stringify({
        code: 200,
        msg: "success",
        data: {
            userId: 1145141919,
            nickname: "年度订阅会员",
            avatar: "",
            phone: "",
            vip: true,
            vipLevel: "SUBSCRIPTION",
            isVip: true,
            // 订阅模式核心字段
            subscription: {
                status: "active",           // 订阅状态：活跃
                autoRenew: true,            // 自动续费
                productType: "yearly",      // 订阅类型：年度
                expireTime: expireTimeStr,  // 到期时间
                startTime: currentTime,     // 开始时间
                renewCount: 99,             // 续费次数
                platform: "ios"             // 订阅平台
            },
            expireTime: expireTimeStr,
            startTime: currentTime,
            vipDay: 365,
            totalVipDay: 9999,
            createTime: currentTime,
            member: {
                status: 1,                  // 会员状态：有效
                level: 3,
                expire: expireTimeStr,
                subscriptionType: "yearly", // 订阅类型
                autoRenew: true             // 自动续费
            }
        }
    });
}
