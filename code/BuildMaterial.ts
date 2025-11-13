import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { ShaderDir } from "./Const";
import { GetAllDir, GetAllFile } from "./Utils";


export class BuildMaterial extends BuildBase {

    private readonly _d2Dir = path.join(ShaderDir, "2d");
    private readonly _d3Dir = path.join(ShaderDir, "3d");
    private readonly _typeMap = {
        "int": ["Laya.ShaderDataType.Int", "getInt", "setInt"],
        "bool": ["Laya.ShaderDataType.Bool", "getBool", "setBool"],
        "float": ["Laya.ShaderDataType.Float", "getFloat", "setFloat"],
        "vec2": ["Laya.ShaderDataType.Vector2", "getVector2", "setVector2"],
        "vec3": ["Laya.ShaderDataType.Vector3", "getVector3", "setVector3"],
        "vec4": ["Laya.ShaderDataType.Vector4", "getVector4", "setVector4"],
        "mat3": ["Laya.ShaderDataType.Matrix3x3", "getMatrix3x3", "setMatrix3x3"],
        "mat4": ["Laya.ShaderDataType.Matrix4x4", "getMatrix4x4", "setMatrix4x4"],
        "sampler2D": ["Laya.ShaderDataType.Texture2D", "getTexture", "setTexture"],
        "sampler3D": ["Laya.ShaderDataType.Texture3D", "getTexture", "setTexture"],
        "samplerCube": ["Laya.ShaderDataType.TextureCube", "getTexture", "setTexture"],
        "sampler2DArray": ["Laya.ShaderDataType.Texture2DArray", "getTexture", "setTexture"],
    };
    private readonly _typeDefaultValue = {
        "Laya.ShaderDataType.Int": "0",
        "Laya.ShaderDataType.Bool": "false",
        "Laya.ShaderDataType.Float": "0",
        "Laya.ShaderDataType.Vector2": "new Laya.Vector2(0, 0)",
        "Laya.ShaderDataType.Vector3": "new Laya.Vector3(0, 0, 0)",
        "Laya.ShaderDataType.Vector4": "new Laya.Vector4(0, 0, 0, 0)",
        "Laya.ShaderDataType.Matrix3x3": "new Laya.Matrix3x3()",
        "Laya.ShaderDataType.Matrix4x4": "new Laya.Matrix4x4()",
    };
    private readonly _ignoreUniform = {
        "u_Bones": 1,
        "u_Time": 1,
        "u_MvpMatrix": 1,
        "u_CurrentTime": 1,
    }

    doBuild() {
        this.collectShaderDefine();

        GetAllDir(this._d2Dir).forEach(v => this.createGLSLMaterial(v, false));
        GetAllDir(this._d3Dir).forEach(v => this.createGLSLMaterial(v, true));
    }

    private collectShaderDefine() {
        const d3Files = GetAllFile(this._d3Dir, true, v => v.endsWith(".vs") || v.endsWith(".fs"));
        d3Files.sort();
        const d3Defines = d3Files.map(v => {
            const fileName = path.basename(v).replace(".vs", "_VS").replace(".fs", "_FS");
            return `export const ${ fileName } = "${ fs.readFileSync(v).toString().replace(/\r/g, "").replace(/\n/g, "\\n") }";`;
        });
        fs.writeFileSync(path.join(this._d3Dir, "Shader3DDefine.ts"), d3Defines.join("\n\n"));

        const d2Files = GetAllFile(this._d2Dir, true, v => v.endsWith(".vs") || v.endsWith(".fs"));
        d2Files.sort();
        const d2Defines = d2Files.map(v => {
            const fileName = path.basename(v).replace(".vs", "_VS").replace(".fs", "_FS");
            return `export const ${ fileName } = "${ fs.readFileSync(v).toString().replace(/\r/g, "").replace(/\n/g, "\\n") }";`;
        });
        fs.writeFileSync(path.join(this._d2Dir, "Shader2DDefine.ts"), d2Defines.join("\n\n"));
    }

