/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, AuditLog, ActionType, EntityType, Student, SessionRecord, Class, Session } from './types';
import { GoogleGenerativeAI } from "@google/generative-ai";

const STORAGE_KEY = 'seham_system_data';

// AI Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export const getInitialState = (): AppState => {
  const defaultState: AppState = {
    classes: [],
    students: [],
    sessions: [],
    sessionRecords: [],
    auditLogs: [],
    evidence: [],
    settings: {
      pin: '1234',
      biometricEnabled: false,
      autoLockTimer: 5,
      language: 'ar',
      theme: 'dark',
      teacherName: '',
      schoolName: '',
      subjectName: '',
      gender: 'female',
      studentGender: 'girls',
      educationalLevel: 'primary',
      reportTemplate: 'professional',
      isOnboardingComplete: false
    },
    notifications: [],
    parentCommunications: [],
    isLocked: true,
  };

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...defaultState,
        ...parsed,
        settings: {
          ...defaultState.settings,
          ...(parsed.settings || {})
        }
      };
    } catch (e) {
      console.error('Failed to parse saved state', e);
    }
  }
  return defaultState;
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const createAuditLog = (
  action: ActionType,
  entityType: EntityType,
  entityId: string,
  field?: string,
  oldValue?: any,
  newValue?: any
): AuditLog => ({
  id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  action,
  entityType,
  entityId,
  field,
  oldValue,
  newValue,
});

// Utility for random student picking
export const pickRandomFromList = (list: any[]) => {
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
};

// Security: Simple hashing utility for PIN (not full-blown hashing but better than clear text)
// In a production environment, you would use a more robust crypto library.
export const hashPin = (pin: string) => {
  // Simple obfuscation for demo-quality security. 
  // Real app should use window.crypto.subtle for hashing.
  return btoa(pin.split('').reverse().join('p_i_n'));
};

export const verifyPin = (input: string, storedHash: string) => {
  // Migration check: if the stored value is 4-6 digits, it's clear text (legacy)
  if (/^\d{4,6}$/.test(storedHash)) {
    return input === storedHash;
  }
  return hashPin(input) === storedHash;
};

// Derived Statistics Logic
export const getStudentStats = (studentId: string, records: SessionRecord[] = []) => {
  const studentRecords = (records || []).filter(r => r && r.studentId === studentId);
  const totalSessions = studentRecords.length;
  const attendanceCount = studentRecords.filter(r => r.attendance === 'Present' || r.attendance === 'Late').length;
  const absenceCount = studentRecords.filter(r => r.attendance === 'Absent').length;
  const attendanceRate = totalSessions > 0 ? (attendanceCount / totalSessions) * 100 : 0;
  const avgParticipation = totalSessions > 0 
    ? studentRecords.reduce((acc, r) => acc + (r.participation || 0), 0) / totalSessions 
    : 0;

  return {
    totalSessions,
    attendanceCount,
    absenceCount,
    attendanceRate,
    avgParticipation,
  };
};

export const getStudentTrend = (studentId: string, records: SessionRecord[] = []) => {
  const studentRecords = (records || [])
    .filter(r => r && r.studentId === studentId);
  
  if (studentRecords.length < 3) return 'Stable';

  const getScore = (r: SessionRecord) => {
    if (!r) return 0;
    const attendanceScore = r.attendance === 'Present' ? 1 : r.attendance === 'Late' ? 0.5 : 0;
    const participationScore = (r.participation || 0) / 5;
    return (attendanceScore + participationScore) / 2;
  };

  const last5 = studentRecords.slice(-5);
  if (last5.length < 3) return 'Stable';

  const firstHalf = last5.slice(0, Math.floor(last5.length / 2));
  const secondHalf = last5.slice(-Math.floor(last5.length / 2));

  if (firstHalf.length === 0 || secondHalf.length === 0) return 'Stable';

  const avg1 = firstHalf.reduce((acc, r) => acc + getScore(r), 0) / firstHalf.length;
  const avg2 = secondHalf.reduce((acc, r) => acc + getScore(r), 0) / secondHalf.length;

  const diff = avg2 - avg1;
  if (diff > 0.1) return 'Improving';
  if (diff < -0.1) return 'Declining';
  return 'Stable';
};

