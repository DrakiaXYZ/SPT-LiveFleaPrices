import type { DependencyContainer } from "tsyringe";

import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type { IPostDBLoadModAsync } from "@spt/models/external/IPostDBLoadModAsync";
import type { DatabaseServer } from "@spt/servers/DatabaseServer";
import type { RagfairPriceService } from "@spt/services/RagfairPriceService";
import type { ConfigServer } from "@spt/servers/ConfigServer";
import type { IRagfairConfig } from "@spt/models/spt/config/IRagfairConfig";
import type { TraderHelper } from "@spt/helpers/TraderHelper";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import * as fs from "node:fs";
import * as path from "node:path";

class Mod implements IPostDBLoadModAsync 
{
    private static container: DependencyContainer;
    private static updateTimer: NodeJS.Timeout;
    private static config: Config;
    private static configPath = path.resolve(__dirname, "../config/config.json");
    private static pricesPath = path.resolve(__dirname, "../config/prices.json");

    private static blacklistPath = path.resolve(__dirname, "../config/blacklist.json")
    private static blacklist: string[];

    private static originalPrices;

    public async postDBLoadAsync(container: DependencyContainer): Promise<void> 
    {
        Mod.container = container;
        Mod.config = JSON.parse(fs.readFileSync(Mod.configPath, "utf-8"));
        Mod.blacklist = JSON.parse(fs.readFileSync(Mod.blacklistPath, "utf-8"));

        // Store a clone of the original prices table, so we can make sure things don't go too crazy
        const databaseServer = Mod.container.resolve<DatabaseServer>("DatabaseServer");
        const priceTable = databaseServer.getTables().templates.prices;
        Mod.originalPrices = structuredClone(priceTable);

        // Update prices on startup
        const currentTime = Math.floor(Date.now() / 1000);
        let fetchPrices = false;
        if (currentTime > Mod.config.nextUpdate) 
        {
            fetchPrices = true;
        }

        if (!await Mod.updatePrices(fetchPrices)) 
        {
            return;
        }

        // Setup a refresh interval to update once every hour
        Mod.updateTimer = setInterval(Mod.updatePrices, (60 * 60 * 1000));
    }

