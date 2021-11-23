const puppeteer = require('puppeteer');
const fs = require('fs');
let rows = require('../helper/num-of-rows');
let download = require('../helper/download-icon');
let db = require('../../database/connect-to-database');
let scrape = require('../helper/scrape-item');
let timer = require('../helper/delay');


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

    // Variables to hold each disciples url so I don't have to keep copy and pasting.
    const carpenter = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/recipe/?category2=0&page=';
    const blacksmith = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/recipe/?category2=1&page=';
    const armorer = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/recipe/?category2=2&page=';
    const goldsmith = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/recipe/?category2=3&page=';
    const alchemist = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/recipe/?category2=6&page=';

    // Check Complete
    const culinarian = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/recipe/?category2=7&page=';
    const leatherworker = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/recipe/?category2=4&page=';
    const weaver = 'https://na.finalfantasyxiv.com/lodestone/playguide/db/recipe/?category2=5&page=';

    let startingPage = 2;

    const URL = armorer;

    await page.goto(URL + `${startingPage}`, {
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

    let mySQLObject = {
        id: null,
        level: null,
        itemLevel: null,
        type: null,
        icon: null,
        name: null,
        totalCrafted: null,
        link: null
    };

    let recipeID = 0;
    // Scrape the rows on the first page, then start the loop since we need a page.goto before starting the loop.
    await scrapeRows(recipesIconArr);





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
        let currentRow = 3;


        // Iterate through the number of rows on that page collecting data.
        for (let i = currentRow; i <= totalRows; i++) {


            try {


                recipeID += 1;

                mySQLObject.id = recipeID;
                console.log('------------------------------');
                console.log("Current Row:  " + recipeID);
                console.log('------------------------------');


                let recipeLevelQS = `#character > tbody > tr:nth-child(${i}) > td:nth-child(2)`;
                const waitForRecipeLevel = await page.waitForSelector(recipeLevelQS);
                const recipeLevel = await waitForRecipeLevel.evaluate(rlevel => rlevel.innerText);

                let recipeItemLevelQS = `#character > tbody > tr:nth-child(${i}) > td:nth-child(3)`;
                const waitForItemLevel = await page.waitForSelector(recipeItemLevelQS);
                const itemLevel = await waitForItemLevel.evaluate(ilevel => ilevel.innerText);

                mySQLObject.level = recipeLevel;
                mySQLObject.itemLevel = itemLevel;


                let recipeTypeQS = `#character > tbody > tr:nth-child(${i}) > td.db-table__body--light.latest_patch__major__item > div.db-table__link_txt > span:nth-child(3)`


                // Not all recipes have a type, so if it doesn't exist then make it a type of null.
                if (await page.$(recipeTypeQS) !== null) {

                    const waitForRecipeType = await page.waitForSelector(recipeTypeQS);
                    const recipeType = await waitForRecipeType.evaluate(type => type.innerText);
                    mySQLObject.recipeType = recipeType;

                }



                ///////////// Click to recipe details page  /////////////

                // Click on link to get recipe details, call getRecipeRequirements, then once done go back to list page.
                await page.click(`#character > tbody > tr:nth-child(${i}) div.db-table__link_txt > a`);
                // Image query selector
                let imageQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__item__header.clearfix > div.db-view__item__icon.latest_patch__major__detail__item > img.db-view__item__icon__item_image.sys_nq_element';
                const waitForImage = await page.waitForSelector(imageQS);
                const iconImageURL = await waitForImage.evaluate(img => img.src);

                mySQLObject.link = page.url();




                // Push icon url to the icons array
                // iconsArr.push(iconImageURL);

                // Recipe Name query selector
                let recipeNameQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__item__header.clearfix > div.db-view__item__text > h2';
                const waitForName = await page.waitForSelector(recipeNameQS);
                const recipeName = await waitForName.evaluate(name => name.innerText);


                mySQLObject.icon = createImagePath(recipeName);

                mySQLObject.name = recipeName;



                // Total Crafted query selector
                let totalCraftedQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div.db-tree__data_header > div > p > span';
                const waitForTotal = await page.waitForSelector(totalCraftedQS);
                const totalCrafted = await waitForTotal.evaluate(total => total.innerText);
                mySQLObject.totalCrafted = totalCrafted;


                // await download.downloadIcon(browser, iconImageURL, 'scrape-ffxiv-recipes/icons/culinarian', recipeName.replace(/\s+/g, '-').toLowerCase());
                console.log(recipeName.replace('', ''));
                // Gather the recipe required materials
                await getRecipeMaterials();
                // Gather the recipe required crystals
                await getRecipeCrystals();

                // console.log(formattedSQL);
                //console.log(mySQLObject)





                // Once done gathering all the necessary data, go back to the list page.
                await page.goBack();
            } catch (error) {
                console.log("Error in iteration: " + i)
            }

        }


    }



    // Function that will gather the materials required to craft the recipe.
    async function getRecipeMaterials() {

        // Crafting materials query selector
        const materialsQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(3) > div > div.js__material';
        const totalMaterials = (await page.$$(materialsQS)).length;


        // Starting at position 2 cause the website doesn't start at 1 for some reason, so +1 to the end to compensate.
        for (let i = 2; i <= totalMaterials + 1; i++) {

            try {



                let materialQuantityQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(3) > div > div:nth-child(${i}) > div > span > span`;
                const waitForQuantities = await page.waitForSelector(materialQuantityQS);
                const quantity = await waitForQuantities.evaluate(qty => qty.innerText);

                let marterialNameQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(3) > div > div:nth-child(${i}) > div.db-view__data__reward__item__name.js__trigger_icons > div > a`;
                const waitForNames = await page.waitForSelector(marterialNameQS);
                const materialName = await waitForNames.evaluate(name => name.innerText);

                let formattedMaterialName = materialName.replace("'", "\\'");

                // Get the materials id from the materials table using the material name.

                await db.query(`SELECT material_id FROM materials WHERE name = '${formattedMaterialName}'`, async function (err, material) {
                    if (err) throw error;

                    // If the material is not found within the materials table.
                    // Scrape the missing materials url and send it to the scrapeItem function.
                    // The scrapeItem function will then go to that link and scrape the require fields to be entered into the database.
                    // No longer have to error out and manually enter the url to the file!!!!
                    if (material[0] === undefined) {
                        console.log("Found undefined.")

                        let materialURLQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(3) > div > div:nth-child(${i}) > div.db-view__data__reward__item__name.js__trigger_icons > div > a`;
                        const waitForURL = await page.waitForSelector(materialURLQS);
                        const materialURL = await waitForURL.evaluate(link => link.href);
                        await scrape.scrapeItem(materialURL, browser, db);

                    } else {
                        let materialID = JSON.stringify(material[0].material_id);
                        console.log("rID  mID  qty")
                        console.log(recipeID + ", " + materialID + ", " + quantity)
                    }


                })

            } catch (error) {
                console.log("Error in iteration: " + i)
            }

            // Insert the recipe id, material id, and material quantity into the materials list table.


        }



    }

    // Function that will gather the crystals required to craft the recipe.
    async function getRecipeCrystals() {

        // Crafting Crystals query selector
        const crystalsQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(4) > div > div ';
        const totalCrystals = (await page.$$(crystalsQS)).length;

        for (let z = 2; z <= totalCrystals + 1; z++) {

            try {

                let crystalQuantitiesQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(4) > div > div:nth-child(${z}) > div.db-view__data__reward__item__name > span`;
                const waitForQuantities = await page.waitForSelector(crystalQuantitiesQS);
                const quantity = await waitForQuantities.evaluate(qty => qty.innerText);

                let crystalNameQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > div:nth-child(4) > div > div:nth-child(${z}) > div.db-view__data__reward__item__name > div > a > strong`;
                const waitForCrystals = await page.waitForSelector(crystalNameQS);
                const crystalName = await waitForCrystals.evaluate(name => name.innerText);


                db.query(`SELECT crystal_id FROM crystals WHERE name = '${crystalName}'`, function (err, result) {
                    if (err) console.log("error");

                    let crystalID = JSON.stringify(result[0].crystal_id);

                    console.log("rID  cID  qty")
                    console.log(recipeID + ", " + crystalID + ", " + quantity)
                });
            } catch (error) {
                console.log("Error in iteration: " + i)
            }

        }



    }



    // Function that will create a path name for the materials icon to store into the Database.
    function createImagePath(recipeName) {

        return "../../assets/recipe-icons/" + recipeName.replace(/\s+/g, '-').toLowerCase() + ".png";
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