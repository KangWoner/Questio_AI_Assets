"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoTagProblem = exports.generateSimilarProblems = exports.ragTutorImage = exports.generateEssaySummary = exports.analyzeProblemImage = exports.askTutorAi = exports.migrateOldAssets = exports.chatTutor = exports.processAssetCsvTrigger = exports.generateEvaluationReport = exports.confirmPayment = exports.geminiProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const cors_1 = __importDefault(require("cors"));
const genai_1 = require("@google/genai");
const admin = __importStar(require("firebase-admin"));
const sync_1 = require("csv-parse/sync");
const google_auth_library_1 = require("google-auth-library");
admin.initializeApp();
const db = admin.firestore();
const corsHandler = (0, cors_1.default)({ origin: true });
// ?섍꼍 蹂???ㅼ젙 (firebase functions:config:set google.gemini_key="YOUR_KEY")
const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('API_KEY not found in Firebase config or environment variables');
    }
    return new genai_1.GoogleGenAI({ apiKey });
};
exports.geminiProxy = (0, https_1.onRequest)({ timeoutSeconds: 300, memory: '512MiB', cors: true }, (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            // Header?먯꽌 ?몄쬆 ?좏겙 ?뺤씤 (Bearer ?좏겙)
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized: No token provided' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (err) {
                console.error('Token verification error:', err);
                res.status(401).json({ error: 'Unauthorized: Invalid token' });
                return;
            }
            const uid = decodedToken.uid;
            // ?ъ슜??臾몄꽌 ?뺤씤
            const userRef = db.collection('users').doc(uid);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                res.status(403).json({ error: 'Forbidden: User not found in database' });
                return;
            }
            const userData = userSnap.data();
            const plan = userData.plan || 'basic';
            const freeTokens = userData.freeTokens || 0;
            // ?꾨줈 ?뚮옖???꾨땶 寃쎌슦 ?좏겙 ?섎웾 ?뺤씤 諛?李④컧
            if (plan !== 'pro') {
                if (freeTokens <= 0) {
                    res.status(403).json({ error: 'Forbidden: No free tokens remaining' });
                    return;
                }
                // ?좏겙 李④컧 吏꾪뻾
                await userRef.update({
                    freeTokens: admin.firestore.FieldValue.increment(-1)
                });
            }
            const ai = getAiClient();
            const { model, contents, config } = req.body;
            if (!model || !contents) {
                res.status(400).send('Missing required fields: model, contents');
                return;
            }
            const response = await ai.models.generateContent({
                model,
                contents,
                config
            });
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error proxying to Gemini API:', error);
            res.status(500).send(`Internal Server Error: ${error.message || error}`);
        }
    });
});
exports.confirmPayment = (0, https_1.onRequest)({ cors: true }, (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            const { paymentKey, orderId, amount, uid } = req.body;
            // Allow tests locally to pass without strict TOSS_SECRET_KEY check in dev
            const secretKey = process.env.TOSS_SECRET_KEY || 'test_sk_yZqmkKeP8gBqlXGENQ9drbQRxB9l';
            const encryptedSecretKey = Buffer.from(secretKey + ':').toString('base64');
            const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${encryptedSecretKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ paymentKey, orderId, amount }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                res.status(response.status).json(errorData);
                return;
            }
            const data = await response.json();
            // If uid is provided, update user tokens or purchased assets
            if (uid) {
                const userRef = db.collection('users').doc(uid);
                if (orderId.startsWith('Asset_')) {
                    // ?④굔 ?먯뀑 援щℓ 濡쒖쭅
                    // expected orderId: Asset_{assetId}_{randomId}
                    const parts = orderId.split('_');
                    const assetId = parts.slice(1, -1).join('_'); // Get everything between Asset and random suffix
                    // TODO: Actual validDays should come from a verified DB check. For now, defaulting to 365 days.
                    const now = new Date();
                    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
                    await userRef.collection('purchasedAssets').doc(assetId).set({
                        assetId,
                        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
                        expiresAt: expiresAt.toISOString()
                    });
                }
                else {
                    // ?뺢린 援щ룆(Pro) 援щℓ 濡쒖쭅
                    const isPro = orderId.includes('Pro');
                    const now = new Date();
                    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                    await userRef.set({
                        plan: isPro ? 'pro' : 'basic',
                        subscriptionEndDate: endDate.toISOString(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }
            }
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            console.error('Payment confirmation error:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    });
});
exports.generateEvaluationReport = (0, https_1.onRequest)({ timeoutSeconds: 540, memory: '2GiB', concurrency: 10, cors: true }, (req, res) => {
    corsHandler(req, res, async () => {
        console.log(`[EvalReport] Request started. Method: ${req.method}, Content-Length: ${req.headers['content-length']}`);
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            console.log('[EvalReport] Checking auth token');
            // Header Authentication
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized: No token provided' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (err) {
                console.error('Token verification error:', err);
                res.status(401).json({ error: 'Unauthorized: Invalid token' });
                return;
            }
            const uid = decodedToken.uid;
            const userRef = db.collection('users').doc(uid);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                res.status(403).json({ error: 'Forbidden: User not found in database' });
                return;
            }
            const userData = userSnap.data();
            const plan = userData.plan || 'basic';
            const freeTokens = userData.freeTokens || 0;
            if (plan !== 'pro') {
                if (freeTokens <= 0) {
                    res.status(403).json({ error: 'Forbidden: No free tokens remaining' });
                    return;
                }
                // Token Deduction (1 token for the entire process)
                await userRef.update({
                    freeTokens: admin.firestore.FieldValue.increment(-1)
                });
            }
            const ai = getAiClient();
            const { examLabel, examInfo, scoringCriteria, essayInstructions, reportTemplate, referenceParts, studentParts, model, studentName, generationDate } = req.body;
            if (!model || !studentParts || studentParts.length === 0) {
                res.status(400).send('Missing required fields');
                return;
            }
            const prompt = `
    You are 'Questio AI Engine', a rigorous and highly critical AI professor specializing in university-level ${examLabel} grading. 
    Your task is to evaluate student solutions with extreme precision and zero tolerance for hallucinations.

    # Context:
    - Student: ${studentName}
    - Exam Type: ${examLabel}
    - Exam Info: ${examInfo}
    - Scoring Criteria: ${scoringCriteria}
    ${essayInstructions || ''}
    ${reportTemplate ? `- Special Instructions: ${reportTemplate}` : ''}

    # Strict Grading Rules:
    1. **Evidence-Based Only**: Grade ONLY what is explicitly visible in the student's solution images/PDFs. If a problem or a sub-problem is missing, it MUST receive 0 points.
    2. **Anti-Hallucination Strict Mode**: Only if the student's solution image is completely blank or literally contains no recognizable characters at all, YOU MUST ABORT GRADING and output exactly: "?숈깮 ?듭븞吏瑜??먮룆?????녾굅??泥⑤??섏? ?딆븯?듬땲?? ?щ컮瑜??대?吏瑜??ㅼ떆 ?낅줈?쒗빐二쇱꽭??" Otherwise, attempt to grade whatever is visible, even if it's partial or handwriting is poor. Do not invent any graded responses.
    3. **Strict Deduction**: If the logic is flawed, even if the final answer is correct, deduct points according to the scoring criteria.
    4. **No Assumptions**: Do not assume the student "meant" something if it's not written.
    5. **Verification Step**: Before grading, identify which problems are present in the student's solution. If a problem mentioned in the 'Scoring Criteria' is not found in the 'Student Solution', mark it as 'Not Attempted'.
    6. **Mathematical Precision**: Use standard LaTeX \\( ... \\) for inline mathematical notations and \\[ ... \\] for block equations. DO NOT USE single $ signs.
       - **IMPORTANT**: If you include Korean text inside LaTeX, you MUST wrap it in \\text{...} (e.g., \\(\\text{?쒓? ?섏떇}\\)). 
       - **NEVER** write Korean text directly inside LaTeX without \\text{...}.
    7. **Comparison**: Directly compare the student's steps with the 'Scoring/Solution Materials' provided.

    # Output Structure (Korean Markdown):
    ## 1. 臾몄젣 ?앸퀎 諛??묒떆 ?щ?
    ## 2. 珥앹젏 (?띾뱷?먯닔/留뚯젏)
    ## 3. 梨꾩젏 湲곗?蹂??곸꽭 ?먯닔 (Table format)
    | 臾명빆/湲곗? | 諛곗젏 | ?띾뱷 ?먯닔 | 媛먯젏 ?ъ쑀 諛?洹쇨굅 |
    | :--- | :--- | :--- | :--- |
    ## 4. 臾몄젣蹂??곸꽭 ?됯?
    ## 5. 珥앺룊 諛??숈뒿 媛쒖꽑 ?쇰뱶諛?
            `;
            const config = { temperature: 0.1, topP: 0.1 };
            if (model.includes('pro'))
                config.thinkingConfig = { thinkingBudget: 16000 };
            else
                config.thinkingConfig = { thinkingBudget: 4000 };
            console.log(`[EvalReport] Starting Gemini evaluation generation. Model: ${model}. Ref parts: ${referenceParts === null || referenceParts === void 0 ? void 0 : referenceParts.length}, Student parts: ${studentParts === null || studentParts === void 0 ? void 0 : studentParts.length}`);
            // Step 1: Grading
            const gradingResponse = await ai.models.generateContent({
                model,
                contents: {
                    parts: [
                        { text: "### SYSTEM INSTRUCTIONS ###\n" + prompt },
                        { text: "\n\n### REFERENCE MATERIALS (PROBLEMS & SCORING CRITERIA) ###\n" },
                        ...(referenceParts || []).map((p) => ({ inlineData: p })),
                        { text: "\n\n### STUDENT SOLUTION (TO BE GRADED) ###\n" },
                        ...studentParts.map((p) => ({ inlineData: p })),
                    ],
                },
                config,
            });
            console.log(`[EvalReport] First generation complete.`);
            const rawReport = gradingResponse.text || "寃곌낵瑜??앹꽦?????놁뒿?덈떎.";
            if (rawReport.includes("?숈깮 ?듭븞吏瑜??먮룆?????녾굅??泥⑤??섏? ?딆븯?듬땲??")) {
                res.status(200).json({ htmlReport: rawReport, rawReport, extractedData: {} });
                return;
            }
            // Step 2: Format to HTML
            const formatPrompt = `Convert this math exam evaluation report into a clean, modern Tailwind CSS HTML document. 
Theme: stone-900 background, stone-300 text.
Header should include: Exam Info: ${examInfo}, Date: ${generationDate}, Student: ${studentName}.
Preserve all LaTeX \\( ... \\) and \\[ ... \\]. DO NOT convert them to $ signs.
**IMPORTANT**: Ensure all Korean text inside LaTeX is correctly formatted with \\text{...} (e.g., \\(\\text{?쒓?}\\)) if it isn't already.
Ensure tables have proper borders and padding.
\n\nReport Content:\n${rawReport}`;
            const htmlResponse = await ai.models.generateContent({
                model,
                contents: formatPrompt,
                config: { temperature: 0.1, topP: 0.1 }
            });
            const htmlReport = (htmlResponse.text || "").replace(/```html|```/g, "").trim();
            // Step 3: Extract Data
            const extractPrompt = `Extract evaluation data as JSON. Ensure fields: totalScore (number), maxScore (number), weaknesses (string array), strengths (string array), conceptWeaknesses (array of {concept, category, count, details}), coreCompetencies (object {problemSolving, writingAbility, calculationAccuracy} scores out of 100), criteriaScores (array). 
Report content:\n${rawReport}`;
            let extractedData = {};
            try {
                const extractResponse = await ai.models.generateContent({
                    model,
                    contents: extractPrompt,
                    config: { responseMimeType: "application/json" }
                });
                extractedData = JSON.parse(extractResponse.text || "{}");
            }
            catch (e) {
                console.error("JSON Extraction Error:", e);
            }
            res.status(200).json({ htmlReport, rawReport, extractedData });
        }
        catch (error) {
            console.error('Error generating evaluation report:', error);
            res.status(500).json({ error: `Internal Server Error: ${error.message || error}` });
        }
    });
});
// CSV 媛쒕퀎 臾명빆 臾몄젣???Questions) 遺꾪븷 ?먮룞 ????⑥닔
exports.processAssetCsvTrigger = (0, firestore_1.onDocumentCreated)({
    document: 'assets/{assetId}',
    region: 'us-central1',
    memory: '512MiB'
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log('No data associated with the event');
        return;
    }
    const data = snapshot.data();
    const assetId = event.params.assetId;
    const csvUrl = data.questionGcsUrl || data.productGcsUrl;
    if (!csvUrl) {
        console.log('No CSV URL found in the asset document');
        return;
    }
    try {
        console.log(`[processAssetCsvTrigger] Fetching CSV from: ${csvUrl}`);
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        }
        const csvText = await response.text();
        // csv-parse瑜??댁슜??媛뺣젰??CSV ?뚯떛 (?띾뵲?댄몴 ???쇳몴 ?덉젙??泥섎━)
        // 泥?踰덉㎏ ?됱? ?ㅻ뜑濡?泥섎━
        const records = (0, sync_1.parse)(csvText, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
        if (records.length === 0) {
            console.log('CSV is empty or missing data rows');
            return;
        }
        const batch = db.batch();
        const questionsRef = db.collection('questions');
        let createdCount = 0;
        for (const rawRow of records) {
            const row = rawRow;
            // ??而щ읆紐?瑜??뚮Ц?먯? 怨듬갚?쒓굅 ?뺥깭濡??쇰컲?뷀븯??留ㅽ븨
            const rowKeys = Object.keys(row);
            const getVal = (keywords) => {
                const key = rowKeys.find(k => keywords.some(kw => k.toLowerCase().replace(/\s/g, '').includes(kw)));
                return key ? row[key] : '';
            };
            const university = getVal(['university', '대학교', '대학']);
            const year = getVal(['year', '출제년도', '연도']);
            const category = getVal(['category', '문제유형', '분류']);
            const questionLink = getVal(['question_link', 'prob_public', '문제해설']);
            const solutionLink = getVal(['solution_link', 'sol_public', '해설링크', '풀이링크']);
            const title = getVal(['문서제목', 'title', '제목']);
            // 媛쒕퀎 臾몄젣 臾몄꽌瑜??꾪븳 ?쒓렇 ?앹꽦
            const tags = [];
            if (university)
                tags.push(university);
            if (year)
                tags.push(year);
            if (category)
                tags.push(category);
            // ?대떦 ?됱씠 ?꾩쟾??鍮꾩뼱?덈뒗 ?곕젅湲?媛믪씠硫??ㅽ궢
            if (!university && !year && !questionLink)
                continue;
            const newQDoc = questionsRef.doc();
            batch.set(newQDoc, {
                assetId: assetId, // 遺紐??쒗뭹 ?⑦궎吏 ID ?곌껐
                university,
                year,
                category,
                title,
                questionLink,
                solutionLink,
                tags,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            createdCount++;
        }
        console.log(`[processAssetCsvTrigger] Writing ${createdCount} rows to 'questions' collection...`);
        // 理쒕? 諛곗튂 ?ш린??500?대?濡??섏뼱媛硫??섎씪以섏빞 ?섏?留? 蹂댄넻 湲곗텧 6媛쒕뀈??500媛쒕? ?섏????딆쓬
        await batch.commit();
        // ?먮낯 Asset 臾몄꽌?먮룄 '遺꾪븷(migration) ?꾨즺' 留덊겕 ?쒖떆
        await snapshot.ref.update({
            questionsExtracted: true,
            totalExtractedQuestions: createdCount,
            metadataExtractedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Successfully extracted ${createdCount} questions to separate DB documents.`);
    }
    catch (error) {
        console.error('Error extracting CSV data to questions DB:', error);
    }
});
// ?숈깮??珥덇컻?명솕 AI ?쒗꽣 梨꾪똿 ?붾뱶?ъ씤??
exports.chatTutor = (0, https_1.onRequest)({ timeoutSeconds: 60, memory: '256MiB', cors: true }, (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            // Header Authentication
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized: No token provided' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (err) {
                console.error('Token verification error:', err);
                res.status(401).json({ error: 'Unauthorized: Invalid token' });
                return;
            }
            const uid = decodedToken.uid;
            const userRef = db.collection('users').doc(uid);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                res.status(403).json({ error: 'Forbidden: User not found in database' });
                return;
            }
            const userData = userSnap.data();
            const freeTokens = userData.freeTokens || 0;
            if (freeTokens <= 0 && userData.plan !== 'pro') {
                res.status(403).json({ error: 'Forbidden: ?쒗꽣留곸쓣 吏꾪뻾?????덈뒗 Q-Token??紐⑤몢 ?뚯쭊?섏뿀?듬땲??' });
                return;
            }
            // ?좏겙 1媛?李④컧
            if (userData.plan !== 'pro') {
                await userRef.update({
                    freeTokens: admin.firestore.FieldValue.increment(-1)
                });
            }
            const ai = getAiClient();
            const { contents, questionContext, language, targetAudience } = req.body;
            if (!contents || !Array.isArray(contents)) {
                res.status(400).send('Missing req.body.contents array');
                return;
            }
            let modeDescription = "??쒕?援??移섎룞 理쒓퀬???섑븰 ?쇱닠 諛??섎━ 湲곗텧 遺꾩꽍 媛뺤궗?댁옄, 怨좊벑?숈깮 ???理쒖긽?꾧텒 '珥덇컻?명솕 AI ?쒗꽣'?낅땲??";
            if (targetAudience === 'middle') {
                modeDescription = "???멸퀎 以묓븰?앸뱾?먭쾶 ?섑븰???먮━瑜?媛???쎄퀬 ?ㅼ젙?섍쾶, ?ㅼ깮??鍮꾩쑀瑜??ㅼ뼱 ?ㅻ챸?댁＜??'移쒖젅??湲濡쒕쾶 ?섑븰???좎깮???낅땲??";
            }
            const systemPrompt = `?뱀떊? ${modeDescription}
移쒖젅?섍퀬 ?꾨Ц?곸씤 ?ㅼ쓣 ?좎??섏꽭?? ?숈깮?먭쾶 諛붾줈 ?뺣떟???뚮젮二쇱? 留먭퀬, ?뚰겕?쇳뀒??臾몃떟踰뺤쿂???듭떖??源딄쾶 吏싳뼱二쇨퀬 ?ㅼ뒪濡??ㅼ쓬 ?④퀎瑜??앷컖?대낫?꾨줉 ?뚰듃瑜??섏졇二쇱꽭??

?꾩옱 ?숈깮??蹂닿퀬 ?덈뒗 湲곗텧臾몄젣 ?뺣낫:
${questionContext ? JSON.stringify(questionContext) : '?먯쑀 吏덈Ц 紐⑤뱶'}

?섑븰 ?섏떇??異쒕젰???뚮뒗 臾댁“嫄??ㅼ쓬 ?щ㎎??泥좎???吏?ㅼ떗?쒖삤:
1. 臾몄옣 ???몃씪???섏떇? \\( ?섏떇 \\) ?쇰줈 媛먯떥?몄슂. (?덈? ?⑥씪 $ 臾몄옄瑜??ъ슜?섏? 留덉꽭??
2. ?낅┰?곸씤 釉붾줉 ?섏떇? \\[ ?섏떇 \\] ?쇰줈 媛먯떥?몄슂.
3. ?섏떇(LaTeX) ?대????쒓????⑥빞 ??寃쎌슦 諛섎뱶??\\text{?쒓?} ?뺥깭濡??묒꽦?댁빞 ?ㅻ쪟媛 ?놁뒿?덈떎.
4. ?ㅽ럹?몄뼱?먯꽌 ?곗씠????Ъ?뚰몴(쩔)???붾㈃ ?고듃 ?쒖뒪?쒖쓣 援먮??쒗궎誘濡??덈? ?ъ슜?섏? 留덉꽭?? ??긽 ?뺣갑??臾쇱쓬???)留??ъ슜?섏꽭??
5. 諛섎뱶???숈깮???붿껌???몄뼱 肄붾뱶(${language || 'ko'})???몄뼱瑜??ъ슜?섏뿬 ?듬? ?꾩껜瑜??앹꽦?섏떗?쒖삤.`;
            // 湲곕낯? 鍮좊Ⅴ怨???붿뿉 ?곹빀??flash 紐⑤뜽
            const model = "gemini-2.5-flash";
            const response = await ai.models.generateContent({
                model,
                contents,
                config: {
                    temperature: 0.7,
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                }
            });
            res.status(200).json({ text: response.text });
        }
        catch (error) {
            console.error('Error in chatTutor proxy:', error);
            res.status(500).json({ error: error.message || error });
        }
    });
});
// 湲곗〈 ?낅줈?쒕맂 ?먯뀑 CSV ?쇨큵 ?뚭툒 ?뚯떛(Migration) HTTP ?⑥닔 (1?뚯꽦)
exports.migrateOldAssets = (0, https_1.onRequest)({ timeoutSeconds: 540, memory: '1GiB' }, async (req, res) => {
    try {
        const allAssets = await db.collection('assets').get();
        const unmigratedAssets = allAssets.docs.filter(doc => {
            const data = doc.data();
            return !data.questionsExtracted && (data.questionGcsUrl || data.productGcsUrl);
        });
        let totalExtracted = 0;
        let processedAssets = 0;
        for (const doc of unmigratedAssets) {
            const data = doc.data();
            const assetId = doc.id;
            const csvUrl = data.questionGcsUrl || data.productGcsUrl;
            console.log(`[migrateOldAssets] Processing asset: ${assetId}, URL: ${csvUrl}`);
            const response = await fetch(csvUrl);
            if (!response.ok) {
                console.error(`Failed to fetch CSV for ${assetId}`);
                continue;
            }
            const csvText = await response.text();
            const records = (0, sync_1.parse)(csvText, { columns: true, skip_empty_lines: true, trim: true });
            if (records.length === 0)
                continue;
            const batch = db.batch();
            const questionsRef = db.collection('questions');
            let createdCount = 0;
            for (const rawRow of records) {
                const row = rawRow;
                const rowKeys = Object.keys(row);
                const getVal = (keywords) => {
                    const key = rowKeys.find(k => keywords.some(kw => k.toLowerCase().replace(/\s/g, '').includes(kw)));
                    return key ? row[key] : '';
                };
                const university = getVal(['university', '대학교', '대학']);
                const year = getVal(['year', '출제년도', '연도']);
                const category = getVal(['category', '문제유형', '분류']);
                const questionLink = getVal(['question_link', 'prob_public', '문제해설']);
                const solutionLink = getVal(['solution_link', 'sol_public', '해설링크', '풀이링크']);
                const title = getVal(['문서제목', 'title', '제목']);
                const tags = [];
                if (university)
                    tags.push(university);
                if (year)
                    tags.push(year);
                if (category)
                    tags.push(category);
                if (!university && !year && !questionLink)
                    continue;
                const newQDoc = questionsRef.doc();
                batch.set(newQDoc, {
                    assetId: assetId,
                    university,
                    year,
                    category,
                    title,
                    questionLink,
                    solutionLink,
                    tags,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                createdCount++;
            }
            console.log(`[migrateOldAssets] Committing ${createdCount} docs for asset ${assetId}`);
            // Firestore batch write limit is 500. Assuming CSV rows are less than 500 for now.
            await batch.commit();
            await doc.ref.update({
                questionsExtracted: true,
                totalExtractedQuestions: createdCount,
                metadataExtractedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            totalExtracted += createdCount;
            processedAssets++;
        }
        res.status(200).json({ success: true, processedAssets, totalExtracted });
    }
    catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ error: error.message || String(error) });
    }
});
// Vertex AI Search (?먯씠?꾪듃 鍮뚮뜑) ?꾩슜 ?듭떊 API
exports.askTutorAi = (0, https_1.onRequest)({ timeoutSeconds: 300, memory: '512MiB', cors: true }, (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            // Header?먯꽌 ?몄쬆 ?좏겙 ?뺤씤
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized: No token provided' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            try {
                await admin.auth().verifyIdToken(idToken);
            }
            catch (err) {
                res.status(401).json({ error: 'Unauthorized: Invalid token' });
                return;
            }
            const { query } = req.body;
            if (!query) {
                res.status(400).send('Missing required field: query');
                return;
            }
            // 援ш? ?대씪?곕뱶 ?먮룞 ?몄쬆 (?쒕쾭媛?沅뚰븳)
            // Firebase ?섍꼍?먯꽌??Service Account瑜??먮룞 痍⑤뱷?⑸땲??
            const auth = new google_auth_library_1.GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            const client = await auth.getClient();
            const token = await client.getAccessToken();
            const projectId = "451093355784";
            const location = "global";
            const engineId = "questio-math-ocr-app_1773932599382";
            // v1alpha API ?붾뱶?ъ씤???앹꽦 (?앹꽦???듬? 吏?먯슜)
            const url = `https://discoveryengine.googleapis.com/v1alpha/projects/${projectId}/locations/${location}/collections/default_collection/engines/${engineId}/servingConfigs/default_search:search`;
            // Google Agent Builder(Vertex AI Search)濡?吏곸젒 ?붿껌
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json',
                    'x-goog-user-project': 'questio-ai-b2b'
                },
                body: JSON.stringify({
                    query: query,
                    pageSize: 10,
                    // 寃?????붿빟臾?Summary)???④퍡 ?붿껌?섎뒗 ?듭뀡 ?쒓났
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
                const errText = await response.text();
                throw new Error(`Google API Error (${response.status}): ${errText}`);
            }
            const data = await response.json();
            res.status(200).json(data);
        }
        catch (error) {
            console.error('Error calling Vertex AI Search:', error);
            res.status(500).json({ error: error.message || String(error) });
        }
    });
});
// --- NEW FEATURE: AI/ML Image Processing (移대찓???섑븰 ?몄떇/梨꾩젏) ---
exports.analyzeProblemImage = (0, https_1.onRequest)({ timeoutSeconds: 60, memory: '512MiB', cors: true }, (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            // Header Authentication
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized: No token provided' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (err) {
                res.status(401).json({ error: 'Unauthorized: Invalid token' });
                return;
            }
            const uid = decodedToken.uid;
            const userRef = db.collection('users').doc(uid);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                res.status(403).json({ error: 'Forbidden: User not found in database' });
                return;
            }
            const userData = userSnap.data();
            const freeTokens = userData.freeTokens || 0;
            if (freeTokens <= 0 && userData.plan !== 'pro') {
                res.status(403).json({ error: 'Forbidden: 튜터링을 진행할 수 있는 Q-Token이 모두 소진되었습니다. (사진 인식 1토큰 필요)' });
                return;
            }
            const { imageBase64, mimeType, questionContext } = req.body;
            if (!imageBase64) {
                res.status(400).json({ error: 'Missing imageBase64 data' });
                return;
            }
            if (userData.plan !== 'pro') {
                await userRef.update({
                    freeTokens: admin.firestore.FieldValue.increment(-1)
                });
            }
            const ai = getAiClient();
            const systemPrompt = `당신은 대한민국 대치동 최고의 수학 논술 및 수리 기출 분석 강사이자, '초개인화 최고의 수학 튜터'입니다.
학생이 본인의 질의내용과 수학 문제를 사진으로 찍어서 보냈습니다.
이미지를 스캔하여 (OCR) 어떤 문제인지/어떤 질의인지 정확히 파악하고, 다음 지침을 따르세요:
1. 학생의 질의가 있다면 어디서 막혔는지 파악하여 짚어주세요.
2. 해결해야 할 수학 문제라면 단계별(Step-by-step)로 완벽한 해설과 정답을 제시하세요.
3. 수식은 무조건 다음 포맷을 철저히 지키세요: 문장 내 수식은 \\( 수식 \\), 블록 수식은 \\[ 수식 \\] 으로 감싸고 절대 단일 $ 기호는 쓰지 마세요.
4. 친절하고 격려하는 말투를 사용하세요.`;
            const contents = [
                {
                    parts: [
                        { inlineData: { data: imageBase64.replace(/^data:image\/\w+;base64,/, ''), mimeType: mimeType || 'image/jpeg' } },
                        { text: questionContext || "이 사진에 있는 수학 문제를 단계별로 풀이해 주세요." }
                    ]
                }
            ];
            const model = "gemini-2.5-pro";
            const response = await ai.models.generateContent({
                model,
                contents,
                config: {
                    temperature: 0.3,
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                }
            });
            res.status(200).json({ text: response.text });
        }
        catch (error) {
            console.error('Error in analyzeProblemImage:', error);
            res.status(500).json({ error: error.message || error });
        }
    });
});
exports.generateEssaySummary = (0, https_1.onRequest)({ timeoutSeconds: 60, memory: '256MiB', cors: true }, (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized: No token provided' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (err) {
                res.status(401).json({ error: 'Unauthorized: Invalid token' });
                return;
            }
            const uid = decodedToken.uid;
            const userRef = db.collection('users').doc(uid);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                res.status(403).json({ error: 'Forbidden: User not found in database' });
                return;
            }
            const userData = userSnap.data();
            const plan = userData.plan || 'basic';
            const freeTokens = userData.freeTokens || 0;
            if (plan !== 'pro') {
                if (freeTokens <= 0) {
                    res.status(403).json({ error: 'Forbidden: 리포트 분석에 필요한 Q-Token이 모두 소진되었습니다.' });
                    return;
                }
                const result = await db.runTransaction(async (t) => {
                    var _a;
                    const doc = await t.get(userRef);
                    const currentTokens = ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.freeTokens) || 0;
                    if (currentTokens <= 0)
                        return false;
                    t.update(userRef, { freeTokens: admin.firestore.FieldValue.increment(-1) });
                    return true;
                });
                if (!result) {
                    res.status(403).json({ error: 'Forbidden: 리포트 분석에 필요한 Q-Token이 모두 소진되었습니다.' });
                    return;
                }
            }
            const { questionText, questionFiles, rubricText, rubricFiles, essayText, essayFiles } = req.body;
            if (!essayText && (!essayFiles || essayFiles.length === 0)) {
                res.status(400).send('Missing required fields: essayText or essayFiles is required.');
                return;
            }
            const ai = getAiClient();
            const systemPrompt = `당신은 대한민국 대치동 최고 1타 논술/국어 및 자기소개서 전문 첨삭 강사입니다.
학생이 작성한 장문(논술, 비문학, 자기소개서 등)을 평가하고 초개인화된 진단 리포트를 작성해 주어야 합니다.

[첨부된 자료 구조 설명]
1. 문제(Question): 학생이 풀어야 했던 원래 문제나 지문 정보입니다. (텍스트 또는 이미지/PDF)
2. 채점기준/풀이(Rubric/Solution): 학교측에서 제공한 예시답안이나 채점 기준표입니다. (텍스트 또는 이미지/PDF)
3. 학생답안(Essay): 학생이 직접 작성한 글입니다. (텍스트 또는 이미지/PDF)

리포트는 반드시 다음 마크다운 형식을 따라 전문적이고 가독성 있게 작성하십시오:

# 📝 AI 초개인화 진단 리포트

## 1. 🎯 한 줄 핵심 요약
- 학생 글의 가장 핵심적인 주장이나 내용을 명쾌하게 한 줄로 요약하세요.

## 2. 🌟 글의 강점 및 잘한 점
- 문장력, 논리 전개, 설득력 등 학생의 뛰어난 점을 칭찬해 주세요.

## 3. 🔍 보완이 필요한 개선/진단점 (팩폭)
- 논리적 비약, 어색한 어휘, 문맥 단절 등 상황(문제/채점기준)에 비추어 감점 요인을 아주 날카롭고 구체적으로 지적하세요.
- 개선된 예시 문장도 하나 제안해 주세요.

## 4. 🥇 종합 평가 및 점수
- 100점 만점 기준으로 종합 점수를 부여하세요 (예: 85 / 100 점).
- 총평 코멘트를 추가하세요.`;
            const processFiles = (files) => {
                if (!files || !Array.isArray(files))
                    return [];
                return files.map(f => ({
                    inlineData: {
                        data: f.data.replace(/^data:(image\/\w+|application\/pdf);base64,/, ''),
                        mimeType: f.mimeType
                    }
                }));
            };
            const qParts = processFiles(questionFiles);
            if (questionText)
                qParts.unshift({ text: `[문제 텍스트]: ${questionText}` });
            const rParts = processFiles(rubricFiles);
            if (rubricText)
                rParts.unshift({ text: `[채점기준/풀이 텍스트]: ${rubricText}` });
            const eParts = processFiles(essayFiles);
            if (essayText)
                eParts.unshift({ text: `[학생답안 텍스트]: ${essayText}` });
            const allParts = [];
            if (qParts.length > 0) {
                allParts.push({ text: "--- 다음은 학생이 풀어야 할 [문제]에 대한 정보입니다. ---" });
                allParts.push(...qParts);
                allParts.push({ text: "\n\n" });
            }
            if (rParts.length > 0) {
                allParts.push({ text: "--- 다음은 해당 문제의 [채점기준/예시풀이] 정보입니다. ---" });
                allParts.push(...rParts);
                allParts.push({ text: "\n\n" });
            }
            if (eParts.length > 0) {
                allParts.push({ text: "--- 다음은 학생이 실제로 작성한 [답안] 정보입니다. 이를 분석하십시오. ---" });
                allParts.push(...eParts);
            }
            const contents = [{ role: "user", parts: allParts }];
            const model = "gemini-2.5-flash";
            const response = await ai.models.generateContent({
                model,
                contents,
                config: {
                    temperature: 0.2,
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                }
            });
            res.status(200).json({ text: response.text });
        }
        catch (error) {
            console.error('Error in generateEssaySummary:', error);
            res.status(500).json({ error: error.message || error });
        }
    });
});
// --- NEW RAG FEATURE: 교과서 기반 문제 풀이 튜터 ---
exports.ragTutorImage = (0, https_1.onRequest)({ timeoutSeconds: 120, memory: '1GiB', cors: true }, (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            // Header Authentication
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized: No token provided' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (err) {
                res.status(401).json({ error: 'Unauthorized: Invalid token' });
                return;
            }
            const uid = decodedToken.uid;
            const userRef = db.collection('users').doc(uid);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                res.status(403).json({ error: 'Forbidden: User not found in database' });
                return;
            }
            const userData = userSnap.data();
            const freeTokens = userData.freeTokens || 0;
            if (freeTokens <= 0 && userData.plan !== 'pro') {
                res.status(403).json({ error: 'Forbidden: Q-Token이 모두 소진되었습니다. (RAG 튜터 기능)' });
                return;
            }
            const { imageBase64, mimeType } = req.body;
            if (!imageBase64) {
                res.status(400).json({ error: 'Missing imageBase64 data' });
                return;
            }
            if (userData.plan !== 'pro') {
                await userRef.update({
                    freeTokens: admin.firestore.FieldValue.increment(-1)
                });
            }
            const ai = getAiClient();
            // Step 1: Extract Text (OCR Query Generation)
            const ocrPrompt = "Extract the mathematical problem text and equations from this image. Output only the text and LaTeX, nothing else.";
            const contentsFirst = [
                {
                    parts: [
                        { inlineData: { data: imageBase64.replace(/^data:image\/\w+;base64,/, ''), mimeType: mimeType || 'image/jpeg' } },
                        { text: ocrPrompt }
                    ]
                }
            ];
            const ocrResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: contentsFirst,
                config: { temperature: 0.1 }
            });
            const extractedQuery = ocrResponse.text || "수학 문제";
            console.log("[ragTutorImage] Extracted Query: ", extractedQuery);
            // Step 2: Retrieve from Vertex AI Search
            const auth = new google_auth_library_1.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
            const client = await auth.getClient();
            const token = await client.getAccessToken();
            const projectId = "451093355784";
            const location = "global";
            const engineId = "questio-math-ocr-app_1773932599382";
            const url = `https://discoveryengine.googleapis.com/v1alpha/projects/${projectId}/locations/${location}/collections/default_collection/engines/${engineId}/servingConfigs/default_search:search`;
            let retrievedContext = "";
            try {
                const searchResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token.token}`,
                        'Content-Type': 'application/json',
                        'x-goog-user-project': 'questio-ai-b2b'
                    },
                    body: JSON.stringify({
                        query: extractedQuery,
                        pageSize: 3,
                        contentSearchSpec: {
                            snippetSpec: { returnSnippet: true },
                            extractiveContentSpec: { maxExtractiveAnswerCount: 1 }
                        }
                    })
                });
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.results) {
                        retrievedContext = searchData.results.map((r) => {
                            var _a, _b, _c, _d, _e, _f;
                            const snippets = ((_c = (_b = (_a = r.document) === null || _a === void 0 ? void 0 : _a.derivedStructData) === null || _b === void 0 ? void 0 : _b.snippets) === null || _c === void 0 ? void 0 : _c.map((s) => s.snippet).join(" ")) || "";
                            const extracts = ((_f = (_e = (_d = r.document) === null || _d === void 0 ? void 0 : _d.derivedStructData) === null || _e === void 0 ? void 0 : _e.extractive_answers) === null || _f === void 0 ? void 0 : _f.map((e) => e.content).join(" ")) || "";
                            return extracts || snippets;
                        }).join("\n\n");
                    }
                }
            }
            catch (e) {
                console.error("Vertex AI Search fail, proceeding without context", e);
            }
            console.log("[ragTutorImage] Retrieved Context Length: ", retrievedContext.length);
            // Step 3: Final Generation with Context
            const systemPrompt = `당신은 대한민국 대치동 최고 1타 수학 강사이자 초개인화 수학 튜터입니다.
