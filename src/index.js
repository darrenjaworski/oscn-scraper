const datefns = require("date-fns");
const fs = require("fs");
const https = require("https");
const jsdom = require("jsdom");

const { JSDOM } = jsdom;
const { format, addDays, compareDesc, isAfter, isValid } = datefns;
const sleep = () =>
    new Promise((resolve) => setTimeout(resolve, Math.random() * 2000));

class OSCNScraper {
    baseURL = "https://www.oscn.net/applications/oscn/";
    evictionText = new RegExp(
        "FORCIBLE ENTRY & DETAINER|FORCIBLE ENTRY &amp; DETAINER"
    );

    startDate = new Date(2018, 0, 1); // month is zero indexed, start of the year;
    endDate = new Date();

    main = async (
        start = this.startDate,
        end = this.endDate,
        searchString = ""
    ) => {
        let searchDate = start;
        const endIsAfterStart = isAfter(start, end);

        if (endIsAfterStart) {
            throw new Error(`start - ${start} is after end - ${end}`);
        }
        if (!isValid(start)) {
            throw new Error(`start - ${start} is not a valid date`);
        }
        if (!isValid(end)) {
            throw new Error(`end - ${end} is not a valid date`);
        }

        // loop through dates
        while (compareDesc(searchDate, end) > 0) {
            const url = this.getSearchUrl(searchDate);
            const reportPage = await this.getPage(url);

            this.searchDayReportPage(
                reportPage,
                format(searchDate, "MM-dd-yyyy"),
                searchString
            );

            searchDate = addDays(searchDate, 1);
        }
    };

    getPage = async (url, attempts = 0) => {
        return new Promise((resolve) => {
            https
                .get(url, (res) => {
                    let data = "";
                    res.on("data", (chunk) => {
                        data += chunk.toString();
                    });
                    res.on("end", () => {
                        resolve(data);
                    });
                })
                .on("error", async (error) => {
                    console.log(error);
                    if (attempts == 5) {
                        console.log(
                            `Tried to get page ${url} five times and failed.`
                        );
                        return;
                    }
                    await sleep();
                    return await this.getPage(url, attempts + 1);
                });
        });
    };

    downloadFile = async (
        url,
        caseNumber,
        barcode,
        matchName = "",
        attempts = 0
    ) => {
        const topLevelDir = matchName ? `/search-term/${matchName}` : "cases";
        const directory = `./${topLevelDir}/${caseNumber}`;
        const filePath = `${directory}/${barcode}.tif`;

        if (fs.existsSync(filePath)) return;

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        const file = fs.createWriteStream(filePath);

        https
            .get(url, (res, reject) => {
                res.pipe(file);
            })
            .on("error", async (error) => {
                console.log(error);
                if (attempts == 5) {
                    console.log(
                        `Tried to get page ${url} five times and failed.`
                    );
                    return;
                }
                await sleep();
                return await this.downloadFile(
                    url,
                    caseNumber,
                    barcode,
                    matchName,
                    attempts + 1
                );
            });
    };

    getSearchUrl = (date) => {
        const urlEncodedDate = encodeURI(format(date, "MM/dd/yyyy"));
        return `${this.baseURL}report.asp?report=WebJudicialDocketEventAll&errorcheck=true&database=&db=Oklahoma&EventCode=72440&StartDate=${urlEncodedDate}&GeneralNumber=1&generalnumber1=1`;
    };

    searchDayReportPage = async (pageContent, dateString, searchString) => {
        console.log(`searching for cases on ${dateString}`);

        const searchRegEx = searchString && new RegExp(searchString, "i");
        const dom = new JSDOM(pageContent);

        let links = [...dom.window.document.querySelectorAll(".clspg")]
            .filter((row) => {
                const contentString = row.innerHTML;

                if (!searchString) return true;

                return searchRegEx.test(contentString);
            })
            .map((d) => d.querySelector("a").href);

        if (!links.length) return;

        // for each link on that days page
        for (let index = 0; index < links.length; index++) {
            const link = links[index];

            const linkPage = await this.getPage(`${this.baseURL}${link}`);
            const linkDom = new JSDOM(linkPage);

            const hasForcibleEntry = [
                ...linkDom.window.document.querySelectorAll(
                    ".docketEntry font > font"
                ),
            ]
                .map((d) => d.textContent)
                .some((d) => this.evictionText.test(d));

            if (!hasForcibleEntry) continue;

            // if eviction text then grab the files
            [...linkDom.window.document.querySelectorAll(".docketEntry a")]
                .filter((d) => d.href)
                .forEach(async (d) => {
                    const imageURL = d.href;
                    const queryParams = imageURL.split("&");
                    const barcode =
                        queryParams[queryParams.length - 1].split("=")[1];
                    const caseNumber =
                        queryParams[queryParams.length - 3].split("=")[1];
                    const fileURL = `${this.baseURL}${imageURL}`;
                    const snakeMatch = searchString
                        .replace(/\s/g, "-")
                        .toLowerCase();
                    const match = snakeMatch ? snakeMatch : "";

                    await this.downloadFile(
                        fileURL,
                        caseNumber,
                        barcode,
                        match
                    );
                });
        }
    };
}

module.exports = OSCNScraper;
