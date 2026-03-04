import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ExamDatabaseRecord } from '../models/types';
import { Firestore, collection, writeBatch, doc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ExamDataService {
  private firestore: Firestore = inject(Firestore);

  /**
   * 대학교 CSV 데이터(가천대 샘플 형식)를 파싱하여 데이터베이스에 업로드합니다.
   * CSV 형식: 대학교,연도,유형,문제URL,해설URL
   * 예: 가천대학교,2024,자연계열 오전,https://storage.googleapis.com/.../problem.pdf,https://storage.googleapis.com/.../solution.pdf
   */
  uploadCsvData(file: File): Observable<{ success: boolean, count: number, message: string }> {
    return from(this.parseAndUpload(file)).pipe(
      catchError(error => {
        console.error('CSV Upload Error:', error);
        return throwError(() => new Error(`CSV 업로드 중 오류가 발생했습니다: ${error.message}`));
      })
    );
  }

  private async parseAndUpload(file: File): Promise<{ success: boolean, count: number, message: string }> {
    // 1. 파일 읽기
    const text = await file.text();

    // 2. CSV 파싱 (줄바꿈 문자로 행 분리, 쉼표로 열 분리)
    // 윈도우/맥 환경의 줄바꿈(\r\n 또는 \n)을 모두 처리
    const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');

    if (rows.length === 0) {
      throw new Error('CSV 파일이 비어있습니다.');
    }

    // 첫 번째 행이 헤더인지 확인 (가정: '대학교'라는 단어가 포함되어 있으면 헤더로 간주하고 건너뜀)
    const hasHeader = rows[0].includes('대학교') || rows[0].includes('대학');
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const records: ExamDatabaseRecord[] = [];

    // 3. 데이터 매핑 및 유효성 검사
    for (let i = 0; i < dataRows.length; i++) {
      // 따옴표로 묶인 CSV 데이터 파싱 (복잡한 CSV 파서 대신 간단한 split 사용 - URL에 쉼표가 없다는 가정)
      // 만약 URL 등에 쉼표가 포함될 수 있다면 정규식 파서나 외부 라이브러리(papaparse 등) 사용 권장
      const columns = dataRows[i].split(',').map(col => col.trim());

      // 최소 필수 열 확인 (대학교, 연도, 유형)
      if (columns.length >= 3) {
        const record: Partial<ExamDatabaseRecord> = {
          university: columns[0],
          year: columns[1],
          problemType: columns[2],
        };

        // Firebase Firestore does not support 'undefined' values.
        // Omit the property entirely if it's empty to prevent SDK crashes.
        if (columns[3]) record.problemUrl = columns[3];
        if (columns[4]) record.solutionUrl = columns[4];

        // 데이터가 유효한지 간단히 체크
        if (record.university && record.year && record.problemType) {
          records.push(record as ExamDatabaseRecord);
        } else {
          console.warn(`[Warning] ${i + 1}번째 행 데이터가 불완전하여 무시되었습니다:`, dataRows[i]);
        }
      }
    }

    if (records.length === 0) {
      throw new Error('파싱된 유효한 레코드가 없습니다. CSV 형식을 확인해주세요.');
    }

    // 4. Firestore에 일괄 업로드 (Batch Write)
    const batch = writeBatch(this.firestore);
    const examCollectionRef = collection(this.firestore, 'logic_exams');

    records.forEach(record => {
      // 사용자가 요청한 컬렉션에 저장합니다.
      const newDocRef = doc(examCollectionRef);
      batch.set(newDocRef, record);
    });

    // 500개 제한이 있으므로, 매우 큰 CSV의 경우 청크 처리가 필요할 수 있습니다.
    // 현재는 일반적인 크기를 가정하고 한번에 커밋합니다.
    await batch.commit();

    return {
      success: true,
      count: records.length,
      message: `${records.length}개의 데이터가 Firestore(logic_exams)에 성공적으로 업로드되었습니다.`
    };
  }
}
