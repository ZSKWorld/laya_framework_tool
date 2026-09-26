import * as exec from "node:child_process";
import * as fs from "node:fs";
import * as http from "node:http";
import * as https from "node:https";
import * as path from "node:path";
import { RemoveDir } from "../Utils";

const RootDir = path.resolve(__dirname);
const BundleDir = path.join(RootDir, "data/bundles");
const BundleTempDir = path.join(RootDir, "data/bundles_temp");
const ExtractDir = path.join(RootDir, "data/extract");
const GameUrl = "https://game.maj-soul.com/assetbundles/DXT";
const BundleHashUrl = path.join(GameUrl, "bundle_hash.txt");
const BundleInfoUrl = path.join(GameUrl, "bundle_info_so.majset");
const BundleInfoPath = path.join(RootDir, "bundle_info.majset");
const BundleHashPath = path.join(RootDir, "bundle_hash.txt");
const BundleInfoJsonPath = path.join(RootDir, "MonoBehaviour/BundleInfoSO.json");

if (!fs.existsSync(BundleDir)) fs.mkdirSync(BundleDir, { recursive: true });
if (!fs.existsSync(BundleTempDir)) fs.mkdirSync(BundleTempDir, { recursive: true });
if (!fs.existsSync(ExtractDir)) fs.mkdirSync(ExtractDir, { recursive: true });

var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
        var fulfilled = (value) => {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        };
        var rejected = (value) => {
            try {
                step(generator.throw(value));
            } catch (e) {
                reject(e);
            }
        };
        var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
        step((generator = generator.apply(__this, __arguments)).next());
    });
};

function download(url: string, dest: string, redirectCount = 0): Promise<void> {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) {
            return reject(new Error("Too many redirects"));
        }

        const client = url.startsWith("https") ? https : http;
        const req = client.get(
            url,
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
                    // 如果需要防盗链，把 Referer 填成游戏页面地址：
                    // Referer: "https://game.maj-soul.com/",
                },
            },
            (res) => {
                // 处理重定向
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const nextUrl = new URL(res.headers.location, url).toString();
                    res.resume();
                    return resolve(download(nextUrl, dest, redirectCount + 1));
                }

                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`下载失败，HTTP 状态码: ${ res.statusCode }`));
                }

                // 确保目录存在
                fs.mkdirSync(path.dirname(dest), { recursive: true });

                // //获取res的内容
                // const data: Buffer[] = [];
                // res.on("data", (chunk) => {
                //     data.push(chunk);
                // });

                const fileStream = fs.createWriteStream(dest);
                res.pipe(fileStream);

                fileStream.on("finish", () => {
                    fileStream.close();
                    // console.log(`✅ 下载完成: ${ dest }`);
                    resolve();
                });

                fileStream.on("error", (err) => {
                    fs.unlink(dest, () => { });
                    reject(err);
                });
            }
        );

        req.on("error", reject);
        req.setTimeout(30_000, () => {
            req.destroy(new Error("请求超时"));
        });
    });
}

function downloadTxt(url: string, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) {
            return reject(new Error("Too many redirects"));
        }

        const client = url.startsWith("https") ? https : http;
        const req = client.get(
            url,
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
                    // 如果需要防盗链，把 Referer 填成游戏页面地址：
                    // Referer: "https://game.maj-soul.com/",
                },
            },
            (res) => {
                // 处理重定向
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const nextUrl = new URL(res.headers.location, url).toString();
                    res.resume();
                    return resolve(downloadTxt(nextUrl, redirectCount + 1));
                }

                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`下载失败，HTTP 状态码: ${ res.statusCode }`));
                }


                //获取res的文本内容
                const data: Buffer[] = [];
                res.on("data", (chunk) => {
                    data.push(chunk);
                });

                res.on("end", () => {
                    const file = Buffer.concat(data).toString('utf-8');
                    resolve(file);
                });
            }
        );

        req.on("error", reject);
        req.setTimeout(30_000, () => {
            req.destroy(new Error("请求超时"));
        });
    });
}

