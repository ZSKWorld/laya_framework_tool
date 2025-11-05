import * as fs from "fs";
import * as xlsx from "node-xlsx";
import * as path from "path";

type KeyMap<T> = { [key: string]: T; };
type ExcelData = { name: string, data: string[][]; }[];
const resDir = "D:\\liqi\\majsoul-extendres_test\\";
const xlsxPath = "D:\\liqi\\liqi-excel\\data\\";
const activity_items_json = "code/quehun/extend_res/output/activity_items.json";
const old_to_new_json = "code/quehun/extend_res/output/old_to_new.json";
const new_to_old_json = "code/quehun/extend_res/output/new_to_old.json";
const unsed_json = "code/quehun/extend_res/output/unsed.json";
const unsed_banner_json = "code/quehun/extend_res/output/unsed_banner.json";

const langType = ["chs", "chs_t", "common", "en", "en_chs_t", "en_kr", "jp", "kr"];

function removeEmptyDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(v => {
        const vPath = path.resolve(dir, v);
        if (!fs.existsSync(vPath)) return;
        const stat = fs.statSync(vPath);
        if (stat.isDirectory()) {
            removeEmptyDir(vPath);
            const vDirInfos = fs.readdirSync(vPath);
            if (vDirInfos.length == 0) {
                fs.rmdirSync(vPath);
            }
        }
    });
}

