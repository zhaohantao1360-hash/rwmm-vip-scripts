/*
  PingMe 签到（Egern 版）
  基于 fmz200/wool_scripts 原版逻辑的本地优化版，与 Loon 版同源（muse 维护）
  https://raw.githubusercontent.com/zhaohantao1360-hash/rwmm-vip-scripts/refs/heads/main/PingMeSignin_egern.js

  相对 mickeu/huangkouping 旧版的变化：
   1. 不再每轮伪造设备 ID，全程使用抓到的真实设备 ID（旧版伪造设备是触发服务端风控的主因）
   2. 网络抖动自动重试（3 次，退避 1.5s）+ 15s 请求超时；重试仅用于只读的余额查询，
      签到/视频接口不重试（重试会带上新的时间戳+随机数，服务端会当成新的次数）
   3. 视频失败分类：验证码/次数上限优雅停止并提示，不再一刀切
   4. 签到成功或服务端确认已签过后记下日期，当天后续轮次跳过 checkIn（每天只调一次）
   5. 通知首行显示本次收益合计

  存储 key 与抓参脚本共用 pingme_capture_v3（与旧版抓参格式兼容，无需重新抓参）
*/

const ckKey = 'pingme_capture_v3';
const SECRET = '0fOiukQq7jXZV2GRi9LGlO';
const MAX_VIDEO = 5;
const VIDEO_DELAY = 8000;
const NETWORK_RETRIES = 3;
const RETRY_DELAY = 1500;
const REQ_TIMEOUT = 15000;
const CHECKIN_FLAG = 'pingme_checkin_done_v1';
const NOTIFY_ICON = 'https://raw.githubusercontent.com/axhani/icon/refs/heads/main/pingme&wetalk.png';

export default async function(ctx) {
  const logs = [];
  const notify = (msg) => logs.push(msg);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function localToday() {
    const n = new Date(), p = x => String(x).padStart(2, '0');
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
  }

  function isNetworkError(err) {
    const m = (err && (err.error || err.message)) || String(err || '');
    return /timeout|timed out|超时|SSL|reset|connection|network|stream closed|closed|EOF|abort/i.test(m);
  }

  async function httpGet(url, headers) {
    const p = ctx.http.get(url, { headers }).then(r => r.json());
    return Promise.race([
      p,
      sleep(REQ_TIMEOUT).then(() => { throw new Error('请求超时'); })
    ]);
  }

  async function fetchApi(path, capture, headers, retry) {
    retry = (retry === undefined) ? NETWORK_RETRIES : retry;
    try {
      return await httpGet(buildUrl(path, capture), headers);
    } catch (err) {
      if (retry > 0 && isNetworkError(err)) {
        console.log(`网络抖动，${RETRY_DELAY}ms 后重试 (${NETWORK_RETRIES - retry + 1}/${NETWORK_RETRIES})：${path}`);
        await sleep(RETRY_DELAY);
        return fetchApi(path, capture, headers, retry - 1);
      }
      throw err;
    }
  }

  try {
    const raw = ctx.storage.get(ckKey);
    if (!raw) {
      ctx.notify({ title: '❌ PingMe签到', body: '请先打开 PingMe App 触发一次余额查询以抓取参数' });
      return;
    }
    let capture;
    try { capture = JSON.parse(raw); }
    catch (e) {
      ctx.notify({ title: '❌ PingMe签到', body: '签到参数损坏，请重新打开 PingMe 抓参' });
      return;
    }

    console.log('PingMe签到，开始！');
    notify('开始运行签到');
    const headers = buildHeaders(capture);
    let beforeBalance = null;

    // 1. 查询余额（只读，允许重试）
    try {
      const d = await fetchApi('queryBalanceAndBonus', capture, headers);
      if (d.retcode === 0) {
        beforeBalance = parseFloat(d.result.balance);
        const line = `💰 运行前余额：${d.result.balance} Coins`;
        console.log(line); notify(line);
      } else {
        const line = `⚠️ 查询：${d.retmsg}`;
        console.log(line); notify(line);
      }
    } catch (e) {
      const line = '❌ 查询余额失败';
      console.log(line); notify(line);
    }

    // 2. 签到（不重试；今日已签过则跳过）
    if (ctx.storage.get(CHECKIN_FLAG) === localToday()) {
      const line = '⏭ 签到：今日已签过，跳过';
      console.log(line); notify(line);
    } else {
      try {
        const d = await fetchApi('checkIn', capture, headers, 0);
        const msg = ((d.result && d.result.bonusHint) || d.retmsg || '').replace(/\n/g, ' ');
        if (d.retcode === 0) {
          const line = `✅ 签到：${msg}`;
          console.log(line); notify(line);
          ctx.storage.set(CHECKIN_FLAG, localToday());
        } else if (/已经签过|已签到/i.test(d.retmsg || '')) {
          const line = `⚠️ 签到：${d.retmsg}`;
          console.log(line); notify(line);
          ctx.storage.set(CHECKIN_FLAG, localToday());
        } else {
          const line = `⚠️ 签到：${d.retmsg}`;
          console.log(line); notify(line);
        }
      } catch (e) {
        const line = '❌ 签到请求失败';
        console.log(line); notify(line);
      }
    }

    // 3. 视频奖励（不重试；失败即停，验证码/上限优雅停止）
    for (let i = 1; i <= MAX_VIDEO; i++) {
      await sleep(i === 1 ? 1500 : VIDEO_DELAY);
      try {
        const d = await fetchApi('videoBonus', capture, headers, 0);
        if (d.retcode === 0) {
          const line = `🎬 视频${i}：+${(d.result && d.result.bonus) || '?'} Coins`;
          console.log(line); notify(line);
        } else if (/验证码|captcha/i.test(d.retmsg || '')) {
          const line = `⏸ 视频${i}：${d.retmsg}（需手动完成）`;
          console.log(line); notify(line);
          break;
        } else {
          const line = `⏸ 视频${i}：${d.retmsg}`;
          console.log(line); notify(line);
          break;
        }
      } catch (e) {
        const line = `❌ 视频${i}：请求失败`;
        console.log(line); notify(line);
        break;
      }
    }

    // 4. 最终余额 + 汇总通知
    try {
      const d = await fetchApi('queryBalanceAndBonus', capture, headers);
      if (d.retcode === 0) {
        const after = parseFloat(d.result.balance);
        let line = `💰 最新余额：${d.result.balance} Coins`;
        if (beforeBalance !== null && !isNaN(after)) {
          line += `（本次 +${(after - beforeBalance).toFixed(3)}）`;
        }
        logs.unshift(line);
      }
    } catch (e) { /* ignore */ }

    ctx.notify({
      title: '🎉 PingMe签到完成',
      body: logs.join('\n'),
      sound: true,
      attachment: { url: NOTIFY_ICON, mimeType: 'png' }
    });
  } catch (err) {
    ctx.notify({
      title: '❌ PingMe签到失败',
      body: logs.join('\n') + '\n' + (err.message || String(err)),
      sound: true
    });
  }
}

