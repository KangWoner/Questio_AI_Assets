const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'questio-ai-b2b'
});

const db = admin.firestore();

async function checkAssets() {
    try {
        console.log("Fetching latest 3 uploaded ASSETS from DB...");
        const snapshot = await db.collection('assets')
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();

        if (snapshot.empty) {
            console.log("No assets found.");
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`\n=== Asset ID: ${doc.id} ===`);
            console.log(`- Title: ${data.title}`);
            console.log(`- Original CSV URL: ${data.productGcsUrl}`);
            console.log(`- Extracted: ${data.questionsExtracted ? 'Yes' : 'No'}`);
            console.log(`- Total Extracted Questions: ${data.totalExtractedQuestions || 0}`);
        });
    } catch (error) {
        console.error("Firestore Error:", error);
    }
}

checkAssets();
