"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEssaySummary = void 0;
exports.generateEssaySummary = onRequest({ timeoutSeconds: 60, memory: '256MiB', cors: true }, (req, res) => {
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
                    res.status(403).json({ error: 'Forbidden: 튜터링을 진행할 수 있는 Q-Token이 모두 소진되었습니다. (리포트 분석 1토큰 필요)' });
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
                    res.status(403).json({ error: 'Forbidden: 튜터링을 진행할 수 있는 Q-Token이 모두 소진되었습니다.' });
                    return;
                }
            }
            const { essayText, essayContext } = req.body;
            if (!essayText) {
                res.status(400).send('Missing required fields: essayText');
                return;
            }
            const ai = getAiClient();
            const systemPrompt = `당신은 대한민국 대치동 최고 1타 논술/국어 및 자기소개서 전문 첨삭 강사입니다.
학생이 작성한 장문(논술, 비문학, 자기소개서 등)을 평가하고 초개인화된 진단 리포트를 작성해 주어야 합니다.

리포트는 반드시 다음 마크다운 형식을 따라 전문적이고 가독성 있게 작성하십시오:

# 📝 AI 초개인화 진단 리포트

## 1. 🎯 한 줄 핵심 요약
- 학생 글의 가장 핵심적인 주장이나 내용을 명쾌하게 한 줄로 요약하세요.

## 2. 🌟 글의 강점 및 잘한 점
- 문장력, 논리 전개, 설득력 등 학생의 뛰어난 점을 칭찬해 주세요.

## 3. 🔍 보완이 필요한 개선/진단점 (팩폭)
- 논리적 비약, 어색한 어휘, 문맥 단절 등 감점 요인을 아주 날카롭고 구체적으로 지적하세요.
- 개선된 예시 문장도 하나 제안해 주세요.

## 4. 🥇 종합 평가 및 점수
- 100점 만점 기준으로 종합 점수를 부여하세요 (예: 85 / 100 점).
- 총평 코멘트를 추가하세요.`;
            // 텍스트 분석/요약에 빠르고 뛰어난 gemini-2.5-flash 모델 적용
            const model = "gemini-2.5-flash";
            const contents = [
                {
                    role: "user",
                    parts: [
                        { text: `[학생이 설정한 맥락]: ${essayContext || '지정되지 않음'}\n\n[학생 원문]:\n${essayText}` }
                    ]
                }
            ];
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
//# sourceMappingURL=temp_append.js.map