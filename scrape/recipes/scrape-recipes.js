const puppeteer = require('puppeteer');
const fs = require('fs');
let rows = require('../helper/num-of-rows');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1200,
        height: 1800
    })

    const URL = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/recipe/?category2=7&page=';


    await page.goto(URL + '1', {
        waitUntil: 'domcontentloaded'
    });

    const totalRecipesQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db-filter__row > div > div > div > span.total';
    const waitForTotalRecipes = await page.waitForSelector(totalRecipesQS);
    const totalRecipes = await waitForTotalRecipes.evaluate(total => total.innerText);

    // Total number of pages will be the total number of recipes divided by 50, rounded up.
    const totalNumOfPages = Math.ceil(totalRecipes / 50);

    // Array to hold the material icon path string.
    const recipesIconArr = [];

    // Variable that will be collect all recipe data and format it into mysql insertion string.
    let mysqlString = "";

    // Array that will hold all the sql formatted recipes.
    const mySQLArray = [];

    // Scrape the rows on the first page, then start the loop since we need a page.goto before starting the loop.
    await scrapeRows(recipesIconArr);



    // Loop through the number of pages, gathering all information from each row.
    // Start at page 2 since we are loading into page 1. So k = 2.
    for (let k = 2; k <= totalNumOfPages; k++) {

        console.log('-------------' + 'Page ' + k + '----------------');
        await page.goto(URL + `${k}`, {
            waitUntil: 'domcontentloaded'
        });
        await scrapeRows(recipesIconArr);
    }

    // After going through all pages and rows from the website, write to files and close the browser.
    await writeToFile(mySQLArray);
    await writeURLsToFile(recipesIconArr);

    await browser.close();




    // **************************************************** FUNCTIONS *****************************************************************

    async function scrapeRows(iconsArr) {


        let totalRows = await rows.getNumOfRows(page);


        // Iterate through the number of rows on that page collecting data.
        for (let i = 1; i <= totalRows; i++) {

            console.log("Current Row:  " + i);
            console.log('------------------------------');


            let recipeLevelQS = `#character > tbody > tr:nth-child(${i}) > td:nth-child(2)`;
            const waitForRecipeLevel = await page.waitForSelector(recipeLevelQS);
            const recipeLevel = await waitForRecipeLevel.evaluate(rlevel => rlevel.innerText);

            let recipeItemLevelQS = `#character > tbody > tr:nth-child(${i}) > td:nth-child(3)`;
            const waitForItemLevel = await page.waitForSelector(recipeItemLevelQS);
            const itemLevel = await waitForItemLevel.evaluate(ilevel => ilevel.innerText);

            await concatOnMySQLString(recipeLevel);




            // If the item level of the recipe comes back as a -, then it will be turned into null.
            if (itemLevel === "-") {

                await concatOnMySQLString("null");

            } else {

                await concatOnMySQLString(itemLevel);
            }

            let recipeTypeQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-table__link_txt > span:nth-child(3)`


            // Not all recipes have a type, so if it doesn't exist then make it a type of null.
            if (await page.$(recipeTypeQS) !== null) {

                const waitForRecipeType = await page.waitForSelector(recipeTypeQS);
                const recipeType = await waitForRecipeType.evaluate(type => type.innerText);

                await concatOnMySQLString(recipeType);
            } else {

                await concatOnMySQLString("null");
            }


            // Click on link to get recipe details, call getRecipeRequirements, then once done go back to list page.
            await page.click(`#character > tbody > tr:nth-child(${i}) div.db-table__link_txt > a`);
            // Image query selector
            let imageQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__item__header.clearfix > div.db-view__item__icon.latest_patch__major__detail__item > img.db-view__item__icon__item_image.sys_nq_element';
            const waitForImage = await page.waitForSelector(imageQS);
            const iconImageURL = await waitForImage.evaluate(img => img.src);


            // Push icon url to the icons array
            iconsArr.push(iconImageURL);

            await getRecipeRequirements(mysqlString);
            await page.goBack();

        }
    }



    // Function that will gather the recipe icon, materials, crystals, and how many are rewarded when successfully crafted.
    async function getRecipeRequirements() {

        // Recipe Name query selector
        let recipeNameQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__item__header.clearfix > div.db-view__item__text > h2';
        const waitForName = await page.waitForSelector(recipeNameQS);
        const recipeName = await waitForName.evaluate(name => name.innerText);
        await concatOnMySQLString(await createImagePath(recipeName));
        await concatOnMySQLString(recipeName);


        // Total Crafted query selector
        let totalCraftedQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div.db-tree__data_header > div > p > span';
        const waitForTotal = await page.waitForSelector(totalCraftedQS);
        const totalCrafted = await waitForTotal.evaluate(total => total.innerText);
        await concatOnMySQLString(totalCrafted);


        // Crafting materials query selector
        const materialsQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(3) > div > div.js__material';
        const totalMaterials = (await page.$$(materialsQS)).length;
        const maxNumOfMaterials = 6;


        // Starting at position 2 cause the website doesn't start at 1 for some reason, so +1 to the end to compensate.
        for (let i = 2; i <= totalMaterials + 1; i++) {

            let materialQuantityQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(3) > div > div:nth-child(${i}) > div > span > span`;
            const waitForQuantities = await page.waitForSelector(materialQuantityQS);
            const quantity = await waitForQuantities.evaluate(qty => qty.innerText);

            let marterialNameQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(3) > div > div:nth-child(${i}) > div.db-view__data__reward__item__name.js__trigger_icons > div > a`;
            const waitForNames = await page.waitForSelector(marterialNameQS);
            const materialName = await waitForNames.evaluate(name => name.innerText);

            await concatOnMySQLString(materialName);
            await concatOnMySQLString(quantity);
        }

        // Once all required material fields are complete, fill the rest with nulls.
        await concatOnMySQLString(fillRemainingFields((maxNumOfMaterials - totalMaterials)));

        // Crafting Crystals query selector
        const crystalsQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(4) > div > div ';
        const totalCrystals = (await page.$$(crystalsQS)).length;
        const maxNumOfCrystals = 2;

        for (let z = 2; z <= totalCrystals + 1; z++) {
            let crystalQuantitiesQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(4) > div > div:nth-child(${z}) > div.db-view__data__reward__item__name > span`;
            const waitForQuantities = await page.waitForSelector(crystalQuantitiesQS);
            const quantity = await waitForQuantities.evaluate(qty => qty.innerText);

            let crystalNameQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(4) > div > div:nth-child(${z}) > div.db-view__data__reward__item__name > div > a > strong`;
            const waitForCrystals = await page.waitForSelector(crystalNameQS);
            const crystalName = await waitForCrystals.evaluate(name => name.innerText);

            await concatOnMySQLString(crystalName);
            await concatOnMySQLString(quantity);

        }

        // Once all required crystal fields are complete, fill the rest with nulls.
        await concatOnMySQLString(fillRemainingFields((maxNumOfCrystals - totalCrystals)));


        // Recipe Level|Item Level|Recipe Type|Recipe Name|Total Crafted|Material1 Name|Qty|Material2 Name|Qty|Material3 Name|Qty|Material4 Name|Qty|Material5 Name|Qty|Material6 Name|Qty|Crystal1 Name|Qty|Crystal2 Name|Qty'

        // Trim any white spaces on the string and remove the last character which will be an extra comma.
        let formattedSQL = mysqlString.trim().slice(0, -1);
        mySQLArray.push(formattedSQL);



        // Reset mysqlString back to an empty string;
        mysqlString = "";
    }
    // Function that will create a path name for the materials icon to store into the Database.
    function createImagePath(recipeName) {

        return "../../assets/recipe-icons/" + recipeName.replace(/\s+/g, '-').toLowerCase() + ".png";
    }

    // A single recipe can have up to six materials. If the current recipe doesn't require all 6 slots, we will fill them with nulls.
    function fillRemainingFields(remainingNumOfFields) {
        let fieldsArray = [];
        for (let i = 0; i < remainingNumOfFields; i++) {
            // The fields being filled are material/crystal name and the quantity.
            fieldsArray.push("null");
            fieldsArray.push("null");
        }

        return fieldsArray;
    }

    function concatOnMySQLString(field) {
        if (Array.isArray(field)) {
            field.map((value) => {
                return mysqlString += value + ", ";
            })
        } else {
            mysqlString += field + ", ";
        }

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