function replacePathSign(str: string, reverse?: boolean) {
    if (!str) return str;
    if (reverse) return str.replace(/\//g, "\\\\");
    else return str.replace(/\\/g, "/");
}

function getAllFile(dirPath: string, filter?: (name: string) => boolean, map?: (name: string) => string) {
    if (fs.existsSync(dirPath) == false) return [];
    const names: string[] = [];
    fs.readdirSync(dirPath).forEach(filename => {
        const filePath = path.resolve(dirPath, filename);
        const state = fs.statSync(filePath);
        if (state.isDirectory()) {
            names.push(...getAllFile(filePath, filter, map));
        } else if (state.isFile()) {
            if (!filter || filter(filename)) {
                const temp = map ? map(path.resolve(dirPath, filename)) : path.resolve(dirPath, filename);
                names.push(temp);
            }
        }
    });
    return names;
}

/** 数字转excel表列名 */
function numberToExcelColumn(num: number) {
    let result = '';
    while (num > 0) {
        // Excel列名是基于26进制计算的，但要从1开始计数，所以减去1
        const remainder = (num - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        num = Math.floor((num - 1) / 26);
    }
    return result;
}

/** excel表列名转数字 */
function columnNameToNumber(columnName: string) {
    const code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = 0;
    for (let i = 0; i < columnName.length; i++) {
        const index = code.indexOf(columnName[i].toUpperCase()) + 1; // 加1是因为Excel的A是1，B是2，以此类推
        result += index * Math.pow(26, columnName.length - 1 - i); // 从右向左计算26进制数，例如AB是28（1*26^1 + 2*26^0）
    }
    return result;
}

function exchangeKeyValue<T>(obj: T): T {
    const result = {} as any;
    for (const key in obj) {
        const ele = obj[key];
        if (typeof (ele) == "object") {
            result[key] = exchangeKeyValue(ele);
        } else {
            result[ele] = key;
        }
    }
    return result;
}

enum BannerType {
    Unused = "unused",
    /** 大厅主界面使用 */
    Lobby = "lobby",
    /** 主体内使用 */
    Main = "main",
    /** 活动页面使用 */
    Tab = "tab",
    /** 轮换模式特殊处理 */
    RotationalMatch = "rotationalmatch",
}

enum ItemType {
    None = "",
    Unused = "unused",
    Main = "main",


    Activity = "activity",


    Deco_Bgm = "deco/bgm",
    Deco_Effect_HuPai = "deco/effect_hupai",
    Deco_Effect_LiZhi = "deco/effect_lizhi",
    Deco_Effect_MingPaiZhiShi = "deco/effect_mingpaizhishi",
    Deco_Hand = "deco/hand",
    Deco_HeadFrame = "deco/head_frame",
    Deco_LiZhiBgm = "deco/lizhi_bgm",
    Deco_LiZhiBang = "deco/lizhibang",
    Deco_LobbyBackground = "deco/lobby_background",
    Deco_MJFace = "deco/mjpface",
    Deco_MJPai = "deco/mjpai",
    Deco_TableCloth = "deco/tablecloth",
}

/** 类别 item.category */
enum ItemCategory {
    /** 普通 */
    PuTong = 1,
    /** 礼物 */
    LiWu,
    /** 福袋 */
    FuDai,
    /** 角色装扮 */
    JueSeZhuangBan,
    /** 通用装扮 */
    TongYongZhuangBan,
    /** 活动道具 */
    HuoDongDaoJu,
    /** 限时称号 */
    XianShiChengHao,
    /** 不参与成就的装扮 */
    BuCanYuChengJiuDeZhuangBan,
}

/** 通用装扮子类型 */
enum ItemCategory_TongYongZhuangBan_Type {
    /** 立直棒 */
    LiZhiBang,
    /** 和牌特效 */
    HuPaiTeXiao,
    /** 立直特效 */
    LiZhiTeXiao,
    /** 手的样式 */
    ShouDeYangShi,
    /** 立直音乐 */
    LiZhiYinYue,
    /** 头像框 */
    TouXiangKuang,
    /** 桌布 */
    ZhuoBo,
    /** 牌背 */
    PaiBei,
    /** 大厅背景 */
    DaTingBeiJing,
    /** 背景音乐 */
    BeiJingYinYue,
    /** 鸣牌指示 */
    MingPaiZhiShi,
    /** 限时称号 */
    XianShiChengHao,
    /** 插画loading图 */
    ChaHuaLoadingTu,
    /** 麻将牌正面mjpface */
    MaJiangPaiZhengMian,
}

function forEachExcel(excelData: ExcelData, sheetName, colNames: string[], cb: (row: number, col: number, colName: string, value: any) => void) {
    const sheet = excelData.find(v => v.name == sheetName);
    const rows = sheet.data.length;
    const fieldNames = sheet.data.find(v => v[0] && v[0].trim() == "##");
    const startRow = sheet.data.findIndex(v => !v[0] || !v[0].startsWith("#"));
    for (let i = startRow; i < rows; i++) {
        const rowData = sheet.data[i];
        colNames.forEach(colName => {
            const colNum = columnNameToNumber(colName) - 1;
            const v = replacePathSign(rowData[colNum]);
            cb(i, colNum, colName, v);
        });
    }
}

function findExcelContent(excelData: ExcelData, sheetName: string, colNames: string[], out: KeyMap<ItemType>, type: ItemType | ((data: any) => ItemType)) {
    const sheet = excelData.find(v => v.name == sheetName);
    const rows = sheet.data.length;
    const fieldNames = sheet.data.find(v => v[0] && v[0].trim() == "##");
    const startRow = sheet.data.findIndex(v => !v[0] || !v[0].startsWith("#"));
    for (let i = startRow; i < rows; i++) {
        const rowData = sheet.data[i];
        colNames.forEach(colName => {
            const colNum = columnNameToNumber(colName) - 1;
            const v = replacePathSign(rowData[colNum]);
            if (v && v.startsWith("extendRes/items")) {
                if (typeof (type) == "string") out[v] = type as ItemType;
                else if (typeof (type) == "function") {
                    const data = {};
                    fieldNames.forEach((v, i) => {
                        if (!v || v.trim().startsWith("#")) return;
                        data[v] = rowData[i];
                    });
                    out[v] = type(data);
                }
                else out[v] = ItemType.None;
            }
        });
    }
}

const excelValues: KeyMap<ItemType> = {};
let item_definition_sheets: ExcelData;
let desktop_sheets: ExcelData;
let exchange_sheets: ExcelData;
let mall_sheets: ExcelData;
let shops_sheets: ExcelData;
let activity_sheets: ExcelData;

const unusedTranslateMap: KeyMap<[ItemType, string]> = {
    "extendRes/items/book0.jpg": [ItemType.Main, ""],
    "extendRes/items/book1.jpg": [ItemType.Main, ""],
    "extendRes/items/book2.jpg": [ItemType.Main, ""],
    "extendRes/items/chigua.jpg": [ItemType.None, ""],
    "extendRes/items/coin6.png": [ItemType.Main, ""],
    "extendRes/items/coin7.png": [ItemType.Main, ""],
    "extendRes/items/coin8.png": [ItemType.Main, ""],
    "extendRes/items/default.jpg": [ItemType.Main, ""],
    "extendRes/items/denglong.png": [ItemType.Activity, ""],
    "extendRes/items/effect_liqi_wind.jpg": [ItemType.Deco_Effect_LiZhi, ""],
    "extendRes/items/fudai_star.jpg": [ItemType.Main, ""],
    "extendRes/items/guihuajiu.png": [ItemType.Activity, ""],
    "extendRes/items/liqi_baozhu.jpg": [ItemType.Deco_LiZhiBang, "liqi_bianpao.jpg"],
    "extendRes/items/liqi_bgm_1.jpg": [ItemType.Deco_LiZhiBgm, ""],
    "extendRes/items/liqi_bgm_2.jpg": [ItemType.Deco_LiZhiBgm, ""],
    "extendRes/items/liqi_chuzhen.jpg": [ItemType.Deco_LiZhiBgm, ""],
    "extendRes/items/mingpaizhishi_dian.jpg": [ItemType.Deco_Effect_MingPaiZhiShi, "mpzs_shandian.jpg"],
    "extendRes/items/mjp_orange.jpg": [ItemType.Deco_MJPai, "mjp_default.jpg"],
    "extendRes/items/present_cotten.png": [ItemType.Main, ""],
    "extendRes/items/ron_lightening.jpg": [ItemType.Deco_Effect_HuPai, ""],
    "extendRes/items/tablecloth_navy.jpg": [ItemType.Deco_TableCloth, "tablecloth_default.jpg"],
    "extendRes/items/tablecloth_zhongxiahuahuo.jpg": [ItemType.Deco_TableCloth, ""],
    "extendRes/items/touzi_0.png": [ItemType.Activity, ""],
    "extendRes/items/zhongxialvdong.jpg": [ItemType.Deco_Bgm, ""],
    "extendRes/items2/2211saki_liqi.jpg": [ItemType.Deco_LiZhiBang, "liqi_2211saki.jpg"],
    "extendRes/items2/2211saki_liqi_effect.jpg": [ItemType.Deco_Effect_LiZhi, "effect_liqi_2211saki.jpg"],
    "extendRes/items2/2211saki_pai.jpg": [ItemType.Deco_MJPai, "mjp_2211saki.jpg"],
    "extendRes/items2/2211saki_ron.jpg": [ItemType.Deco_Effect_HuPai, "ron_2211saki.jpg"],
    "extendRes/items2/2211saki_table.jpg": [ItemType.Deco_TableCloth, "tablecloth_2211saki.jpg"],
    "extendRes/items2/2303wenquan_coin.jpg": [ItemType.Activity, ""],
    "extendRes/items2/2303wenquan_coin_0.png": [ItemType.Activity, ""],
    "extendRes/items2/23llx_liqi.jpg": [ItemType.Deco_LiZhiBang, "liqi_llx.jpg"],
    "extendRes/items2/23llx_liqi_effect.jpg": [ItemType.Deco_Effect_LiZhi, "effect_liqi_llx.jpg"],
    "extendRes/items2/23llx_pai.jpg": [ItemType.Deco_MJPai, "mjp_llx.jpg"],
    "extendRes/items2/23llx_ron.jpg": [ItemType.Deco_Effect_HuPai, "ron_llx.jpg"],
    "extendRes/items2/23llx_table.jpg": [ItemType.Deco_TableCloth, "tablecloth_llx.jpg"],
    "extendRes/items2/23yly_liqi.jpg": [ItemType.Deco_LiZhiBang, "liqi_yly.jpg"],
    "extendRes/items2/23yly_liqi_effect.jpg": [ItemType.Deco_Effect_LiZhi, "effect_liqi_yly.jpg"],
    "extendRes/items2/23yly_pai.jpg": [ItemType.Deco_MJPai, "mjp_yly.jpg"],
    "extendRes/items2/23yly_ron.jpg": [ItemType.Deco_Effect_HuPai, "ron_yly.jpg"],
    "extendRes/items2/23yly_table.jpg": [ItemType.Deco_TableCloth, "tablecloth_yly.jpg"],
    "extendRes/items2/24ba_liqi.jpg": [ItemType.Deco_LiZhiBang, "liqi_24ba.jpg"],
    "extendRes/items2/24ba_liqi_effect.jpg": [ItemType.Deco_Effect_LiZhi, "effect_liqi_24ba.jpg"],
    "extendRes/items2/24ba_pai.jpg": [ItemType.Deco_MJPai, "mjp_24ba.jpg"],
    "extendRes/items2/24ba_ron.jpg": [ItemType.Deco_Effect_HuPai, "ron_24ba.jpg"],
    "extendRes/items2/24ba_table.jpg": [ItemType.Deco_TableCloth, "tablecloth_24ba.jpg"],
    "extendRes/items2/25hf_liqi.jpg": [ItemType.Deco_LiZhiBang, "liqi_25hf.jpg"],
    "extendRes/items2/25hf_liqi_effect.jpg": [ItemType.Deco_Effect_LiZhi, "effect_liqi_25hf.jpg"],
    "extendRes/items2/25hf_pai.jpg": [ItemType.Deco_MJPai, "mjp_25hf.jpg"],
    "extendRes/items2/25hf_ron.jpg": [ItemType.Deco_Effect_HuPai, "ron_25hf.jpg"],
    "extendRes/items2/25hf_table.jpg": [ItemType.Deco_TableCloth, "tablecloth_25hf.jpg"],
    "extendRes/items2/akagi_liqi.jpg": [ItemType.Deco_LiZhiBang, "liqi_akagi.jpg"],
    "extendRes/items2/akagi_liqi_effect.jpg": [ItemType.Deco_Effect_LiZhi, "effect_liqi_akagi.jpg"],
    "extendRes/items2/akagi_pai.jpg": [ItemType.Deco_MJPai, "mjp_akagi.jpg"],
    "extendRes/items2/akagi_ron.jpg": [ItemType.Deco_Effect_HuPai, "ron_akagi.jpg"],
    "extendRes/items2/akagi_table.jpg": [ItemType.Deco_TableCloth, "tablecloth_akagi.jpg"],
    "extendRes/items2/huiye_liqi.jpg": [ItemType.Deco_LiZhiBang, "liqi_kaguya.jpg"],
    "extendRes/items2/huiye_liqi_effect.jpg": [ItemType.Deco_Effect_LiZhi, "effect_liqi_kaguya.jpg"],
    "extendRes/items2/huiye_pai.jpg": [ItemType.Deco_MJPai, "mjp_kaguya.jpg"],
    "extendRes/items2/huiye_ron.jpg": [ItemType.Deco_Effect_HuPai, "ron_kaguya.jpg"],
    "extendRes/items2/huiye_table.jpg": [ItemType.Deco_TableCloth, "tablecloth_kaguya.jpg"],
    "extendRes/items2/kuangdu_liqi.jpg": [ItemType.Deco_LiZhiBang, "liqi_kuangdu.jpg"],
    "extendRes/items2/kuangdu_liqi_effect.jpg": [ItemType.Deco_Effect_LiZhi, "effect_liqi_kuangdu.jpg"],
    "extendRes/items2/kuangdu_pai.jpg": [ItemType.Deco_MJPai, "mjp_kuangdu.jpg"],
    "extendRes/items2/kuangdu_ron.jpg": [ItemType.Deco_Effect_HuPai, "ron_kuangdu.jpg"],
    "extendRes/items2/kuangdu_table.jpg": [ItemType.Deco_TableCloth, "tablecloth_kuangdu.jpg"],
    "extendRes/items2/saki_liqi.jpg": [ItemType.Deco_LiZhiBang, "liqi_saki.jpg"],
    "extendRes/items2/saki_liqi_effect.jpg": [ItemType.Deco_Effect_LiZhi, "effect_liqi_saki.jpg"],
    "extendRes/items2/saki_pai.jpg": [ItemType.Deco_MJPai, "mjp_saki.jpg"],
    "extendRes/items2/saki_ron.jpg": [ItemType.Deco_Effect_HuPai, "ron_saki.jpg"],
    "extendRes/items2/saki_table.jpg": [ItemType.Deco_TableCloth, "tablecloth_saki.jpg"],
    "extendRes/items2/tablecloth_2108event.jpg": [ItemType.Deco_TableCloth, "tablecloth_21fish.jpg"],
    "extendRes/items2/xiongmao_0.png": [ItemType.Activity, ""],
    "extendRes/items/wine0_2.jpg": [ItemType.Main, ""],
    "extendRes/items/wine1_2.jpg": [ItemType.Main, ""],
    "extendRes/items/wine1_limit_2.jpg": [ItemType.Main, ""],
    "extendRes/items/wine2_2.jpg": [ItemType.Main, ""],
    "extendRes/items/wine2_limit_2.jpg": [ItemType.Main, ""],
    "extendRes/items2/kirins1en_item.jpg": [ItemType.None, ""],
    "extendRes/items2/team2109.jpg": [ItemType.Deco_HeadFrame, "headframe_team2109.jpg"],
};

function createItemsMap() {
    const items: KeyMap<ItemType> = {};
    const unusedItems: KeyMap<[ItemType, string]> = {};
    const activityItems: KeyMap<ItemType> = {};
    langType.forEach(lang => {
        const prefix = path.join(resDir, lang, "/");
        const itemsTexs = getAllFile(
            path.join(prefix, "extendRes/items"),
            name => name.endsWith(".png") || name.endsWith(".jpg"),
            filepath => replacePathSign(filepath.replace(prefix, "")),
        );
        const items2Texs = getAllFile(
            path.join(resDir, lang, "extendRes/items2"),
            name => name.endsWith(".png") || name.endsWith(".jpg"),
            filepath => replacePathSign(filepath.replace(prefix, "")),
        );
        itemsTexs.forEach(v => {
            const v1: ItemType = excelValues[v] || unusedTranslateMap[v]?.[0] || ItemType.Unused;
            items[v] = v1;
            if (v1 == ItemType.Unused) unusedItems[v] = [v1, ""];
            else if (v1 == ItemType.Activity) activityItems[v] = v1;
        });
        items2Texs.forEach(v => {
            const v1: ItemType = excelValues[v] || unusedTranslateMap[v]?.[0] || ItemType.Unused;
            items[v] = v1;
            if (v1 == ItemType.Unused) unusedItems[v] = [v1, ""];
            else if (v1 == ItemType.Activity) activityItems[v] = v1;
        });
    });
    return { items, unusedItems, activityItems };
}

function getBannerMap() {
    const bannerMap: KeyMap<BannerType> = {
        "myres2/activity_banner/interval/beishui.png": BannerType.RotationalMatch,
    };
    forEachExcel(desktop_sheets, "matchmode", ["AG"], (row, colNum, colName, value: string) => {
        if (!value) return;
        if (!value.trim()) return;
        value = replacePathSign(value.trim());
        switch (colName) {
            case "AG": bannerMap[value] = BannerType.RotationalMatch; break;
        }
    });
    forEachExcel(activity_sheets, "activity_banner", ["E", "F", "G", "H", "I"], (row, colNum, colName, value: string) => {
        if (!value) return;
        if (!value.trim()) return;
        value = replacePathSign(value.trim());
        switch (colName) {
            case "E": bannerMap[value] = BannerType.Lobby; break;
            case "F": bannerMap[value] = BannerType.Tab; break;
            case "G": bannerMap[value] = BannerType.Tab; break;
            case "H": bannerMap[value] = BannerType.Tab; break;
            case "I": bannerMap[value] = BannerType.Tab; break;
        }
    });

    const unusedBanner: KeyMap<string> = {};
    langType.forEach(lang => {
        const prefix = path.join(resDir, lang, "/");
        const bannerTexes = getAllFile(
            path.join(prefix, "myres2/activity_banner"),
            name => name.endsWith(".png") || name.endsWith(".jpg"),
            filepath => replacePathSign(filepath.replace(prefix, "")),
        );
        bannerTexes.forEach(v => {
            if (!bannerMap[v]) {
                bannerMap[v] = BannerType.Unused;
                unusedBanner[v] = BannerType.Unused;
                console.log(v);
            }
        });
    });

    const bannerItem: KeyMap<string> = {};
    for (const key in bannerMap) {
        const ele = bannerMap[key];
        const keyArr = key.split("/");
        bannerItem[key] = `${ keyArr[0] }/${ keyArr[1] }/${ ele }/${ keyArr[keyArr.length - 1] }`;
    }
    return { bannerItem, unusedBanner };
}

function build() {
    item_definition_sheets = xlsx.parse(path.join(xlsxPath, "item_definition.xlsx"));
    desktop_sheets = xlsx.parse(path.join(xlsxPath, "desktop.xlsx"));
    exchange_sheets = xlsx.parse(path.join(xlsxPath, "exchange.xlsx"));
    mall_sheets = xlsx.parse(path.join(xlsxPath, "mall.xlsx"));
    shops_sheets = xlsx.parse(path.join(xlsxPath, "shops.xlsx"));
    activity_sheets = xlsx.parse(path.join(xlsxPath, "activity.xlsx"));

    findExcelContent(item_definition_sheets, "currency", ["M", "N"], excelValues, ItemType.Main);

    //chiyuebin 309201
    //fankaijihui 309037
    //24summer1 30900044
    findExcelContent(item_definition_sheets, "item", ["U", "V"], excelValues, (data) => {
        const id = +data.id;
        if (id == 309201 || id == 309037 || id == 30900044 || id == 30900093 || id == 30900094) { //这三个图策划确认会有用，放到main里
            return ItemType.Main;
        }
        const category: ItemCategory = +data.category;
        const type = +data.type;
        let itemType: ItemType = ItemType.None;
        switch (category) {
            case ItemCategory.PuTong:
            case ItemCategory.LiWu:
            case ItemCategory.FuDai: itemType = ItemType.Main; break;
            case ItemCategory.JueSeZhuangBan: break;
            case ItemCategory.TongYongZhuangBan:
                const subType = type as unknown as ItemCategory_TongYongZhuangBan_Type;
                switch (subType) {
                    case ItemCategory_TongYongZhuangBan_Type.LiZhiBang: itemType = ItemType.Deco_LiZhiBang; break;
                    case ItemCategory_TongYongZhuangBan_Type.HuPaiTeXiao: itemType = ItemType.Deco_Effect_HuPai; break;
                    case ItemCategory_TongYongZhuangBan_Type.LiZhiTeXiao: itemType = ItemType.Deco_Effect_LiZhi; break;
                    case ItemCategory_TongYongZhuangBan_Type.ShouDeYangShi: itemType = ItemType.Deco_Hand; break;
                    case ItemCategory_TongYongZhuangBan_Type.LiZhiYinYue: itemType = ItemType.Deco_LiZhiBgm; break;
                    case ItemCategory_TongYongZhuangBan_Type.TouXiangKuang: itemType = ItemType.Deco_HeadFrame; break;
                    case ItemCategory_TongYongZhuangBan_Type.ZhuoBo:
                        itemType = ItemType.Deco_TableCloth;
                        break;
                    case ItemCategory_TongYongZhuangBan_Type.PaiBei: itemType = ItemType.Deco_MJPai; break;
                    case ItemCategory_TongYongZhuangBan_Type.DaTingBeiJing: itemType = ItemType.Deco_LobbyBackground; break;
                    case ItemCategory_TongYongZhuangBan_Type.BeiJingYinYue: itemType = ItemType.Deco_Bgm; break;
                    case ItemCategory_TongYongZhuangBan_Type.MingPaiZhiShi: itemType = ItemType.Deco_Effect_MingPaiZhiShi; break;
                    case ItemCategory_TongYongZhuangBan_Type.XianShiChengHao: break;
                    case ItemCategory_TongYongZhuangBan_Type.ChaHuaLoadingTu: break;
                    case ItemCategory_TongYongZhuangBan_Type.MaJiangPaiZhengMian: itemType = ItemType.Deco_MJFace; break;
                }
                break;
            case ItemCategory.HuoDongDaoJu: itemType = ItemType.Activity; break;
            case ItemCategory.XianShiChengHao: break;
            case ItemCategory.BuCanYuChengJiuDeZhuangBan: break;
            default:
                break;
        }
        return itemType;
    });
    findExcelContent(item_definition_sheets, "function_item", ["I", "J"], excelValues, (data) => {
        if (data.type == 2) return ItemType.Main;//月卡图标放到main里
        return ItemType.Activity;
    });
    findExcelContent(desktop_sheets, "chest", ["I"], excelValues, ItemType.Main);
    findExcelContent(exchange_sheets, "exchange", ["G"], excelValues, ItemType.Main);
    findExcelContent(exchange_sheets, "searchexchange", ["G"], excelValues, ItemType.Main);
    findExcelContent(exchange_sheets, "fushiquanexchange", ["G"], excelValues, ItemType.Main);
    findExcelContent(mall_sheets, "month_ticket", ["L"], excelValues, ItemType.Main);
    findExcelContent(mall_sheets, "goods", ["N"], excelValues, ItemType.Main);
    findExcelContent(shops_sheets, "zhp_goods", ["C"], excelValues, ItemType.Main);

    const itemsMap = createItemsMap();
    const activityItemsMap: KeyMap<ItemType> = JSON.parse(fs.readFileSync(activity_items_json).toString());
    for (const key in activityItemsMap) {
        const element = activityItemsMap[key];
        delete activityItemsMap[key];
        activityItemsMap[replacePathSign(key)] = element;
    }
    const items = { ...itemsMap.items } as KeyMap<string>;
    for (const key in items) {
        const itemType = items[key];
        const filename = unusedTranslateMap[key] && unusedTranslateMap[key][1] || path.basename(key);
        if (itemType == ItemType.Activity && activityItemsMap[key]) {
            const newPath = path.join("extendRes/items/activity", activityItemsMap[key], filename);
            items[key] = replacePathSign(newPath);
        } else {
            const newPath = path.join("extendRes/items", itemType, filename);
            items[key] = replacePathSign(newPath);
        }
    }
    const bannerMap = getBannerMap();
    const old_to_new = { ...items, ...bannerMap.bannerItem };
    const new_to_old = exchangeKeyValue(old_to_new);

    fs.writeFileSync(
        old_to_new_json,
        replacePathSign(JSON.stringify(old_to_new, null, 4), true)
    );
    fs.writeFileSync(
        new_to_old_json,
        replacePathSign(JSON.stringify(new_to_old, null, 4), true)
    );
    fs.writeFileSync(
        unsed_json,
        replacePathSign(JSON.stringify(Object.keys(itemsMap.unusedItems), null, 4), true)
    );
    fs.writeFileSync(
        unsed_banner_json,
        replacePathSign(JSON.stringify(Object.keys(bannerMap.unusedBanner), null, 4), true)
    );

    for (const key in itemsMap.activityItems) {
        if (!activityItemsMap[key]) {
            activityItemsMap[key] = ItemType.Unused;
        }
    }
    fs.writeFileSync(
        activity_items_json,
        replacePathSign(JSON.stringify(activityItemsMap, null, 4), true)
    );

}

function moveRes_2020_to_2022() {
    const allItems = JSON.parse(fs.readFileSync(old_to_new_json).toString());
    langType.forEach(lang => {
        const parentDir = path.join(resDir, lang);
        for (const key in allItems) {
            const oldPath = path.join(parentDir, key);
            if (!fs.existsSync(oldPath)) continue;
            const newPath = path.join(parentDir, allItems[key]);
            if (fs.existsSync(newPath)) {
                console.log("重名文件：", oldPath.replace(resDir, ""), newPath.replace(resDir, ""));
            }
            fs.mkdirSync(path.dirname(newPath), { recursive: true });
            fs.renameSync(oldPath, newPath);
        }
        removeEmptyDir(path.join(resDir, lang, "extendRes"));
        removeEmptyDir(path.join(resDir, lang, "myres2/activity_banner"));
    });
}

function moveRes_2022_to_2020() {
    const allItems = JSON.parse(fs.readFileSync(new_to_old_json).toString());
    langType.forEach(lang => {
        const parentDir = path.join(resDir, lang);
        for (const key in allItems) {
            const oldPath = path.join(parentDir, key);
            if (!fs.existsSync(oldPath)) continue;
            const newPath = path.join(parentDir, allItems[key]);
            if (fs.existsSync(newPath)) {
                console.log("重名文件：", oldPath.replace(resDir, ""), newPath.replace(resDir, ""));
            }
            fs.mkdirSync(path.dirname(newPath), { recursive: true });
            fs.renameSync(oldPath, newPath);
        }
        removeEmptyDir(path.join(resDir, lang, "extendRes"));
        removeEmptyDir(path.join(resDir, lang, "myres2/activity_banner"));
    });
}

build();

// moveRes_2020_to_2022();
// moveRes_2022_to_2020();
