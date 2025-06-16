import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { BinDir, LibResPathPath, ResDir, ResPathDeclarePath, ResPathPath, TS_MODIFY_TIP } from "./Const";
import { GetAllFile, UpperFirst } from "./Utils";

const enum FileType {
    Json = ".json",
    Ttf = ".ttf",
    Png = ".png",
    Jpg = ".jpg",
    Scene = ".ls",
    Sprite3D = ".lh",
    SK = ".sk",
    Mp3 = ".mp3",
    Wav = ".wav",
    Spine = ".skel",
    Zip = ".zip",
}

export class BuildResPath2 extends BuildBase {
    doBuild() {
        const enums: string[] = [];
        const unclassifiedFiles: string[] = [];
        fs.readdirSync(ResDir).forEach(v => {
            const vPath = path.resolve(ResDir, v);
            const stat = fs.statSync(vPath);
            if (stat.isDirectory()) {
                switch (v) {
                    case "config": enums.push(...this.buildConfig(vPath)); break;
                    case "font": enums.push(...this.buildFont(vPath)); break;
                    case "prescreen": enums.push(...this.buildPrescreen(vPath)); break;
                    case "scene": enums.push(...this.buildScene(vPath)); break;
                    case "skeleton": enums.push(...this.buildSkeleton(vPath)); break;
                    case "sound": enums.push(...this.buildSound(vPath)); break;
                    case "spine": enums.push(...this.buildSpine(vPath)); break;
                    case "texture": enums.push(...this.buildTexture(vPath)); break;
                    case "ui": enums.push(...this.buildUI(vPath)); break;
                    default: unclassifiedFiles.push(...GetAllFile(vPath, true)); break;
                }
            } else if (stat.isFile()) {
                unclassifiedFiles.push(vPath);
            }
        });
        enums.unshift(...this.buildUnclassified(unclassifiedFiles));
        const enumsContent = enums.join("\n\n");
        const pathContent = `${ TS_MODIFY_TIP }ResPath = {\n${ enumsContent.replace(/export enum /g, "").replace(/ {/g, ": {").replace(/}/g, "},").replace(/ =/g, ":") }\n}`;
        fs.writeFileSync(LibResPathPath, pathContent);

        const declareContent = `${ TS_MODIFY_TIP }declare namespace ResPath {\n${ enumsContent }\n}`
            .replace(new RegExp("export enum", "g"), "enum");
        fs.writeFileSync(ResPathDeclarePath, declareContent);
    }

    private retifyFilePath(files: string[]) {
        return files.map(v => v.replace(BinDir + "\\", "").replace(/\\/g, "/"));
    }

    private getAllFile(dirPath: string, filters: FileType[]) {
        return this.retifyFilePath(GetAllFile(dirPath, true, v => filters.some(v1 => v.endsWith(v1))));
    }

    private getNameKVs(files: string[]) {
        return files.map(v => {
            const basename = path.basename(v).split(".")[0];
            return [UpperFirst(basename), basename];
        });
    }

    private getPathKVs(files: string[], haveExt: boolean = true) {
        return files.map(v => {
            const basename = path.basename(v).split(".")[0];
            return [UpperFirst(basename), haveExt ? v : v.split(".")[0]];
        });
    }

    private createContent(name: string, kvs: string[][]) {
        const content = kvs.map(v => `\t\t${ v[0] } = "${ v[1] }",`).join("\n");
        if (content) return `\texport enum ${ name } {\n${ content }\n\t}`;
        else return `\texport enum ${ name } { }`;
    }

    private buildConfig(dirPath: string) {
        const files = this.getAllFile(dirPath, [FileType.Json]);
        const pathKVs = this.getPathKVs(files);
        return [
            this.createContent("ConfigPath", pathKVs)
        ];
    }

    private buildFont(dirPath: string) {
        const files = this.getAllFile(dirPath, [FileType.Ttf]);
        const nameKVs = this.getNameKVs(files);
        const pathKVs = this.getPathKVs(files);
        return [
            this.createContent("FontName", nameKVs),
            this.createContent("FontPath", pathKVs),
        ];
    }

    private buildPrescreen(dirPath: string) {
        const files = this.getAllFile(dirPath, [FileType.Png, FileType.Jpg]);
        const pathKVs = this.getPathKVs(files);
        return [
            this.createContent("PrescreenPath", pathKVs),
        ];
    }

    private buildScene(dirPath: string) {
        const sceneFiles = this.getAllFile(dirPath, [FileType.Scene]);
        const scenePathKVs = this.getPathKVs(sceneFiles).map(v => ["Scene_" + v[0], v[1]]);
        const sprite3dFiles = this.getAllFile(dirPath, [FileType.Sprite3D]);
        const sprite3dPathKVs = this.getPathKVs(sprite3dFiles).map(v => ["Sprite3D_" + v[0], v[1]]);
        return [
            this.createContent("ScenePath", [...scenePathKVs, ...sprite3dPathKVs]),
        ];
    }

    private buildSkeleton(dirPath: string) {
        const files = this.getAllFile(dirPath, [FileType.SK]);
        const pathKVs = this.getPathKVs(files);
        return [
            this.createContent("SkeletonPath", pathKVs),
        ];
    }

    private buildSound(dirPath: string) {
        const mp3Files = this.getAllFile(dirPath, [FileType.Mp3]);
        const mp3PathKVs = this.getPathKVs(mp3Files).map(v => ["MP3_" + v[0], v[1]]);
        const wavFiles = this.getAllFile(dirPath, [FileType.Wav]);
        const wavPathKVs = this.getPathKVs(wavFiles).map(v => ["WAV_" + v[0], v[1]]);
        return [
            this.createContent("SoundPath", [...mp3PathKVs, ...wavPathKVs]),
        ];
    }

    private buildSpine(dirPath: string) {
        const files = this.getAllFile(dirPath, [FileType.Spine]);
        const pathKVs = this.getPathKVs(files);
        return [
            this.createContent("SpinePath", pathKVs),
        ];
    }

    private buildTexture(dirPath: string) {
        const pngFiles = this.getAllFile(dirPath, [FileType.Png]);
        const pngPathKVs = this.getPathKVs(pngFiles).map(v => ["PNG_" + v[0], v[1]]);
        const jpgFiles = this.getAllFile(dirPath, [FileType.Jpg]);
        const jpgPathKVs = this.getPathKVs(jpgFiles).map(v => ["JPG_" + v[0], v[1]]);
        return [
            this.createContent("TexturePath", [...pngPathKVs, ...jpgPathKVs]),
        ];
    }

    private buildUI(dirPath: string) {
        const files = this.getAllFile(dirPath, [FileType.Zip]);
        const nameKVs = this.getNameKVs(files);
        const pathKVs = this.getPathKVs(files, false);
        return [
            this.createContent("PkgName", nameKVs),
            this.createContent("PkgPath", pathKVs),
        ];
    }

    private buildUnclassified(files: string[]) {
        const pathKVs = this.getPathKVs(this.retifyFilePath(files));
        return [
            this.createContent("UnclassifiedPath", pathKVs),
        ];
    }
}