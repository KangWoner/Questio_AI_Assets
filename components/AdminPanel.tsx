import React, { useState, useEffect } from 'react';
import { grantTokensByEmail, resetTokensByEmail, createAsset, AssetData, uploadAssetFile, db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'tokens' | 'assets' | 'settings'>('tokens');
    const [isProcessing, setIsProcessing] = useState(false);

    // Settings state
    const [academyName, setAcademyName] = useState('');

    useEffect(() => {
        if (isOpen && auth.currentUser) {
            const fetchAcademySettings = async () => {
                const docRef = doc(db, 'academySettings', auth.currentUser!.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().name) {
                    setAcademyName(docSnap.data().name);
                }
            };
            fetchAcademySettings();
        }
    }, [isOpen]);

    // Tokens state
    const [targetEmail, setTargetEmail] = useState('');
    const [tokenAmount, setTokenAmount] = useState(10);

    // Asset state
    const [assetForm, setAssetForm] = useState<AssetData>({
        id: '',
        title: '',
        description: '',
        price: 30000,
        validDays: 365,
        questionGcsUrl: '',
        answerGcsUrl: ''
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    if (!isOpen) return null;

    const handleGrantTokens = async () => {
        if (!targetEmail) {
            alert("이메일을 입력해주세요.");
            return;
        }

        setIsProcessing(true);
        try {
            const result = await grantTokensByEmail(targetEmail, tokenAmount);
            alert(result.message);
            if (result.success) {
                setTargetEmail('');
            }
        } catch (e) {
            alert("토큰 지급에 실패했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResetTokens = async () => {
        if (!targetEmail) {
            alert("이메일을 입력해주세요.");
            return;
        }

        setIsProcessing(true);
        try {
            const result = await resetTokensByEmail(targetEmail, 3);
            alert(result.message);
        } catch (e) {
            alert("토큰 초기화에 실패했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!auth.currentUser) return;
        setIsProcessing(true);
        try {
            await setDoc(doc(db, 'academySettings', auth.currentUser.uid), {
                name: academyName,
                updatedAt: new Date()
            }, { merge: true });
            alert('학원 설정이 저장되었습니다.');
        } catch (e) {
            alert('설정 저장에 실패했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetForm.id || !assetForm.title) {
            alert("필수 항목(ID, 타이틀)을 모두 입력해주세요.");
            return;
        }
        if (!selectedFile) {
            alert("업로드할 CSV 파일을 선택해주세요.");
            return;
        }

        setIsProcessing(true);
        try {
            // 파일 업로드
            const filePath = `assets/${Date.now()}_${selectedFile.name}`;
            const downloadUrl = await uploadAssetFile(selectedFile, filePath);

            // DB 등록 (파일 업로드 결과의 동일한 URL을 기록)
            const finalAssetForm = {
                ...assetForm,
                questionGcsUrl: downloadUrl,
                answerGcsUrl: downloadUrl
            };

            const result = await createAsset(finalAssetForm);
            alert(result.message);
            if (result.success) {
                // Initialize form
                setAssetForm({
                    ...assetForm,
                    id: '',
                    title: '',
                    description: '',
                    questionGcsUrl: '',
                    answerGcsUrl: ''
                });
                setSelectedFile(null);
            }
        } catch (e: any) {
            console.error("Asset Creation Error:", e);
            alert(`에셋 등록 또는 파일 업로드에 실패했습니다.\n사유: ${e.message || e}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 p-6">
            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/50 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 relative z-10 shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[10px] font-black tracking-widest uppercase">
                            Super Admin
                        </div>
                        <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">
                            Questio <span className="text-red-400">Control</span>
                        </h2>
                    </div>
                    <button onClick={onClose} title="닫기" className="text-slate-500 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 shrink-0">
                    <button 
                        onClick={() => setActiveTab('tokens')}
                        className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === 'tokens' ? 'bg-slate-800/80 text-white border-b-2 border-red-500' : 'text-slate-500 hover:bg-slate-800/30 hover:text-slate-300'}`}
                    >
                        Token Management
                    </button>
                    <button 
                        onClick={() => setActiveTab('assets')}
                        className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === 'assets' ? 'bg-slate-800/80 text-white border-b-2 border-cyan-500' : 'text-slate-500 hover:bg-slate-800/30 hover:text-slate-300'}`}
                    >
                        Asset Registry
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === 'settings' ? 'bg-slate-800/80 text-white border-b-2 border-purple-500' : 'text-slate-500 hover:bg-slate-800/30 hover:text-slate-300'}`}
                    >
                        Academy Settings
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-8 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 relative z-10">
                    
                    {activeTab === 'tokens' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-lg font-black text-white mb-1">토큰 지급 및 초기화</h3>
                                <p className="text-xs text-slate-400 mb-6">사용자에게 무료 채점 토큰을 수동으로 조절합니다.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Target User Email</label>
                                <input
                                    type="text"
                                    value={targetEmail}
                                    onChange={(e) => setTargetEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full px-5 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-red-400 transition-colors"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tokens to Add</label>
                                <div className="flex space-x-3">
                                    {[10, 50, 100].map(amount => (
                                        <button
                                            key={amount}
                                            onClick={() => setTokenAmount(amount)}
                                            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${tokenAmount === amount ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                        >
                                            +{amount}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex space-x-4 mt-6">
                                <button
                                    onClick={handleGrantTokens}
                                    disabled={isProcessing}
                                    className="flex-1 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black rounded-xl shadow-lg disabled:opacity-50 transition-all uppercase tracking-widest"
                                >
                                    {isProcessing ? '처리 중...' : '지급 (Grant)'}
                                </button>
                                <button
                                    onClick={handleResetTokens}
                                    disabled={isProcessing}
                                    className="flex-1 py-4 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white font-black rounded-xl disabled:opacity-50 transition-all uppercase tracking-widest"
                                >
                                    3개로 초기화
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'assets' && (
                        <form onSubmit={handleCreateAsset} className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div>
                                <h3 className="text-lg font-black text-white mb-1">신규 에셋(CSV) 등록</h3>
                                <p className="text-xs text-slate-400 mb-6">등록 즉시 Asset Store 상점에 상품으로 노출됩니다.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Asset ID *</label>
                                    <input required placeholder="csv_yonsei_2026" title="Asset ID"
                                        value={assetForm.id} onChange={e => setAssetForm({...assetForm, id: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-cyan-500 text-sm" />
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">판매 가격 (₩)</label>
                                    <input required type="number" min="0" step="1000" title="판매 가격"
                                        value={assetForm.price} onChange={e => setAssetForm({...assetForm, price: Number(e.target.value)})}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-cyan-500 text-sm" />
                                </div>
                                
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">타이틀 *</label>
                                    <input required placeholder="2026 연세대 모의 논술" title="상품 타이틀"
                                        value={assetForm.title} onChange={e => setAssetForm({...assetForm, title: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-cyan-500 text-sm" />
                                </div>


                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">에셋 파일 (CSV) 업로드 *</label>
                                    <input 
                                        type="file" 
                                        accept=".csv"
                                        title="에셋 CSV 파일 업로드"
                                        onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 outline-none focus:border-cyan-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 transition-all cursor-pointer" 
                                    />
                                </div>

                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">상세 설명</label>
                                    <textarea rows={3} placeholder="상점에 노출될 상세 설명을 적어주세요."
                                        value={assetForm.description} onChange={e => setAssetForm({...assetForm, description: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-cyan-500 text-sm resize-none" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="w-full mt-4 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all uppercase tracking-widest"
                            >
                                {isProcessing ? '등록 중...' : '상품 등록 완료'}
                            </button>
                        </form>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-lg font-black text-white mb-1">학원 환경 설정</h3>
                                <p className="text-xs text-slate-400 mb-6">학생용 앱과 랜딩 페이지에 노출될 학원 이름(브랜드명)을 설정합니다.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">배포용 학원 이름</label>
                                <input
                                    type="text"
                                    value={academyName}
                                    onChange={(e) => setAcademyName(e.target.value)}
                                    placeholder="예: 퀘스쳔 수리논술 학원 대치본점"
                                    className="w-full px-5 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-purple-400 transition-colors"
                                />
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                disabled={isProcessing}
                                className="w-full mt-4 py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-black rounded-xl shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all uppercase tracking-widest"
                            >
                                {isProcessing ? '저장 중...' : '설정 저장'}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
