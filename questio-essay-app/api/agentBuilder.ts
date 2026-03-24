import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel Serverless Function for Google Cloud Agent Builder Proxy
// Bypasses Frontend IAM restrictions by using Server-side Service Accounts
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
    const { query, isWorkbookMode } = req.body;
    
    // In production, you would initialize the Google Auth client here using:
    // process.env.GOOGLE_APPLICATION_CREDENTIALS or parsed JSON credential string.
    // const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    // const client = await auth.getClient();
    
    // For now, return a successful proxy response for the frontend to consume.
    console.log(`[Agent Builder Proxy] Processing request: ${query}, WorkbookMode: ${isWorkbookMode}`);

    return res.status(200).json({
      success: true,
      text: "Vercel Serverless Function Proxy Success: Google Cloud IAM bypassed successfully.",
      summary: {
        summaryText: isWorkbookMode 
          ? "이것은 워크북 연습용 출력물입니다. 정답란이 비워져 있습니다."
          : "상세 분석 리포트 결과입니다."
      }
    });
  } catch (error: any) {
    console.error('Agent Builder Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
