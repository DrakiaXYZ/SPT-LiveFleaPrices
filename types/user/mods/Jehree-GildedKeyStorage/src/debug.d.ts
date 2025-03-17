import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type { ITemplateItem } from "@spt/models/eft/common/tables/ITemplateItem";
import type { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import type { SaveServer } from "@spt/servers/SaveServer";
import type { ItemHelper } from "@spt/helpers/ItemHelper";
export declare class Debug {
    debugConfig: any;
    constructor(debugConfig: any);
    logMissingKeys(logger: ILogger, itemHelper: ItemHelper, dbItems: Record<string, ITemplateItem>, dbLocales: Record<string, string>): void;
    logRareKeys(logger: ILogger, itemHelper: ItemHelper, dbItems: Record<string, ITemplateItem>, dbLocales: Record<string, string>): void;
    isKeyMissing(keyId: string): boolean;
    giveProfileAllKeysAndGildedCases(staticRouterModService: StaticRouterModService, saveServer: SaveServer, logger: ILogger): void;
    removeAllDebugInstanceIdsFromProfile(staticRouterModService: StaticRouterModService, saveServer: SaveServer): void;
    getArrayOfKeysAndCases(): Array<any>;
}
