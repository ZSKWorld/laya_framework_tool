import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "../BuildBase";
import { ExcelDir, ProtoDir, QHCodeZipPath, ResDir } from "../Const";
import { GetAllFile, ZipFolder } from "../Utils";

const ProtoSourceDir = "D:/liqi/liqi-protocol/proto";
const ExcelSourceDir = "D:/liqi/liqi-excel/data";
const ProjectProtoPath = "D:/liqi/laya_liqi_new/bin/res/proto/liqi.json";
const ProjectExcelPath = "D:/liqi/laya_liqi_new/bin/res/config/lqc.lqbin";
const ProjectCodeDir = "D:/liqi/laya_liqi_new/src";

export class BuildCopyRes extends BuildBase {
    doBuild() {
        this.copyProto();
        this.copyExcel();
        this.copyCodeZip();
    }

    private copyProto() {
        if (fs.existsSync(ProtoSourceDir))
            GetAllFile(ProtoSourceDir, true, v => v.endsWith(".proto")).forEach(v => {
                fs.copyFileSync(v, path.join(ProtoDir, path.basename(v)));
            });
        if (fs.existsSync(ProjectProtoPath))
            fs.copyFileSync(ProjectProtoPath, path.join(ResDir, "config/proto.json"));
    }

    private copyExcel() {
        if (fs.existsSync(ExcelSourceDir))
            GetAllFile(ExcelSourceDir, true, v => v.endsWith(".xlsx")).forEach(v => {
                fs.copyFileSync(v, path.join(ExcelDir, path.basename(v)));
            });
        if (fs.existsSync(ProjectExcelPath))
            fs.copyFileSync(ProjectExcelPath, path.join(ResDir, "config/lqc.bin"));
    }

    private copyCodeZip() {
        if (fs.existsSync(ProjectCodeDir))
            ZipFolder(ProjectCodeDir, QHCodeZipPath);
    }
}