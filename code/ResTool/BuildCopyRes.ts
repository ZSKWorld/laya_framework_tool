import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "../BuildBase";
import { ExcelDir, ProtoDir, ResDir } from "../Const";
import { GetAllFile } from "../Utils";

const ProtoSourceDir = "D:/liqi/liqi-protocol/proto";
const ExcelSourceDir = "D:/liqi/liqi-excel/data";
const ProjectProtoPath = "D:/liqi/laya_liqi_new/bin/res/proto/liqi.json";
const ProjectExcelPath = "D:/liqi/laya_liqi_new/bin/res/config/lqc.lqbin";

export class BuildCopyRes extends BuildBase {
    doBuild(): void {
        this.copyProto();
        this.copyExcel();
    }

    private copyProto() {
        GetAllFile(ProtoSourceDir, true, v => v.endsWith(".proto")).forEach(v => {
            fs.copyFileSync(v, path.join(ProtoDir, path.basename(v)));
        });
        fs.copyFileSync(ProjectProtoPath, path.join(ResDir, "config/proto.json"));
    }

    private copyExcel() {
        GetAllFile(ExcelSourceDir, true, v => v.endsWith(".xlsx")).forEach(v => {
            fs.copyFileSync(v, path.join(ExcelDir, path.basename(v)));
        });
        fs.copyFileSync(ProjectExcelPath, path.join(ResDir, "config/lqc.bin"));
    }
}