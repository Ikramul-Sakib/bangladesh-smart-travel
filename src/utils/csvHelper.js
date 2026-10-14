/**
 * Convert an array of flat objects into a CSV string
 * @param {Array<Object>} rows
 * @param {Array<string>} columns
 */
function toCSV(rows, columns) {
    const escapeCell = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const headerLine = columns.join(',');
    const dataLines = rows.map((row) =>
        columns.map((col) => escapeCell(row[col])).join(',')
    );

    return [headerLine, ...dataLines].join('\n');
}

/**
 * Parse a CSV string into an array of objects keyed by the header row
 * @param {string} csvText
 */
function parseCSV(csvText) {
    const lines = csvText
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    if (lines.length < 2) return [];

    const splitLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = splitLine(lines[0]);
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const values = splitLine(lines[i]);
        if (values.length === 0) continue;
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = values[idx] !== undefined ? values[idx] : '';
        });
        records.push(obj);
    }

    return records;
}

module.exports = {
    toCSV,
    parseCSV
};