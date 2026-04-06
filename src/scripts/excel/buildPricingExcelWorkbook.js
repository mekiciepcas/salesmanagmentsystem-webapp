/**
 * Ortak ExcelJS workbook üretimi — Electron preload ve web sunucusu tarafından kullanılır.
 * Görünüm: EPC kurumsal renkleri (theme.css ile uyumlu), okunabilir punto, tek dış çerçeve,
 * sayfa grid çizgileri kapalı; dikey dondurma yok (üst bilgi “yapışık” kalmaz, satırlara rahat inilir).
 */
const ExcelJS = require('exceljs');

/** theme.css — EPC Energy Power Conversion */
const EPC = {
  navy: 'FF1B3A6B',
  navyDark: 'FF142D55',
  blue: 'FF2E7FC1',
  navyLight: 'FFE8EEF6',
  blueLight: 'FFDEEEF9',
  green: 'FF7DC242',
  border: 'FFCDD8E8',
  text: 'FF1B3A6B',
  textMuted: 'FF3D5278',
  white: 'FFFFFFFF',
  zebra: 'FFF0F4F9',
  zebraAlt: 'FFFFFFFF',
};

const FONT = 'Calibri';
const SIZE_BODY = 12;
const SIZE_META = 12;
const SIZE_HEADER = 13;
const SIZE_TITLE = 18;
const SIZE_SUMMARY_TITLE = 12;

function mergeBorder(existing, patch) {
  return { ...(existing || {}), ...patch };
}

/** İçerik bloğunun dış kenarına çerçeve (iç hücre kenarlıkları korunur). */
function applyOuterFrame(worksheet, r1, c1, r2, c2, argb) {
  const edge = { style: 'medium', color: { argb } };
  for (let c = c1; c <= c2; c += 1) {
    const topCell = worksheet.getCell(r1, c);
    topCell.border = mergeBorder(topCell.border, { top: edge });
    const botCell = worksheet.getCell(r2, c);
    botCell.border = mergeBorder(botCell.border, { bottom: edge });
  }
  for (let r = r1; r <= r2; r += 1) {
    const leftCell = worksheet.getCell(r, c1);
    leftCell.border = mergeBorder(leftCell.border, { left: edge });
    const rightCell = worksheet.getCell(r, c2);
    rightCell.border = mergeBorder(rightCell.border, { right: edge });
  }
}

/** ExcelJS hücre metni (birleşik hücrelerde master üzerinden). */
function safeCellText(cell) {
  try {
    if (!cell) return '';
    const t = cell.text;
    if (t != null && String(t).trim() !== '') return String(t);
    const v = cell.value;
    if (v == null) return '';
    if (typeof v === 'object' && v.richText) {
      return v.richText.map((x) => x.text || '').join('');
    }
    if (typeof v === 'object' && v.formula != null) return '';
    return String(v);
  } catch {
    return '';
  }
}

function maxLineLengthInString(s) {
  if (!s) return 0;
  let m = 0;
  for (const line of String(s).split(/\r?\n/)) {
    m = Math.max(m, line.length);
  }
  return m;
}

/** Excel sütun genişliği (yaklaşık karakter); min–max aralığında. */
function widthFromMaxChars(maxChars, minW, maxW) {
  const n = maxChars <= 0 ? minW : maxChars * 1.12 + 2.6;
  return Math.min(maxW, Math.max(minW, n));
}

function sumColumnWidths(worksheet, c1, c2) {
  let s = 0;
  for (let c = c1; c <= c2; c += 1) {
    s += worksheet.getColumn(c).width || 10;
  }
  return s;
}

/** Metnin verilen “efektif sütun genişliği”nde kaç satıra sarılacağı (Calibri ~12 pt). */
function wrappedLineCount(text, effectiveWidthUnits) {
  if (!text || !String(text).trim()) return 1;
  const cpc = Math.max(3.5, (effectiveWidthUnits || 10) * 0.9);
  let lines = 0;
  for (const seg of String(text).split(/\r?\n/)) {
    const len = seg.length;
    lines += Math.max(1, Math.ceil(len / cpc));
  }
  return lines;
}