학생이 본인의 질의내용과 수학 문제를 사진으로 찍어서 보냈습니다.

[검색된 교과서 기반 지식]:
${retrievedContext ? retrievedContext : "검색된 관련 교과서 내용이 부족합니다. 보편적인 기초 지식을 바탕으로 설명해 주세요."}

[지침]:
1. 반드시 위의 '검색된 교과서 기반 지식'에 나오는 공식을 바탕으로 설명해야 합니다. 고등학교 공식을 중학생 문맥에 사용하지 마세요.
2. 학생이 풀 수 있도록 단계별(Step-by-step) 힌트나 풀이를 제시하세요.
3. 수식은 무조건 문장 내 \\( 수식 \\), 블록 \\[ 수식 \\] 포맷을 철저히 지키며 $ 기호는 단일이든 이중이든 전혀 쓰지 마세요.
4. 예쁜 한국어 수식 렌더링을 위해 한국어가 포함된 수식은 반드시 \\(\\text{수식어}\\) 처럼 텍스트를 감싸주세요.
5. 다정하고 격려하는 어조를 사용하세요.`;
            const contentsFinal = [
                {
                    parts: [
                        { inlineData: { data: imageBase64.replace(/^data:image\/\w+;base64,/, ''), mimeType: mimeType || 'image/jpeg' } },
                        { text: "이 이미지를 보고 문제를 파악한 뒤, 관련 교과서 개념을 바탕으로 차근차근 단계별로 풀어주세요." }
                    ]
                }
            ];
            const responseFinal = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: contentsFinal,
                config: {
                    temperature: 0.3,
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                }
            });
            res.status(200).json({ text: responseFinal.text, contextUsed: retrievedContext ? true : false, extractedQuery });
        }
        catch (error) {
            console.error('Error in ragTutorImage:', error);
            res.status(500).json({ error: error.message || String(error) });
        }
    });
});
// --- NEW RAG FEATURE: 유사 문제 생성기 ---
exports.generateSimilarProblems = (0, https_1.onRequest)({ timeoutSeconds: 300, memory: '1GiB', cors: true }, (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            // Header Authentication
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized: No token provided' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (err) {
                res.status(401).json({ error: 'Unauthorized: Invalid token' });
                return;
            }
            const uid = decodedToken.uid;
            const userRef = db.collection('users').doc(uid);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                res.status(403).json({ error: 'Forbidden: User not found in database' });
                return;
            }
            const userData = userSnap.data();
            const freeTokens = userData.freeTokens || 0;
            if (freeTokens <= 0 && userData.plan !== 'pro') {
                res.status(403).json({ error: 'Forbidden: Q-Token이 모두 소진되었습니다. (유사 문제 생성기)' });
                return;
            }
            const { imageBase64, mimeType, problemText, count = 3 } = req.body;
            if (!imageBase64 && !problemText) {
                res.status(400).json({ error: 'Missing imageBase64 or problemText data' });
                return;
            }
            if (userData.plan !== 'pro') {
                await userRef.update({
                    freeTokens: admin.firestore.FieldValue.increment(-1)
                });
            }
            const ai = getAiClient();
            let extractedQuery = problemText || "";
            // Step 1: Extract Text (if image provided)
            if (imageBase64) {
                const ocrPrompt = "Extract the mathematical problem text and equations from this image. Output only the exact text and LaTeX.";
                const contentsFirst = [{
                        parts: [
                            { inlineData: { data: imageBase64.replace(/^data:image\/\w+;base64,/, ''), mimeType: mimeType || 'image/jpeg' } },
                            { text: ocrPrompt }
                        ]
                    }];
                const ocrResponse = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: contentsFirst,
                    config: { temperature: 0.1 }
                });
                extractedQuery = ocrResponse.text || extractedQuery;
                console.log("[generateSimilarProblems] Extracted Query: ", extractedQuery);
            }
            // Step 2: Retrieve from Vertex AI Search
            const auth = new google_auth_library_1.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
            const client = await auth.getClient();
            const token = await client.getAccessToken();
            const projectId = "451093355784";
            const location = "global";
            const engineId = "questio-math-ocr-app_1773932599382";
            const url = `https://discoveryengine.googleapis.com/v1alpha/projects/${projectId}/locations/${location}/collections/default_collection/engines/${engineId}/servingConfigs/default_search:search`;
            let retrievedContext = "";
            try {
                const searchResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token.token}`,
                        'Content-Type': 'application/json',
                        'x-goog-user-project': 'questio-ai-b2b'
                    },
                    body: JSON.stringify({
                        query: extractedQuery,
                        pageSize: 3,
                        contentSearchSpec: {
                            snippetSpec: { returnSnippet: true },
                            extractiveContentSpec: { maxExtractiveAnswerCount: 1 }
                        }
                    })
                });
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.results) {
                        retrievedContext = searchData.results.map((r) => {
                            var _a, _b, _c, _d, _e, _f;
                            const snippets = ((_c = (_b = (_a = r.document) === null || _a === void 0 ? void 0 : _a.derivedStructData) === null || _b === void 0 ? void 0 : _b.snippets) === null || _c === void 0 ? void 0 : _c.map((s) => s.snippet).join(" ")) || "";
                            const extracts = ((_f = (_e = (_d = r.document) === null || _d === void 0 ? void 0 : _d.derivedStructData) === null || _e === void 0 ? void 0 : _e.extractive_answers) === null || _f === void 0 ? void 0 : _f.map((e) => e.content).join(" ")) || "";
                            return extracts || snippets;
                        }).join("\n\n");
                    }
                }
            }
            catch (e) {
                console.error("Vertex AI Search fail", e);
            }
            // Step 3: Final Generation
            const systemPrompt = `당신은 초개인화 수학 쌍둥이 문제(유사 문제) 생성기입니다.
