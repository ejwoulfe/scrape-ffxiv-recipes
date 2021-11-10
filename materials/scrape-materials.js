const puppeteer = require('puppeteer');
let tools = require('../delay');
const fs = require('fs');


(async () => {
    const browser = await puppeteer.launch({ headless: true });
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
    const materialsInfoArr = [];


    // Loop through the number of pages, gathering all information from the 50 rows per page.
    for (let k = 2; k <= 3; k++) {

        console.log(await scrapeRowsOneToFifty(materialsInfoArr));
        await page.goto(`https://na.finalfantasyxiv.com/lodestone/playguide/db/item/?category2=6&page=${k}`, {
            waitUntil: 'domcontentloaded'
        });

    }




    async function scrapeRowsOneToFifty(arr) {

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


            const materialImageQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-list__item__icon.latest_patch__major__box > div > img`;
            const waitForImage = await page.waitForSelector(materialImageQS);
            const materialImage = await waitForImage.evaluate(img => img.src);


            arr.push(materialName + ", " + await createImagePath(materialName) + ", " + materialType);

        }
        return arr;
    }

    async function writeToFile(materialsArr) {
        // Write materials information to a file.
        fs.writeFile('materials.txt',
            materialsArr.map((value, index) => {
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
    4
    async function createImagePath(materialName) {
        return "../../assets/material-icons/" + materialName.replace(/\s+/g, '-').toLowerCase() + ".png";

    }


    await writeToFile(materialsInfoArr);



    await browser.close();




})();
