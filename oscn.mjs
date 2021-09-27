import cheerio from "cheerio";
import DateFns from "date-fns";
import fs from "fs";
import https from "https";

const { format, addDays, compareDesc } = DateFns;
const sleep = () =>
    new Promise((resolve) => setTimeout(resolve, Math.random() * 2000));

class OSCNScraper {
    baseURL = "https://www.oscn.net/applications/oscn/";
    startDate = new Date(2017, 0, 1); // month is zero indexed, start of the year;
    endDate = new Date();
    evictionText = RegExp("FORCIBLE ENTRY & DETAINER");

    main = async () => {
        let searchDate = this.startDate;
        // loop through dates
        while (compareDesc(searchDate, this.endDate) > 0) {
            const url = this.getSearchUrl(searchDate);
            const reportPage = await this.getPage(url);

            await this.searchDayReportPage(
                reportPage,
                format(searchDate, "MM-dd-yyyy")
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
                    if ((attempts = 5)) {
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
        dateString,
        caseNumber,
        barcode,
        attempt = 0
    ) => {
        const dateParts = dateString.split("-");
        const directory = `./files/${dateParts[2]}/${dateParts[0]}-${dateParts[1]}`;

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        const file = fs.createWriteStream(
            `${directory}/${caseNumber}-${barcode}.tif`
        );

        https
            .get(url, (res, reject) => {
                res.pipe(file);
            })
            .on("error", async (error) => {
                console.log(error);
                if ((attempts = 5)) {
                    console.log(
                        `Tried to get page ${url} five times and failed.`
                    );
                    return;
                }
                await sleep();
                return await this.downloadFile(
                    url,
                    dateString,
                    caseNumber,
                    barcode,
                    attempt + 1
                );
            });
    };

    getSearchUrl = (date) => {
        const urlEncodedDate = encodeURI(format(date, "MM/dd/yyyy"));
        return `${this.baseURL}report.asp?report=WebJudicialDocketEventAll&errorcheck=true&database=&db=Oklahoma&EventCode=72440&StartDate=${urlEncodedDate}&GeneralNumber=1&generalnumber1=1`;
    };

    searchDayReportPage = async (pageContent, dateString) => {
        console.log(`searching for cases on ${dateString}`);

        const $ = cheerio.load(pageContent);
        let links = [];

        $(".clspg a").each((i, e) => {
            links.push($(e).attr("href"));
        });

        for (let index = 0; index < links.length; index++) {
            const link = links[index];

            const linkPage = await this.getPage(`${this.baseURL}${link}`);
            const $link = cheerio.load(linkPage);

            let hasForcibleEntry = false;

            const textTags = $link(".docketEntry font > font");

            for (let index = 0; index < textTags.length; index++) {
                const tag = textTags[index];
                const text = $(tag).text();
                hasForcibleEntry = this.evictionText.test(text);

                if (hasForcibleEntry) break;
            }

            if (!hasForcibleEntry) continue;

            $link(".docketEntry a").each(async (i, e) => {
                const imageUrl = $(e).attr("href");
                const queryParams = imageUrl.split("&");
                const barcode =
                    queryParams[queryParams.length - 1].split("=")[1];
                const caseNumber =
                    queryParams[queryParams.length - 3].split("=")[1];
                const fileURL = `${this.baseURL}${imageUrl}`;

                await this.downloadFile(
                    fileURL,
                    dateString,
                    caseNumber,
                    barcode
                );
            });
        }
    };
}

const scraper = new OSCNScraper();

scraper.main();
