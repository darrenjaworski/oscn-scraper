import cheerio from "cheerio";
import fs from "fs";
import https from "https";
import fetch from "node-fetch";
import pkg from "date-fns";

const { format, addDays, compareDesc } = pkg;

class OSCNScraper {
  baseURL = "https://www.oscn.net/applications/oscn/";
  startDate = new Date(2020, 0, 1); // month is zero indexed, start of the year;
  endDate = new Date();
  evictionText = RegExp("FORCIBLE ENTRY & DETAINER");

  main = async () => {
    let searchDate = this.startDate;
    // loop through dates
    while (compareDesc(searchDate, this.endDate) > 0) {
      const url = this.getSearchUrl(searchDate);
      console.log(url);
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
    let body = "";
    let response = undefined;

    try {
      response = await fetch(url);
      body = await response.text();

      return body;
    } catch (error) {
      console.log(error);
    }

    return body;
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

      console.log(`searching page ${link} for evictions`);
      for (let index = 0; index < textTags.length; index++) {
        const tag = textTags[index];
        const text = $(tag).text();
        hasForcibleEntry = this.evictionText.test(text);

        if (hasForcibleEntry) break;
      }

      if (!hasForcibleEntry) break;

      console.log(`${link} has an eviction`);
      console.log("searching page for files");

      $link(".docketEntry a").each((i, e) => {
        const imageUrl = $(e).attr("href");
        const queryParams = imageUrl.split("&");
        const barcode = queryParams[queryParams.length - 1].split("=")[1];
        const caseNumber = queryParams[queryParams.length - 3].split("=")[1];
        const fileLocation = `${this.baseURL}${imageUrl}`;

        try {
          console.log(`grabbing file from ${fileLocation}`);
          const file = fs.createWriteStream(
            `./files/${dateString}-${caseNumber}-${barcode}.tif`
          );

          https.get(fileLocation, (res) => {
            res.pipe(file);
          });
        } catch (error) {
          console.log(error);
        }
      });
    }
  };
}

const scraper = new OSCNScraper();
scraper.main();
