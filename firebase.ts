import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBs0rVgZPmH5ngL0Z90fZHytl4Ekurg_0E",
    authDomain: "questio-ai-b2b.firebaseapp.com",
    projectId: "questio-ai-b2b",
    storageBucket: "questio-ai-b2b.firebasestorage.app",
    messagingSenderId: "321541018701",
    appId: "1:321541018701:web:23eca04b49e688392f3804",
    measurementId: "G-25F8B2M1JT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // 1. 신규 사용자인지 확인하고, 처음 로그인 시 무료 토큰 3개를 부여합니다.
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                freeTokens: 30, // 초기 무료 토큰 30개 지급 (MVP/프로토타입 배포용)
                totalGrantedTokens: 30,
                createdAt: new Date().toISOString()
            });
        }

        return user;
    } catch (error) {
        console.error("Error signing in with Google: ", error);
        throw error;
    }
};

export const logOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out: ", error);
        throw error;
    }
};

export const getAvailableTokens = async (uid: string): Promise<number> => {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            return userSnap.data().freeTokens ?? 0;
        }
        return 0;
    } catch (e) {
        console.error("Error fetching tokens:", e);
        return 0;
    }
};

export interface UserData {
    uid: string;
    email: string;
    displayName: string;
    freeTokens: number;
    totalGrantedTokens?: number;
    plan?: string;
    subscriptionEndDate?: string;
}

export const getUserData = async (uid: string): Promise<UserData | null> => {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            return userSnap.data() as UserData;
        }
        return null;
    } catch (e) {
        console.error("Error fetching user data:", e);
        return null;
    }
};

export const getPurchasedAssets = async (uid: string): Promise<string[]> => {
    try {
        const assetsRef = collection(db, "users", uid, "purchasedAssets");
        const snapshot = await getDocs(assetsRef);
        const now = new Date();
        
        return snapshot.docs
            .filter(doc => {
                const data = doc.data();
                if (!data.expiresAt) return true;
                const expiresAt = new Date(data.expiresAt);
                return expiresAt > now;
            })
            .map(doc => doc.data().assetId as string);
    } catch (e) {
        console.error("Error fetching purchased assets:", e);
        return [];
    }
};

export const purchaseAssetVirtual = async (uid: string, assetId: string): Promise<{ success: boolean; message: string }> => {
    try {
        const assetRef = doc(db, "users", uid, "purchasedAssets", assetId);
        await setDoc(assetRef, {
            assetId: assetId,
            purchasedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1년 보장
        });
        return { success: true, message: `가상 결제가 성공적으로 처리되었습니다.` };
    } catch (e) {
        console.error("Error in virtual purchase:", e);
        return { success: false, message: "결제 처리 중 오류가 발생했습니다." };
    }
};

export const deletePurchasedAsset = async (uid: string, assetId: string): Promise<{ success: boolean; message: string }> => {
    try {
        const assetRef = doc(db, "users", uid, "purchasedAssets", assetId);
        await deleteDoc(assetRef);
        return { success: true, message: "보관함에서 삭제되었습니다." };
    } catch (e) {
        console.error("Error deleting asset:", e);
        return { success: false, message: "삭제 처리 중 오류가 발생했습니다." };
    }
};


export interface AssetData {
    id: string;
    title: string;
    description: string;
    price: number;
    validDays: number;
    questionGcsUrl: string;
    answerGcsUrl: string;
}

export const createAsset = async (assetData: AssetData): Promise<{ success: boolean; message: string }> => {
    try {
        const assetRef = doc(db, "assets", assetData.id);
        await setDoc(assetRef, {
            ...assetData,
            createdAt: new Date().toISOString()
        });
        return { success: true, message: `에셋 [${assetData.id}] 등록이 완료되었습니다.` };
    } catch (e) {
        console.error("Error creating asset:", e);
        return { success: false, message: "에셋 등록 중 오류가 발생했습니다." };
    }
};

export const deleteAsset = async (assetId: string): Promise<{ success: boolean; message: string }> => {
    try {
        const assetRef = doc(db, "assets", assetId);
        await deleteDoc(assetRef);
        return { success: true, message: `스토어에서 에셋이 완전히 삭제되었습니다.` };
    } catch (e) {
        console.error("Error deleting asset:", e);
        return { success: false, message: "에셋 삭제 중 오류가 발생했습니다." };
    }
};

export const uploadAssetFile = async (file: File, path: string): Promise<string> => {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
    } catch (e) {
        console.error("Error uploading file:", e);
        throw e;
    }
};

export const getAvailableAssets = async (): Promise<AssetData[]> => {
    try {
        const assetsRef = collection(db, "assets");
        const snapshot = await getDocs(assetsRef);
        return snapshot.docs.map(doc => doc.data() as AssetData);
    } catch (e) {
        console.error("Error fetching available assets:", e);
        return [];
    }
};

export const getAssetsByIds = async (assetIds: string[]): Promise<AssetData[]> => {
    if (!assetIds || assetIds.length === 0) return [];
    
    try {
        // Firestore 'in' query supports up to 10 items.
        // For production with many items, batching is required.
        const chunks = [];
        for (let i = 0; i < assetIds.length; i += 10) {
            chunks.push(assetIds.slice(i, i + 10));
        }

        const assets: AssetData[] = [];
        for (const chunk of chunks) {
            const assetsRef = collection(db, "assets");
            const q = query(assetsRef, where("id", "in", chunk));
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => assets.push(doc.data() as AssetData));
        }
        return assets;
    } catch (e) {
        console.error("Error fetching assets by IDs:", e);
        return [];
    }
};

