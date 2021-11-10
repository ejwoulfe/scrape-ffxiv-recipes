const puppeteer = require('puppeteer');
let tools = require('../delay');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1200,
        height: 1800
    })


    await page.goto('https://na.finalfantasyxiv.com/lodestone/playguide/db/recipe/?category2=5&page=1', {
        waitUntil: 'domcontentloaded'
    });

    const totalRecipesQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db-filter__row > div > div > div > span.total';
    const waitForTotalRecipes = await page.waitForSelector(totalRecipesQS);
    const totalRecipes = await waitForTotalRecipes.evaluate(total => total.innerText);

    // Total number of pages will be the total number of recipes divided by 50, rounded up.
    const totalNumOfPages = Math.ceil(totalRecipes / 50);


    // Loop through the number of pages, gathering all information from the 50 rows per page.
    for (let k = 2; k <= totalNumOfPages; k++) {

        await scrapeRowsOneToFifty();
        await page.goto(`https://na.finalfantasyxiv.com/lodestone/playguide/db/recipe/?category2=5&page=${k}`, {
            waitUntil: 'domcontentloaded'
        });

    }




    async function scrapeRowsOneToFifty() {
        // 50 Recipes per page, loop from row 1 to row 50.
        for (let i = 1; i <= 50; i++) {


            let recipeLevelQS = `#character > tbody > tr:nth-child(${i}) > td:nth-child(2)`;
            const waitForRecipeLevel = await page.waitForSelector(recipeLevelQS);
            const recipeLevel = await waitForRecipeLevel.evaluate(rlevel => rlevel.innerText);

            let recipeItemLevelQS = `#character > tbody > tr:nth-child(${i}) > td:nth-child(3)`;
            const waitForItemLevel = await page.waitForSelector(recipeItemLevelQS);
            const itemLevel = await waitForItemLevel.evaluate(ilevel => ilevel.innerText);
            console.log('Recipe Level: ' + recipeLevel + " Item Level: " + itemLevel);

            let recipeTypeQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-table__link_txt > span:nth-child(3)`
            if (await page.$(recipeTypeQS) !== null) {
                const waitForRecipeType = await page.waitForSelector(recipeTypeQS);
                const recipeType = await waitForRecipeType.evaluate(type => type.innerText);
                console.log(recipeType);
            }



            // Click on link to get recipe details.
            await page.click(`#character > tbody > tr:nth-child(${i}) div.db-table__link_txt > a`);
            await gatherInformation();
            await page.goBack();
            await tools.delay(1000);


        }
    }




    async function gatherInformation() {
        // Image query selector
        let imageQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__item__header.clearfix > div.db-view__item__icon.latest_patch__major__detail__item > img.db-view__item__icon__item_image.sys_nq_element';


        const waitForImage = await page.waitForSelector(imageQS);
        const imageURL = await waitForImage.evaluate(img => img.src);
        console.log(imageURL);


        // Recipe Name query selector
        let recipeNameQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__item__header.clearfix > div.db-view__item__text > h2';
        const waitForName = await page.waitForSelector(recipeNameQS);
        const recipeName = await waitForName.evaluate(name => name.innerText);

        console.log('Recipe Name: ' + recipeName);

        // Total Crafted query selector
        let totalCraftedQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div.db-tree__data_header > div > p > span';
        const waitForTotal = await page.waitForSelector(totalCraftedQS);
        const totalCrafted = await waitForTotal.evaluate(total => total.innerText);

        console.log('Total Crafted: ' + totalCrafted);

        // Crafting materials query selector
        const materialsQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(3) > div > div.js__material';
        const totalMaterials = (await page.$$(materialsQS)).length;

        for (let i = 2; i <= totalMaterials + 1; i++) {

            let materialQuantityQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(3) > div > div:nth-child(${i}) > div > span > span`;
            const waitForQuantities = await page.waitForSelector(materialQuantityQS);
            const quantity = await waitForQuantities.evaluate(qty => qty.innerText);

            let marterialNameQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(3) > div > div:nth-child(${i}) > div.db-view__data__reward__item__name.js__trigger_icons > div > a`;
            const waitForNames = await page.waitForSelector(marterialNameQS);
            const materialName = await waitForNames.evaluate(name => name.innerText);

            console.log(materialName + ', ' + quantity);

        }

        // Crafting Crystals query selector
        const crystalsQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(4) > div > div ';
        const totalCrystals = (await page.$$(crystalsQS)).length;

        for (let z = 2; z <= totalCrystals + 1; z++) {
            let crystalQuantitiesQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(4) > div > div:nth-child(${z}) > div.db-view__data__reward__item__name > span`;
            const waitForQuantities = await page.waitForSelector(crystalQuantitiesQS);
            const quantity = await waitForQuantities.evaluate(qty => qty.innerText);

            let crystalNameQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(4) > div > div:nth-child(${z}) > div.db-view__data__reward__item__name > div > a > strong`;
            const waitForCrystals = await page.waitForSelector(crystalNameQS);
            const crystalName = await waitForCrystals.evaluate(name => name.innerText);

            console.log(crystalName + ", " + quantity)

        }

        console.log(page.url());



        console.log('-------------------------------');
    }

    await browser.close();
})();