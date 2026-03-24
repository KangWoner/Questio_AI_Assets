import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers for Local Development & Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { query, imageBase64, questionContext } = req.body;
    const textQuery = questionContext || query || '안녕하세요';

    // Parse Vercel Environment Variable for Service Account
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable. Please add your service account key in Vercel.");
    }

    let credentials;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
         credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    }
    
    // Authenticate using Application Default Credentials or parsed JSON
    const auth = new GoogleAuth({
      ...(credentials ? { credentials } : {}),
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    const projectId = "concise-terrain-462100-h9";
    const dataStoreId = "questio-math-ocr-data_1773931947878";
    const location = "global";

    // Call Discovery Engine Search API with summarySpec (RAG Answer)
    const apiUrl = `https://discoveryengine.googleapis.com/v1/projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreId}/servingConfigs/default_search:search`;

    const requestBody: any = {
      query: textQuery,
      contentSearchSpec: {
        summarySpec: {
          summaryResultCount: 3,
          includeCitations: true
        }
      }
    };

    // Note: If your Agent Builder Datastore supports Multimodal Search, we can include image contents.
    if (imageBase64) {
      requestBody.imageQuery = { imageBytes: imageBase64 };
    }

    const apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      console.error("Discovery Engine Error:", data);
      throw new Error(data.error?.message || "Agent Builder API Error");
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Chat Agent Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
