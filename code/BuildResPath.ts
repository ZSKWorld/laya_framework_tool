import { readdirSync, statSync, writeFileSync } from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { ResDir, ResPathDeclarePath, ResPathPath, TS_MODIFY_TIP } from "./Const";
import { UpperFirst } from "./Utils";

interface Config {
    filter: (nam: string) => boolean;
    nameReplacer?: (name: string) => string;
    name: string;
    pathName: string;
    includes: string[];
    haveName: boolean;
    haveExt: boolean;
    ignoreSubDir?: boolean;
}

export class BuildResPath extends BuildBase {
    protected _resDir = ResDir;
    protected _resPathDeclarePath = ResPathDeclarePath;
    protected _resPathPath = ResPathPath;
    protected _rootDir = "res/";
    protected _excludeFile: string[] = [];
    private _config: Config[] = [
        {
            filter: (name: string) => name.startsWith(this._rootDir + "ui/"),
            name: "PkgName",
            pathName: "PkgPath",
            includes: [".zip"],
            haveName: true,
            haveExt: false,
        },
        {
            filter: (name: string) => name.startsWith(this._rootDir + "font/"),
            name: "FontName",
            pathName: "FontPath",
            includes: [".ttf"],
            haveName: true,
            haveExt: true,
        },
        {
            filter: (name: string) => name.startsWith(this._rootDir + "skeleton/"),
            name: "SkeletonName",
            pathName: "SkeletonPath",
            includes: [".sk"],
            haveName: false,
            haveExt: true,
        },
        {
            filter: (name: string) => name.startsWith(this._rootDir + "scene/"),
            nameReplacer: (filename: string) => {
                const [name, ext] = filename.split(".");
                if (ext == "lh") return "LH_" + name;
                else if (ext == "ls") return "LS_" + name;
                else return name;
            },
            name: "SceneName",
            pathName: "ScenePath",
            includes: [".ls", ".lh"],
            haveName: false,
            haveExt: true,
            ignoreSubDir: true,
        },
    ];
    doBuild() {
        const content = this.buildResEnum(this._resDir, this._rootDir);
        const resPathContent = `${ TS_MODIFY_TIP }export namespace ResPath {\n${ content }}`;
        writeFileSync(this._resPathPath, resPathContent);
        const resPathDeclareContent = resPathContent
            .replace(new RegExp("export namespace", "g"), "declare namespace")
            .replace(new RegExp("export enum", "g"), "enum");
        writeFileSync(this._resPathDeclarePath, resPathDeclareContent);
    }

    private buildResEnum(dirPath: string, dirName: string, baseContent?: string) {
        let content = baseContent || "";
        let dirs: string[] = [];
        let files: string[] = [];
        readdirSync(dirPath).forEach(fileName => {
            const filePath = path.resolve(dirPath, fileName);
            const info = statSync(filePath);
            if (info.isDirectory()) {
                if (fileName.startsWith("$")) return;
                dirs.push(fileName);
            } else {
                if (this._excludeFile.find(v => fileName.endsWith(v))) return;
                files.push(fileName);
            }
        });
        const config = this._config.find(v => v.filter(dirName));
        if (config) {
            if (config.haveName)
                content += this.buildEnum(config.name, false, dirName, files, config.includes, config.haveExt, config.nameReplacer);
            content += this.buildEnum(config.pathName, true, dirName, files, config.includes, config.haveExt, config.nameReplacer);
        } else {
            if (!baseContent) content += this.buildEnum("UnclassifiedPath", true, dirName, files, null);
            else {
                const dirs = dirName.split("/");
                content += this.buildEnum(UpperFirst(dirs[dirs.length - 2] + "Path"), true, dirName, files, null);
            }
        }
        if (!config || !config.ignoreSubDir) {
            dirs.forEach(fileName => {
                const filePath = path.resolve(dirPath, fileName);
                let subDir = dirName + fileName + "/";
                content = this.buildResEnum(filePath, subDir, content + `\t// ${ subDir }\n`);
            });
        }
        return content;
    }

    protected buildEnum(name: string, isPath: boolean, dir: string, files: string[], includes: string[], haveExt: boolean = true, nameReplacer?: (name: string) => string) {
        let content = "";
        files.forEach(v => {
            if (includes && !includes.find(inclu => v.endsWith(inclu))) return;
            const fileName = v.split(".")[0];
            const value = isPath ? (dir + (haveExt ? v : fileName)) : fileName;
            content += `\n\t\t${ UpperFirst(nameReplacer ? nameReplacer(v) : fileName) } = "${ value }",`;
        });
        if (content) return `\texport enum ${ name } {${ content }\n\t}\n\n`;
        else return `\texport enum ${ name } {}\n\n`;
    }
}