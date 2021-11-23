let download = require('../helper/download-icon');
module.exports = {
    scrapeItem: async function (url, browserObject, db) {

        const page2 = await browserObject.newPage();
        await page2.goto(url, {
            waitUntil: 'domcontentloaded'
        });


        // Image query selector
        let imageQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db__l_main.db__l_main__view > div.db-view__item__header.clearfix > div.db-view__item__icon.latest_patch__major__detail__item > img.db-view__item__icon__item_image.sys_nq_element';
        const waitForImage = await page2.waitForSelector(imageQS);
        const iconImageURL = await waitForImage.evaluate(img => img.src);

        // Material Name query selector
        let materialNameQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db__l_main.db__l_main__view > div.db-view__item__header.clearfix > div.db-view__item__text > div > h2';
        const waitForName = await page2.waitForSelector(materialNameQS);
        const materialName = await waitForName.evaluate(name => name.innerText);

        let materialTypeQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db__l_main.db__l_main__view > div.db-view__item__header.clearfix > div.db-view__item__text > div > p';
        const waitForType = await page2.waitForSelector(materialTypeQS);
        const materialType = await waitForType.evaluate(type => type.innerText);


        await download.downloadIcon(browserObject, iconImageURL, 'scrape-ffxiv-recipes/icons/materials', materialName.replace(/\s+/g, '-').toLowerCase());

        // Replace all apostrophes with \s for the sql query.
        let materialIcon = createImagePath(materialName.replace("'", "\\'"));
        let materialNameFormatted = materialName.replace("'", "\\'")
        let materialTypeFormatted = materialType.replace("'", "\\'");

        // Two queries, one will get the number of rows in the materials table to know what the next material id will be.
        // Second query will be the one to insert the data into the materials table.
        db.query('SELECT COUNT(*) as count FROM materials;', (err, result) => {
            if (err) console.log("error");
            let materialID = JSON.stringify(result[0].count + 1);
            db.query(`INSERT INTO materials (material_id, name, icon, type) VALUES (${materialID}, '${materialNameFormatted}', '${materialIcon}', '${materialTypeFormatted}')`, function (err, result) {
                if (err) throw err;
                console.log("Successfully inserted into db.")
                console.log(result);

                return;
            });
            return;
        });

        function createImagePath(recipeName) {

            return "../../assets/recipe-icons/" + recipeName.replace(/\s+/g, '-').toLowerCase() + ".png";
        }


    }

}
