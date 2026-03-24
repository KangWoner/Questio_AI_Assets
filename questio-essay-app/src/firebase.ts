import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs, where, startAfter, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Data Types
export interface QuestionData {
    id: string;
    assetId: string;
    university: string;
    year: string;
    category: string;
    title: string;
    tags: string[];
    questionLink?: string;
    solutionLink?: string;
    createdAt?: any;
}

export const getQuestions = async (lastDoc?: any, pageSize = 20, filterUniversity?: string): Promise<{ data: QuestionData[], lastDoc: any }> => {
    try {
        const questionsRef = collection(db, "questions");
        let q = query(questionsRef, orderBy("createdAt", "desc"));

        if (filterUniversity) {
            // Note: In a production app with complex tags, array-contains might be better.
            // Using precise exact match for university for now.
            q = query(questionsRef, where("university", "==", filterUniversity), orderBy("createdAt", "desc"));
        }

        if (lastDoc) {
            q = query(q, startAfter(lastDoc), limit(pageSize));
        } else {
            q = query(q, limit(pageSize));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionData));
        const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

        return { data, lastDoc: newLastDoc };
    } catch (error) {
        console.error("Error fetching questions:", error);
        return { data: [], lastDoc: null };
    }
};

export const useToken = async (uid: string): Promise<boolean> => {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const tokens = userSnap.data().freeTokens ?? 0;
            // 무제한 이용권 등의 처리 로직이 추가될 수 있습니다. 우선은 숫자 토큰만 차감.
            if (tokens === 'limitless') return true; 

            if (Number(tokens) > 0) {
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
