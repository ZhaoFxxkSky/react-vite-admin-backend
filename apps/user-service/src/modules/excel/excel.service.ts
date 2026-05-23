import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class ExcelService {
  export(data: any[], headers: { key: string; title: string }[]): Buffer {
    const headerKeys = headers.map((h) => h.key);
    const headerTitles = headers.map((h) => h.title);

    const rows = data.map((item) =>
      headerKeys.map((key) => item[key] ?? ''),
    );

    const worksheet = XLSX.utils.aoa_to_sheet([headerTitles, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  parse(buffer: Buffer): any[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  }

  generateTemplate(headers: { key: string; title: string }[]): Buffer {
    const headerTitles = headers.map((h) => h.title);

    const worksheet = XLSX.utils.aoa_to_sheet([headerTitles]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