function buildUrl(path, capture) {
  const params = {};
  Object.keys(capture.paramsRaw || {}).forEach(k => {
    if (k !== 'sign' && k !== 'signDate') params[k] = capture.paramsRaw[k];
  });
  // 刷新防重放字段（存在才换）；真实设备 ID 原样保留，不伪造
  if ('timestamp' in params) params.timestamp = Math.floor(Date.now() / 1000);
  if ('nonce' in params) params.nonce = Math.random().toString(36).slice(2, 10);
  params.signDate = getUTCSignDate();
  const signBase = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  params.sign = MD5(signBase + SECRET);
  const qs = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
  return `https://api.pingmeapp.net/app/${path}?${qs}`;
}

function buildHeaders(capture) {
  const headers = {};
  Object.keys(capture.headers || {}).forEach(k => {
    if (!['content-length', ':authority', ':method', ':path', ':scheme'].includes(k)) {
      headers[k] = capture.headers[k];
    }
  });
  headers['Host'] = 'api.pingmeapp.net';
  headers['Accept'] = headers['Accept'] || 'application/json';
  return headers;
}

function getUTCSignDate() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
}

function MD5(string) {
  function RotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
  function AddUnsigned(lX, lY) {
    const lX4 = lX & 0x40000000, lY4 = lY & 0x40000000, lX8 = lX & 0x80000000, lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) return (lResult & 0x40000000) ? (lResult ^ 0xC0000000 ^ lX8 ^ lY8) : (lResult ^ 0x40000000 ^ lX8 ^ lY8);
    return lResult ^ lX8 ^ lY8;
  }
  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | (~z)); }
  function FF(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function GG(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function HH(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function II(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function ConvertToWordArray(str) {
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1).fill(0);
    let lBytePosition = 0, lByteCount = 0;
    while (lByteCount < lMessageLength) {
      const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] |= str.charCodeAt(lByteCount) << lBytePosition;
      lByteCount++;
    }
    const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] |= 0x80 << lBytePosition;
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function WordToHex(lValue) {
    let WordToHexValue = '', WordToHexValue_temp = '', lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = '0' + lByte.toString(16);
      WordToHexValue += WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }
  let x = [];
  let k, AA, BB, CC, DD, a, b, c, d;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;
  x = ConvertToWordArray(string);
  a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
  for (k = 0; k < x.length; k += 16) {
    AA = a; BB = b; CC = c; DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = AddUnsigned(a, AA); b = AddUnsigned(b, BB); c = AddUnsigned(c, CC); d = AddUnsigned(d, DD);
  }
  return (WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)).toLowerCase();
}
