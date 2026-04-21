/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EntityType = 'CLASS' | 'STUDENT' | 'SESSION' | 'ATTENDANCE' | 'PARTICIPATION' | 'ACTIVITY' | 'HOMEWORK' | 'NOTE' | 'SETTING' | 'EVIDENCE';
export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  timestamp: string;
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
}

export interface Class {
  id: string;
  name: string;
  level: string;
}

export type StudentTag = 'Strong' | 'Average' | 'Needs support';

export interface StudentHistoryRecord {
  date: string;
  attendance: 'Present' | 'Absent' | 'Late';
  activity: number; // score
  homework: boolean;
  participation: number; // 1-5
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  tags: StudentTag[];
  notes: string;
  seatPosition?: { row: number; col: number };
  // Stats are derived but can be cached
}

export interface Resource {
  id: string;
  title: string;
  type: 'Link' | 'File' | 'Video' | 'Image';
  url: string;
}

export interface Session {
  id: string;
  classId: string;
  date: string;
  title: string;
  objective: string;
  activities: string;
  homework: string;
  notes: string;
  isCompleted: boolean;
  aiLessonPlan?: string;
  resources?: Resource[];
}

export interface SessionRecord {
  id: string; // sessionRecordId
  sessionId: string;
  studentId: string;
  attendance: 'Present' | 'Absent' | 'Late';
  participation: number; // 1-5
  grade?: number; // 0-10 or custom
  notes: string;
  isDistinguished?: boolean;
}

export interface UserSettings {
  pin: string;
  biometricEnabled: boolean;
  autoLockTimer: number; // minutes
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
  profilePic?: string;
  schoolName?: string;
  teacherName?: string;
  subjectName?: string;
  gender?: 'male' | 'female';
  studentGender?: 'boys' | 'girls' | 'mixed';
  educationalLevel?: 'primary' | 'middle' | 'high' | 'all';
  reportTemplate?: 'modern' | 'classic' | 'professional' | 'colorful';
  isOnboardingComplete?: boolean;
}

export interface Evidence {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  fileUrl?: string;
  fileName?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  date: string;
  isRead: boolean;
}

export interface ParentCommunication {
  id: string;
  studentId: string;
  date: string;
  type: 'Call' | 'WhatsApp' | 'Meeting' | 'Email';
  summary: string;
  outcome: string;
}

export interface AppState {
  classes: Class[];
  students: Student[];
  sessions: Session[];
  sessionRecords: SessionRecord[];
  auditLogs: AuditLog[];
  evidence: Evidence[];
  settings: UserSettings;
  notifications: AppNotification[];
  parentCommunications: ParentCommunication[];
  isLocked: boolean;
  activeTimer?: {
    endTime: string;
    duration: number;
    label: string;
  };
}
