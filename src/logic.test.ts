import { getStudentStats, getStudentTrend, getSmartAnalysis, hashPin, verifyPin } from './logic';
import { describe, it, expect } from 'vitest';
import { SessionRecord } from './types';

describe('Teaching System Logic Tests', () => {
  
  describe('Student Statistics', () => {
    it('should calculate accurate attendance rate', () => {
      const records: Partial<SessionRecord>[] = [
        { studentId: 'stu1', attendance: 'Present', participation: 5 },
        { studentId: 'stu1', attendance: 'Absent', participation: 0 },
        { studentId: 'stu1', attendance: 'Late', participation: 4 },
        { studentId: 'stu1', attendance: 'Present', participation: 3 },
      ];
      
      const stats = getStudentStats('stu1', records as SessionRecord[]);
      // 3 Present/Late out of 4 total
      expect(stats.attendanceRate).toBe(75);
      expect(stats.absenceCount).toBe(1);
    });

    it('should return 0 for empty records', () => {
      const stats = getStudentStats('stu1', []);
      expect(stats.attendanceRate).toBe(0);
      expect(stats.totalSessions).toBe(0);
    });
  });

  describe('Performance Analysis', () => {
    it('should identify excellent students', () => {
      const stats = { attendanceRate: 95, avgParticipation: 4.5 };
      expect(getSmartAnalysis(stats)).toBe('Excellent');
    });

    it('should flag students needing attention', () => {
      const stats = { attendanceRate: 60, avgParticipation: 1.5 };
      expect(getSmartAnalysis(stats)).toBe('Needs attention');
    });
  });

  describe('Security Logic', () => {
    it('should verify correct hashed PIN', () => {
      const pin = '5678';
      const hash = hashPin(pin);
      expect(verifyPin(pin, hash)).toBe(true);
    });

    it('should fail for incorrect PIN', () => {
      const pin = '5678';
      const hash = hashPin('1234');
      expect(verifyPin(pin, hash)).toBe(false);
    });

    it('should support legacy clear-text PINs (Auto-Migration)', () => {
      const legacyPin = '1234';
      expect(verifyPin(legacyPin, legacyPin)).toBe(true);
    });
  });

  describe('Trends', () => {
    it('should detect improving trends', () => {
      const records: Partial<SessionRecord>[] = [
        { studentId: '1', attendance: 'Absent', participation: 1 },
        { studentId: '1', attendance: 'Late', participation: 2 },
        { studentId: '1', attendance: 'Present', participation: 4 },
        { studentId: '1', attendance: 'Present', participation: 5 },
      ];
      expect(getStudentTrend('1', records as SessionRecord[])).toBe('Improving');
    });
  });
});
