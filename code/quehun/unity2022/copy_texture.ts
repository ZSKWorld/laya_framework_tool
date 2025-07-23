import * as fs from "fs";
import * as path from "path";
import * as cliPro from "cli-progress";

//20414, 11227

const rootDir = "D:/liqi/liqi_unity_project_dev/Assets/MyAssets/";
const subDirs = ["ui", "extendRes"];
const targetDir = "D:/liqi/liqi_unity2022_pic/MyAssets/";

function getAllFile(dirPath: string, absolute?: boolean, filter?: (name: string) => boolean, map?: (name: string) => string) {
    if (fs.existsSync(dirPath) == false) return [];
    const names: string[] = [];
    fs.readdirSync(dirPath).forEach(filename => {
        const filePath = path.resolve(dirPath, filename);
        const state = fs.statSync(filePath);
        if (state.isDirectory()) {
            names.push(...getAllFile(filePath, absolute, filter, map));
        } else if (state.isFile()) {
            if (!filter || filter(filename)) {
                const temp = map ? map(filename) : filename;
                absolute ? names.push(path.resolve(dirPath, temp)) : names.push(temp);
            }
        }
    });
    return names;
}

console.log("开始...");
let total = 0;
// 复制图片
subDirs.forEach(subDir => {
    console.log("开始搜索文件夹：", subDir);
    const allTex = getAllFile(
        path.join(rootDir, subDir),
        true,
        fname => fname.endsWith(".png") || fname.endsWith(".jpg")
    ).map(v => v.replace(/\\/g, "/"));
    const texCount = allTex.length;
    total += texCount;
    allTex.forEach((v, i) => {
        const tPath = v.replace(rootDir, targetDir);
        const tDir = path.dirname(tPath);
        if (fs.existsSync(tDir) == false)
            fs.mkdirSync(tDir, { recursive: true });
        fs.copyFileSync(v, tPath);
        fs.copyFileSync(v + ".meta", tPath + ".meta");
        console.log(`复制进度：${ subDir } ${ i + 1 }/${ texCount }`);
    });
    console.log("文件夹 ", subDir, " 复制完毕！");
});
console.log("结束...", total);
