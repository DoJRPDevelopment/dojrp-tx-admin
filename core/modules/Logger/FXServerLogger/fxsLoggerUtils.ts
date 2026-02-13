//This regex was done in the first place to prevent fxserver output to be interpreted as txAdmin output by the host terminal
//IIRC the issue was that one user with a TM on their nick was making txAdmin's console to close or freeze. I couldn't reproduce the issue.
// \x00-\x08 Control characters in the ASCII table.
// allow \r and \t
// \x0B-\x1A Vertical tab and control characters from shift out to substitute.
// allow \x1B (escape for colors n stuff)
// \x1C-\x1F Control characters (file separator, group separator, record separator, unit separator).
// allow all printable
// \x7F Delete character.
export const regexControls = /[\x00-\x08\x0B-\x1A\x1C-\x1F\x7F]|(?:\x1B\[|\x9B)[\d;]+[@-K]/g;
export const regexColors = /\x1B[^m]*?m/g;




/**
 * Splits a string into two parts: the first line and the rest of the string.
 * Returns an object indicating whether an end-of-line (EOL) character was found.
 * If the string ends with a line break, `rest` is set to `undefined`.
 * Supports both Unix (`\n`) and Windows (`\r\n`) line breaks.
 */
export const splitFirstLine = (str: string): SplitFirstLineResult => {
    const firstEolIndex = str.indexOf('\n');
    if (firstEolIndex === -1) {
        return { first: str, rest: undefined, eol: false };
    }

    const isEolCrLf = firstEolIndex > 0 && str[firstEolIndex - 1] === '\r';
    const foundEolLength = isEolCrLf ? 2 : 1;
    const firstEolAtEnd = firstEolIndex === str.length - foundEolLength;
    if (firstEolAtEnd) {
        return { first: str, rest: undefined, eol: true };
    }

    const first = str.substring(0, firstEolIndex + foundEolLength);
    const rest = str.substring(firstEolIndex + foundEolLength);
    const eol = rest[rest.length - 1] === '\n';
    return { first, rest, eol };
};
type SplitFirstLineResult = {
    first: string;
    rest: string | undefined;
    eol: boolean;
};


/**
 * Strips the last end-of-line (EOL) character from a string.
 */
export const stripLastEol = (str: string) => {
    if (str.endsWith('\r\n')) {
        return {
            str: str.slice(0, -2),
            eol: '\r\n',
        }
    } else if (str.endsWith('\n')) {
        return {
            str: str.slice(0, -1),
            eol: '\n',
        }
    }
    return { str, eol: '' };
}


/**
 * Adds a given prefix to each line in the input string.
 * Does not add a prefix to the very last empty line, if it exists.
 * Efficiently handles strings without line breaks by returning the prefixed string.
 */
export const prefixMultiline = (str: string, prefix: string): string => {
    if (str.length === 0 || str === '\n') return '';
    let newlineIndex = str.indexOf('\n');

    // If there is no newline, append the whole string and return
    if (newlineIndex === -1 || newlineIndex === str.length - 1) {
        return prefix + str;
    }

    let result = prefix; // Start by prefixing the first line
    let start = 0;
    while (newlineIndex !== -1 && newlineIndex !== str.length - 1) {
        result += str.substring(start, newlineIndex + 1) + prefix;
        start = newlineIndex + 1;
        newlineIndex = str.indexOf('\n', start);
    }

    // Append the remaining part of the string after the last newline
    return result + str.substring(start);
};


/**
 * Formats a date as YYYY-MM-DD display format.
 * @param date input date
 * @returns Date in yyyy-mm-dd padded format
 */
export const formatDateYYYYMMDD = (date: Date): string => {
    if (!date) {
        return "";
    }

    const yyyy = date.getFullYear().toString();
    const mo = ('0' + (date.getMonth() + 1)).slice(-2);
    const dd = ('0' + date.getDate()).slice(-2);

    return `${yyyy}-${mo}-${dd}`;
}

/**
 * Gets the date-based prefix for a log line
 * @returns date-based prefix for a log line
 */
export const logDatePrefix = (): string => {
    const dt = new Date();
    const yyyy = dt.getFullYear().toString();
    const mo = ('0' + (dt.getMonth() + 1)).slice(-2);
    const dd = ('0' + dt.getDate()).slice(-2);
    const hh = ('0' + dt.getHours()).slice(-2);
    const min = ('0' + dt.getMinutes()).slice(-2);
    const sec = ('0' + dt.getSeconds()).slice(-2);
    const offsetMin = dt.getTimezoneOffset() * -1;
    let offsetText = '';

    switch (true)
    {
        case (offsetMin === 0):
            offsetText = 'UTC';
            break;

        case (offsetMin < 0):
            offsetText = `UTC${offsetMin/60}`;
            break;
        
        case (offsetMin > 0):
            offsetText = `UTC+${offsetMin/60}`;
            break;
    }

    return `${yyyy}-${mo}-${dd} ${hh}:${min}:${sec} ${offsetText}: `;
}