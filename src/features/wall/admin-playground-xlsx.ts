import { City, Country, State } from "country-state-city";
import { cardThemes, categories, SUBCATEGORY_OPTIONS, type CardCategory } from "./types";

const PLAN_OPTIONS = [
  { label: "Free (1 day)", value: 0 },
  { label: "$2.99 — 30 days", value: 2.99 },
  { label: "$7.99 — 90 days", value: 7.99 },
  { label: "$19.99 — 90 days (premium)", value: 19.99 },
  { label: "$24.99 — 365 days", value: 24.99 },
] as const;

const DURATION_OPTIONS = [1, 7, 30, 90, 180, 365] as const;

const CSV_TEMPLATE_ROW_HEADERS = [
  "name",
  "ownerName",
  "category",
  "subcategory",
  "line",
  "message",
  "area",
  "city",
  "state",
  "country",
  "zipcode",
  "theme",
  "paidAmount",
  "featuredTier",
  "status",
  "durationDays",
  "likes",
  "clicks",
  "reviewCount",
  "phone",
  "email",
  "website",
  "location",
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "whatsapp",
  "telegram",
] as const;

type WorkbookLike = {
  addWorksheet(name: string): any;
  definedNames: { add(location: string, name: string): void };
};

export type LocationCatalog = {
  countries: Array<{ code: string; name: string }>;
  statesByCountry: Map<string, Array<{ code: string; name: string }>>;
  citiesByCountryState: Map<string, string[]>;
};

export function sanitizeExcelName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "default";
}

