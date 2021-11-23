const puppeteer = require('puppeteer');
const fs = require('fs');
let rows = require('../helper/num-of-rows');
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

    const URL = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/item/?db_search_category=item&difficulty=&max_craft_lv=&category2=7&q=Ingredient&min_craft_lv=&category3=63&patch=&page=';

    let startingPage = 1;


    await page.goto(URL + `${startingPage}`, {
        waitUntil: 'domcontentloaded'
    });

    const totalMaterialsQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db-filter__row > div > div > div > span.total';
    const waitForTotalMaterials = await page.waitForSelector(totalMaterialsQS);
    const totalMaterials = await waitForTotalMaterials.evaluate(total => total.innerText);

    // Total number of pages will be the total number of materials divided by 50, rounded up.
    const totalNumOfPages = Math.ceil(totalMaterials / 50);


    // This will be the last material id in my materials table plus 1 to start inserting.
    let materialID = 6677;


    // Scrape the rows on the first page, then start the loop since we need a page.goto before starting the loop.
    await scrapeRows();





    // Loop through the number of pages, gathering all information from each row.
    // Start at page 2 since we are loading into page 1. So k = 2.
    for (let k = startingPage + 1; k <= totalNumOfPages; k++) {

        console.log('-------------' + 'Page ' + k + '----------------');
        await page.goto(URL + `${k}`, {
            waitUntil: 'domcontentloaded'
        });
        await scrapeRows();
    }


    await browser.close();




    // **************************************************** FUNCTIONS *****************************************************************

    async function scrapeRows() {


        let totalRows = await rows.getNumOfRows(page);


        // Iterate through the number of rows on that page collecting data.
        for (let i = 1; i <= totalRows; i++) {

            materialID += 1;


            console.log('------------------------------');
            console.log("Current Row:  " + i);
            console.log('------------------------------');


            // Image query selector
            let imageQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-list__item__icon > div > img`;
            const waitForImage = await page.waitForSelector(imageQS);
            const iconImageURL = await waitForImage.evaluate(img => img.src);




            // Material Name query selector
            let materialNameQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-table__link_txt > a`;
            const waitForName = await page.waitForSelector(materialNameQS);
            const materialName = await waitForName.evaluate(name => name.innerText);

            // let materialTypeQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-table__link_txt > span > a`;
            // const waitForType = await page.waitForSelector(materialTypeQS);
            // const materialType = await waitForType.evaluate(type => type.innerText);
            let materialType = 'Miscellany';



            await download.downloadIcon(browser, iconImageURL, 'scrape-ffxiv-recipes/icons/materials', materialName.replace(/\s+/g, '-').toLowerCase());

            console.log(materialID);
            let materialIcon = createImagePath(materialName.replace("'", "\\'").replace('', ''));
            let materialNameReplaced = materialName.replace("'", "\\'").replace('', '');
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


    }


    // Function that will create a path name for the materials icon to store into the Database.
    function createImagePath(materialName) {

        return "../../assets/material-icons/" + materialName.replace(/\s+/g, '-').toLowerCase() + ".png";
    }


})();