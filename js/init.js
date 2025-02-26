// 全局变量
var G = {};
// 缓存数据
var cacheData = { init: true };
var refererData = [];
// 当前tabID
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0] && tabs[0].id) {
        G.tabId = tabs[0].id;
    }
});
// 所有设置变量 默认值
G.OptionLists = {
    Ext: [
        { "ext": "flv", "size": 0, "state": true },
        { "ext": "hlv", "size": 0, "state": true },
        { "ext": "f4v", "size": 0, "state": true },
        { "ext": "mp4", "size": 0, "state": true },
        { "ext": "mp3", "size": 0, "state": true },
        { "ext": "wma", "size": 0, "state": true },
        { "ext": "wav", "size": 0, "state": true },
        { "ext": "m4a", "size": 0, "state": true },
        { "ext": "letv", "size": 0, "state": true },
        { "ext": "ts", "size": 0, "state": true },
        { "ext": "webm", "size": 0, "state": true },
        { "ext": "ogg", "size": 0, "state": true },
        { "ext": "ogv", "size": 0, "state": true },
        { "ext": "acc", "size": 0, "state": true },
        { "ext": "mov", "size": 0, "state": true },
        { "ext": "mkv", "size": 0, "state": true },
        { "ext": "m4s", "size": 0, "state": true },
        { "ext": "m3u8", "size": 0, "state": true },
        { "ext": "m3u", "size": 0, "state": true },
        { "ext": "mpeg", "size": 0, "state": true },
        { "ext": "avi", "size": 0, "state": true },
        { "ext": "wmv", "size": 0, "state": true },
        { "ext": "asf", "size": 0, "state": true },
        { "ext": "movie", "size": 0, "state": true },
        { "ext": "divx", "size": 0, "state": true },
        { "ext": "mpeg4", "size": 0, "state": true },
        { "ext": "vid", "size": 0, "state": true },
        { "ext": "aac", "size": 0, "state": true },
        { "ext": "mpd", "size": 0, "state": true }
    ],
    Type: [
        { "type": "audio/*", "size": 0, "state": true },
        { "type": "video/*", "size": 0, "state": true },
        { "type": "application/ogg", "size": 0, "state": true },
        { "type": "application/vnd.apple.mpegurl", "size": 0, "state": true },
        { "type": "application/x-mpegurl", "size": 0, "state": true },
        { "type": "application/mpegurl", "size": 0, "state": true },
        { "type": "application/octet-stream-m3u8", "size": 0, "state": true },
        { "type": "application/dash+xml", "size": 0, "state": true },
        { "type": "application/m4s", "size": 0, "state": true }
    ],
    Regex: [
        { "type": "ig", "regex": ".*vurl=([^&]*)", "ext": "m3u8", "state": true },
        { "type": "ig", "regex": "/getvinfo\\?", "ext": "json", "state": true },
        { "type": "ig", "regex": "https://cache\\.video\\.[a-z]*\\.com/dash\\?tvid=.*", "ext": "json", "state": true }
    ],
    TitleName: false,
    OtherAutoClear: 100,
    Player: "",
    ShowWebIco: true,
    MobileUserAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
    m3u8dl: false,
    m3u8dlArg: `"\${url}" --workDir "%USERPROFILE%\\Downloads\\m3u8dl" --saveName "\${title}_\${now}" --enableDelAfterDone \${referer|exists:'--headers "Referer:*"'}`,
    playbackRate: 2,
    copyM3U8: "${url}",
    copyMPD: `ffmpeg \${referer|exists:'-headers "referer: *"'} -i "\${url}" -c copy "\${title}_\${now}.mp4"`,
    copyOther: "${url}",
    refreshClear: true,
    initComplete: true,
    youtube: false,
    catDownload: false,
    saveAs: false,
    userAgent: "",
    downFileName: "${title}.${ext}",
    css: "",
};
G.TabIdList = {
    featMobileTabId: [],
    featAutoDownTabId: [],
    mediaControl: { tabid: 0, index: -1 },
};

// Init
InitOptions();

// 102版本以上 非Firefox 开启更多功能
// G.isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
G.isFirefox = false;
G.version = 93;
if (navigator.userAgent.includes("Chrome/")) {
    const version = navigator.userAgent.match(/Chrome\/([\d]+)/);
    if (version && version[1]) {
        G.version = parseInt(version[1]);
    }
} else if (navigator.userAgent.includes("Firefox/")) {
    G.isFirefox = true;
}

