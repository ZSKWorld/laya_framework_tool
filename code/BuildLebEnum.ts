import * as fs from "fs";
import * as ts from "typescript";
import { BuildBase } from "./BuildBase";
import { LebEnumsOutput, LebEnumsSources, TS_MODIFY_TIP } from "./Const";


interface EnumStructure {
    namespace: string;
    name: string;
    members: { key: string, value: string | number }[];
}

interface NSEnumStructure {
    name: string;
    enums: EnumStructure[];
}

export class BuildLebEnum extends BuildBase {
    doBuild(): void {
        const enums = this.getEnumStructure(LebEnumsSources);
        const nsEnums: Record<string, NSEnumStructure> = {};
        enums.forEach(v => {
            nsEnums[v.namespace] = nsEnums[v.namespace] || { name: v.namespace, enums: [] };
            nsEnums[v.namespace].enums.push(v);
        });
        const content: string[] = [TS_MODIFY_TIP];
        for (const key in nsEnums) {
            const e = nsEnums[key];
            content.push(this.getEnumStructureContent(e));
        }
        fs.writeFileSync(LebEnumsOutput, content.join("\n"));
    }

    private getEnumStructure(filePaths: string[]) {
        filePaths = filePaths.filter(v => fs.existsSync(v));
        const program = ts.createProgram(filePaths, {
            target: ts.ScriptTarget.Latest,
            module: ts.ModuleKind.CommonJS,
        });
        const checker = program.getTypeChecker();
        const enums: EnumStructure[] = [];
        filePaths.forEach(v => enums.push(...this.getEnumStructureOnSourceFile(checker, program.getSourceFile(v))));
        return enums;
    }

    private getNamespacePath(node: ts.Node) {
        const parentNames: string[] = [];
        let parent = node.parent;

        while (parent) {
            if (ts.isModuleDeclaration(parent)) {
                parentNames.unshift(parent.name.getText());
            }
            parent = parent.parent;
        }

        return parentNames.join(".");
    }

    private getEnumStructureOnSourceFile(checker: ts.TypeChecker, sourceFile: ts.SourceFile) {
        if (!sourceFile) {
            console.error("无法读取文件");
            return [];
        }
        const enums: EnumStructure[] = [];

        const visit = (node: ts.Node) => {
            if (ts.isEnumDeclaration(node)) {
                const members = node.members.map(member => {
                    const computedValue = checker.getConstantValue(member);

                    return {
                        key: member.name.getText(sourceFile),
                        value: computedValue
                    };
                });

                enums.push({
                    namespace: this.getNamespacePath(node),
                    name: node.name.getText(sourceFile),
                    members: members
                });
            }
            ts.forEachChild(node, visit);
        }

        visit(sourceFile);
        return enums;
    }

    private getEnumStructureContent(data: NSEnumStructure) {
        const hasNS = !!data.name;
        let content: string[] = [];

        data.enums.forEach(v => {
            if (v.members.length > 0) {
                if (hasNS) content.push(`${ v.name }: {`);
                else content.push(`${ v.name } = {`);
                v.members.forEach(vv => {
                    const value = typeof vv.value == "string" ? `\"${ vv.value }\"` : vv.value;
                    content.push(`\t${ vv.key }: ${ value },`);
                });

                if (hasNS) content.push("},");
                else content.push("}\n");
            } else {
                if (hasNS)
                    content.push(`${ v.name }: {},`);
                else
                    content.push(`${ v.name } = {},`);
            }
        });

        const preSpace = hasNS ? "\t" : "";
        content = content.map(v => preSpace + v);

        if (hasNS) {
            content.unshift(`${ data.name } = {`);
            content.push(`}`);
        }
        return content.join("\n");
    }
}