module.exports = {
    getNumOfRows: async function (currentPage) {
        // Recipe Rows Starting query selector
        const recipeStartRowsQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db-filter__row > div.pager > div > div > span.show_start';
        const waitForStart = await currentPage.waitForSelector(recipeStartRowsQS);
        const rowStartNum = await waitForStart.evaluate(start => start.innerText);

        // Recipe Rows End query selector
        const recipeEndRowsQS = '#eorzea_db > div.clearfix > div.db_cnts > div.db-filter__row > div.pager > div > div > span.show_end';
        const waitForEnd = await currentPage.waitForSelector(recipeEndRowsQS);
        const rowEndNum = await waitForEnd.evaluate(end => end.innerText);

        // Variable that will tell us how many rows are on that page so we will know how many iterations we need for our loop.
        let numOfRows = (parseInt(rowEndNum) - parseInt(rowStartNum)) + 1;

        return numOfRows;


    }
}