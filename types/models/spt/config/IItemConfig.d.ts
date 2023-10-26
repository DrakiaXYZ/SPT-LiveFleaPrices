import { IBaseConfig } from "./IBaseConfig";
export interface IItemConfig extends IBaseConfig {
    kind: "aki-item";
    /** Items that should be globally blacklisted */
    blacklist: string[];
    /** Items that can only be found on bosses */
    bossItems: string[];
}
