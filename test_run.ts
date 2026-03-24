import { findGcsFilesForAsset } from './firebase.ts';

async function run() {
    const res = await findGcsFilesForAsset('연세대', '2025', '수리논술');
    console.log(res);
}

run();
