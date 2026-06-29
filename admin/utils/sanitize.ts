import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const window = new JSDOM("").window as unknown as Window & typeof globalThis;
const DOMPurify = createDOMPurify(window);

export const sanitize = (str: string) => DOMPurify.sanitize(str.trim());
