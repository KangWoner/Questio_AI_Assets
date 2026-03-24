import React, { useState, useEffect } from 'react';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import { auth, getPurchasedAssets, getAvailableAssets, AssetData, purchaseAssetVirtual, deleteAsset } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export interface AssetStoreProps {
  onGoToLibrary?: () => void;
  isAdminUser?: boolean;
}

export const AssetStore: React.FC<AssetStoreProps> = ({ onGoToLibrary, isAdminUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [purchasedAssetIds, setPurchasedAssetIds] = useState<string[]>([]);
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      // 1. 등록된 모든 상점 데이터 불러오기
      const allAssets = await getAvailableAssets();
      setAssets(allAssets);

      // 2. 로그인된 경우 보유 에셋 체크
      if (user) {
        const pAssets = await getPurchasedAssets(user.uid);
        setPurchasedAssetIds(pAssets);
      }
      setIsLoadingStore(false);
    });
    return () => unsub();
  }, []);

  // filtered list
  const filteredAssets = assets.filter(asset => {
    return asset.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handlePurchaseClick = async (assetId: string) => {
    if (!auth.currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    if (confirm(`'${asset.title}' 을(를) 구매하시겠습니까?\n테스트용: 가상 결제로 즉시 보관함에 들어갑니다.`)) {
        const result = await purchaseAssetVirtual(auth.currentUser.uid, assetId);
        alert(result.message);
        if (result.success) {
            setPurchasedAssetIds(prev => [...prev, assetId]);
            if (isAdminUser && onGoToLibrary) {
                onGoToLibrary();
            }
        }
    }
  };

  const handleDeleteAsset = async (assetId: string, assetTitle: string) => {
    if (!auth.currentUser) return;
    if (confirm(`'${assetTitle}' 에셋을 스토어 전체 데이터베이스에서 완전히 삭제하시겠습니까?\n이 작업은 취소할 수 없습니다.`)) {
      const result = await deleteAsset(assetId);
      if (result.success) {
        setAssets(prev => prev.filter(a => a.id !== assetId));
        alert(result.message);
      } else {
        alert(result.message);
      }
    }
  };


  return (
    <div className="animate-in fade-in duration-700 w-full">
      
      {/* 1. Header Section */}
      <div className="mb-12 space-y-4">
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter shadow-sm uppercase">
          Questio <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">Asset Store</span>
        </h2>
        <p className="text-slate-400 font-medium">B2B 엔진 전용 프리미엄 AI 채점 기준 데이터베이스(CSV) 상점입니다.</p>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-10 p-6 bg-slate-900/40 rounded-3xl border border-white/5 shadow-xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="flex-1 relative z-10">
          <input
            type="text"
            placeholder="에셋 이름, 키워드로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 text-white px-5 py-4 rounded-2xl border border-slate-700 focus:outline-none focus:border-cyan-500/50 transition-colors shadow-inner"
          />
        </div>
      </div>

      {/* 3. Asset Grid */}
      {isLoadingStore ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredAssets.map(asset => {
          const isPurchased = purchasedAssetIds.includes(asset.id);

          return (
            <div 
              key={asset.id} 
              className={`group relative glass-panel rounded-[2rem] p-8 border hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden 
                ${isPurchased 
                  ? 'border-emerald-500/30 bg-emerald-900/10 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
                  : 'border-white/5 hover:border-cyan-500/30 hover:bg-slate-800/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]'}`}
            >
              
              {/* Asset content */}
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-2 relative">
                      <span className="w-fit px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-[10px] font-black tracking-widest uppercase text-slate-300">
                        통합 에셋
                      </span>
                      {isPurchased && (
                        <span className="w-fit px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          보유 중
                        </span>
                      )}
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteAsset(asset.id, asset.title)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-400/10 ml-auto"
                    title="상점에서 완전 삭제"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2 leading-snug">{asset.title}</h3>
                  <p className="text-sm text-slate-400 line-clamp-3">{asset.description}</p>
                </div>
              </div>

              {/* Price & Action */}
              <div className="mt-10 pt-6 border-t border-white/5 relative z-10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase block mb-1">
                    사용 기한: {isPurchased ? '2026-11-15 까지' : `${asset.validDays}일`}
                  </span>
                  <div className="flex items-baseline space-x-1">
                    {isPurchased ? (
                      <span className="text-lg font-black text-emerald-400">Purchased</span>
                    ) : (
                      <>
                        <span className="text-2xl font-black text-white">{asset.price.toLocaleString()}</span>
                        <span className="text-sm text-slate-400 font-bold">원</span>
                      </>
                    )}
                  </div>
                </div>

                {!isPurchased && (
                  <button 
                    title="에셋 구매하기"
                    onClick={() => handlePurchaseClick(asset.id)}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center group-hover:bg-cyan-400 transition-colors shadow-xl"
                  >
                    <svg className="w-5 h-5 text-slate-900 ml-1 transform translate-x-px" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {filteredAssets.length === 0 && !isLoadingStore && (
        <div className="text-center py-20 bg-slate-900/30 rounded-[2rem] border border-white/5">
          <p className="text-slate-400 font-medium">선택하신 조건에 맞는 에셋이 없습니다.</p>
        </div>
      )}

    </div>
  );
};