function getAllBundlePathMap(): [number, { path: string, size: number; }[]] {
    if (!fs.existsSync(BundleInfoJsonPath)) return [0, []];
    const buffer = fs.readFileSync(BundleInfoJsonPath);
    // 关键：指定 utf-8 编码将 Buffer 转为字符串
    const jsonString = buffer.toString('utf-8');
    const jsonData = JSON.parse(jsonString);
    const bundlePathes = [];
    let totalSize = 0;
    jsonData.bundleInfos.forEach(v => {
        const filepath = path.join(BundleDir, path.basename(v.name));
        if (!fs.existsSync(filepath)) {
            totalSize += v.fileSize;
            bundlePathes.push({ path: path.join(GameUrl, v.name), size: v.fileSize });
        }
    });
    return [totalSize, bundlePathes];
}

function getSizeDesc(size: number) {
    if (size < 1024) return `${ size }B`;
    if (size < 1024 * 1024) return `${ (size / 1024).toFixed(2) }KB`;
    if (size < 1024 * 1024 * 1024) return `${ (size / 1024 / 1024).toFixed(2) }MB`;
    return `${ (size / 1024 / 1024 / 1024).toFixed(2) }GB`;
}

function extracBundleInfo() {
    return download(BundleInfoUrl, BundleInfoPath).then(() => {
        const cmd = [
            "C:/Users/Administrator/Desktop/AssetStudio-net8.0-win/AssetStudio.CLI.exe",
            BundleInfoPath,
            RootDir,
            "--unity_version", "2022.3.62f2c1",
            "--game", "Normal",
        ].join(" ");
        exec.execSync(cmd, { maxBuffer: 1024 * 1024 * 200 });
    });
}

function downloadBundles() {
    const [totalSize, allBundlePath] = getAllBundlePathMap();
    console.log("bundle下载数量为：" + allBundlePath.length);
    if (!allBundlePath.length) {
        return Promise.resolve(false);
    }
    let totalSizeDesc = getSizeDesc(totalSize);
    let downloadSize = 0;
    return __async(this, null, function* () {
        const downloadDelta = 20;
        for (let i = 0; i < allBundlePath.length; i += downloadDelta) {
            yield Promise.all(allBundlePath.slice(i, i + downloadDelta).map(info => download(info.path, path.join(BundleTempDir, path.basename(info.path)))));
            downloadSize += allBundlePath.slice(i, i + downloadDelta).reduce((a, b) => a + b.size, 0);
            console.log(`下载${ i + downloadDelta }/${ allBundlePath.length }： ${ getSizeDesc(downloadSize) } / ${ totalSizeDesc }`);
        }
        return true;
    });
}

function extractBundleByType(type: string) {
    const cmd = [
        "C:/Users/Administrator/Desktop/AssetStudio-net8.0-win/AssetStudio.CLI.exe",
        BundleTempDir,
        ExtractDir,
        "--unity_version", "2022.3.62f2c1",
        "--game", "Normal",
        "--types", type,
        "--group_assets", "ByContainer",
        "--silent",
    ].join(" ");
    exec.execSync(cmd, { maxBuffer: 1024 * 1024 * 200 });
}

function extractBundles() {
    console.log("提取bundle资源......");
    extractBundleByType("Sprite");
    extractBundleByType("Texture2D");
    extractBundleByType("TextAsset");

    fs.readdirSync(BundleTempDir).forEach(v => {
        fs.copyFileSync(path.join(BundleTempDir, v), path.join(BundleDir, v));
    });
    RemoveDir(BundleTempDir);
}

downloadTxt(BundleHashUrl).then((v: string) => {
    var oldHash = "";
    if (fs.existsSync(BundleHashPath)) {
        oldHash = fs.readFileSync(BundleHashPath, "utf8");
    }
    if (oldHash != v) {
        fs.writeFileSync(BundleHashPath, v);
        console.log("有bunlde更新，开始下载：");
        extracBundleInfo().then(() => {
            downloadBundles().then((success) => {
                success && extractBundles();
                console.log("资源更新完毕！");
            });
        });
    } else {
        console.log("已是最新bundle");
    }
});
