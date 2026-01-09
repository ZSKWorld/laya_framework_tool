import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { ShaderDir } from "./Const";
import { GetAllDir, GetAllFile } from "./Utils";

/** 定义 GLSL 类型到 Laya 类型的映射关系 */
interface ITypeMap {
    type: string;    // Laya.ShaderDataType
    getter: string;  // getFloat...
    setter: string;  // setFloat...
    default?: string; // 默认值
}

export class BuildMaterial extends BuildBase {
    private readonly _d2Dir = path.join(ShaderDir, "2d");
    private readonly _d3Dir = path.join(ShaderDir, "3d");

    private readonly _typeMap: Record<string, ITypeMap> = {
        "int": { type: "Laya.ShaderDataType.Int", getter: "getInt", setter: "setInt", default: "0" },
        "bool": { type: "Laya.ShaderDataType.Bool", getter: "getBool", setter: "setBool", default: "false" },
        "float": { type: "Laya.ShaderDataType.Float", getter: "getFloat", setter: "setFloat", default: "0" },
        "vec2": { type: "Laya.ShaderDataType.Vector2", getter: "getVector2", setter: "setVector2", default: "new Laya.Vector2(0, 0)" },
        "vec3": { type: "Laya.ShaderDataType.Vector3", getter: "getVector3", setter: "setVector3", default: "new Laya.Vector3(0, 0, 0)" },
        "vec4": { type: "Laya.ShaderDataType.Vector4", getter: "getVector4", setter: "setVector4", default: "new Laya.Vector4(0, 0, 0, 0)" },
        "mat3": { type: "Laya.ShaderDataType.Matrix3x3", getter: "getMatrix3x3", setter: "setMatrix3x3", default: "new Laya.Matrix3x3()" },
        "mat4": { type: "Laya.ShaderDataType.Matrix4x4", getter: "getMatrix4x4", setter: "setMatrix4x4", default: "new Laya.Matrix4x4()" },
        "sampler2D": { type: "Laya.ShaderDataType.Texture2D", getter: "getTexture", setter: "setTexture" },
        "sampler3D": { type: "Laya.ShaderDataType.Texture3D", getter: "getTexture", setter: "setTexture" },
        "samplerCube": { type: "Laya.ShaderDataType.TextureCube", getter: "getTexture", setter: "setTexture" },
        "sampler2DArray": { type: "Laya.ShaderDataType.Texture2DArray", getter: "getTexture", setter: "setTexture" },
    };

    private readonly _ignoreUniforms = new Set(["u_Bones", "u_Time", "u_MvpMatrix", "u_CurrentTime"]);

    doBuild() {
        this.collectShaderDefines();

        // 扫目录生成材质类
        const task = (dirs: string[], is3D: boolean) => dirs.forEach(dir => this.createGLSLMaterial(dir, is3D));
        task(GetAllDir(this._d2Dir), false);
        task(GetAllDir(this._d3Dir), true);
    }

    /** 1. 提取 2D/3D 通用的着色器汇总逻辑 */
    private collectShaderDefines() {
        const build = (dir: string, outputName: string) => {
            const files = GetAllFile(dir, true, v => v.endsWith(".vs") || v.endsWith(".fs")).sort();
            const defines = files.map(filePath => {
                const name = path.basename(filePath).replace(".vs", "_VS").replace(".fs", "_FS");
                const content = JSON.stringify(fs.readFileSync(filePath, "utf-8").replace(/\r/g, "").replace(/\n/g, "\\n"));
                return `export const ${ name } = ${ content };`;
            });
            fs.writeFileSync(path.join(dir, outputName), defines.join("\n\n"));
        };

        build(this._d2Dir, "Shader2DDefine.ts");
        build(this._d3Dir, "Shader3DDefine.ts");
    }