    static async updatePrices(fetchPrices = true): Promise<boolean> 
    {
        const logger = Mod.container.resolve<ILogger>("WinstonLogger");
        const databaseServer = Mod.container.resolve<DatabaseServer>("DatabaseServer");
        const ragfairPriceService = Mod.container.resolve<RagfairPriceService>("RagfairPriceService");
        const ragfairConfig = Mod.container.resolve<ConfigServer>("ConfigServer").getConfig(ConfigTypes.RAGFAIR) as IRagfairConfig;
        const traderHelper = Mod.container.resolve<TraderHelper>("TraderHelper");
        const priceTable = databaseServer.getTables().templates.prices;
        const itemTable = databaseServer.getTables().templates.items;
        const handbookTable = databaseServer.getTables().templates.handbook;
        const gameMode = Mod.config.pvePrices ? "pve" : "regular";
        const maxRetries = Mod.config.maxRetries ?? 3;
        let prices: Record<string, number>;

        // Fetch the latest prices.json if we're triggered with fetch enabled, or the prices file doesn't exist
        if (fetchPrices || !fs.existsSync(Mod.pricesPath)) 
        {
            logger.info(`[LiveFleaPrices] Fetching Flea Prices for gamemode ${gameMode}...`);

            let response;

            for (let retryCount = 1; retryCount <= maxRetries; retryCount++) {
                try {
                    response = await fetch(`https://raw.githubusercontent.com/DrakiaXYZ/SPT-LiveFleaPriceDB/main/prices-${gameMode}.json`);

                    if (response.ok) {
                        logger.info(`[LiveFleaPrices] Fetch attempt ${retryCount} successful.`);
                        break;
                    }

                    if (retryCount === maxRetries) {
                        break;
                    }

                    logger.warning(`[LiveFleaPrices] Fetch attempt ${retryCount} failed, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                } catch (error) {
                    if (retryCount === maxRetries) {
                        logger.error(`[LiveFleaPrices] Final fetch attempt failed with error: ${error.message}`);
                        break;
                    }

                    logger.warning(`[LiveFleaPrices] Fetch attempt ${retryCount} failed with error: ${error.message}, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }

            // If all retries failed, disable future updating
            if (!response?.ok) {
                logger.error(`[LiveFleaPrices] All ${maxRetries} fetch attempts failed. Last status: ${response?.status} (${response?.statusText})`);
                clearInterval(Mod.updateTimer);
                return false;
            }

            prices = await response.json();

            // Store the prices to disk for next time
            fs.writeFileSync(Mod.pricesPath, JSON.stringify(prices));

            // Update config file with the next update time
            Mod.config.nextUpdate = Math.floor(Date.now() / 1000) + 3600;

            // Add log message showing next update time
            const nextUpdateDate = new Date(Mod.config.nextUpdate * 1000);
            logger.info(`[LiveFleaPrices] Next price update scheduled for: ${nextUpdateDate.toLocaleString()}`);

            fs.writeFileSync(Mod.configPath, JSON.stringify(Mod.config, null, 4));
        }
        // Otherwise, read the file from disk
        else 
        {
            logger.info(`[LiveFleaPrices] Using cached prices.`);
            prices = JSON.parse(fs.readFileSync(Mod.pricesPath, "utf-8"));
        }

        // Loop through the new prices file, updating all prices present
        for (const itemId in prices) 
        {
            // Skip any price that doesn't exist in the item table
            if (!itemTable[itemId]) 
            {
                continue;
            }

            // Skip any item that's blacklisted
            if (Mod.blacklist.includes(itemId)) 
            {
                if (Mod.config.debug) 
                {
                    logger.debug(`[LiveFleaPrices] Item ${itemId} was skipped due to it being blacklisted.`);
                }
                continue;
            }

            let basePrice = Mod.originalPrices[itemId];
            if (!basePrice) 
            {
                basePrice = handbookTable.Items.find(x => x.Id === itemId)?.Price ?? 0;
            }

            const maxPrice = basePrice * Mod.config.maxIncreaseMult;
            if (maxPrice !== 0 && (!Mod.config.maxLimiter || prices[itemId] <= maxPrice)) 
            {
                priceTable[itemId] = prices[itemId];
            }
            else 
            {
                if (Mod.config.debug) 
                {
                    logger.debug(`[LiveFleaPrices] Setting ${itemId} to ${maxPrice} instead of ${prices[itemId]} due to over inflation`);
                }
                priceTable[itemId] = maxPrice;
            }

            // Special handling in the event `useTraderPriceForOffersIfHigher` is enabled, to fix issues selling items
            if (ragfairConfig.dynamic.useTraderPriceForOffersIfHigher) 
            {
                // If the trader price is greater than the flea price, set the flea price to 10% higher than the trader price
                const traderPrice = traderHelper.getHighestSellToTraderPrice(itemId);
                if (traderPrice > priceTable[itemId]) 
                {
                    const newPrice = Math.floor(traderPrice * 1.1);
                    if (Mod.config.debug) 
                    {
                        logger.debug(`[LiveFleaPrices] Setting ${itemId} to ${newPrice} instead of ${prices[itemId]} due to trader price`);
                    }
                    priceTable[itemId] = newPrice;
                }
            }
        }

        // Refresh dynamic price cache.
        ragfairPriceService.refreshDynamicPrices();

        return true;
    }
}

interface Config 
{
    nextUpdate: number,
    maxIncreaseMult: number,
    maxLimiter: boolean,
    pvePrices: boolean,
    debug: boolean,
    maxRetries?: number,
}

module.exports = { mod: new Mod() }