export const getSmartAnalysis = (stats: any) => {
  if (stats.attendanceRate > 90 && stats.avgParticipation > 4) return 'Excellent';
  if (stats.attendanceRate < 70 || stats.avgParticipation < 2) return 'Needs attention';
  return 'Average';
};

// AI Assistant Functions
export const generateLessonPlan = async (title: string, objective: string, level: string) => {
  try {
    const prompt = `أنت مساعد معلم محترف. قم بإعداد خطة درس مفصلة لدرس بعنوان "${title}"، الهدف منه هو "${objective}"، للمستوى الدراسي "${level}". 
    يجب أن تتضمن الخطة:
    1. مقدمة مشوقة.
    2. الأنشطة التعليمية المقترحة.
    3. الوسائل التعليمية.
    4. طريقة التقييم.
    اجعل الأسلوب تربوياً ومبتكراً باللغة العربية.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Lesson Plan Error:", error);
    return "فشل في توليد خطة الدرس. يرجى المحاولة لاحقاً.";
  }
};

export const analyzeStudentPerformance = async (studentName: string, stats: any, trend: string) => {
  try {
    const prompt = `قم بتحليل أداء الطالب "${studentName}" بناءً على البيانات التالية:
    - نسبة الحضور: ${stats.attendanceRate}%
    - متوسط المشاركة: ${stats.avgParticipation}/5
    - الاتجاه العام: ${trend}
    
    اكتب تقريراً وصفياً قصيراً (3-4 أسطر) باللغة العربية يوضح نقاط القوة والتوصيات للتحسين بأسلوب تربوي مشجع.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Student Analysis Error:", error);
    return "فشل في تحليل أداء الطالب.";
  }
};

export const generateParentMessage = (studentName: string, stats: any, language: 'ar' | 'en') => {
  if (language === 'ar') {
    const status = stats.attendanceRate > 90 && stats.avgParticipation > 4 ? 'ممتاز جداً' : 
                   stats.attendanceRate > 70 ? 'جيد' : 'يحتاج لمتابعة';
    
    return `السلام عليكم ورحمة الله وبركاته،
نود إحاطتكم علماً بأداء ابنكم/ابنتكم ${studentName} في الفترة الماضية:
- نسبة الحضور: ${stats.attendanceRate.toFixed(1)}%
- مستوى المشاركة: ${stats.avgParticipation.toFixed(1)}/5
- التقييم العام: ${status}

شكراً لتعاونكم معنا للارتقاء بمستوى الطالب.`;
  } else {
    const status = stats.attendanceRate > 90 && stats.avgParticipation > 4 ? 'Excellent' : 
                   stats.attendanceRate > 70 ? 'Good' : 'Needs attention';
                   
    return `Dear Parent,
We would like to inform you about ${studentName}'s performance:
- Attendance Rate: ${stats.attendanceRate.toFixed(1)}%
- Participation Level: ${stats.avgParticipation.toFixed(1)}/5
- Overall Status: ${status}

Thank you for your cooperation.`;
  }
};

// Export Logic (Mock)
export const exportData = (format: 'PDF' | 'Excel' | 'Word' | 'WhatsApp', data: any) => {
  console.log(`Exporting to ${format}`, data);
  // In a real app, this would trigger a download or open a share sheet
  alert(`تم تصدير التقرير بصيغة ${format}`);
};

// Calendar Logic
export const getDaysInMonth = (month: number, year: number) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const getMonthName = (month: number, language: 'ar' | 'en') => {
  const date = new Date(2000, month, 1);
  return date.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long' });
};
