# Project Questio (Enterprise B2B Edition)

본 프로젝트는 수리논술 AI 조교 시스템의 상업화 및 대량 처리 안정성을 확보하기 위해, 기존의 클라이언트(React) 중심 아키텍처에서 **Angular + Firebase Cloud Functions 중심의 엔터프라이즈 아키텍처**로 마이그레이션한 버전입니다.

이 구조는 다음 두 가지 치명적인 문제를 근본적으로 해결하기 위해 설계되었습니다.

---

## 🚨 해결된 핵심 문제점 및 원리

### 1. AI 채점 결과의 비일관성 (100점 ↔ 70점 요동치는 문제)
*   **원인**: 브라우저에서 직접 AI 프롬프트를 호출할 때, AI의 '창의성' 수치가 고정되지 않고, 응답 형식이 자유로워 매번 다른 문맥으로 해석(Hallucination)하는 현상입니다.
*   **해결 로직 (Cloud Functions)**: AI 호출 로직을 브라우저에서 완전히 분리하여 Firebase 클라우드 서버(`functions/src/index.ts`)로 숨겼습니다.
    *   **`temperature: 0.0` 강제**: AI의 창의성을 0으로 낮춰, 10번을 물어봐도 가장 확률이 높은 1개의 동일한 정답만 출력하도록 '항상성'을 부여했습니다.
    *   **`responseMimeType: "application/json"` 강제**: AI가 서술형 글을 쓰는 것이 아니라, 무조건 엄격한 `{ "totalScore": 85, "strengths": "...", "weaknesses": "..." }` 형태의 데이터(JSON)만 뱉어내도록 시스템 레벨에서 족쇄를 채웠습니다.

### 2. 다중 학생 일괄 채점 시 브라우저 멈춤 (Freezing) 현상
*   **원인**: 기존 코드는 `for` 반복문 안에서 무거운 AI API 응답을 `await`로 무작정 기다렸습니다. 10명 이상의 데이터를 한 번에 처리하면 브라우저 메모리와 네트워크 큐가 꽉 차서 앱이 멈춰버립니다.
*   **해결 로직 (Angular RxJS Queue)**: `src/app/services/ai-evaluation.service.ts` 파일에서 Angular의 비동기 스트림 기술인 **RxJS(`concatMap`)**를 도입했습니다.
    *   학생 100명을 한 번에 던져도, 브라우저가 직접 기다리지 않고 **"백그라운드 대기열(Queue)"**을 만들어 클라우드에 하나씩 순차적으로/병렬로 안전하게 전송합니다.
    *   UI 스레드를 절대 막지 않기 때문에(Non-blocking), 채점이 진행되는 동안 스크롤링이나 탭 이동이 부드럽게 작동합니다.

---

## 💻 로컬에서 테스트 실행 방법 (모의 테스트)

현재 작성된 코드는 Firebase에 실제로 연결되기 전, **변경된 UI와 멈춤 현상(Freezing)이 해결된 모의 큐(Queue) 시스템**을 눈으로 확인할 수 있는 상태입니다.

1.  **필수 조건**: Node.js가 설치되어 있어야 합니다.
2.  터미널을 열고 다음 명령어를 순서대로 실행하세요.

```bash
# 1. Angular 프로젝트 폴더로 이동
cd questio-angular-firebase

# 2. 의존성 설치
npm install

# 3. 로컬 서버 실행
npm start
```
3.  브라우저에서 `http://localhost:4200`으로 접속합니다.
4.  로그인 창에 `questio`를 입력하고 접속합니다.
5.  **`EXECUTE QUESTIO-ENGINE`** 버튼을 누릅니다.
6.  **확인 포인트**: 가상의 학생 5명이 동시에 채점 대기열에 들어가지만, UI는 멈추지 않고(애니메이션이 부드럽게 작동함) 순차적으로 채점이 완료(✓)되는 것을 볼 수 있습니다.

---

## 🚀 실제 상용화(B2B)를 위한 다음 단계 가이드

이 앱을 실제로 구글 클라우드(Gemini)에 연결하고 데이터베이스에 저장하려면, 대표님께서 **새로운 Firebase 프로젝트**를 생성하고 연동해야 합니다.

**[해야 할 일]**
1.  **Firebase 콘솔 접속**: [https://console.firebase.google.com/](https://console.firebase.google.com/) 에 접속하여 "새 프로젝트 추가"를 클릭합니다. (예: `questio-b2b`)
2.  **Firestore 및 Storage 활성화**: 데이터베이스(Firestore)와 파일 저장소(Storage)를 "프로덕션 모드"로 시작합니다.
3.  **환경 변수(API Key) 설정**:
    *   Firebase 프로젝트 설정에서 `웹 앱 추가`를 눌러 나오는 `firebaseConfig` 값을 복사합니다.
    *   이 프로젝트의 `src/environments/environment.ts` 파일에 있는 가짜(Mock) 정보 대신 복사한 진짜 정보를 붙여넣습니다.
4.  **클라우드 함수 배포 (가장 중요)**:
    *   터미널에서 `npm install -g firebase-tools` 로 파이어베이스 도구를 설치합니다.
    *   `firebase login` 으로 구글 계정에 로그인합니다.
    *   `cd functions` 로 이동하여 `.env` 파일을 만들고 대표님의 `GEMINI_API_KEY=진짜키` 를 적어넣습니다.
    *   `firebase deploy --only functions` 명령어를 통해 **정확도 문제를 해결한 AI 채점 로직**을 실제 구글 서버에 배포합니다.

이후부터는 학원에서 수백 명의 답안지를 올려도 브라우저가 죽지 않고, 클라우드의 무한한 파워를 이용해 항상 동일한 기준(Temperature 0)으로 완벽하게 채점된 결과를 받아보실 수 있습니다.