function rowHeightFromLines(lines, { minH = 22, maxH = 120, perLine = 15.5, pad = 8 } = {}) {
  return Math.min(maxH, Math.max(minH, lines * perLine + pad));
}

/**
 * Sütun genişlikleri: tablo + özet + (varsa) üst bilgi A/B sütunları.
 * Satır yükseklikleri: başlık, meta, tablo, özet.
 */
function applyContentBasedSizing(worksheet, ctx) {
  const {
    lastCol,
    preset,
    tableStartRow,
    dataEndRow,
    summaryStartRow,
    summaryEndRow,
    metaFirstRow,
    metaLastRow,
    titleText,
  } = ctx;

  const colMins =
    preset === 'rectifier-flex'
      ? [6, 10, 14, 12, 10, 8, 10, 9, 10]
      : [6, 12, 10, 9, 10, 9, 9, 10, 10];
  const colMaxs =
    preset === 'rectifier-flex'
      ? [11, 28, 60, 55, 20, 14, 22, 16, 22]
      : [11, 52, 20, 16, 20, 16, 16, 20, 20];

  for (let c = 1; c <= lastCol; c += 1) {
    let maxChars = 0;

    for (let r = tableStartRow; r <= dataEndRow; r += 1) {
      maxChars = Math.max(maxChars, maxLineLengthInString(safeCellText(worksheet.getCell(r, c))));
    }

    for (let r = summaryStartRow; r <= summaryEndRow; r += 1) {
      maxChars = Math.max(maxChars, maxLineLengthInString(safeCellText(worksheet.getCell(r, c))));
    }

    if (metaFirstRow > 0 && metaLastRow >= metaFirstRow) {
      if (c === 1 || c === 2) {
        for (let r = metaFirstRow; r <= metaLastRow; r += 1) {
          maxChars = Math.max(
            maxChars,
            maxLineLengthInString(safeCellText(worksheet.getCell(r, c)))
          );
        }
      }
    }

    worksheet.getColumn(c).width = widthFromMaxChars(
      maxChars,
      colMins[c - 1],
      colMaxs[c - 1]
    );
  }

  const fullWidth = sumColumnWidths(worksheet, 1, lastCol);
  const titleLines = wrappedLineCount(titleText, fullWidth);
  const titleH = rowHeightFromLines(titleLines, { minH: 30, maxH: 96, perLine: 17 });
  worksheet.getRow(1).height = Math.max(14, titleH / 2);
  worksheet.getRow(2).height = Math.max(14, titleH / 2);

  if (metaFirstRow > 0 && metaLastRow >= metaFirstRow) {
    const mergedMetaWidth = sumColumnWidths(worksheet, 2, lastCol);
    for (let r = metaFirstRow; r <= metaLastRow; r += 1) {
      const val = safeCellText(worksheet.getCell(r, 2));
      const lbl = safeCellText(worksheet.getCell(r, 1));
      const lv = wrappedLineCount(val, mergedMetaWidth);
      const ll = wrappedLineCount(lbl, worksheet.getColumn(1).width || 8);
      worksheet.getRow(r).height = rowHeightFromLines(Math.max(lv, ll), {
        minH: 22,
        maxH: 140,
      });
    }
  }

  for (let r = tableStartRow; r <= dataEndRow; r += 1) {
    let maxLines = 1;
    for (let c = 1; c <= lastCol; c += 1) {
      const txt = safeCellText(worksheet.getCell(r, c));
      const w = worksheet.getColumn(c).width || 10;
      maxLines = Math.max(maxLines, wrappedLineCount(txt, w));
    }
    worksheet.getRow(r).height = rowHeightFromLines(maxLines, {
      minH: 24,
      maxH: 130,
    });
  }

  const sumTitle = safeCellText(worksheet.getCell(summaryStartRow, 1));
  worksheet.getRow(summaryStartRow).height = rowHeightFromLines(
    wrappedLineCount(sumTitle, fullWidth),
    { minH: 26, maxH: 48, perLine: 16 }
  );

  const mergedValWidth = sumColumnWidths(worksheet, 2, lastCol);
  for (let r = summaryStartRow + 1; r <= summaryEndRow; r += 1) {
    const la = wrappedLineCount(
      safeCellText(worksheet.getCell(r, 1)),
      worksheet.getColumn(1).width || 8
    );
    const tb = safeCellText(worksheet.getCell(r, 2));
    const lb = tb ? wrappedLineCount(tb, mergedValWidth) : 1;
    worksheet.getRow(r).height = rowHeightFromLines(Math.max(la, lb), {
      minH: 22,
      maxH: 72,
    });
  }
}

