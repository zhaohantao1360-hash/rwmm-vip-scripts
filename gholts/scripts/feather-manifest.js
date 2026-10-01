const params = parseQuery($request.url);
const required = ["bundleid", "name", "version", "fetchurl"];
const missing = required.filter((key) => !params[key]);
const localPayload = /^http:\/\/127\.0\.0\.1:[0-9]+\/[^?#]+\.ipa$/.test(
    params.fetchurl || "",
);

if (missing.length || !localPayload) {
    $done({
        response: {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
            body: missing.length
                ? `Missing query fields: ${missing.join(", ")}`
                : "Enable Feather's Only use localhost address option",
        },
    });
} else {
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "application/xml; charset=utf-8",
                "Cache-Control": "no-store",
            },
            body: manifest(params),
        },
    });
}

function parseQuery(url) {
    const result = {};
    const query = String(url).split("?", 2)[1] || "";

    for (const item of query.split("&")) {
        if (!item) continue;
        const separator = item.indexOf("=");
        const key = decode(separator < 0 ? item : item.slice(0, separator));
        const value = decode(separator < 0 ? "" : item.slice(separator + 1));
        if (key) result[key] = value;
    }

    return result;
}

function decode(value) {
    try {
        return decodeURIComponent(String(value).replace(/\+/g, " "));
    } catch {
        return String(value);
    }
}

function xml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function manifest({ bundleid, name, version, fetchurl }) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
<key>items</key>
<array>
<dict>
<key>assets</key>
<array>
<dict>
<key>kind</key>
<string>software-package</string>
<key>url</key>
<string>${xml(fetchurl)}</string>
</dict>
</array>
<key>metadata</key>
<dict>
<key>bundle-identifier</key>
<string>${xml(bundleid)}</string>
<key>bundle-version</key>
<string>${xml(version)}</string>
<key>kind</key>
<string>software</string>
<key>title</key>
<string>${xml(name)}</string>
</dict>
</dict>
</array>
</dict>
</plist>`;
}
