const puppeteer = require('puppeteer');
let download = require('../helper/download-icon');
let timer = require('../helper/delay');
let db = require('../../database/connect-to-database');


// Connect to the database.
db.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1200,
        height: 1800
    })

    const itemURL = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/item/bc6baa52e6e/';


    await page.goto(itemURL, {
        waitUntil: 'domcontentloaded'
    });

    // This will be the last material id in my materials table plus 1 to start inserting.
    let materialID = 4594;


    // Scrape the rows on the first page, then start the loop since we need a page.goto before starting the loop.
    await scrapeItem();


    await browser.close();




    // **************************************************** FUNCTIONS *****************************************************************

    async function scrapeItem() {


        // Image query selector
        let imageQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db__l_main.db__l_main__view > div.db-view__item__header.clearfix > div.db-view__item__icon.latest_patch__major__detail__item > img.db-view__item__icon__item_image.sys_nq_element';
        const waitForImage = await page.waitForSelector(imageQS);
        const iconImageURL = await waitForImage.evaluate(img => img.src);

        // Material Name query selector
        let materialNameQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db__l_main.db__l_main__view > div.db-view__item__header.clearfix > div.db-view__item__text > div > h2';
        const waitForName = await page.waitForSelector(materialNameQS);
        const materialName = await waitForName.evaluate(name => name.innerText);

        let materialTypeQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db__l_main.db__l_main__view > div.db-view__item__header.clearfix > div.db-view__item__text > div > p';
        const waitForType = await page.waitForSelector(materialTypeQS);
        const materialType = await waitForType.evaluate(type => type.innerText);


        await download.downloadIcon(browser, iconImageURL, 'scrape-ffxiv-recipes/icons/materials', materialName.replace(/\s+/g, '-').toLowerCase());

        console.log(materialID);
        let materialIcon = createImagePath(materialName.replace("'", "\\'"));
        let materialNameReplaced = materialName.replace("'", "\\'")
        console.log(materialNameReplaced)
        console.log(materialIcon);
        console.log(materialType);
        console.log('\n');

        // Insert the scrapped materials into the materials table.
        db.query(`INSERT INTO materials (material_id, name, icon, type) VALUES (${materialID}, '${materialNameReplaced}', '${materialIcon}', '${materialType}')`, function (err, result) {
            if (err) throw err;
            console.log("Successfully inserted into db.")
        });

        await timer.delay(2000);

    }

    // Function that will create a path name for the materials icon to store into the Database.
    function createImagePath(materialName) {

        return "../../assets/material-icons/" + materialName.replace(/\s+/g, '-').toLowerCase() + ".png";
    }
})();