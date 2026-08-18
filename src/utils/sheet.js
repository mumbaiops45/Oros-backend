import XLSX from "xlsx";

const normalizeKey = (key = "") => {
    return String(key)
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
};

/**
 * Reads a .csv / .xlsx / .xls file and returns rows as plain
 * objects with normalised snake_case keys.
 */
export const parseSheet = (filePath) => {

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
        throw new Error("The uploaded file has no sheet");
    }

    const rows = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName],
        { defval: "" }
    );

    return rows.map((row) => {

        const normalized = {};

        Object.keys(row).forEach((key) => {
            normalized[normalizeKey(key)] = row[key];
        });

        return normalized;
    });
};

/**
 * Accepts snake_case or camelCase headers.
 */
export const cell = (row, ...keys) => {

    for (const key of keys) {

        const value = row[normalizeKey(key)];

        if (value !== undefined && value !== null && value !== "") {
            return typeof value === "string" ? value.trim() : value;
        }
    }

    return "";
};

export const toNumber = (value, fallback = null) => {

    if (value === "" || value === null || value === undefined) {
        return fallback;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : NaN;
};

export const toBoolean = (value, fallback = false) => {

    if (value === "" || value === null || value === undefined) {
        return fallback;
    }

    const normalized = String(value).trim().toLowerCase();

    if (["true", "1", "yes", "y"].includes(normalized)) {
        return true;
    }

    if (["false", "0", "no", "n"].includes(normalized)) {
        return false;
    }

    return null;
};

/**
 * specs / options / price_slabs columns hold JSON arrays.
 * Empty cell is valid and means "nothing to create".
 */
export const parseJsonArray = (value, columnName) => {

    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return [];
    }

    if (Array.isArray(value)) {
        return value;
    }

    let parsed;

    try {
        parsed = JSON.parse(value);
    } catch {
        throw new Error(`Invalid JSON in "${columnName}" column`);
    }

    if (!Array.isArray(parsed)) {
        throw new Error(`"${columnName}" must be a JSON array`);
    }

    return parsed;
};
