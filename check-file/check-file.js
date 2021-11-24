const fs = require("fs");
let timer = require('../scrape/helper/delay');
let db = require('../database/connect-to-database');


// Connect to the database.
db.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});



let notExistingArr = [];

for (let i = 1; i <= 7000; i++) {

    db.query(`SELECT icon, name FROM materials WHERE material_id = '${i}'`, async function (err, material) {
        try {


            const path = material[0].icon;


            if (fs.existsSync(path)) {


            } else {
                console.log(path)
                notExistingArr.push(material[0].name)
                console.log(material[0].name)
                console.log(notExistingArr.length);
            }
            return;
        } catch (err) {
        }


    });
}

