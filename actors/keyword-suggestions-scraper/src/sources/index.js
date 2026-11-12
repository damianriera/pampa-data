import { bing } from './bing.js';
import { google, youtube } from './google.js';

export const SOURCES = { google, youtube, bing };
export const SOURCE_IDS = Object.keys(SOURCES);
