/** Quote a CSV field only when it has to be quoted, and double any quotes inside. */
function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: string[][]): string {
  // The BOM makes Excel open UTF-8 correctly instead of mangling accents.
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function downloadFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next frame: revoking synchronously can cancel the download
  // in some browsers before it has started reading the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `TISMUN-UNSC-session-log-2026-03-13.csv` */
export function timestampedName(parts: string[], extension: string): string {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const slug = parts
    .filter(Boolean)
    .join('-')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-');
  return `${slug}-${stamp}.${extension}`;
}
