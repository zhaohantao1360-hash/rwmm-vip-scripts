/*
让我喵喵 - 会员解锁脚本 (v3)
作者: 哎呀漫鸭
改写: AI Assistant

更新日志:
- 2026/06/24: v2 修复逻辑错误，增加原始响应记录
- 2026/10/01: v3 就地修改原始响应的 VIP 字段（保留真实 userId/昵称/头像，不再整段伪造）；
              脚本内增加 URL 路径检查，非用户信息接口原样放行；
              原始响应解析失败时回退到伪造 VIP 数据。

原理: 拦截 www.pdreamer.com 的用户信息接口，把 data 里的会员字段改成 SVIP。
*/

(function () {
    const url = $request.url;
    const path = url.split('?')[0].toLowerCase();

    // 只处理用户信息类接口，其它请求原样放行（避免误伤会员页/购买页等）
    if (!/getuserinfo|userinfo/.test(path)) {
        console.log('[让我喵喵v3] 非用户信息接口，原样放行: ' + url);
        $done({});
        return;
    }

    const now = new Date();
    const future = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
    const fmt = d => d.toISOString().replace('T', ' ').substring(0, 19);
    const expireTime = fmt(future);

    const rawBody = $response && $response.body;
    let obj = null;
    try {
        obj = rawBody ? JSON.parse(rawBody) : null;
    } catch (e) {
        obj = null;
    }

    let body;
    if (obj && typeof obj === 'object') {
        // 就地修改：保留服务器返回的真实用户信息，只改会员字段
        const data = (obj.data && typeof obj.data === 'object') ? obj.data : (obj.data = {});
        if ('code' in obj) obj.code = 200;
        if ('msg' in obj) obj.msg = 'success';

        Object.assign(data, {
            vip: true,
            vipLevel: 'SVIP',
            isVip: true,
            isSvip: true,
            isMember: true,
            memberType: 'svip',
            expireTime: expireTime,
            startTime: fmt(now),
            vipDay: 9999,
            totalVipDay: 9999,
            // 兼容字段
            isVipInt: 1,
            vipStatus: 1,
            memberLevel: 3,
            levelName: '超级VIP'
        });

        // member 字段做合并而非覆盖，避免破坏原有结构
        if (data.member && typeof data.member === 'object') {
            Object.assign(data.member, { status: 1, level: 3, expire: expireTime });
        } else {
            data.member = { status: 1, level: 3, expire: expireTime };
        }

        body = JSON.stringify(obj);
        console.log('[让我喵喵v3] 已就地修改原始响应，保留真实用户信息: ' + url);
    } else {
        // 回退：原始响应解析失败时伪造完整 VIP 数据
        body = JSON.stringify({
            code: 200,
            msg: 'success',
            data: {
                userId: 114514,
                nickname: 'SVIP会员',
                avatar: '',
                phone: '',
                vip: true,
                vipLevel: 'SVIP',
                isVip: true,
                isSvip: true,
                isMember: true,
                memberType: 'svip',
                expireTime: expireTime,
                startTime: fmt(now),
                vipDay: 9999,
                totalVipDay: 9999,
                isVipInt: 1,
                vipStatus: 1,
                memberLevel: 3,
                levelName: '超级VIP',
                member: { status: 1, level: 3, expire: expireTime }
            }
        });
        console.log('[让我喵喵v3] 原始响应解析失败，使用伪造 VIP 数据: ' + url);
    }

    $done({ body: body });
})();
