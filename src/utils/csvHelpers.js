/**
 * Serialise an array of flat objects to CSV and trigger a browser download.
 * A UTF-8 BOM is prepended so Excel opens the file with correct encoding.
 *
 * @param {Object[]} rows     - Array of plain objects; all values must be primitive.
 * @param {string}   filename - Desired filename including .csv extension.
 */
export function downloadCsv(rows, filename) {
    if (!rows || rows.length === 0) return;

    const headers = Object.keys(rows[0]);

    const escape = (v) => {
        const s = v === null || v === undefined ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };

    const lines = [
        headers.join(','),
        ...rows.map(row => headers.map(h => escape(row[h])).join(','))
    ];

    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
