import cheerio from "cheerio";
import fs from "fs";
import https from "https";
import pkg from "date-fns";

const { format, addDays, compareDesc } = pkg;
const sleep = () =>
  new Promise((resolve) => setTimeout(resolve, Math.Random * 100));

class OSCNScraper {
  baseURL = "https://www.oscn.net/applications/oscn/";
  startDate = new Date(2021, 6, 1); // month is zero indexed, start of the year;
  endDate = new Date();
  evictionText = RegExp("FORCIBLE ENTRY & DETAINER");

  main = async () => {
    let searchDate = this.startDate;
    // loop through dates
    while (compareDesc(searchDate, this.endDate) > 0) {
      const url = this.getSearchUrl(searchDate);
      const reportPage = await this.getPage(url);

      console.log(`searching for cases on ${format(searchDate, "MM/dd/yyyy")}`);
      await this.searchDayReportPage(
        reportPage,
        format(searchDate, "MM-dd-yyyy")
      );

      searchDate = addDays(searchDate, 1);
    }
  };

  getPage = async (url) => {
    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk.toString();
          });
          res.on("end", () => {
            resolve(data);
          });
          res.on("error", async () => {
            console.log(error);
            await sleep();
            return await this.getPage(url);
          });
        })
        .on("error", async (error) => {
          console.log(error);
          await sleep();
          return await this.getPage(url);
        });
    });
  };

  downloadFile = async (url, dateString, caseNumber, barcode) => {
    return new Promise((resolve, reject) => {
      const directory = `./files/${dateString}`;

      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory);
      }

      const file = fs.createWriteStream(
        `${directory}/${caseNumber}-${barcode}.tif`
      );

      https
        .get(url, (res, reject) => {
          res.pipe(file);
          res.on("error", async () => {
            console.log(error);
            await sleep();
            return await this.downloadFile(
              url,
              dateString,
              caseNumber,
              barcode
            );
          });
        })
        .on("error", async (error) => {
          console.log(error);
          await sleep();
          return await this.downloadFile(url, dateString, caseNumber, barcode);
        });
    });
  };

  getSearchUrl = (date) => {
    const urlEncodedDate = encodeURI(format(date, "MM/dd/yyyy"));
    return `${this.baseURL}report.asp?report=WebJudicialDocketEventAll&errorcheck=true&database=&db=Oklahoma&EventCode=72440&StartDate=${urlEncodedDate}&GeneralNumber=1&generalnumber1=1`;
  };

  searchDayReportPage = async (pageContent, dateString) => {
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
        const barcode = queryParams[queryParams.length - 1].split("=")[1];
        const caseNumber = queryParams[queryParams.length - 3].split("=")[1];
        const fileURL = `${this.baseURL}${imageUrl}`;

        await this.downloadFile(fileURL, dateString, caseNumber, barcode);
      });
    }
  };
}

const scraper = new OSCNScraper();

scraper.main();
