// Replace these ten local files with your own photos, then run the build.
// They are bundled into the HTML so the delivered experience also works offline.
import floor from '../assets/星空の床.png';
import photo01 from '../assets/photos/01.webp';
import photo02 from '../assets/photos/02.webp';
import photo03 from '../assets/photos/03.webp';
import photo04 from '../assets/photos/04.webp';
import photo05 from '../assets/photos/05.webp';
import photo06 from '../assets/photos/06.webp';
import photo07 from '../assets/photos/07.webp';
import photo08 from '../assets/photos/08.webp';
import photo09 from '../assets/photos/09.webp';
import photo10 from '../assets/photos/10.webp';
export const FLOOR_SOURCE = floor;
export const PHOTO_SOURCES = [photo01,photo02,photo03,photo04,photo05,photo06,photo07,photo08,photo09,photo10];

// User-supplied works. No titles or authors have been provided.
export const PHOTO_TITLES = PHOTO_SOURCES.map((_, index) => `写真 ${String(index + 1).padStart(2, "0")}`);