    /** 2. 生成具体材质类文件 */
    private createGLSLMaterial(dir: string, is3D: boolean) {
        const fileName = path.basename(dir);
        const vsPath = path.join(dir, `${ fileName }.vs`);
        const fsPath = path.join(dir, `${ fileName }.fs`);
        const matPath = path.join(dir, `${ fileName }Material.ts`);

        if (!fs.existsSync(vsPath) || !fs.existsSync(fsPath) || fs.existsSync(matPath)) return;

        // 提取 Uniforms
        const uniformsMap = this.parseUniforms([vsPath, fsPath]);
        const matName = `${ fileName }Material`;

        // 构建代码行数组
        const lines: string[] = [];
        const importBase = is3D ? "Shader3DDefine" : "Shader2DDefine";

        lines.push(`import { ${ fileName }_FS as fs, ${ fileName }_VS as vs } from "../${ importBase }";\n`);
        lines.push(`export class ${ matName } extends Laya.Material {`);
        lines.push(`\tprivate static readonly ShaderName = "${ fileName }";`);

        // A. 声明 ShaderDefine 静态变量 (针对采样器)
        for (const [name, glslType] of Object.entries(uniformsMap)) {
            if (glslType.startsWith("sampler")) {
                lines.push(`\tprivate static DEF_${ name.substring(2) }: Laya.ShaderDefine;`);
            }
        }

        // B. init() 注册方法
        lines.push(`\n\tstatic init() {`);
        for (const [name, glslType] of Object.entries(uniformsMap)) {
            if (glslType.startsWith("sampler")) {
                const defName = `DEF_${ name.substring(2) }`;
                lines.push(`\t\t${ matName }.${ defName } = Laya.Shader3D.getDefineByName("${ defName }");`);
            }
        }

        lines.push(`\n\t\tconst uniformMap = {`);
        for (const [name, glslType] of Object.entries(uniformsMap)) {
            const layaType = this._typeMap[glslType]?.type;
            if (layaType) lines.push(`\t\t\t${ name }: ${ layaType },`);
        }
        lines.push(`\t\t};`);

        lines.push(`\t\tconst defaultValue = {`);
        for (const [name, glslType] of Object.entries(uniformsMap)) {
            const defVal = this._typeMap[glslType]?.default;
            if (defVal) lines.push(`\t\t\t${ name }: ${ defVal },`);
        }
        lines.push(`\t\t};`);

        lines.push(`\t\tconst shader = Laya.Shader3D.add(${ matName }.ShaderName);`);
        lines.push(`\t\tshader.shaderType = Laya.ShaderFeatureType.D3;`);
        lines.push(`\t\tconst subShader = new Laya.SubShader(Laya.SubShader.DefaultAttributeMap, uniformMap, defaultValue);`);
        lines.push(`\t\tshader.addSubShader(subShader);`);
        lines.push(`\t\tsubShader.addShaderPass(vs, fs);`);
        lines.push(`\t}\n`);

        // C. Constructor
        lines.push(`\tconstructor() {`);
        lines.push(`\t\tsuper();`);
        lines.push(`\t\tthis.setShaderName(${ matName }.ShaderName);`);
        lines.push(`\t}\n`);

        // D. Getters & Setters
        lines.push(`\t//#region 字段`);
        for (const [name, glslType] of Object.entries(uniformsMap)) {
            const t = this._typeMap[glslType];
            if (!t) continue;

            lines.push(`\tget ${ name }() { return this.${ t.getter }("${ name }"); }`);

            if (glslType.startsWith("sampler")) {
                const defName = `${ matName }.DEF_${ name.substring(2) }`;
                lines.push(`\tset ${ name }(value: any) {`);
                lines.push(`\t\tthis.setDefine(${ defName }, !!value);`);
                lines.push(`\t\tthis.${ t.setter }("${ name }", value);`);
                lines.push(`\t}`);
            } else {
                lines.push(`\tset ${ name }(value: any) { this.${ t.setter }("${ name }", value); }`);
            }
        }
        lines.push(`\t//#endregion`);
        lines.push(`}`);

        fs.writeFileSync(matPath, lines.join("\n"));
    }

    /** 3. 提取 Uniform 解析逻辑，增强正则匹配 */
    private parseUniforms(filePaths: string[]): Record<string, string> {
        const uniforms: Record<string, string> = {};
        // 正则增强：匹配 "uniform type name;" 且忽略多余空格
        const reg = /uniform\s+([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)/g;

        filePaths.forEach(p => {
            const content = fs.readFileSync(p, "utf-8");
            let match: RegExpExecArray | null;
            while ((match = reg.exec(content)) !== null) {
                const [, type, name] = match;
                if (!this._ignoreUniforms.has(name)) {
                    uniforms[name] = type;
                }
            }
        });
        return uniforms;
    }
}