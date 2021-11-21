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

    const URL = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/item/?category2=5&page=';


    await page.goto(URL + '1', {
        waitUntil: 'domcontentloaded'
    });

    const totalMaterialsQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db-filter__row > div > div > div > span.total';
    const waitForTotalMaterials = await page.waitForSelector(totalMaterialsQS);
    const totalMaterials = await waitForTotalMaterials.evaluate(total => total.innerText);

    // Total number of pages will be the total number of materials divided by 50, rounded up.
    const totalNumOfPages = Math.ceil(totalMaterials / 50);



    let materialID = 3975;


    // Scrape the rows on the first page, then start the loop since we need a page.goto before starting the loop.
    await scrapeRows();





    // Loop through the number of pages, gathering all information from each row.
    // Start at page 2 since we are loading into page 1. So k = 2.
    for (let k = 2; k <= totalNumOfPages; k++) {

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
            let imageQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-list__item__icon.latest_patch__major__box > div > img`;
            const waitForImage = await page.waitForSelector(imageQS);
            const iconImageURL = await waitForImage.evaluate(img => img.src);




            // Material Name query selector
            let materialNameQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-table__link_txt > a`;
            const waitForName = await page.waitForSelector(materialNameQS);
            const materialName = await waitForName.evaluate(name => name.innerText);

            let materialTypeQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-table__link_txt > span > a`;
            const waitForType = await page.waitForSelector(materialTypeQS);
            const materialType = await waitForType.evaluate(type => type.innerText);


            // await download.downloadIcon(browser, iconImageURL, 'scrape-ffxiv-recipes/icons/materials', materialName.replace(/\s+/g, '-').toLowerCase());

            console.log(materialID);
            let materialIcon = createImagePath(materialName.replace("'", "\\'"));
            let materialNameReplaced = materialName.replace("'", "\\'")
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



    // Function that will write the material info to a file.
    async function writeToFile(sqlArray) {

        fs.writeFile('recipes.txt', sqlArray.map((value, index) => {
            // Use index as an ID key.
            let recipeID = index + 1;
            if (index === 0) {
                return "(" + recipeID + ", " + value + ")";
            } else {
                return "\n" + "(" + recipeID + ", " + value + ")";
            }
        }),
            (error) => {

                if (error) throw err;

            })
    }

    // Function that will write the material icon urls to a file.
    async function writeURLsToFile(iconsArr) {

        fs.writeFile('icon-urls.txt',
            iconsArr.map((value, index) => {
                if (index === 0) {
                    return value;
                } else {
                    return "\n" + value;
                }
            }),
            (error) => {

                if (error) throw err;
            })

    }


})();