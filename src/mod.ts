import { DependencyContainer } from "tsyringe";

import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { IPostDBLoadModAsync } from "@spt-aki/models/external/IPostDBLoadModAsync";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import * as fs from "fs";
import * as path from "path";

class Mod implements IPostDBLoadModAsync
{
    private static container: DependencyContainer;
    private static updateTimer: any;
    private static config: any;
    private static configPath = path.resolve(__dirname, "../config/config.json");
    private static pricesPath = path.resolve(__dirname, "../config/prices.json");

    public async postDBLoadAsync(container: DependencyContainer): Promise<void> 
    {
        Mod.container = container;
        Mod.config = JSON.parse(fs.readFileSync(Mod.configPath, "utf-8"));

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
        const priceTable = databaseServer.getTables().templates.prices;
        let prices: any;

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
        }
        // Otherwise, read the file from disk
        else
        {
            prices = JSON.parse(fs.readFileSync(Mod.pricesPath, "utf-8"));
        }

        // Loop through the new prices file, updating all prices present
        for (const itemId in prices)
        {
            priceTable[itemId] = prices[itemId];
        }
        logger.info("Flea Prices Updated!");

        // Update config file with the next update time
        Mod.config.nextUpdate = Math.floor(Date.now() / 1000) + 3600;
        fs.writeFileSync(Mod.configPath, JSON.stringify(Mod.config, null, 4));

        return true;
    }
}

module.exports = { mod: new Mod() }