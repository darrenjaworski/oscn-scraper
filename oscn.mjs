import puppeteer from "puppeteer";
import cheerio from "cheerio";
import fs from "fs";
import https from "https";

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
      try {
        const link = links[index];

        const linkPage = await this.getPage(`${this.baseURL}${link}`);
        const $link = cheerio.load(linkPage);

        $link(".docketEntry a").each((i, e) => {
          try {
            const imageUrl = $(e).attr("href");
            const caseName = imageUrl.split("=").pop();
            const fileLocation = `${this.baseURL}${imageUrl}`;
            const file = fs.createWriteStream(`./files/${caseName}.tiff`);
            https.get(fileLocation, (res) => {
              res.pipe(file);
            });
          } catch (error) {
            console.log("error occurred when downloading file", error);
          }
        });
      } catch (error) {
        console.log("error occurred looping through the links", error);
      }
    }
  };

  getPage = async (url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on("request", async (request) => {
      if (
        ["image", "stylesheet", "font"].indexOf(request.resourceType()) !== -1
      ) {
        await request.abort();
      } else {
        await request.continue();
      }
    });
    await page.goto(url, { waitUntil: "networkidle2" });
    const html = await page.content();
    await browser.close();

    return html;
  };
}

const scraper = new OSCNScraper();
scraper.main();
