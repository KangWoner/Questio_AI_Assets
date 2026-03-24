const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'questio-ai-b2b' });
const db = admin.firestore();
async function check() {
    const snap = await db.collection('questions').orderBy('createdAt', 'desc').limit(3).get();
    if(snap.empty) { console.log("Empty!"); return; }
    snap.forEach(d => console.log(d.data()));
}
check();
