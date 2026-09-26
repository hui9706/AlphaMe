import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await cp('app-config.json', 'dist/app-config.json');
