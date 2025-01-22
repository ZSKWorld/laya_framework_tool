import { BuildResPath } from "./BuildResPath";
import { ResDir3_0, ResPathDeclarePath3_0, ResPathPath3_0 } from "./Const";
import { UpperFirst } from "./Utils";


export class BuildResPath3_0 extends BuildResPath {
    protected _resDir = ResDir3_0;
    protected _resPathDeclarePath = ResPathDeclarePath3_0;
    protected _resPathPath = ResPathPath3_0;
    protected _rootDir = "assets/resources/";
    protected _excludeFile: string[] = [".meta"];

    protected buildEnum(name: string, isPath: boolean, dir: string, files: string[], include: string, haveExt: boolean = true) {
        if (dir.startsWith("assets/")) dir = dir.substring(7);
        return super.buildEnum(name, isPath, dir, files, include, haveExt);
    }
}