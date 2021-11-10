const fs = require('fs');
module.exports = {
    delay: function (time) {
        return new Promise(function (resolve) {
            setTimeout(resolve, time)
        })
    },
    downloadIcon: async function (browser, url, folderName, name) {
        const page2 = await browser.newPage();

        const viewSource = await page2.goto(url);

        fs.writeFile(`../${folderName}/${name}.png`, await viewSource.buffer(), function (err) {
            if (err) {
                return console.log(err);
            }

            console.log("The file was saved!");
        });
        await page2.close();
    }
}
