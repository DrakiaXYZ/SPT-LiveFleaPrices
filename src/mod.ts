import type { DependencyContainer } from "tsyringe";

import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type { IPostDBLoadModAsync } from "@spt/models/external/IPostDBLoadModAsync";
import type { DatabaseServer } from "@spt/servers/DatabaseServer";
import type { RagfairPriceService } from "@spt/services/RagfairPriceService";
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
        const priceTable = databaseServer.getTables().templates.prices;
        const itemTable = databaseServer.getTables().templates.items;
        const handbookTable = databaseServer.getTables().templates.handbook;
        let prices: Record<string, number>;

        // Fetch the latest prices.json if we're triggered with fetch enabled, or the prices file doesn't exist
        if (fetchPrices || !fs.existsSync(Mod.pricesPath))
        {
            logger.info("Fetching Flea Prices...");
            const response = await fetch("https://raw.githubusercontent.com/DrakiaXYZ/SPT-LiveFleaPriceDB/main/prices.json");

            // If the request failed, disable future updating
            if (!response?.ok)
            {
                logger.error(`Error fetching flea prices: ${response.status} (${response.statusText})`);
                clearInterval(Mod.updateTimer);
                return false;
            }

            prices = await response.json();

            // Store the prices to disk for next time
            fs.writeFileSync(Mod.pricesPath, JSON.stringify(prices));

            // Update config file with the next update time
            Mod.config.nextUpdate = Math.floor(Date.now() / 1000) + 3600;
            fs.writeFileSync(Mod.configPath, JSON.stringify(Mod.config, null, 4));
        }
        // Otherwise, read the file from disk
        else
        {
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
                logger.debug(`Item ${itemId} was skipped due to it being blacklisted.`)
                continue;
            }

            let basePrice = Mod.originalPrices[itemId];
            if (!basePrice)
            {
                basePrice = handbookTable.Items.find(x => x.Id === itemId)?.Price ?? 0;
            }

            const maxPrice = basePrice * Mod.config.maxIncreaseMult;
            if (maxPrice !== 0 && prices[itemId] <= maxPrice)
            {
                priceTable[itemId] = prices[itemId];
            }
            else
            {
                logger.debug(`Setting ${itemId} to ${maxPrice} instead of ${prices[itemId]} due to over inflation`);
                priceTable[itemId] = maxPrice;
            }
        }

        // Refresh dynamic price cache.
        ragfairPriceService.refreshDynamicPrices();

        logger.info("Flea Prices Updated!");

        return true;
    }
}

interface Config 
{
    nextUpdate: number,
    maxIncreaseMult: number,
}

module.exports = { mod: new Mod() }