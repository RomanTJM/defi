import { Buffer } from 'buffer';
import '@testing-library/jest-dom/vitest';

globalThis.Buffer = Buffer;
if (typeof global !== 'undefined') {
    global.Buffer = Buffer;
}
if (typeof window !== 'undefined') {
    window.Buffer = Buffer;
}
