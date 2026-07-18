import * as XLSX from "xlsx";

import { parseCsv } from "@/lib/import/parseCsv";

/** Convert first sheet (or named sheet) of an .xlsx buffer to CSV text. */
export function xlsxBufferToCsv(buffer: ArrayBuffer | Buffer, sheetName?: string): {
  csvText: string;
  sheet: string;
  sheets: string[];
} {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheets = wb.SheetNames;
  const sheet = sheetName && sheets.includes(sheetName) ? sheetName : sheets[0];
  if (!sheet) {
    return { csvText: "", sheet: "", sheets };
  }
  const csvText = XLSX.utils.sheet_to_csv(wb.Sheets[sheet]);
  return { csvText, sheet, sheets };
}

export function parseXlsxBuffer(buffer: ArrayBuffer | Buffer, sheetName?: string) {
  const { csvText, sheet, sheets } = xlsxBufferToCsv(buffer, sheetName);
  const parsed = parseCsv(csvText);
  return { ...parsed, sheet, sheets, csvText };
}