// 脚本列表
G.scriptList = new Map();
G.scriptList.set("search.js", { key: "search", refresh: true, allFrames: true, world: "MAIN", name: "深度搜索", tabId: new Set() });
G.scriptList.set("catch.js", { key: "catch", refresh: true, allFrames: true, world: "MAIN", name: "缓存捕捉", tabId: new Set() });
G.scriptList.set("recorder.js", { key: "recorder", refresh: false, allFrames: true, world: "MAIN", name: "视频录制", tabId: new Set() });
G.scriptList.set("recorder2.js", { key: "recorder2", refresh: false, allFrames: false, world: "ISOLATED", name: "屏幕捕捉", tabId: new Set() });

// ffmpeg
const ffmpeg = {
    tab: 0,
    url: "https://ffmpeg.bmmmd.com/",
}

// 正则预编译
const reProtocol = /^[\w]+:\/\/.+/i;
const reFilename = /filename="?([^"]+)"?/;
const reRange = /([\d]+)-([\d]+)\/([\d]+)/;
const reYoutube = /&(range|rbuf|rn|cver|altitags|pot|fallback_count|sq)=[^&]*/g;
const reStringModify = /['\\:\*\?"<\/>\|~]/g;

// 防抖
let debounce = undefined;
let debounceCount = 0;

// 初始变量
function InitOptions() {
    // 断开重新连接后 立刻把local里MediaData数据交给cacheData
    chrome.storage.local.get({ MediaData: {} }, function (items) {
        if (items.MediaData.init) {
            cacheData = {};
            return;
        }
        cacheData = items.MediaData;
    });
    // 读取sync配置数据 交给全局变量G
    chrome.storage.sync.get(G.OptionLists, function (items) {
        // Ext的Array转为Map类型
        items.Ext = new Map(items.Ext.map(item => [item.ext, item]));
        G = { ...items, ...G };
    });
    // 读取local配置数据 交给全局变量G
    chrome.storage.local.get(G.TabIdList, function (items) {
        G = { ...items, ...G };
    });
}
// 监听变化，新值给全局变量
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (changes.MediaData) {
        if (changes.MediaData.newValue?.init) { cacheData = {}; }
        return;
    }
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (key == "Ext") {
            G.Ext = new Map(newValue.map(item => [item.ext, item]));
            continue;
        }
        G[key] = newValue;
    }
});
// 扩展升级，清空本地储存
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "update") {
        chrome.storage.local.clear(function () {
            InitOptions();
        });
        chrome.alarms.create("nowClear", { when: Date.now() + 3000 });
    }
});

// 清理冗余数据
function clearRedundant() {
    // console.log("clearRedundant");
    chrome.tabs.query({}, function (tabs) {
        let allTabId = [-1];    // 初始化一个-1 防止断开sw重连后 幽灵数据丢失
        for (let item of tabs) {
            allTabId.push(item.id);
        }
        if (!cacheData.init) {
            // 清理 缓存数据
            for (let key in cacheData) {
                if (!allTabId.includes(parseInt(key))) {
                    delete cacheData[key];
                }
            }
            chrome.storage.local.set({ MediaData: cacheData });
        }
        // 清理 declarativeNetRequest
        chrome.declarativeNetRequest.getSessionRules(function (rules) {
            for (let item of rules) {
                if (!allTabId.includes(item.id)) {
                    chrome.declarativeNetRequest.updateSessionRules({
                        removeRuleIds: [item.id]
                    });
                }
            }
        });
        // 清理脚本
        G.scriptList.forEach(function (scriptList) {
            scriptList.tabId.forEach(function (tabId) {
                if (!allTabId.includes(tabId)) {
                    scriptList.tabId.delete(tabId);
                }
            });
        });
    });
    refererData = [];
}

// 替换掉不允许的文件名称字符
function stringModify(str) {
    if (!str) { return str; }
    return str.replace(reStringModify, function (m) {
        return {
            "'": '&#39;',
            '\\': '&#92;',
            '/': '&#47;',
            ':': '&#58;',
            '*': '&#42;',
            '?': '&#63;',
            '"': '&quot;',
            '<': '&lt;',
            '>': '&gt;',
            '|': '&#124;',
            '~': '_'
        }[m];
    });
}