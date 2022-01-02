# oscn scraper

Make some oklahoma court records more accessible.

## getting started

To run locally you will need Node. Recommend the Node LTS version (at least version 12+) at the present time.

To run the script:

```bash
$ npm install

$ npm start
```

To clean the files:

```bash
$ npm run clean

$ npm install
```

For CLI usage:

```bash
$ npm i -g .

// to show options
$ oscn

// usage
// dates are in MMDDYYYY format
// options are --startDate or -s and --endDate or -e and --query or -q
$ oscn -s 01012020 -e 01012021 -q "Oklahoma housing authority"
```
