const fs = require('fs');
const lines = fs.readFileSync('src/index.ts', 'utf8').split('\n');
const start = 742; // index 742 is line 743

const newCode = `            if (freeTokens <= 0 && userData.plan !== 'pro') {
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

            const systemPrompt = \`당신은 대한민국 대치동 최고의 수학 논술 및 수리 기출 분석 강사이자, '초개인화 최고의 수학 튜터'입니다.
학생이 본인의 질의내용과 수학 문제를 사진으로 찍어서 보냈습니다.
이미지를 스캔하여 (OCR) 어떤 문제인지/어떤 질의인지 정확히 파악하고, 다음 지침을 따르세요:
1. 학생의 질의가 있다면 어디서 막혔는지 파악하여 짚어주세요.
2. 해결해야 할 수학 문제라면 단계별(Step-by-step)로 완벽한 해설과 정답을 제시하세요.
3. 수식은 무조건 다음 포맷을 철저히 지키세요: 문장 내 수식은 \\\\( 수식 \\\\), 블록 수식은 \\\\[ 수식 \\\\] 으로 감싸고 절대 단일 $ 기호는 쓰지 마세요.
4. 친절하고 격려하는 말투를 사용하세요.\`;

            const contents = [
                {
                    parts: [
                        { inlineData: { data: imageBase64.replace(/^data:image\\/\\w+;base64,/, ''), mimeType: mimeType || 'image/jpeg' } },
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
        } catch (error: any) {
            console.error('Error in analyzeProblemImage:', error);
            res.status(500).json({ error: error.message || error });
        }
    });
});

export const generateEssaySummary = onRequest({ timeoutSeconds: 60, memory: '256MiB', cors: true }, (req, res) => {
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
            } catch (err) {
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

            const userData = userSnap.data() as any;
            const plan = userData.plan || 'basic';
            const freeTokens = userData.freeTokens || 0;

            if (plan !== 'pro') {
                if (freeTokens <= 0) {
                    res.status(403).json({ error: 'Forbidden: 리포트 분석에 필요한 Q-Token이 모두 소진되었습니다.' });
                    return;
                }
                const result = await db.runTransaction(async (t) => {
                    const doc = await t.get(userRef);
                    const currentTokens = doc.data()?.freeTokens || 0;
                    if (currentTokens <= 0) return false;
                    t.update(userRef, { freeTokens: admin.firestore.FieldValue.increment(-1) });
                    return true;
                });
                if (!result) {
                    res.status(403).json({ error: 'Forbidden: 리포트 분석에 필요한 Q-Token이 모두 소진되었습니다.' });
                    return;
                }
            }

            const { 
                questionText, questionFiles, 
                rubricText, rubricFiles, 
                essayText, essayFiles 
            } = req.body;
            
            if (!essayText && (!essayFiles || essayFiles.length === 0)) {
                res.status(400).send('Missing required fields: essayText or essayFiles is required.');
                return;
            }

            const ai = getAiClient();
            
            const systemPrompt = \`당신은 대한민국 대치동 최고 1타 논술/국어 및 자기소개서 전문 첨삭 강사입니다.
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
- 총평 코멘트를 추가하세요.\`;

            const processFiles = (files: any[]) => {
                if (!files || !Array.isArray(files)) return [];
                return files.map(f => ({
                    inlineData: {
                        data: f.data.replace(/^data:(image\\/\\w+|application\\/pdf);base64,/, ''),
                        mimeType: f.mimeType
                    }
                }));
            };

            const qParts: any[] = processFiles(questionFiles);
            if (questionText) qParts.unshift({ text: \`[문제 텍스트]: \${questionText}\` } as any);

            const rParts: any[] = processFiles(rubricFiles);
            if (rubricText) rParts.unshift({ text: \`[채점기준/풀이 텍스트]: \${rubricText}\` } as any);

            const eParts: any[] = processFiles(essayFiles);
            if (essayText) eParts.unshift({ text: \`[학생답안 텍스트]: \${essayText}\` } as any);

            const allParts: any[] = [];
            if (qParts.length > 0) {
                allParts.push({ text: "--- 다음은 학생이 풀어야 할 [문제]에 대한 정보입니다. ---" });
                allParts.push(...qParts);
                allParts.push({ text: "\\n\\n" });
            }
            if (rParts.length > 0) {
                allParts.push({ text: "--- 다음은 해당 문제의 [채점기준/예시풀이] 정보입니다. ---" });
                allParts.push(...rParts);
                allParts.push({ text: "\\n\\n" });
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
        } catch (error: any) {
            console.error('Error in generateEssaySummary:', error);
            res.status(500).json({ error: error.message || error });
        }
    });
});
`;

const finalLines = lines.slice(0, 742);
finalLines.push(newCode);
fs.writeFileSync('src/index.ts', finalLines.join('\n'));
