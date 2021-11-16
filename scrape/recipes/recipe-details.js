// Recipe Details query selector
const recipeDetailsQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > ul > li';
const totalDetails = (await page.$$(recipeDetailsQS)).length;
// Get total number of li elements in the details container, loop through them and gather the text.
for (let j = 1; j <= totalDetails; j++) {
    let detailQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > ul > li:nth-child(${j})`;
    const waitForDetails = await page.waitForSelector(detailQS);
    const detail = await waitForDetails.evaluate(detail => detail.innerText);

    console.log(detail);

}

// Recipe Characteristics query selector
const craftsmanQS = '#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > dl > dd';
const totalCharacteristics = (await page.$$(craftsmanQS)).length;

// Get total number of dl elements in the characteristics container, loop through them and gather the text.
for (let a = 2; a <= totalCharacteristics + 1; a++) {
    let characteristicsQS = `#eorzea_db > div.clearfix > div.db_cnts > div > div.recipe_detail.item_detail_box > div.db-view__data > dl > dd:nth-child(${a})`;
    const waitForCraftsman = await page.waitForSelector(characteristicsQS);
    const craftsmanship = await waitForCraftsman.evaluate(craft => craft.innerText);
    console.log(craftsmanship);
}
