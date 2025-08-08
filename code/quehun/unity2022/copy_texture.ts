import * as fs from "fs";
import * as path from "path";
import * as ProgressBar from "progress";

//20414, 11227
type KeyMap<T> = { [key: string]: T; };

const rootDir: string = "D:/liqi/liqi_unity_project_dev/Assets/MyAssets/";
const subDirs = ["ui", "extendRes"];
const targetDir: string = "D:/liqi/liqi_unity2022_pic/MyAssets/";

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

function getAllDir(dirPath: string, absolute?: boolean, filter?: (name: string) => boolean, map?: (name: string) => string) {
    if (fs.existsSync(dirPath) == false) return [];
    const dirs: string[] = [];
    fs.readdirSync(dirPath).forEach(filename => {
        const filePath = path.resolve(dirPath, filename);
        const state = fs.statSync(filePath);
        if (state.isDirectory()) {
            if (!filter || filter(filename)) {
                const temp = map ? map(filename) : filename;
                absolute ? dirs.push(path.resolve(dirPath, temp)) : dirs.push(temp);
            }
            dirs.push(...getAllDir(filePath, absolute, filter, map));
        }
    });
    return dirs;
}

function copyTex() {
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
}
// copyTex();

function findSameNameFile(dirPath: string) {
    const filemap = {};
    fs.readdirSync(dirPath).forEach(filename => {
        const filePath = path.resolve(dirPath, filename);
        const state = fs.statSync(filePath);
        if (state.isDirectory()) {
            findSameNameFile(filePath);
        } else if (state.isFile()) {
            const fname = path.basename(filename, path.extname(filename));
            if (filemap[fname])
                console.log("重名文件：" + filePath);
            else {
                filemap[fname] = 1;
            }
        }
    });
}
// findSameNameFile(targetDir);


function find2022PicAllTexGUID() {
    // const checkDir = "D:\\liqi\\liqi_unity2022_pic\\MyAssets\\extendRes\\background\\beijing_22summer";
    // const checkDir = "D:\\liqi\\liqi_unity2022_pic\\MyAssets\\extendRes\\badge\\common";
    const checkDir = targetDir;
    const allTexMeta = getAllFile(
        checkDir,
        true,
        v => v.endsWith(".png.meta") || v.endsWith(".jpg.meta")
    ).filter(v =>
        !v.includes("\\extendRes\\background\\")
        && !v.includes("pic_scattered")
        && !v.includes("\\texture\\")
        && !v.includes("DevDebug")
        && !v.includes("\\effect\\")
    );
    const texGUIDMap = {};
    const bar = new ProgressBar(':bar :current/:total :percent :etas', { total: allTexMeta.length });
    allTexMeta.forEach((v, i) => {
        const vContent = fs.readFileSync(v).toString();
        vContent.replace(/(guid: )[0-9a-zA-Z]{32}/g, (subStr) => {
            const guid = subStr.replace("guid: ", "");
            const tPath = path.relative(targetDir, v).replace(".png.meta", "").replace(".jpg.meta", "").replace(/\\/g, "/");
            texGUIDMap[tPath] = guid;
            return subStr;
        });
        bar.tick();
    });
    fs.writeFileSync(
        "code/quehun/unity2022/2022pic_tex_guid_map.json",
        JSON.stringify(texGUIDMap, null, 4)
    );
}
// find2022PicAllTexGUID();

class SpriteGUID {
    public content: string;
    public fileID: string;
    public guid: string;
    public type: string;
    constructor(str: string) {
        this.content = str;
        const t = str.substring(str.indexOf("{") + 1, str.indexOf("}"));
        const tArr = t.split(", ");
        this.fileID = tArr[0].split(": ")[1];
        this.guid = tArr[1].split(": ")[1];
        this.type = tArr[2].split(": ")[1];
    }

    toString() {
        return `m_Sprite: {fileID: ${ this.fileID }, guid: ${ this.guid }, type: ${ this.type }}`;
    }
}
function replacePrefabSpriteID() {
    const guidMap = JSON.parse(fs.readFileSync("code/quehun/unity2022/guid_map.json").toString());
    const allPrefabs = [
        ...getAllFile(path.join(rootDir, "ui"), true, v => v.endsWith(".prefab"))
    ];
    const mSpriteMap: KeyMap<string[]> = {};
    const bar = new ProgressBar(':bar :current/:total :percent :etas', { total: allPrefabs.length });
    allPrefabs.forEach(v => {
        let fileContent = fs.readFileSync(v).toString();
        const mathes = fileContent.matchAll(/m_Sprite: \{(.*)?\}/g);
        const tPath = path.relative(rootDir, v);
        mSpriteMap[tPath] = [];
        for (const e of mathes) {
            if (e[0] == "m_Sprite: {fileID: 0}") continue;
            if (mSpriteMap[tPath].includes(e[0])) continue;
            mSpriteMap[tPath].push(e[0]);
            const guidInfo = new SpriteGUID(e[0]);
            if (guidMap[guidInfo.guid]) {
                const oldGUID = guidInfo.guid;
                guidInfo.guid = guidMap[oldGUID][0];
                guidInfo.fileID = guidMap[oldGUID][1];
                fileContent = fileContent.replace(new RegExp(e[0], "g"), guidInfo.toString());
            }
        }
        fs.writeFileSync(v, fileContent);
        bar.tick();
    });


    // fs.writeFileSync(
    //     "code/quehun/unity2022/mSpriteMap.json",
    //     JSON.stringify(mSpriteMap, null, 4)
    // );
}
// replacePrefabSpriteID();

