import React from 'react';
import type { StudentRecord } from '../types';

interface CompetencyChartProps {
  records: StudentRecord[];
}

export const CompetencyChart: React.FC<CompetencyChartProps> = ({ records }) => {
  if (records.length === 0) {
    return null;
  }

  // 최근 5개 기록만 사용
  const recentRecords = records.slice(-5);
  
  // 최신 기록
  const latest = records[records.length - 1];
  const previous = records.length > 1 ? records[records.length - 2] : null;

  // 변화량 계산
  const getChange = (current: number, prev: number | undefined) => {
    if (prev === undefined) return null;
    return current - prev;
  };

  const latestComp = latest.coreCompetencies || { problemSolving: 0, writingAbility: 0, calculationAccuracy: 0 };
  const prevComp = previous?.coreCompetencies;

  const competencies = [
    {
      name: '문제해결력',
      key: 'problemSolving',
      score: latestComp.problemSolving,
      change: getChange(latestComp.problemSolving, prevComp?.problemSolving),
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500',
    },
    {
      name: '서술 능력',
      key: 'writingAbility',
      score: latestComp.writingAbility,
      change: getChange(latestComp.writingAbility, prevComp?.writingAbility),
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500',
    },
    {
      name: '계산력',
      key: 'calculationAccuracy',
      score: latestComp.calculationAccuracy,
      change: getChange(latestComp.calculationAccuracy, prevComp?.calculationAccuracy),
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 현재 역량 점수 바 차트 */}
      <div className="bg-stone-900/50 rounded-lg p-4">
        <h4 className="font-semibold text-stone-200 mb-4">📊 핵심 역량 현황</h4>
        <div className="space-y-4">
          {competencies.map((comp) => (
            <div key={comp.key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-stone-300 text-sm">{comp.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-stone-100 font-bold">{comp.score}점</span>
                  {comp.change !== null && (
                    <span className={`text-xs ${comp.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {comp.change >= 0 ? '▲' : '▼'}{Math.abs(comp.change)}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-stone-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full bg-gradient-to-r ${comp.color} transition-all duration-500`}
                  style={{ width: `${comp.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 시간별 추이 차트 */}
      {recentRecords.length > 1 && (
        <div className="bg-stone-900/50 rounded-lg p-4">
          <h4 className="font-semibold text-stone-200 mb-4">📈 역량 변화 추이</h4>
          
          {/* 범례 */}
          <div className="flex gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-stone-400">문제해결력</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-500"></div>
              <span className="text-stone-400">서술능력</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-stone-400">계산력</span>
            </div>
          </div>

          {/* 간단한 라인 차트 (CSS로 구현) */}
          <div className="relative h-40 flex items-end justify-between gap-2">
            {recentRecords.map((record, idx) => {
              const comp = record.coreCompetencies || { problemSolving: 0, writingAbility: 0, calculationAccuracy: 0 };
              return (
                <div key={record.id} className="flex-1 flex flex-col items-center">
                  {/* 막대 그래프 */}
                  <div className="w-full flex justify-center gap-1 items-end h-32">
                    <div
                      className="w-3 bg-blue-500 rounded-t transition-all duration-300"
                      style={{ height: `${comp.problemSolving * 0.32}px` }}
                      title={`문제해결력: ${comp.problemSolving}`}
                    />
                    <div
                      className="w-3 bg-purple-500 rounded-t transition-all duration-300"
                      style={{ height: `${comp.writingAbility * 0.32}px` }}
                      title={`서술능력: ${comp.writingAbility}`}
                    />
                    <div
                      className="w-3 bg-green-500 rounded-t transition-all duration-300"
                      style={{ height: `${comp.calculationAccuracy * 0.32}px` }}
                      title={`계산력: ${comp.calculationAccuracy}`}
                    />
                  </div>
                  {/* 날짜 라벨 */}
                  <div className="text-xs text-stone-500 mt-2 truncate w-full text-center">
                    {record.date.split(' ')[0].slice(5)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 역량별 상세 분석 */}
      <div className="bg-stone-900/50 rounded-lg p-4">
        <h4 className="font-semibold text-stone-200 mb-4">💡 역량별 분석</h4>
        <div className="space-y-3">
          {competencies.map((comp) => {
            let advice = '';
            let status = '';
            
            if (comp.score >= 80) {
              status = '🟢 우수';
              advice = '현재 수준을 유지하세요!';
            } else if (comp.score >= 60) {
              status = '🟡 보통';
              advice = '조금 더 연습이 필요해요.';
            } else {
              status = '🔴 부족';
              advice = '집중적인 학습이 필요합니다.';
            }

            // 역량별 구체적 조언
            if (comp.key === 'problemSolving' && comp.score < 70) {
              advice = '다양한 유형의 문제를 많이 접해보세요.';
            } else if (comp.key === 'writingAbility' && comp.score < 70) {
              advice = '풀이 과정을 글로 써보는 연습을 하세요.';
            } else if (comp.key === 'calculationAccuracy' && comp.score < 70) {
              advice = '계산 과정을 꼼꼼히 검토하는 습관을 들이세요.';
            }

            return (
              <div key={comp.key} className="flex justify-between items-center p-2 bg-stone-800/50 rounded">
                <div>
                  <span className="text-stone-200">{comp.name}</span>
                  <span className="text-xs ml-2">{status}</span>
                </div>
                <span className="text-xs text-stone-400">{advice}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
