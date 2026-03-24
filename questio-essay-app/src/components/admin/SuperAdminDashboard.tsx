import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { LayoutDashboard, Users, AlertCircle, LogOut, Plus, QrCode, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

interface FranchiseUser {
  uid?: string;
  email: string;
  displayName?: string;
  institutionId: string;
  planType: string;
  tokens: number;
  status: 'pending' | 'active';
  lastLoginAt?: any;
}

export default function SuperAdminDashboard() {
  const [directors, setDirectors] = useState<FranchiseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Franchise Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');

  // QR Modal State
  const [qrCodeData, setQrCodeData] = useState<{code: string, name: string} | null>(null);

  const fetchDirectors = async () => {
    try {
      setLoading(true);
      // Fetch Pre-registered franchises
      const fSnap = await getDocs(collection(db, 'franchises'));
      const franchiseList = fSnap.docs.map(d => d.data());
      
      // Fetch Activated directors
      const q = query(collection(db, 'users'), where('role', '==', 'director'));
      const dSnap = await getDocs(q);
      const activeDirectors = dSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as FranchiseUser));
      
      const combined = new Map<string, FranchiseUser>();
      activeDirectors.forEach(d => {
        if (d.institutionId) {
           combined.set(d.institutionId, { ...d, status: 'active' });
        }
      });
      
      franchiseList.forEach(f => {
        if (f.institutionId && !combined.has(f.institutionId)) {
          combined.set(f.institutionId, {
            institutionId: f.institutionId,
            email: f.directorEmail,
            displayName: f.academyName,
            planType: f.planType || 'basic',
            tokens: 0,
            status: 'pending'
          });
        }
      });
      
      setDirectors(Array.from(combined.values()));
    } catch (err: any) {
      console.error(err);
      setError('가맹점(원장님) 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectors();
  }, []);

  const updatePlan = async (uid: string | undefined, newPlan: string) => {
    if (!uid) { alert('활성화되지 않은 계정은 요금제 변경이 불가능합니다.'); return; }
    try {
      await updateDoc(doc(db, 'users', uid), { planType: newPlan });
      alert('요금제가 업데이트 되었습니다.');
      fetchDirectors();
    } catch (e) {
      alert('요금제 변경 실패');
    }
  };

  const resetTokens = async (uid: string | undefined, amount: number) => {
    if (!uid) { alert('활성화되지 않은 계정입니다.'); return; }
    try {
      await updateDoc(doc(db, 'users', uid), {
        tokens: amount,
        freeTokens: amount
      });
      alert(`${amount} 토큰이 충전되었습니다.`);
      fetchDirectors();
    } catch (e) {
      alert('토큰 충전 실패');
    }
  };

  const handleAddFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newEmail || !newName) return;
    try {
      await setDoc(doc(db, 'franchises', newCode), {
        institutionId: newCode,
        directorEmail: newEmail,
        academyName: newName,
        createdAt: serverTimestamp(),
        planType: 'basic',
      });
      alert('가맹점이 사전 등록되었습니다! 원장님이 해당 이메일로 가입하면 자동으로 권한이 부여됩니다.');
      setShowAddModal(false);
      setNewCode(''); setNewEmail(''); setNewName('');
      fetchDirectors();
    } catch (err) {
      console.error(err);
      alert('가맹점 등록에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Super Admin <span className="text-slate-500 font-medium">| Questio HQ</span></h1>
        </div>
        <button onClick={() => auth.signOut()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium">
          <LogOut className="w-4 h-4" /> 로그아웃
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Intro */}
        <div className="bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-indigo-500/20 p-6 rounded-3xl">
          <h2 className="text-2xl font-bold text-white mb-2">가맹점(학원) 요금제 관리 대시보드</h2>
          <p className="text-slate-400">Questio AI의 모든 B2B 프랜차이즈 계정을 모니터링하고 요금제를 직접 할당할 수 있습니다.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        {/* Directors List */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> 등록된 가맹점 현황
            </h3>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full">
                총 {directors.length}개 기관
              </span>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
                <Plus className="w-4 h-4" /> 가맹점 신규 등록
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-slate-400 text-sm border-b border-white/5">
                  <th className="p-4 font-medium">기관 코드 (Institution ID)</th>
                  <th className="p-4 font-medium">원장님 정보</th>
                  <th className="p-4 font-medium">잔여 토큰</th>
                  <th className="p-4 font-medium">요금제 플랜 (Plan)</th>
                  <th className="p-4 font-medium text-right">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">데이터를 불러오는 중입니다...</td></tr>
                ) : directors.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">등록된 가맹점이 없습니다.</td></tr>
                ) : (
                  directors.map(dir => (
                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={dir.institutionId} className="hover:bg-white/[0.02] transition-colors relative group">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 font-mono text-sm border border-indigo-500/20">
                            {dir.institutionId}
                          </span>
                          {dir.status === 'pending' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">대기중</span>}
                          {dir.status === 'active' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">활성화됨</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white">{dir.displayName || '미정'}</div>
                        <div className="text-xs text-slate-500">{dir.email}</div>
                      </td>
                      <td className="p-4 font-mono">
                        {dir.status === 'active' ? (
                          <span className="text-emerald-400">{dir.tokens} Q</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <select 
                          value={dir.planType || 'basic'} 
                          onChange={(e) => updatePlan(dir.uid, e.target.value)}
                          disabled={dir.status === 'pending'}
                          title="요금제 선택"
                          aria-label="요금제 선택"
                          className="bg-slate-950 border border-slate-700 text-sm text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                        >
                          <option value="basic">Basic (무료)</option>
                          <option value="tier1">Tier 1 (월 4.9만 / 10명)</option>
                          <option value="tier2">Tier 2 (월 9.9만 / 20명)</option>
                          <option value="tier3">Tier 3 (월 19.9만 / 50명)</option>
                          <option value="tier4">Tier 4 (월 29.9만 / 100명)</option>
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            title="QR코드 열기"
                            onClick={() => setQrCodeData({code: dir.institutionId, name: dir.displayName || '가맹점'})}
                            className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button 
                            disabled={dir.status === 'pending'}
                            onClick={() => resetTokens(dir.uid, 500)}
                            className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            토큰 500개 충전
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Franchise Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl relative">
              <button title="닫기" aria-label="닫기" onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4" /></button>
              <h3 className="text-xl font-bold text-white mb-6">신규 가맹점 등록</h3>
              <form onSubmit={handleAddFranchise} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">학원(가맹점) 이름</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="예: 퀘스티오 수학학원 대치점" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">기관 코드 (영문/숫자)</label>
                  <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="예: MATH01" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono uppercase" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">원장님 구글 로그인 이메일</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="원장님이 구글 연동에 사용할 이메일" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" required />
                </div>
                <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] mt-2">
                  가맹점 등록하기
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* QR Code Modal */}
        {qrCodeData && (
          <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setQrCodeData(null)}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white p-8 rounded-3xl flex flex-col items-center max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button aria-label="닫기" onClick={() => setQrCodeData(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full transition-colors"><X className="w-4 h-4" /></button>
              
              <div className="text-center mb-6 mt-2">
                <h3 className="text-xl font-black text-slate-800">{qrCodeData.name}</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">기관코드 로그인(회원가입) QR 페이지</p>
              </div>

              <div className="bg-white border-8 border-indigo-50 rounded-2xl p-4 shadow-sm mb-6">
                <QRCodeSVG 
                  value={`${window.location.origin}/login?code=${qrCodeData.code}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor="#1e293b" // slate-800
                />
              </div>

              <div className="w-full bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between border border-slate-200">
                <span className="font-mono font-bold text-slate-600 truncate mr-3">
                  {qrCodeData.code}
                </span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/login?code=${qrCodeData.code}`);
                    alert('링크가 복사되었습니다!');
                  }}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/30 shrink-0"
                >
                  링크 복사
                </button>
              </div>
              <p className="text-xs text-slate-400 font-medium text-center mt-4">
                학생들이 카메라로 이 QR을 스캔하면<br/>자동으로 학원에 연결됩니다.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