function copyPicScatteredToGame() {
    const dirs = getAllDir(
        targetDir,
        true,
        v => v == "pic_scattered"
    ).map(v => v.replace(/\\/g, "/"));
    dirs.forEach(v => {
        const tPath = v.replace(targetDir, "");
        const gamePath = rootDir + tPath;
        console.log(gamePath);
    });
    console.log(dirs[0]);
}
// copyPicScatteredToGame();


function CreateExtendResDir() {
    const resDir = "D:\\liqi\\majsoul-extendres\\audio\\deco";
    const allMp3 = getAllFile(
        resDir, true,
        v => v.endsWith(".mp3")
    );
    allMp3.forEach(v => {
        const arr = v.split("\\");
        const filename = arr.pop();
        arr.pop();
        const deleteDir = arr.join("\\");
        arr.pop();
        arr.push(filename);
        const targetPath = arr.join("\\");
        fs.renameSync(v, targetPath);
        if (fs.existsSync(deleteDir))
            fs.rm(deleteDir, { recursive: true }, null);
    });
}
// CreateExtendResDir();

function findAllMaterial() {
    // // const checkDir = rootDir;
    // const checkDir = "D:/liqi/liqi_unity_project_dev_test/Assets/MyAssets/";
    // const allMaterialMeta = getAllFile(
    //     checkDir, true,
    //     v => v.endsWith(".mat.meta")
    // );
    // const allMaterialMap = { count: 0 };
    // allMaterialMeta.forEach(v => {
    //     const relativePath = path.relative(checkDir, v);
    //     const vContent = fs.readFileSync(v).toString();
    //     const matched = vContent.match(/(guid: )[0-9a-zA-Z]{32}/);
    //     const guid = matched[0].replace("guid: ", "");
    //     allMaterialMap[guid] = relativePath;
    // });
    // allMaterialMap.count = Object.keys(allMaterialMap).length - 1;
    // fs.writeFileSync(
    //     // "code/quehun/unity2022/mat_2022.json",
    //     "code/quehun/unity2022/mat_test.json",
    //     JSON.stringify(allMaterialMap, null, 4)
    // );

    const dir2022 = rootDir;
    const dirTest = "D:/liqi/liqi_unity_project_dev_test/Assets/MyAssets/";
    const mat_2022 = JSON.parse(fs.readFileSync("code/quehun/unity2022/mat_2022.json").toString());
    const mat_test = JSON.parse(fs.readFileSync("code/quehun/unity2022/mat_test.json").toString());

    for (const key in mat_2022) {
        const v = mat_2022[key];
        const mPath2022 = path.join(dir2022, v);
        const mPathTest = path.join(dirTest, mat_test[key]);
        const mContent2022 = fs.readFileSync(mPath2022).toString();
        const mContentTest = fs.readFileSync(mPathTest).toString();

        const matched2022_DstBlend = mContent2022.match(/.*(- _DstBlend: ).*/g)[0];
        const matched2022_SrcBlend = mContent2022.match(/.*(- _SrcBlend: ).*/g)[0];
        const matched2022_ZTest = mContent2022.match(/.*(- _ZTest: ).*/g)[0];
        const matched2022_ZWrite = mContent2022.match(/.*(- _ZWrite: ).*/g)[0];

        const matchedTest_DstBlend = mContentTest.match(/.*(- _DstBlend: ).*/g)[0];
        const matchedTest_SrcBlend = mContentTest.match(/.*(- _SrcBlend: ).*/g)[0];
        const matchedTest_ZTest = mContentTest.match(/.*(- _ZTest: ).*/g)[0];
        const matchedTest_ZWrite = mContentTest.match(/.*(- _ZWrite: ).*/g)[0];

        const newContent2022 = mContent2022
            .replace(matched2022_DstBlend, matchedTest_DstBlend)
            .replace(matched2022_SrcBlend, matchedTest_SrcBlend)
            .replace(matched2022_ZTest, matchedTest_ZTest)
            .replace(matched2022_ZWrite, matchedTest_ZWrite);
        fs.writeFileSync(mPath2022, newContent2022);
        // const matchedTest = mContentTest.match(/.*(- _DstBlend: ).*/g)[0];
        // let count = 0;
        // for (const e of matched2022) {
        //     count++;
        // }
        // if(count != 1)
        //     console.log(1, v);
        // count = 0;
        // for (const e of matchedTest) {
        //     count++;
        // }
        // if(count != 1)
        //     console.log(2, v);
    }
    //effect_liqi_23winter
    //ron_akagi
}
findAllMaterial();
