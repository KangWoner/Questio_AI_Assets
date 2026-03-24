import React, { useState, useEffect } from 'react';
import { auth, getPurchasedAssets, getAssetsByIds, AssetData, storage, deletePurchasedAsset } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, getDownloadURL } from 'firebase/storage';

interface MyLibraryProps {
    onGoToEngine: (syncedRecord?: any) => void;
}

export const MyLibrary: React.FC<MyLibraryProps> = ({ onGoToEngine }) => {
    const [assets, setAssets] = useState<AssetData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const purchasedIds = await getPurchasedAssets(user.uid);
                if (purchasedIds.length > 0) {
                    const purchasedAssets = await getAssetsByIds(purchasedIds);
                    setAssets(purchasedAssets);
                }
            }
            setIsLoading(false);
        });
        return () => unsub();
    }, []);



    const handleDeleteAsset = async (assetId: string, assetTitle: string) => {
        if (!auth.currentUser) return;
        const confirmDelete = window.confirm(`'${assetTitle}' 자료를 보관함에서 정말 삭제하시겠습니까? (삭제 후 재다운로드 및 채점이 불가합니다)`);
        
        if (confirmDelete) {
            const result = await deletePurchasedAsset(auth.currentUser.uid, assetId);
            if (result.success) {
                setAssets(prev => prev.filter(a => a.id !== assetId));
                alert(result.message);
            } else {
                alert(result.message);
            }
        }
    };

    const handleSyncAndGo = async (asset: AssetData) => {
        try {
            if (!asset.questionGcsUrl) {
                onGoToEngine();
                return;
            }

            let downloadUrl = asset.questionGcsUrl;
            if (downloadUrl.startsWith('gs://')) {
                const pathMatch = downloadUrl.match(/gs:\/\/[^\/]+\/(.+)/);
                if (pathMatch && pathMatch.length >= 2) {
                    const path = pathMatch[1];
                    const fileRef = ref(storage, path);
                    downloadUrl = await getDownloadURL(fileRef);
                }
            }

            // 파싱을 위한 Fetch (CORS 프록시 사용)
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(downloadUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("CSV fetch failed");
            const text = await response.text();

            const rows = text.split(/\r?\n/).map(r => r.trim()).filter(r => r.length > 0).slice(1);
            const validatedDb: any[] = [];
            let isSimple = false;

            rows.forEach((row) => {
                const parts = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(',').map(s => s.trim());
                const cleanedParts = parts.map(p => p.replace(/^"|"$/g, '').trim());

                const univ = cleanedParts[0] || '';
                const year = cleanedParts[1] || '';
                const pType = cleanedParts[2] || '';
                const pUrl = cleanedParts[3] || '';
                const sUrl = cleanedParts[4] || '';

                if (pType && pType.includes('약술')) isSimple = true;

                if (univ && year && pType && pUrl && sUrl) {
                    validatedDb.push({ university: univ, year: year.toString(), problemType: pType, problemUrl: pUrl, solutionUrl: sUrl });
                }
            });

            if (validatedDb.length > 0) {
                const dbKey = isSimple ? 'simple_exam_database' : 'exam_database';
                localStorage.setItem(dbKey, JSON.stringify(validatedDb));
                alert(`성공: '${asset.title}.csv' 파일로부터 ${validatedDb.length}건을 동기화했습니다.`);
                onGoToEngine(validatedDb[0]);
                return;
            }

            onGoToEngine();

        } catch (error) {
            console.error("Sync error:", error);
            onGoToEngine();
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-32">
                <div className="w-16 h-16 border-4 border-fuchsia-500/30 border-t-fuchsia-400 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-12 pb-20">
            {/* Header section */}
            <div className="text-center space-y-4 pt-10">
                <div className="inline-block px-4 py-1.5 bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-full text-fuchsia-300 text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(217,70,239,0.3)]">
                    My Library
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                    내 <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">보관함</span>
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
                    구매하신 논술자료를 다운로드하고, 다 푸신 후 바로 AI 채점을 시작해보세요.
                </p>
            </div>

            {/* Asset Grid */}
            {assets.length === 0 ? (
                <div className="text-center py-32 bg-slate-900/30 rounded-[3rem] border border-white/5 backdrop-blur-sm">
                    <div className="w-24 h-24 mx-auto mb-6 opacity-20 bg-slate-800 rounded-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <p className="text-slate-400 font-medium text-lg">보유하신 자료가 없습니다.</p>
                    <p className="text-slate-500 text-sm mt-2">상점에서 필요한 자료를 구매해보세요.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {assets.map(asset => (
                        <div key={asset.id} className="relative group rounded-[2rem] p-[1px] bg-gradient-to-b from-white/10 to-transparent hover:from-fuchsia-500/50 transition-all duration-500 overflow-hidden">
                            <div className="absolute inset-0 bg-slate-900/90 -z-10" />
                            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

                            <div className="p-8 space-y-6">
                                {/* Tag & Title */}
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-black text-white leading-tight group-hover:text-fuchsia-300 transition-colors pr-8">
                                        {asset.title}
                                    </h3>
                                    <button 
                                        onClick={() => handleDeleteAsset(asset.id, asset.title)}
                                        className="text-slate-500 hover:text-red-400 transition-colors absolute top-6 right-6 p-2 rounded-full hover:bg-red-400/10"
                                        title="보관함에서 지우기"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Actions */}
                                <button 
                                    onClick={() => handleSyncAndGo(asset)}
                                    className="w-full py-4 mt-2 bg-gradient-to-r from-fuchsia-600/20 to-cyan-600/20 hover:from-fuchsia-500 hover:to-cyan-500 text-fuchsia-300 hover:text-white border border-fuchsia-500/30 hover:border-transparent rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,0,0,0)] hover:shadow-[0_0_20px_rgba(217,70,239,0.4)]"
                                >
                                    문제를 풀어보고 채점받기 &rarr;
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
