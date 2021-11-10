const puppeteer = require('puppeteer');
let tools = require('../helper/delay');
const fs = require('fs');
const delay = require('../helper/delay');


(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1200,
        height: 1800
    })


    await page.goto('https://na.finalfantasyxiv.com/lodestone/playguide/db/item/?category2=6&page=1', {
        waitUntil: 'domcontentloaded'
    });
    const totalRecipesQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db-filter__row > div > div > div > span.total';
    const waitForTotalRecipes = await page.waitForSelector(totalRecipesQS);
    const totalRecipes = await waitForTotalRecipes.evaluate(total => total.innerText);


    // Total number of pages will be the total number of recipes divided by 50, rounded up.
    const totalNumOfPages = Math.ceil(totalRecipes / 50);
    // Array to hold the material name, icon path, and type.
    const materialsInfoArr = [];
    // Array to hold the material icon path string.
    const materialsIconArr = [];

    // Loop through the number of pages, gathering all information from the 50 rows per page.
    // Start at page 2 since we are loading into page 1. So k = 2.
    for (let k = 2; k <= totalNumOfPages; k++) {

        await scrapeRowsOneToFifty(materialsInfoArr, materialsIconArr);
        await page.goto(`https://na.finalfantasyxiv.com/lodestone/playguide/db/item/?category2=6&page=${k}`, {
            waitUntil: 'domcontentloaded'
        });

    }

    // After going through all pages and rows from the website, write to files and close the browser.
    await writeToFile(materialsInfoArr);
    await writeURLsToFile(materialsIconArr);

    await browser.close();




    // **************************************************** FUNCTIONS *****************************************************************


    // Function that will go through the 50 rows per page, gather all the material information we need and store them into arrays.
    async function scrapeRowsOneToFifty(infoArr, iconsArr) {

        // 50 Recipes per page, loop from row 1 to row 50.
        for (let i = 1; i <= 50; i++) {

            // Material Type query selector
            const materialTypeQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-table__link_txt > span > a`;
            const waitForType = await page.waitForSelector(materialTypeQS);
            const materialType = await waitForType.evaluate(craft => craft.innerText);

            // Material name query selector
            const materialNameQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-table__link_txt > a`;
            const waitForName = await page.waitForSelector(materialNameQS);
            const materialName = await waitForName.evaluate(craft => craft.innerText);

            // Material Image query selector
            const materialImageQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-list__item__icon > div > img`;
            const waitForImage = await page.waitForSelector(materialImageQS);
            const materialImage = await waitForImage.evaluate(img => img.src);

            console.log(materialName + ", " + await createImagePath(materialName) + ", " + materialType);

            // Push the image url to the icons array.
            iconsArr.push(materialImage);
            // Push the sql formatted material infor to the array.
            infoArr.push(materialName + ", " + await createImagePath(materialName) + ", " + materialType);

            await tools.delay(500);

        }
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

    // Function that will write the material info to a file.
    async function writeToFile(materialsArr) {

        fs.writeFile('materials.txt',
            materialsArr.map((value, index) => {
                // Use index as an ID key.
                let materialID = index + 1;
                if (index === 0) {
                    return "(" + materialID + ", " + value + ")";
                } else {
                    return "\n" + "(" + materialID + ", " + value + ")";
                }
            }),
            (error) => {

                if (error) throw err;
            })
    }

    // Function that will create a path name for the materials icon to store into the Database.
    async function createImagePath(materialName) {

        return "../../assets/material-icons/" + materialName.replace(/\s+/g, '-').toLowerCase() + ".png";
    }

})();