export const useToken = async (uid: string): Promise<boolean> => {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const tokens = userSnap.data().freeTokens ?? 0;
            if (tokens > 0) {
                await updateDoc(userRef, {
                    freeTokens: increment(-1) // 차감
                });
                return true;
            }
        }
        return false; // 토큰 부족
    } catch (e) {
        console.error("Error using token:", e);
        return false;
    }
};

export const refundToken = async (uid: string): Promise<void> => {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            freeTokens: increment(1) // 환불
        });
    } catch (e) {
        console.error("Error refunding token:", e);
    }
};

export const grantTokensByEmail = async (email: string, amount: number): Promise<{ success: boolean; message: string }> => {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "해당 이메일로 가입된 유저를 찾을 수 없습니다." };
        }

        const promises: Promise<void>[] = [];
        querySnapshot.forEach((document) => {
            const userRef = doc(db, "users", document.id);
            const data = document.data();
            const currentTotal = data.totalGrantedTokens ?? data.freeTokens ?? 0;
            
            promises.push(updateDoc(userRef, {
                freeTokens: increment(amount),
                totalGrantedTokens: currentTotal + amount
            }));
        });

        await Promise.all(promises);
        return { success: true, message: `성공적으로 ${amount}개의 토큰을 지급했습니다.` };
    } catch (e) {
        console.error("Error granting tokens:", e);
        return { success: false, message: "에러가 발생했습니다." };
    }
};

export const resetTokensByEmail = async (email: string, amount: number = 3): Promise<{ success: boolean; message: string }> => {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "해당 이메일로 가입된 유저를 찾을 수 없습니다." };
        }

        const promises: Promise<void>[] = [];
        querySnapshot.forEach((document) => {
            const userRef = doc(db, "users", document.id);
            promises.push(updateDoc(userRef, {
                freeTokens: amount
            }));
        });

        await Promise.all(promises);
        return { success: true, message: `성공적으로 토큰을 ${amount}개로 초기화했습니다.` };
    } catch (e) {
        console.error("Error resetting tokens:", e);
        return { success: false, message: "에러가 발생했습니다." };
    }
};

/**
 * 조건(대학, 연도, 유형)에 맞는 문제와 해설 파일을 알맞은 버킷에서 검색합니다.
 * - 수리논술/논술: questio-assets-storage 버킷의 '문제/', '해설/'
 * - 약술형: questio-assets-simple 버킷의 '약술형 문제/', '약술형 풀이/'
 */
export const findGcsFilesForAsset = async (university: string, year: string, problemType: string): Promise<{ questionUrl: string, answerUrl: string } | null> => {
    try {
        let bucketName = 'questio-assets-storage';
        let qFolder = '문제/';
        let aFolder = '해설/';

        if (problemType.includes('약술')) {
            bucketName = 'questio-assets-simple';
            qFolder = '약술형 문제/';
            aFolder = '약술형 풀이/';
        }

        const buildUrl = (path: string) => `https://storage.googleapis.com/storage/v1/b/${bucketName}/o?prefix=${encodeURIComponent(path)}`;

        const [resQ, resA] = await Promise.all([
            fetch(buildUrl(qFolder)),
            fetch(buildUrl(aFolder))
        ]);

        const dataQ = await resQ.json();
        const dataA = await resA.json();

        const itemsQ = dataQ.items || [];
        const itemsA = dataA.items || [];

        // 특수문자나 띄어쓰기 등 변수가 있으므로 부분 문자열 포함 여부로 확인합니다.
        // 유저 요청 사항: 
        // 문제: 대학교, 출제년도 기준 검색
        const matchesCriteriaQuestion = (name: string) => {
            return name.includes(university) && name.includes(year);
        };

        // 해설: 대학교, 출제년도, 출제유형 기준 검색
        const matchesCriteriaAnswer = (name: string) => {
            // '수리논술'로 검색하더라도 파일명에는 보통 '논술'로 들어있는 경우가 많습니다.
            const typeToSearch = problemType === '수리논술' ? '논술' : problemType;
            return name.includes(university) && name.includes(year) && name.includes(typeToSearch);
        };

        const qMatch = itemsQ.find((i: any) => matchesCriteriaQuestion(i.name));
        const aMatch = itemsA.find((i: any) => matchesCriteriaAnswer(i.name));

        if (!qMatch || !aMatch) {
            console.error("Matching files not found:", { foundQuestion: !!qMatch, foundAnswer: !!aMatch });
            return null;
        }

        return {
            // URL 인코딩을 적용하되 슬래시는 유지
            questionUrl: `https://storage.googleapis.com/${bucketName}/${qMatch.name.split('/').map(encodeURIComponent).join('/')}`,
            answerUrl: `https://storage.googleapis.com/${bucketName}/${aMatch.name.split('/').map(encodeURIComponent).join('/')}`
        };
    } catch (e) {
        console.error("Error finding GCS files:", e);
        return null;
    }
};
