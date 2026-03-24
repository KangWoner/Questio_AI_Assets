const { GoogleAuth } = require('google-auth-library');

async function test() {
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const projectId = "451093355784";
    const location = "global";
    const engineId = "questio-math-ocr-app_1773932599382";
    const url = `https://discoveryengine.googleapis.com/v1alpha/projects/${projectId}/locations/${location}/collections/default_collection/engines/${engineId}/servingConfigs/default_search:search`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: "연세대학교 논술",
            pageSize: 10,
            contentSearchSpec: {
                snippetSpec: { returnSnippet: true },
                extractiveContentSpec: { maxExtractiveAnswerCount: 1 },
                summarySpec: {
                    summaryResultCount: 5,
                    ignoreAdversarialQuery: true
                }
            }
        })
    });

    if (!response.ok) {
        console.error("HTTP ERROR:", response.status);
        console.error(await response.text());
    } else {
        console.log("SUCCESS");
        console.log(await response.json());
    }
}
test().catch(console.error);
