#!/usr/bin/env node
const yargs = require("yargs");
const OSCNScraper = require("./index.js");

const options = yargs
    .usage("Usage: -s <startDate> MMDDYYYY")
    .usage("-e <endDate> MMDDYYYY")
    .option("s", {
        alias: "startDate",
        describe: "Start Date",
        type: "string",
        demandOption: true,
    })
    .option("e", {
        alias: "endDate",
        describe: "End Date",
        type: "string",
        demandOption: true,
    })
    .option("q", {
        alias: "query",
        describe: "Search query (string)",
        type: "string",
        demandOption: false,
    }).argv;

// date validation
const start = new Date();
const sDate = parseInt(options.startDate.slice(2, 4));
const sYear = parseInt(options.startDate.slice(4));
const sMon = parseInt(options.startDate.slice(0, 2));

start.setDate(sDate);
start.setFullYear(sYear);
start.setMonth(sMon - 1);

const end = new Date();

const eDate = parseInt(options.endDate.slice(2, 4));
const eYear = parseInt(options.endDate.slice(4));
const eMon = parseInt(options.endDate.slice(0, 2));

end.setDate(eDate);
end.setFullYear(eYear);
end.setMonth(eMon - 1);

const searchString = options.query;

const scraper = new OSCNScraper();
scraper.main(start, end, searchString);
