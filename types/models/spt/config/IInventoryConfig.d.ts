import { MinMax } from "../../../models/common/MinMax";
import { IBaseConfig } from "./IBaseConfig";
export interface IInventoryConfig extends IBaseConfig {
    kind: "aki-inventory";
    /** Should new items purchased by flagged as found in raid */
    newItemsMarkedFound: boolean;
    randomLootContainers: Record<string, RewardDetails>;
    sealedAirdropContainer: ISealedAirdropContainerSettings;
    /** Contains item tpls that the server should consider money and treat the same as roubles/euros/dollars */
    customMoneyTpls: string[];
}
export interface RewardDetails {
    rewardCount: number;
    foundInRaid: boolean;
    rewardTplPool?: Record<string, number>;
    rewardTypePool?: Record<string, number>;
}
export interface ISealedAirdropContainerSettings {
    weaponRewardWeight: Record<string, number>;
    defaultPresetsOnly: boolean;
    /** Should contents be flagged as found in raid when opened */
    foundInRaid: boolean;
    weaponModRewardLimits: Record<string, MinMax>;
    rewardTypeLimits: Record<string, MinMax>;
    ammoBoxWhitelist: string[];
    allowBossItems: boolean;
}
