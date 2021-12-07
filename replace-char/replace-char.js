//requiring path and fs modules
const path = require('path');
const fs = require('fs');

let disciple = "leatherworker";
//joining path of directory 
const directoryPath = path.join(__dirname, `../../ffxiv-crafting-calculator/src/assets/recipe-icons/${disciple}/`);
//passsing directoryPath and callback function
fs.readdir(directoryPath, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }
    //listing all files using forEach
    files.forEach(function (file) {
        // Do whatever you want to do with the file

        if (file.includes("")) {

            fs.rename(`../../ffxiv-crafting-calculator/src/assets/recipe-icons/${disciple}/` + file, `../../ffxiv-crafting-calculator/src/assets/recipe-icons/${disciple}/` + file.replace('', ''), (err) => {
                if (err) {
                    console.log(err)
                } else {
                    console.log("File renamed.")
                }
            });


        }
    });
});

// 