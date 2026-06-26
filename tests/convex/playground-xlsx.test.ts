import { expect, test, describe } from "vitest";
import { default as ExcelJS } from "exceljs";
import { buildPlaygroundTemplateWorkbook, type LocationCatalog } from "../../src/features/wall/admin-playground-xlsx";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const catalog: LocationCatalog = {
  countries: [
    { code: "US", name: "United States" },
    { code: "TR", name: "Turkey" },
  ],
  statesByCountry: new Map([
    ["US", [
      { code: "TX", name: "Texas" },
      { code: "WA", name: "Washington" },
    ]],
    ["TR", [
      { code: "34", name: "Istanbul" },
    ]],
  ]),
  citiesByCountryState: new Map([
    ["US|TX", ["Austin", "Dallas"]],
    ["US|WA", ["Seattle"]],
    ["TR|34", ["Istanbul"]],
  ]),
};

describe("admin playground xlsx template", () => {
  test("includes dependent list validations and named ranges", async () => {
    const workbook = new ExcelJS.Workbook();
    buildPlaygroundTemplateWorkbook(workbook, catalog);

    const buffer = await workbook.xlsx.writeBuffer();
    const dir = mkdtempSync(join(tmpdir(), "local-wall-xlsx-"));
    const file = join(dir, "template.xlsx");
    writeFileSync(file, Buffer.from(buffer));

    const workbookXml = execFileSync("unzip", ["-p", file, "xl/workbook.xml"], { encoding: "utf8" });
    const bulkXml = execFileSync("unzip", ["-p", file, "xl/worksheets/sheet2.xml"], { encoding: "utf8" });

    expect(workbookXml).toContain('name="states_US"');
    expect(workbookXml).toContain('name="cities_US_TX"');
    expect(bulkXml).toContain("INDEX(&apos;Subcategory Lists&apos;!$A$2:$T$");
    expect(bulkXml).toContain("INDEX(&apos;Location Lists&apos;!$D$2:$");
    expect(bulkXml).toContain("INDEX(&apos;Location Lists&apos;!$B$2:$C$");
    expect(bulkXml).toContain("MATCH($C2,&apos;Subcategory Lists&apos;!$A$1:$T$1,0)");
    expect(bulkXml).toContain("MATCH(LEFT($J2,FIND(&quot; - &quot;,$J2)-1)");
  });
});