export function toExcelColumnLetter(index: number) {
  let n = index;
  let letter = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

export function formatLocationLabel(code: string, name: string) {
  if (code === "TR") return "TR - Türkiye";
  return `${code} - ${name}`;
}

export function getSubcategoriesForCategory(category: string) {
  return category !== "All" ? (SUBCATEGORY_OPTIONS[category as CardCategory] ?? []) : [];
}

export async function loadLocationCatalog() {
  const countries = Country.getAllCountries()
    .filter((country) => country.isoCode === "US" || country.isoCode === "TR")
    .map((country) => ({ code: country.isoCode, name: country.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const statesByCountry = new Map<string, Array<{ code: string; name: string }>>();
  const citiesByCountryState = new Map<string, string[]>();

  for (const country of countries) {
    const states = State.getStatesOfCountry(country.code)
      .map((state) => ({ code: state.isoCode, name: state.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    statesByCountry.set(country.code, states);

    for (const state of states) {
      const cities = City.getCitiesOfState(country.code, state.code).map((city) => city.name).sort((a, b) => a.localeCompare(b));
      citiesByCountryState.set(`${country.code}|${state.code}`, cities);
    }
  }

  return { countries, statesByCountry, citiesByCountryState };
}

function setRowValues(sheet: any, rowNumber: number, values: string[]) {
  values.forEach((value, colIndex) => {
    sheet.getRow(rowNumber).getCell(colIndex + 1).value = value;
  });
}

function blankTemplateRow() {
  return Array.from({ length: CSV_TEMPLATE_ROW_HEADERS.length }, () => "");
}

function buildExampleRows() {
  return [
    [
      "Downtown Dental",
      "Sunrise Dental Group",
      "Services",
      "Consulting",
      "Family dentist with same-day appointments",
      "Now accepting new patients",
      "Downtown",
      "Dallas",
      "TX - Texas",
      "US - United States",
      "75201",
      "cream",
      "24.99",
      "gold",
      "published",
      "365",
      "42",
      "390",
      "18",
      "+1 214 555 0100",
      "hello@sunrisedental.com",
      "https://sunrisedental.com",
      "124 Main St",
      "https://instagram.com/sunrisedental",
      "https://facebook.com/sunrisedental",
      "",
      "",
      "",
      "",
    ],
    [
      "Metro Cleaners",
      "Metro Cleaners LLC",
      "Services",
      "Cleaning",
      "Pickup and delivery laundry service",
      "Same-day turnaround",
      "Midtown",
      "Austin",
      "TX - Texas",
      "US - United States",
      "78701",
      "paper",
      "7.99",
      "silver",
      "published",
      "90",
      "12",
      "75",
      "4",
      "+1 512 555 0144",
      "care@metrocleaners.com",
      "https://metrocleaners.com",
      "88 Congress Ave",
      "https://instagram.com/metrocleaners",
      "https://facebook.com/metrocleaners",
      "https://tiktok.com/@metrocleaners",
      "https://linkedin.com/company/metrocleaners",
      "+1 512 555 0144",
      "https://t.me/metrocleaners",
    ],
  ];
}

export function buildPlaygroundTemplateWorkbook(workbook: WorkbookLike, locationCatalog: LocationCatalog) {
  const instructions = workbook.addWorksheet("Instructions");
  const bulk = workbook.addWorksheet("Bulk Import");
  const examples = workbook.addWorksheet("Examples");
  const listSheet = workbook.addWorksheet("Lists");
  const locationSheet = workbook.addWorksheet("Location Lists");
  const subcategorySheet = workbook.addWorksheet("Subcategory Lists");

  instructions.columns = [{ header: "step", key: "step", width: 20 }, { header: "details", key: "details", width: 88 }];
  instructions.getCell("A1").value = "WALL XLSX BULK IMPORT";
  instructions.getCell("A2").value = "Use the dropdowns in the Bulk Import sheet, fill the free-text cells, and import the file back into WALL.";
  instructions.getCell("A3").value = "Yellow cells are dropdowns. Blank rows are provided so the dropdowns are easy to see and use.";
  instructions.addRows([
    ["1", "Open the Bulk Import sheet and select values from the yellow dropdown cells."],
    ["2", "Country is limited to US or Turkey, and the state/city dropdowns update from that selection."],
    ["3", "Category changes the available subcategories automatically."],
    ["4", "Save the workbook as .xlsx and upload it back into the admin playground."],
  ]);
  instructions.getCell("A6").value = "Selection guide";
  instructions.addRows([
    ["category", "Category dropdown"],
    ["subcategory", "Depends on category"],
    ["country", "Country dropdown: CODE - Name"],
    ["state", "State dropdown: CODE - Name"],
    ["city", "City name dropdown"],
  ]);
  instructions.getCell("D1").value = "Notes";
  instructions.getCell("D2").value = "The Examples sheet shows valid sample rows. The Bulk Import sheet stays blank so every selection is deliberate.";

  bulk.columns = CSV_TEMPLATE_ROW_HEADERS.map((header) => ({ header, key: header, width: 16 }));
  bulk.addRow(blankTemplateRow());
  bulk.addRow(blankTemplateRow());

  examples.columns = CSV_TEMPLATE_ROW_HEADERS.map((header) => ({ header, key: header, width: 16 }));
  buildExampleRows().forEach((row) => examples.addRow(row));

  const categoryOptions = categories.filter((c) => c !== "All");
  listSheet.columns = [
    { header: "category", key: "category", width: 18 },
    { header: "categoryKey", key: "categoryKey", width: 18 },
    { header: "theme", key: "theme", width: 18 },
    { header: "paidAmount", key: "paidAmount", width: 12 },
    { header: "featuredTier", key: "featuredTier", width: 14 },
    { header: "status", key: "status", width: 14 },
    { header: "durationDays", key: "durationDays", width: 14 },
  ];
  categoryOptions.forEach((categoryOption, rowIndex) => {
    listSheet.getCell(`A${rowIndex + 1}`).value = categoryOption;
    listSheet.getCell(`B${rowIndex + 1}`).value = sanitizeExcelName(categoryOption);
  });
  [
    { column: "C", values: cardThemes },
    { column: "D", values: PLAN_OPTIONS.map((plan) => String(plan.value)) },
    { column: "E", values: ["bronze", "silver", "gold"] },
    { column: "F", values: ["published", "hidden", "expired"] },
    { column: "G", values: DURATION_OPTIONS.map((value) => String(value)) },
  ].forEach(({ column, values }) => {
    values.forEach((value, rowIndex) => {
      listSheet.getCell(`${column}${rowIndex + 1}`).value = value;
    });
  });

  subcategorySheet.columns = [{ header: "helper", key: "helper", width: 18 }];
  locationSheet.columns = [{ header: "helper", key: "helper", width: 18 }];

  categoryOptions.forEach((categoryOption, index) => {
    const colLetter = toExcelColumnLetter(index + 1);
    subcategorySheet.getCell(`${colLetter}1`).value = categoryOption;
    const values = getSubcategoriesForCategory(categoryOption);
    values.forEach((value, rowIndex) => {
      subcategorySheet.getCell(`${colLetter}${rowIndex + 2}`).value = value;
    });
    if (!values.length) subcategorySheet.getCell(`${colLetter}2`).value = "";
  });

  const countryCol = "A";
  locationCatalog.countries.forEach((country, rowIndex) => {
    locationSheet.getCell(`${countryCol}${rowIndex + 1}`).value = formatLocationLabel(country.code, country.name);
  });

  const stateColStart = 2;
  const cityColStart = stateColStart + locationCatalog.countries.length;
  let cityColumnCursor = cityColStart;
  let maxStateRows = 1;
  let maxCityRows = 1;

  locationCatalog.countries.forEach((country, countryIndex) => {
    const stateList = locationCatalog.statesByCountry.get(country.code) ?? [];
    const stateCol = toExcelColumnLetter(stateColStart + countryIndex);
    locationSheet.getCell(`${stateCol}1`).value = country.code;
    if (!stateList.length) {
      locationSheet.getCell(`${stateCol}2`).value = "";
    }
    stateList.forEach((state, stateIndex) => {
      locationSheet.getCell(`${stateCol}${stateIndex + 2}`).value = formatLocationLabel(state.code, state.name);
    });
    maxStateRows = Math.max(maxStateRows, stateList.length + 1);
    workbook.definedNames.add(`'Location Lists'!$${stateCol}$2:$${stateCol}$${Math.max(stateList.length + 1, 2)}`, `states_${country.code}`);

    stateList.forEach((state) => {
      const cityList = locationCatalog.citiesByCountryState.get(`${country.code}|${state.code}`) ?? [];
      const cityCol = toExcelColumnLetter(cityColumnCursor++);
      locationSheet.getCell(`${cityCol}1`).value = `${country.code}_${state.code}`;
      if (!cityList.length) {
        locationSheet.getCell(`${cityCol}2`).value = "";
      }
      cityList.forEach((city, cityIndex) => {
        locationSheet.getCell(`${cityCol}${cityIndex + 2}`).value = city;
      });
      maxCityRows = Math.max(maxCityRows, cityList.length + 1);
      workbook.definedNames.add(`'Location Lists'!$${cityCol}$2:$${cityCol}$${Math.max(cityList.length + 1, 2)}`, `cities_${country.code}_${state.code}`);
    });
  });
  const cityColEnd = toExcelColumnLetter(Math.max(cityColumnCursor - 1, cityColStart));
  const stateRangeEndRow = Math.max(2, maxStateRows);
  const cityRangeEndRow = Math.max(2, maxCityRows);

  listSheet.state = "hidden";
  locationSheet.state = "hidden";
  subcategorySheet.state = "hidden";

  const rangeByRef = Object.fromEntries([
    ["country", `'Location Lists'!$A$1:$A$${locationCatalog.countries.length}`],
    ["category", `'Lists'!$A$1:$A$${categoryOptions.length}`],
    ["theme", `'Lists'!$C$1:$C$${cardThemes.length}`],
    ["paidAmount", `'Lists'!$D$1:$D$${PLAN_OPTIONS.length}`],
    ["featuredTier", `'Lists'!$E$1:$E$${3}`],
    ["status", `'Lists'!$F$1:$F$${3}`],
    ["durationDays", `'Lists'!$G$1:$G$${DURATION_OPTIONS.length}`],
  ]);
  const dropdownCells = ["C", "D", "H", "I", "J", "L", "M", "N", "O", "P"] as const;
  dropdownCells.forEach((colLetter) => {
    bulk.getCell(`${colLetter}1`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE68A" } };
    bulk.getCell(`${colLetter}1`).font = { bold: true, color: { argb: "FF1A1A18" } };
  });
  const subcategoryHelperStart = 30;
  const subcategoryHelperCount = categoryOptions.reduce((max, categoryOption) => Math.max(max, getSubcategoriesForCategory(categoryOption).length), 0);
  const stateHelperStart = subcategoryHelperStart + subcategoryHelperCount;
  const stateHelperCount = Math.max(...locationCatalog.countries.map((country) => (locationCatalog.statesByCountry.get(country.code) ?? []).length), 0);
  const cityHelperStart = stateHelperStart + stateHelperCount;
  const cityHelperCount = Math.max(...Array.from(locationCatalog.citiesByCountryState.values()).map((cities) => cities.length), 0);
  const subcategoryHelperRange = subcategoryHelperCount ? `$${toExcelColumnLetter(subcategoryHelperStart)}$2:$${toExcelColumnLetter(subcategoryHelperStart + subcategoryHelperCount - 1)}$102` : null;
  const stateHelperRange = stateHelperCount ? `$${toExcelColumnLetter(stateHelperStart)}$2:$${toExcelColumnLetter(stateHelperStart + stateHelperCount - 1)}$102` : null;
  const cityHelperRange = cityHelperCount ? `$${toExcelColumnLetter(cityHelperStart)}$2:$${toExcelColumnLetter(cityHelperStart + cityHelperCount - 1)}$102` : null;

  for (let index = 0; index < subcategoryHelperCount; index++) {
    const colLetter = toExcelColumnLetter(subcategoryHelperStart + index);
    bulk.getColumn(colLetter).hidden = true;
    bulk.getCell(`${colLetter}1`).value = `subcategory_helper_${index + 1}`;
  }
  for (let index = 0; index < stateHelperCount; index++) {
    const colLetter = toExcelColumnLetter(stateHelperStart + index);
    bulk.getColumn(colLetter).hidden = true;
    bulk.getCell(`${colLetter}1`).value = `state_helper_${index + 1}`;
  }
  for (let index = 0; index < cityHelperCount; index++) {
    const colLetter = toExcelColumnLetter(cityHelperStart + index);
    bulk.getColumn(colLetter).hidden = true;
    bulk.getCell(`${colLetter}1`).value = `city_helper_${index + 1}`;
  }

  const validationRows = 2 + 100;
  for (let rowNumber = 2; rowNumber <= validationRows; rowNumber++) {
    bulk.getCell(`C${rowNumber}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [rangeByRef.category as string],
      showErrorMessage: true,
      showInputMessage: true,
      errorStyle: "stop",
      promptTitle: "Category",
      prompt: "Select a category from the dropdown.",
      errorTitle: "Invalid category",
      error: "Choose a category from the dropdown list.",
    };
    bulk.getCell(`J${rowNumber}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [rangeByRef.country as string],
      showErrorMessage: true,
      showInputMessage: true,
      errorStyle: "stop",
      promptTitle: "Country",
      prompt: "Choose US or Turkey.",
      errorTitle: "Invalid country",
      error: "Select a country from the dropdown list.",
    };
    if (subcategoryHelperRange) {
      bulk.getCell(`D${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [subcategoryHelperRange.replace("$2", `$${rowNumber}`)],
        showErrorMessage: true,
        showInputMessage: true,
        errorStyle: "stop",
        promptTitle: "Subcategory",
        prompt: "Pick a subcategory after selecting a category.",
        errorTitle: "Invalid subcategory",
        error: "Select a subcategory from the dropdown list.",
      };
      for (let index = 0; index < subcategoryHelperCount; index++) {
        const colLetter = toExcelColumnLetter(subcategoryHelperStart + index);
        bulk.getCell(`${colLetter}${rowNumber}`).value = {
          formula: `IFERROR(INDEX('Subcategory Lists'!$A$2:$T$11,COLUMN()-COLUMN($${toExcelColumnLetter(subcategoryHelperStart)}${rowNumber})+1,MATCH($C${rowNumber},'Subcategory Lists'!$A$1:$T$1,0)),"")`,
        };
      }
    }
    if (stateHelperRange) {
      bulk.getCell(`I${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [stateHelperRange.replace("$2", `$${rowNumber}`)],
        showErrorMessage: true,
        showInputMessage: true,
        errorStyle: "stop",
        promptTitle: "State",
        prompt: "Choose a state after selecting country.",
        errorTitle: "Invalid state",
        error: "Select a state from the dropdown list.",
      };
      for (let index = 0; index < stateHelperCount; index++) {
        const colLetter = toExcelColumnLetter(stateHelperStart + index);
        bulk.getCell(`${colLetter}${rowNumber}`).value = {
          formula: `IFERROR(INDEX('Location Lists'!$B$2:$C$${Math.max(stateRangeEndRow, 2)},COLUMN()-COLUMN($${toExcelColumnLetter(stateHelperStart)}${rowNumber})+1,MATCH(LEFT($J${rowNumber},FIND(" - ",$J${rowNumber})-1),'Location Lists'!$B$1:$C$1,0)),"")`,
        };
      }
    }
    if (cityHelperRange) {
      bulk.getCell(`H${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [cityHelperRange.replace("$2", `$${rowNumber}`)],
        showErrorMessage: true,
        showInputMessage: true,
        errorStyle: "stop",
        promptTitle: "City",
        prompt: "Choose a city after selecting country and state.",
        errorTitle: "Invalid city",
        error: "Select a city from the dropdown list.",
      };
      for (let index = 0; index < cityHelperCount; index++) {
        const colLetter = toExcelColumnLetter(cityHelperStart + index);
        bulk.getCell(`${colLetter}${rowNumber}`).value = {
          formula: `IFERROR(INDEX('Location Lists'!$D$2:$${cityColEnd}$${cityRangeEndRow},COLUMN()-COLUMN($${toExcelColumnLetter(cityHelperStart)}${rowNumber})+1,MATCH(LEFT($J${rowNumber},FIND(" - ",$J${rowNumber})-1)&"_"&LEFT($I${rowNumber},FIND(" - ",$I${rowNumber})-1),'Location Lists'!$D$1:$${cityColEnd}$1,0)),"")`,
        };
      }
    }
    bulk.getCell(`L${rowNumber}`).dataValidation = { type: "list", allowBlank: false, formulae: [rangeByRef.theme as string], showErrorMessage: true, showInputMessage: true, errorStyle: "stop" };
    bulk.getCell(`M${rowNumber}`).dataValidation = { type: "list", allowBlank: false, formulae: [rangeByRef.paidAmount as string], showErrorMessage: true, showInputMessage: true, errorStyle: "stop" };
    bulk.getCell(`N${rowNumber}`).dataValidation = { type: "list", allowBlank: false, formulae: [rangeByRef.featuredTier as string], showErrorMessage: true, showInputMessage: true, errorStyle: "stop" };
    bulk.getCell(`O${rowNumber}`).dataValidation = { type: "list", allowBlank: false, formulae: [rangeByRef.status as string], showErrorMessage: true, showInputMessage: true, errorStyle: "stop" };
    bulk.getCell(`P${rowNumber}`).dataValidation = { type: "list", allowBlank: false, formulae: [rangeByRef.durationDays as string], showErrorMessage: true, showInputMessage: true, errorStyle: "stop" };
    for (let col = 1; col <= CSV_TEMPLATE_ROW_HEADERS.length; col++) {
      bulk.getCell(rowNumber, col).protection = { locked: false };
    }
    dropdownCells.forEach((colLetter) => {
      bulk.getCell(`${colLetter}${rowNumber}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
    });
  }

  for (let col = 1; col <= CSV_TEMPLATE_ROW_HEADERS.length; col++) {
    bulk.getCell(1, col).protection = { locked: true };
    examples.getCell(1, col).protection = { locked: true };
  }

  [bulk, examples].forEach((sheet) => {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: CSV_TEMPLATE_ROW_HEADERS.length } };
    sheet.columns.forEach((column: any, idx: number) => {
      column.alignment = { vertical: "middle" };
      if (idx < 18) column.width = Math.max(column.width ?? 12, 16);
    });
    [3, 4, 8, 9, 10, 12, 13, 14, 15, 16].forEach((columnNumber) => {
      sheet.getColumn(columnNumber).width = Math.max(sheet.getColumn(columnNumber).width ?? 12, 18);
    });
  });

  return workbook;
}
