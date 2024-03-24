import { MinMax } from "@spt-aki/models/common/MinMax";
import { IBaseConfig } from "@spt-aki/models/spt/config/IBaseConfig";
import { LootRequest } from "@spt-aki/models/spt/services/LootRequest";
export interface ITraderConfig extends IBaseConfig {
    kind: "aki-trader";
    updateTime: UpdateTime[];
    purchasesAreFoundInRaid: boolean;
    /** Should trader reset times be set based on server start time (false = bsg time - on the hour) */
    tradersResetFromServerStart: boolean;
    updateTimeDefault: number;
    traderPriceMultipler: number;
    /** Keep track of purchased trader-limited items beyond server restarts to prevent server-restart item scumming */
    persistPurchaseDataInProfile: boolean;
    fence: FenceConfig;
}
export interface UpdateTime {
    traderId: string;
    /** Seconds between trader resets */
    seconds: MinMax;
}
export interface FenceConfig {
    discountOptions: DiscountOptions;
    partialRefreshTimeSeconds: number;
    partialRefreshChangePercent: number;
    assortSize: number;
    weaponPresetMinMax: MinMax;
    equipmentPresetMinMax: MinMax;
    itemPriceMult: number;
    presetPriceMult: number;
    armorMaxDurabilityPercentMinMax: IItemDurabilityCurrentMax;
    weaponDurabilityPercentMinMax: IItemDurabilityCurrentMax;
    chancePlateExistsInArmorPercent: number;
    /** Key: item tpl */
    itemStackSizeOverrideMinMax: Record<string, MinMax>;
    itemTypeLimits: Record<string, number>;
    /** Prevent duplicate offers of items of specific categories by parentId*/
    preventDuplicateOffersOfCategory: string[];
    regenerateAssortsOnRefresh: boolean;
    /** Max rouble price before item is not listed on flea */
    itemCategoryRoublePriceLimit: Record<string, number>;
    /** Each slotid with % to be removed prior to listing on fence */
    presetSlotsToRemoveChancePercent: Record<string, number>;
    /** Block seasonal items from appearing when season is inactive */
    blacklistSeasonalItems: boolean;
    blacklist: string[];
    coopExtractGift: CoopExtractReward;
    btrDeliveryExpireHours: number;
}
export interface IItemDurabilityCurrentMax {
    current: MinMax;
    max: MinMax;
}
export interface CoopExtractReward extends LootRequest {
    sendGift: boolean;
    messageLocaleIds: string[];
    giftExpiryHours: number;
}
export interface DiscountOptions {
    assortSize: number;
    itemPriceMult: number;
    presetPriceMult: number;
    weaponPresetMinMax: MinMax;
    equipmentPresetMinMax: MinMax;
}
