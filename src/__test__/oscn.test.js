const OSCNScraper = require("../index");

beforeAll(() => {});
describe("oscn scraper", () => {
    describe("date validation", () => {
        it("should throw an error when start is after the end", () => {
            const start = new Date(2021, 1, 1);
            const end = new Date(2020, 1, 1);

            const scraper = new OSCNScraper();

            expect(scraper.main(start, end)).rejects.toThrow();
        });

        it("should throw an error when start is not valid", () => {
            const start = new Date("foo");
            const end = new Date(2022, 1, 1);

            const scraper = new OSCNScraper();

            expect(scraper.main(start, end)).rejects.toThrow();
        });

        it("should throw an error when end is not a valid date", () => {
            const start = new Date(2020, 0, 1);
            const end = new Date("bar");

            const scraper = new OSCNScraper();

            expect(scraper.main(start, end)).rejects.toThrow();
        });
    });

    describe("main", () => {
        it("should loop through dates", async () => {
            const start = new Date(2020, 0, 1);
            const end = new Date(2020, 0, 10);

            const scraper = new OSCNScraper();

            scraper.getPage = jest
                .fn()
                .mockResolvedValue("<h1>hello world</h1>");
            scraper.searchDayReportPage = jest.fn().mockResolvedValue(null);

            await scraper.main(start, end);

            expect(scraper.getPage).toHaveBeenCalledTimes(9);
            expect(scraper.searchDayReportPage).toHaveBeenCalledTimes(9);
        });
    });
});