원본 문제와 교과서 개념을 참고하여 난이도와 핵심 개념이 정확히 일치하는 쌍둥이 문제 ${count}개를 만드세요.
문맥, 상황, 숫자 등만 바꾸되, 풀어내는 핵심 논리와 풀이 과정의 길이는 원본과 유사해야 합니다.
반드시 JSON 포맷으로 응답해야 하며, 수식은 단일/이중 $를 쓰지 말고 오직 인라인 \\( \\) 또는 블록 \\[ \\] 포맷만 사용하세요.
한국어가 포함된 수식은 \\(\\text{수식}\\) 포맷을 사용하세요.`;
            const promptText = `
[원본 문제]:
${extractedQuery}

[참고 교과서 내용]:
${retrievedContext ? retrievedContext : "관련 교과서 내용을 찾지 못했습니다. 일반적인 지식을 활용하세요."}

위 내용을 바탕으로 문제 ${count}개를 생성하고, JSON 포맷(배열)으로 응답하세요:
[
  {
    "problemText": "문제 내용...",
    "solutionText": "상세한 풀이 과정 및 정답..."
  }
]
`;
            const contentsFinal = [{ parts: [{ text: promptText }] }];
            const responseFinal = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: contentsFinal,
                config: {
                    temperature: 0.7, // 약간의 창의성 허용
                    responseMimeType: "application/json",
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                }
            });
            res.status(200).json({ problems: JSON.parse(responseFinal.text || "[]"), contextUsed: !!retrievedContext });
        }
        catch (error) {
            console.error('Error in generateSimilarProblems:', error);
            res.status(500).json({ error: error.message || String(error) });
        }
    });
});
// --- NEW RAG FEATURE: 자동 태깅(족보 매핑) 봇 ---
exports.autoTagProblem = (0, https_1.onRequest)({ timeoutSeconds: 60, memory: '512MiB', cors: true }, (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            // Header Authentication
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized: No token provided' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (err) {
                res.status(401).json({ error: 'Unauthorized: Invalid token' });
                return;
            }
            // Only allow token usage logic
            const uid = decodedToken.uid;
            const userRef = db.collection('users').doc(uid);
            const userSnap = await userRef.get();
            const userData = userSnap.exists ? userSnap.data() : {};
            if (userData.plan !== 'pro' && (userData.freeTokens || 0) <= 0) {
                res.status(403).json({ error: 'Forbidden: Q-Token이 부족합니다.' });
                return;
            }
            const { imageBase64, mimeType, problemText } = req.body;
            if (!imageBase64 && !problemText) {
                res.status(400).json({ error: 'Missing input data' });
                return;
            }
            if (userData.plan !== 'pro') {
                await userRef.update({
                    freeTokens: admin.firestore.FieldValue.increment(-1)
                });
            }
            const ai = getAiClient();
            let extractedQuery = problemText || "";
            if (imageBase64) {
                const ocrPrompt = "Extract text from image.";
                const ocrResponse = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: [{ parts: [{ inlineData: { data: imageBase64.replace(/^data:image\/\w+;base64,/, ''), mimeType: mimeType || 'image/jpeg' } }, { text: ocrPrompt }] }],
                    config: { temperature: 0.1 }
                });
                extractedQuery = ocrResponse.text || extractedQuery;
            }
            // Search Vertex AI
            const auth = new google_auth_library_1.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
            const client = await auth.getClient();
            const token = await client.getAccessToken();
            const url = "https://discoveryengine.googleapis.com/v1alpha/projects/451093355784/locations/global/collections/default_collection/engines/questio-math-ocr-app_1773932599382/servingConfigs/default_search:search";
            let retrievedContext = "";
            try {
                const searchResponse = await fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': "Bearer " + token.token, 'Content-Type': 'application/json', 'x-goog-user-project': 'questio-ai-b2b' },
                    body: JSON.stringify({
                        query: extractedQuery,
                        pageSize: 5, // 태깅은 정확한 족보를 찾기 위해 범위를 넓힘
                        contentSearchSpec: { snippetSpec: { returnSnippet: true } }
                    })
                });
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.results) {
                        retrievedContext = searchData.results.map((r) => {
                            var _a, _b, _c, _d, _e, _f;
                            const title = ((_b = (_a = r.document) === null || _a === void 0 ? void 0 : _a.derivedStructData) === null || _b === void 0 ? void 0 : _b.title) || ((_c = r.document) === null || _c === void 0 ? void 0 : _c.id) || "";
                            const snippet = ((_f = (_e = (_d = r.document) === null || _d === void 0 ? void 0 : _d.derivedStructData) === null || _e === void 0 ? void 0 : _e.snippets) === null || _f === void 0 ? void 0 : _f.map((s) => s.snippet).join(" ")) || "";
                            return "[출처: " + title + "]\n" + snippet;
                        }).join("\n\n");
                    }
                }
            }
            catch (e) {
                console.error(e);
            }
            const systemPrompt = "당신은 출처 매핑 AI입니다. 문제를 읽고 관련된 '[학년/과목]', '[대단원]', '[핵심 개념(배열)]'을 JSON으로 매핑해 반환하세요.\n" +
                "반드시 주어진 [참고 교과서 정보]를 기반으로 판단하되, 정보가 부족하면 일반적인 한국 교육과정을 따르세요.\n\n" +
                "JSON 응답 포맷:\n{\n  \"grade\": \"중학교 1학년 / 기하 / 수학1 등\",\n  \"chapter\": \"단원명\",\n  \"concepts\": [\"개념1\", \"개념2\"]\n}";
            const promptText = "[원본 문제]:\n" + extractedQuery + "\n\n[참고 교과서 정보]:\n" + retrievedContext;
            const responseFinal = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: [{ parts: [{ text: promptText }] }],
                config: {
                    temperature: 0.1,
                    responseMimeType: "application/json",
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                }
            });
            res.status(200).json(JSON.parse(responseFinal.text || "{}"));
        }
        catch (error) {
            console.error('Error in autoTagProblem:', error);
            res.status(500).json({ error: error.message || String(error) });
        }
    });
});
//# sourceMappingURL=index.js.map