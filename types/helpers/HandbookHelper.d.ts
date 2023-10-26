import { DatabaseServer } from "../servers/DatabaseServer";
declare class LookupItem<T, I> {
    readonly byId: Map<string, T>;
    readonly byParent: Map<string, I[]>;
    constructor();
}
export declare class LookupCollection {
    readonly items: LookupItem<number, string>;
    readonly categories: LookupItem<string, string>;
    constructor();
}
export declare class HandbookHelper {
    protected databaseServer: DatabaseServer;
    protected lookupCacheGenerated: boolean;
    protected handbookPriceCache: LookupCollection;
    constructor(databaseServer: DatabaseServer);
    /**
     * Create an in-memory cache of all items with associated handbook price in handbookPriceCache class
     */
    hydrateLookup(): void;
    /**
     * Get price from internal cache, if cache empty look up price directly in handbook (expensive)
     * If no values found, return 1
     * @param tpl item tpl to look up price for
     * @returns price in roubles
     */
    getTemplatePrice(tpl: string): number;
    /**
     * Get all items in template with the given parent category
     * @param parentId
     * @returns string array
     */
    templatesWithParent(parentId: string): string[];
    /**
     * Does category exist in handbook cache
     * @param category
     * @returns true if exists in cache
     */
    isCategory(category: string): boolean;
    /**
     * Get all items associated with a categories parent
     * @param categoryParent
     * @returns string array
     */
    childrenCategories(categoryParent: string): string[];
    /**
     * Convert non-roubles into roubles
     * @param nonRoubleCurrencyCount Currency count to convert
     * @param currencyTypeFrom What current currency is
     * @returns Count in roubles
     */
    inRUB(nonRoubleCurrencyCount: number, currencyTypeFrom: string): number;
    /**
     * Convert roubles into another currency
     * @param roubleCurrencyCount roubles to convert
     * @param currencyTypeTo Currency to convert roubles into
     * @returns currency count in desired type
     */
    fromRUB(roubleCurrencyCount: number, currencyTypeTo: string): number;
}
export {};
