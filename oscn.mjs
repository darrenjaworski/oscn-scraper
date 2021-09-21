import cheerio from "cheerio";
import fs from "fs";
import https from "https";
import fetch from "node-fetch";

class OSCNScraper {
  baseURL = "https://www.oscn.net/applications/oscn/";
  URL =
    "report.asp?report=WebJudicialDocketEventAll&errorcheck=true&database=&db=Oklahoma&EventCode=72440&StartDate=01%2F02%2F2019&GeneralNumber=1&generalnumber1=1";

  main = async () => {
    const url = `${this.baseURL}${this.URL}`;
    const reportPage = await this.getPage(url);

    const $ = cheerio.load(reportPage);
    let links = [];
    $(".clspg a").each((i, e) => {
      links.push($(e).attr("href"));
    });

    for (let index = 0; index < links.length; index++) {
      const link = links[index];

      const linkPage = await this.getPage(`${this.baseURL}${link}`);
      console.log(`checking page ${link} for files`);
      const $link = cheerio.load(linkPage);

      $link(".docketEntry a").each((i, e) => {
        const imageUrl = $(e).attr("href");
        const queryParams = imageUrl.split("&");
        const barcode = queryParams[queryParams.length - 1].split("=")[1];
        const caseNumber = queryParams[queryParams.length - 3].split("=")[1];
        const fileLocation = `${this.baseURL}${imageUrl}`;
        console.log(`grabbing file from ${fileLocation}`);
        const file = fs.createWriteStream(
          `./files/${caseNumber}-${barcode}.tif`
        );
        try {
          https.get(fileLocation, (res) => {
            res.pipe(file);
          });
        } catch (error) {
          console.log(error);
        }
      });
    }
  };

  getPage = async (url) => {
    const response = await fetch(url);
    const body = await response.text();
    return body;
  };
}

const scraper = new OSCNScraper();
scraper.main();
