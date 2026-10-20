// Global Date-Aware Export & Print Service
// Stamps all CSV, Excel, and Print outputs with report metadata, period range, comparison info, and IST timestamp.

import { formatDisplayDate, formatPeriodRange, formatToISTDateString, getNow, TIMEZONE } from './periodService.js';

export function getFormattedISTTimestamp() {
  const d = getNow();
  const dateStr = formatDisplayDate(formatToISTDateString(d));
  const timeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(d);
  return `${dateStr} ${timeStr} (IST)`;
}

export function generateExportFilename(reportSlug, period) {
  const from = period ? period.from : 'all';
  const to = period ? period.to : 'all';
  const cleanSlug = reportSlug.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return `${cleanSlug}_${from}_to_${to}.csv`;
}

/**
 * Generates and downloads a CSV file with stamped period headers.
 */
export function downloadCSV({
  title,
  period,
  comparePeriod = null,
  filtersApplied = [],
  headers = [],
  rows = [],
  filename = null
}) {
  const periodLabel = period ? (period.preset ? period.preset.toUpperCase().replace(/_/g, ' ') : 'CUSTOM') : 'ALL TIME';
  const rangeStr = period ? `${period.from} to ${period.to} (${formatPeriodRange(period.from, period.to)})` : 'All Time';
  const cmpStr = comparePeriod && comparePeriod.from ? `${comparePeriod.from} to ${comparePeriod.to}` : 'None';
  const generatedAt = getFormattedISTTimestamp();

  const metadataLines = [
    `"REPORT TITLE: ${title.toUpperCase()}"`,
    `"COMPANY: ELIZA INFOTECH (CCTV SURVEILLANCE & ENTERPRISE ERP)"`,
    `"PERIOD: ${periodLabel} [${rangeStr}]"`,
    `"COMPARISON: ${cmpStr}"`,
    `"APPLIED FILTERS: ${filtersApplied.join('; ') || 'None'}"`,
    `"GENERATED AT: ${generatedAt}"`,
    `""` // Empty separator line
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headerLine = headers.map(escapeCSV).join(',');
  const rowLines = rows.map(r => r.map(escapeCSV).join(','));

  const csvContent = [
    ...metadataLines,
    headerLine,
    ...rowLines
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename || generateExportFilename(title, period));
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convenience helper for exporting table data to CSV with period metadata.
 */
export function exportToCsv(slug, headers, rows, options = {}) {
  return downloadCSV({
    title: options.reportTitle || slug,
    period: options.period,
    comparePeriod: options.comparePeriod,
    filtersApplied: options.filtersApplied ? (Array.isArray(options.filtersApplied) ? options.filtersApplied : [options.filtersApplied]) : [],
    headers,
    rows,
    filename: options.filename
  });
}

/**
 * Triggers browser print with stamped print statement header
 */
export function printReport({
  title,
  period,
  entityName = null,
  openingBalance = null,
  closingBalance = null,
  tableHtml = ''
}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const rangeStr = period ? `${formatDisplayDate(period.from)} to ${formatDisplayDate(period.to)}` : 'All Time';
  const timestamp = getFormattedISTTimestamp();

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - Eliza Infotech</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
        .print-header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
        .print-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
        .print-sub { font-size: 12px; color: #64748b; margin: 0; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px; margin-top: 10px; background: #f8fafc; padding: 10px; border-radius: 6px; }
        .balance-badge { font-weight: 700; color: #0284c7; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11.5px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; font-weight: 700; }
        .text-right { text-align: right; }
        .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1 class="print-title">ELIZA INFOTECH &bull; ${title.toUpperCase()}</h1>
        <p class="print-sub">Enterprise Surveillance & Field Operations Suite &bull; Haryana Division</p>
        <div class="meta-grid">
          <div><strong>Period:</strong> ${rangeStr}</div>
          <div><strong>Generated:</strong> ${timestamp}</div>
          ${entityName ? `<div><strong>Entity:</strong> ${entityName}</div>` : ''}
          ${openingBalance !== null ? `<div><strong>Opening Balance:</strong> <span class="balance-badge">₹${Number(openingBalance).toLocaleString('en-IN')}</span></div>` : ''}
          ${closingBalance !== null ? `<div><strong>Closing Balance:</strong> <span class="balance-badge">₹${Number(closingBalance).toLocaleString('en-IN')}</span></div>` : ''}
        </div>
      </div>
      <div>
        ${tableHtml}
      </div>
      <div class="footer">
        Confidential ERP Record &bull; Generated from Eliza Infotech Enterprise CRM & ERP
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
}