function buildPricingExcelWorkbook(options) {
  const preset = options.preset || 'pricing-generic';
  const sheetName = options.sheetName || 'Sheet1';
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: false }],
  });
  const lastCol = 9;
  const thin = { style: 'thin', color: { argb: EPC.border } };

  let rowPtr = 1;
  let metaFirstRow = 0;
  let metaLastRow = 0;

  const resolvedTitle =
    options.title ||
    (preset === 'rectifier-flex'
      ? 'RECTİFİER MALİYET / TEKLİF ÖZETİ'
      : 'FİYAT TEKLİF FORMU');

  worksheet.mergeCells(`A${rowPtr}:I${rowPtr + 1}`);
  const titleCell = worksheet.getCell(`A${rowPtr}`);
  titleCell.value = resolvedTitle;
  titleCell.font = {
    name: FONT,
    bold: true,
    size: SIZE_TITLE,
    color: { argb: EPC.white },
  };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: EPC.navy },
  };
  titleCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
  };
  titleCell.border = {
    bottom: { style: 'medium', color: { argb: EPC.green } },
  };
  rowPtr = 3;

  if (
    preset === 'rectifier-flex' &&
    Array.isArray(options.metadata) &&
    options.metadata.length > 0
  ) {
    metaFirstRow = rowPtr;
    for (const item of options.metadata) {
      const label = item.label != null ? String(item.label) : '';
      const value = item.value != null ? String(item.value) : '';
      const labelCell = worksheet.getCell(`A${rowPtr}`);
      labelCell.value = label;
      labelCell.font = {
        bold: true,
        name: FONT,
        size: SIZE_META,
        color: { argb: EPC.text },
      };
      labelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: EPC.navyLight },
      };
      labelCell.alignment = {
        vertical: 'middle',
        wrapText: true,
        indent: 1,
      };
      labelCell.border = {
        left: thin,
        top: thin,
        bottom: thin,
        right: thin,
      };

      worksheet.mergeCells(`B${rowPtr}:I${rowPtr}`);
      const valueCell = worksheet.getCell(`B${rowPtr}`);
      valueCell.value = value;
      valueCell.font = {
        name: FONT,
        size: SIZE_META,
        color: { argb: EPC.textMuted },
      };
      valueCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: EPC.white },
      };
      valueCell.alignment = { vertical: 'middle', wrapText: true };
      valueCell.border = {
        top: thin,
        bottom: thin,
        right: thin,
      };

      rowPtr += 1;
    }
    metaLastRow = rowPtr - 1;
    rowPtr += 1;
  } else {
    worksheet.mergeCells(`A${rowPtr}:I${rowPtr}`);
    metaFirstRow = rowPtr;
    metaLastRow = rowPtr;
    const dateCell = worksheet.getCell(`A${rowPtr}`);
    dateCell.value = `Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`;
    dateCell.font = {
      bold: true,
      name: FONT,
      size: SIZE_META,
      color: { argb: EPC.text },
    };
    dateCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EPC.blueLight },
    };
    dateCell.alignment = { vertical: 'middle', indent: 1 };
    dateCell.border = { left: thin, right: thin, top: thin, bottom: thin };
    rowPtr += 1;
    while (rowPtr < 5) {
      rowPtr += 1;
    }
  }

  const tableStartRow = rowPtr;

  const headers = options.data[0];
  worksheet.getRow(tableStartRow).values = headers;
  const dataRows = options.data.slice(1);
  worksheet.addRows(dataRows);

  const dataEndRow = worksheet.rowCount;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber >= tableStartRow) {
      row.eachCell((cell) => {
        cell.border = {
          top: thin,
          left: thin,
          bottom: thin,
          right: thin,
        };
        cell.font = {
          name: FONT,
          size: SIZE_BODY,
          color: { argb: EPC.text },
        };
        cell.alignment = {
          vertical: 'middle',
          wrapText: true,
        };
      });
      row.height = 24;
    }
  });

  const headerRow = worksheet.getRow(tableStartRow);
  headerRow.height = 34;
  headerRow.eachCell((cell) => {
    cell.style = {
      font: {
        bold: true,
        name: FONT,
        size: SIZE_HEADER,
        color: { argb: EPC.white },
      },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: EPC.navy },
      },
      alignment: {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      },
      border: {
        top: { style: 'thin', color: { argb: EPC.blue } },
        left: thin,
        bottom: { style: 'medium', color: { argb: EPC.green } },
        right: thin,
      },
    };
  });

  const numericColsGeneric = [3, 4, 5, 6, 7, 8, 9];
  const numericColsRectifier = [5, 6, 7, 8, 9];
  const numericCols =
    preset === 'rectifier-flex' ? numericColsRectifier : numericColsGeneric;

  for (let i = tableStartRow + 1; i <= dataEndRow; i += 1) {
    const row = worksheet.getRow(i);
    const fillArgb = i % 2 === 0 ? EPC.zebra : EPC.zebraAlt;

    row.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillArgb },
      };

      if (!numericCols.includes(colNumber)) {
        cell.alignment = {
          ...cell.alignment,
          horizontal: 'left',
          vertical: 'middle',
          wrapText: true,
        };
      }

      if (numericCols.includes(colNumber)) {
        const numFmt =
          preset === 'rectifier-flex' && colNumber === 6
            ? '#,##0'
            : '#,##0.00';
        cell.numFmt = numFmt;
        cell.alignment = {
          horizontal: 'right',
          vertical: 'middle',
        };
        cell.font = {
          name: FONT,
          size: SIZE_BODY,
          color: { argb: EPC.textMuted },
        };
      }
    });
  }

  const summaryStartRow = dataEndRow + 2;
  worksheet.mergeCells(`A${summaryStartRow}:I${summaryStartRow}`);
  const summaryCell = worksheet.getCell(`A${summaryStartRow}`);
  summaryCell.value = 'ÖZET BİLGİLER';
  summaryCell.font = {
    bold: true,
    name: FONT,
    size: SIZE_SUMMARY_TITLE,
    color: { argb: EPC.white },
  };
  summaryCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: EPC.blue },
  };
  summaryCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };
  summaryCell.border = {
    left: thin,
    right: thin,
    top: thin,
    bottom: { style: 'thin', color: { argb: EPC.navyDark } },
  };
  const firstDataRow = tableStartRow + 1;
  const summaryLineStyle = (row) => {
    worksheet.getCell(`A${row}`).font = {
      name: FONT,
      size: SIZE_BODY,
      bold: true,
      color: { argb: EPC.text },
    };
    worksheet.getCell(`A${row}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EPC.navyLight },
    };
    worksheet.getCell(`A${row}`).alignment = {
      vertical: 'middle',
      indent: 1,
    };
    worksheet.getCell(`A${row}`).border = {
      left: thin,
      bottom: thin,
      right: thin,
    };
    const b = worksheet.getCell(`B${row}`);
    b.font = { name: FONT, size: SIZE_BODY, color: { argb: EPC.textMuted } };
    b.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EPC.white },
    };
    b.alignment = { vertical: 'middle' };
    b.border = { bottom: thin, right: thin };
    worksheet.mergeCells(`B${row}:I${row}`);
  };

  if (preset === 'rectifier-flex') {
    worksheet.getCell(`A${summaryStartRow + 1}`).value = 'Toplam kalem sayısı:';
    worksheet.getCell(`B${summaryStartRow + 1}`).value = {
      formula: `COUNTA(C${firstDataRow}:C${dataEndRow})`,
    };
    summaryLineStyle(summaryStartRow + 1);

    worksheet.getCell(`A${summaryStartRow + 2}`).value =
      'Toplam (maliyet toplamı):';
    worksheet.getCell(`B${summaryStartRow + 2}`).value = {
      formula: `SUM(G${firstDataRow}:G${dataEndRow})`,
    };
    worksheet.getCell(`B${summaryStartRow + 2}`).numFmt = '#,##0.00';
    summaryLineStyle(summaryStartRow + 2);

    worksheet.getCell(`A${summaryStartRow + 3}`).value = 'Toplam-2 (marjlı):';
    worksheet.getCell(`B${summaryStartRow + 3}`).value = {
      formula: `SUM(I${firstDataRow}:I${dataEndRow})`,
    };
    worksheet.getCell(`B${summaryStartRow + 3}`).numFmt = '#,##0.00';
    summaryLineStyle(summaryStartRow + 3);

    worksheet.getCell(`A${summaryStartRow + 4}`).value = 'Ortalama Margin-2:';
    worksheet.getCell(`B${summaryStartRow + 4}`).value = {
      formula: `AVERAGE(H${firstDataRow}:H${dataEndRow})`,
    };
    worksheet.getCell(`B${summaryStartRow + 4}`).numFmt = '#,##0.00';
    summaryLineStyle(summaryStartRow + 4);
  } else {
    worksheet.getCell(`A${summaryStartRow + 1}`).value = 'Toplam Ürün Sayısı:';
    worksheet.getCell(`B${summaryStartRow + 1}`).value = {
      formula: `COUNTA(B${firstDataRow}:B${dataEndRow})`,
    };
    summaryLineStyle(summaryStartRow + 1);

    worksheet.getCell(`A${summaryStartRow + 2}`).value = 'Ortalama Çarpan-1:';
    worksheet.getCell(`B${summaryStartRow + 2}`).value = {
      formula: `AVERAGE(F${firstDataRow}:F${dataEndRow})`,
    };
    summaryLineStyle(summaryStartRow + 2);

    worksheet.getCell(`A${summaryStartRow + 3}`).value = 'Ortalama Çarpan-2:';
    worksheet.getCell(`B${summaryStartRow + 3}`).value = {
      formula: `AVERAGE(G${firstDataRow}:G${dataEndRow})`,
    };
    summaryLineStyle(summaryStartRow + 3);
  }

  const summaryEndRow =
    summaryStartRow + (preset === 'rectifier-flex' ? 4 : 3);

  applyContentBasedSizing(worksheet, {
    lastCol,
    preset,
    tableStartRow,
    dataEndRow,
    summaryStartRow,
    summaryEndRow,
    metaFirstRow,
    metaLastRow,
    titleText: resolvedTitle,
  });

  applyOuterFrame(worksheet, 1, 1, summaryEndRow, lastCol, EPC.navy);

  worksheet.pageSetup = {
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    orientation: 'landscape',
    showGridLines: false,
    margins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
  };

  worksheet.pageSetup.printTitlesRow = `${tableStartRow}:${tableStartRow}`;
  worksheet.headerFooter.oddFooter =
    '&L&"Calibri,9"EPC Energy Power Conversion&R&"Calibri,9"Sayfa &P / &N';

  worksheet.autoFilter = {
    from: { row: tableStartRow, column: 1 },
    to: { row: tableStartRow, column: lastCol },
  };

  worksheet.views = [{ showGridLines: false }];

  return workbook;
}

module.exports = { buildPricingExcelWorkbook };