    private createGLSLMaterial(dir, d3) {
        const fileName = path.basename(dir);
        const vsPath = path.join(dir, fileName + ".vs");
        if (fs.existsSync(vsPath) == false) return;
        const fsPath = path.join(dir, fileName + ".fs");
        if (fs.existsSync(fsPath) == false) return;
        const matName = fileName + "Material";
        const matPath = path.join(dir, matName + ".ts");
        if (fs.existsSync(matPath)) return;
        const vsUniforms = fs.readFileSync(vsPath).toString().replace(/ {2,}/g, " ").match(/uniform [a-zA-Z0-9_]+ [a-zA-Z0-9_]+/g);
        const fsUniforms = fs.readFileSync(fsPath).toString().replace(/ {2,}/g, " ").match(/uniform [a-zA-Z0-9_]+ [a-zA-Z0-9_]+/g);
        // const matches = fs.readFileSync(fsPath).toString().replace(/ {2,}/g, " ").match(/uniform [a-zA-Z0-9_]+ [a-zA-Z0-9_]+(\[([a-zA-Z0-9_]+)\])*;/g);
        const uniforms = [...(vsUniforms || []), ...(fsUniforms || [])];
        const uniformsMap = {};
        uniforms.forEach(v => {
            const arr = v.split(" ");
            if (!this._ignoreUniform[arr[2]] && !uniformsMap[arr[2]]) {
                uniformsMap[arr[2]] = arr[1];
            }
        });
        let content = `import { ${ fileName }_FS as fs, ${ fileName }_VS as vs } from "../${ d3 ? "Shader3DDefine" : "Shader2DDefine" }";\n\n`;
        // content += `const ShaderName = "${ fileName }";\n\n`;
        // for (const key in uniformsMap) {
        //     const e = uniformsMap[key];
        //     if (e == "sampler2D" || e == "sampler3D" || e == "samplerCube") {
        //         const defName = `DEF_${ key.substring(2) }`;
        //         content += `const ${ defName } = Laya.Shader3D.getDefineByName("${ defName }");\n`;
        //     }
        // }
        // content += `\n`;
        content += `export class ${ matName } extends Laya.Material {\n`;
        content += `\tprivate static readonly ShaderName = "${ fileName }";\n`;
        for (const key in uniformsMap) {
            const e = uniformsMap[key];
            if (e == "sampler2D" || e == "sampler3D" || e == "samplerCube") {
                const defName = `DEF_${ key.substring(2) }`;
                content += `\tprivate static ${ defName }: Laya.ShaderDefine;\n`;
            }
        }
        content += `\n`;
        content += `\tstatic init() {\n`;
        for (const key in uniformsMap) {
            const e = uniformsMap[key];
            if (e == "sampler2D" || e == "sampler3D" || e == "samplerCube") {
                const defName = `DEF_${ key.substring(2) }`;
                content += `\t\t${ matName }.${ defName } = Laya.Shader3D.getDefineByName("${ defName }");\n`;
            }
        }
        content += `\n`;
        content += `\t\tconst uniformMap = {\n`;
        for (const key in uniformsMap) {
            const e = uniformsMap[key];
            content += `\t\t\t${ key }: ${ this._typeMap[e]?.[0] },\n`;
        }
        content += `\t\t};\n`;
        content += `\t\tconst defaultValue = {\n`;
        for (const key in uniformsMap) {
            const e = uniformsMap[key];
            const defaultValue = this._typeDefaultValue[this._typeMap[e]?.[0]];
            if (defaultValue)
                content += `\t\t\t${ key }: ${ defaultValue },\n`;
        }
        content += `\t\t};\n`;
        content += `\t\tconst shader = Laya.Shader3D.add(${ matName }.ShaderName);\n`;
        content += `\t\tshader.shaderType = Laya.ShaderFeatureType.D3;\n`;
        content += `\t\tconst subShader = new Laya.SubShader(Laya.SubShader.DefaultAttributeMap, uniformMap, defaultValue);\n`;
        content += `\t\tshader.addSubShader(subShader);\n`;
        content += `\t\tsubShader.addShaderPass(vs, fs);\n`;
        content += `\t}\n\n`;
        content += `\tconstructor() {\n`;
        content += `\t\tsuper();\n`;
        content += `\t\tthis.setShaderName(${ matName }.ShaderName);\n`;
        content += `\t}\n\n`;
        content += `\t//#region 字段\n`;
        for (const key in uniformsMap) {
            const e = uniformsMap[key];
            content += `\tget ${ key }() { return this.${ this._typeMap[e]?.[1] }("${ key }"); }\n`;
            if (e == "sampler2D" || e == "sampler3D" || e == "samplerCube") {
                const defName = `DEF_${ key.substring(2) }`;
                content += `\tset ${ key }(value) {\n`;
                content += `\t\tthis.setDefine(${ matName }.${ defName }, !!value);\n`;
                content += `\t\tthis.${ this._typeMap[e]?.[2] }("${ key }", value);\n`;
                content += `\t}\n`;
            } else {
                content += `\tset ${ key }(value) { this.${ this._typeMap[e]?.[2] }("${ key }", value); }\n`;
            }
        }
        content += `\t//#endregion\n`;
        content += `}`;
        fs.writeFileSync(matPath, content);

    }

}