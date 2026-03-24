const fetch = require('node-fetch');

async function test() {
    try {
        const idToken = "dummy_token_to_check_cors"; // We expect a 401 Unauthorized WITH CORS headers
        const response = await fetch('https://us-central1-questio-ai-b2b.cloudfunctions.net/analyzeProblemImage', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                mimeType: "image/png",
                questionContext: "test"
            })
        });

        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        const text = await response.text();
        console.log("Body:", text);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}
test();
