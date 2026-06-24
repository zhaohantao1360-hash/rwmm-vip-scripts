/*
让我喵喵 - 会员解锁(订阅版)
解锁会员权益 - 订阅模式
*/

let obj = {
    "code": 200,
    "msg": "success",
    "data": {
        "userId": 1145141919,
        "nickname": "年度订阅会员",
        "avatar": "",
        "phone": "",
        "vip": true,
        "vipLevel": "SUBSCRIPTION",
        "isVip": true,
        "subscription": {
            "status": "active",
            "autoRenew": true,
            "productType": "yearly",
            "expireTime": "2027-06-24 23:59:59",
            "startTime": "2026-06-24 00:00:00",
            "renewCount": 99,
            "platform": "ios"
        },
        "expireTime": "2027-06-24 23:59:59",
        "startTime": "2026-06-24 00:00:00",
        "vipDay": 365,
        "totalVipDay": 9999,
        "member": {
            "status": 1,
            "level": 3,
            "expire": "2027-06-24 23:59:59",
            "subscriptionType": "yearly",
            "autoRenew": true
        }
    }
};

$done({ body: JSON.stringify(obj) });
