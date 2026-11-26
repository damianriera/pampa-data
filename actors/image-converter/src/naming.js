// Builds safe, unique key-value store keys like "red-shoes.webp" from the original file name.

const MAX_KEY = 250;

/** "Red Shoes (1).JPG" -> "Red-Shoes-(1)". Keeps only characters a key-value store key allows. */
export function baseName(fileName) {
    let s = String(fileName ?? '').replace(/\.[a-z0-9]{1,5}$/i, '');
    s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    s = s.replace(/[^a-zA-Z0-9!\-_.'()]+/g, '-').replace(/-{2,}/g, '-').replace(/^[-.]+|[-.]+$/g, '');
    return s || 'image';
}

/** Gives each image its own key; a repeated name gets "-2", "-3" and so on. */
export class KeyNamer {
    constructor(prefix = '') {
        this.prefix = prefix;
        this.used = new Set();
    }

    next(fileName, extension) {
        const room = MAX_KEY - this.prefix.length - extension.length - 6;
        const base = baseName(fileName).slice(0, room);
        let key = `${this.prefix}${base}.${extension}`;
        for (let i = 2; this.used.has(key.toLowerCase()); i++) key = `${this.prefix}${base}-${i}.${extension}`;
        this.used.add(key.toLowerCase());
        return key;
    }
}
