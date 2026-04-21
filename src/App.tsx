/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import moment from 'moment-hijri';
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  User as UserIcon,
  ArrowUpRight, 
  Search, 
  Bell, 
  Settings, 
  CreditCard,
  TrendingUp,
  DollarSign,
  Lock,
  Unlock,
  AlertCircle,
  FileText,
  Printer,
  Share2,
  Plus,
  Trash2,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  Calendar,
  Download,
  FileSpreadsheet,
  Database,
  Edit3,
  BookOpen,
  FileUp,
  Award,
  Trophy,
  Briefcase,
  Paperclip,
  Grid,
  Sparkles,
  Zap,
  Timer,
  RefreshCw,
  MessageSquare,
  Moon,
  Globe,
  Video,
  Link as LinkIcon,
  LogOut
} from "lucide-react";
import * as XLSX from 'xlsx';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { AppState, ActionType, EntityType, AuditLog, Class, Student, Session, SessionRecord, Resource, Evidence, ParentCommunication } from './types';
import { 
  getInitialState, 
  saveState, 
  createAuditLog, 
  getStudentStats, 
  getStudentTrend, 
  getSmartAnalysis,
  generateLessonPlan,
  analyzeStudentPerformance,
  generateParentMessage,
  getDaysInMonth,
  getMonthName,
  hashPin,
  verifyPin
} from './logic';

const StatCard = ({ title, value, icon: Icon, color, isDarkMode }: any) => (
  <div className={`p-6 squircle-xl flex flex-col justify-between transition-all duration-300 active:scale-[0.98] ${
    isDarkMode 
    ? 'bg-apple-dark-card border border-white/5 shadow-2xl' 
    : 'bg-white border border-black/5 shadow-sm'
  }`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 squircle-md ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div className="flex items-center gap-1">
        <TrendingUp className="w-3 h-3 text-emerald-500" />
        <span className="text-[10px] font-bold text-emerald-500">+12%</span>
      </div>
    </div>
    <div>
      <p className="text-[11px] font-semibold text-apple-gray uppercase tracking-wider mb-1">{title}</p>
      <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</h3>
    </div>
  </div>
);

import { 
  auth, 
  db, 
  signInWithGoogle, 
  logout, 
  OperationType, 
  handleFirestoreError 
} from './firebase';
import { 
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const DEFAULT_TEACHER_ID = 'demo_teacher_id';
  const [state, setState] = useState<AppState>(getInitialState());
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [pinInput, setPinInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isActionSaving, setIsActionSaving] = useState(false);

  // Background Clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(getInitialState().settings.theme === 'dark');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isStudentProfileOpen, setIsStudentProfileOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [aiResult, setAiResult] = useState('');
  const [isLiveToolsOpen, setIsLiveToolsOpen] = useState(false);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const lastSyncedSettings = useRef<string | null>(null);

  // Sync dark mode with state
  useEffect(() => {
    setIsDarkMode(state.settings.theme === 'dark');
  }, [state.settings.theme]);

  const hijriDate = useMemo(() => {
    moment.locale(state.settings.language === 'ar' ? 'ar-SA' : 'en-US');
    return moment().format('iYYYY/iM/iD');
  }, [state.settings.language]);

  const gregorianDate = useMemo(() => {
    return currentTime.toLocaleDateString(state.settings.language === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [currentTime, state.settings.language]);

  const timeString = useMemo(() => {
    return currentTime.toLocaleTimeString(state.settings.language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [currentTime, state.settings.language]);

  // Persistence & Sync to Firestore
  useEffect(() => {
    saveState(state);
    
    if (user && isAuthReady && state.settings.isOnboardingComplete) {
      const currentSettingsStr = JSON.stringify(state.settings);
      if (currentSettingsStr === lastSyncedSettings.current) return;

      const syncSettings = async () => {
        try {
          const docRef = doc(db, 'users', user.uid);
          await setDoc(docRef, {
            uid: user.uid,
            email: user.email,
            settings: state.settings,
            updatedAt: serverTimestamp()
          }, { merge: true });
          lastSyncedSettings.current = currentSettingsStr;
        } catch (err) {
          console.error("Settings sync error:", err);
        }
      };
      
      const timer = setTimeout(syncSettings, 3000); // 3s debounce for settings sync
      return () => clearTimeout(timer);
    }
  }, [JSON.stringify(state.settings), user, isAuthReady, state.settings.isOnboardingComplete]);

  // Auto-lock logic
  useEffect(() => {
    let timer: any;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setState(prev => ({ ...prev, isLocked: true }));
      }, state.settings.autoLockTimer * 60 * 1000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      clearTimeout(timer);
    };
  }, [state.settings.autoLockTimer]);

  // Audit Log Wrapper
  const updateState = (
    updater: (prev: AppState) => AppState,
    action: ActionType,
    entityType: EntityType,
    entityId: string,
    field?: string,
    oldValue?: any,
    newValue?: any
  ) => {
    setState(prev => {
      const newState = updater(prev);
      const log = createAuditLog(action, entityType, entityId, field, oldValue, newValue);
      return {
        ...newState,
        auditLogs: [log, ...newState.auditLogs]
      };
    });
  };

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
      if (isTimerRunning) {
        alert(state.settings.language === 'ar' ? 'انتهى الوقت!' : 'Time is up!');
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Smart Notifications Logic
  useEffect(() => {
    if (state.sessions.length === 0) return;
    
    const checkNotifications = async () => {
      if (!user || state.isLocked) return;
      const teacherUid = user.uid;
      const today = new Date().toISOString().split('T')[0];
      
      const sessionsToday = state.sessions.filter(s => s.date.split('T')[0] === today);
      if (sessionsToday.length === 0) return;

      for (const session of sessionsToday) {
        const hasAttendance = state.sessionRecords.some(r => r.sessionId === session.id);
        const notifId = `attendance_${session.id}`;
        const existingNotif = state.notifications.find(n => n.id === notifId);
        
        if (!hasAttendance && !existingNotif) {
          try {
            await setDoc(doc(db, 'notifications', notifId), {
              title: state.settings.language === 'ar' ? 'رصد الحضور معلق' : 'Pending Attendance',
              message: state.settings.language === 'ar' ? `لم يتم رصد حضور حصة: ${session.title}` : `Attendance not recorded for: ${session.title}`,
              type: 'warning',
              date: new Date().toISOString(),
              isRead: false,
              teacherUid
            });
          } catch (e) {
            console.error("Notif sync error:", e);
          }
        }
      }
    };

    const timer = setTimeout(checkNotifications, 30000); // Check every 30s instead of 5s
    return () => clearTimeout(timer);
  }, [state.sessions.length, state.sessionRecords.length, state.notifications.length, user]);
  // Set default class if none selected
  useEffect(() => {
    if (!selectedClassId && state.classes.length > 0) {
      setSelectedClassId(state.classes[0].id);
    }
  }, [state.classes, selectedClassId]);

  const pickRandomStudent = () => {
    const classStudents = state.students.filter(s => s.classId === (selectedClassId || state.classes[0]?.id));
    if (classStudents.length === 0) return;
    const random = classStudents[Math.floor(Math.random() * classStudents.length)];
    setRandomStudent(random);
    setTimeout(() => setRandomStudent(null), 5000);
  };

  const handleUnlock = () => {
    if (verifyPin(pinInput, state.settings.pin)) {
      setState(prev => ({ ...prev, isLocked: false }));
      setPinInput('');
    } else {
      alert(state.settings.language === 'ar' ? 'رمز PIN غير صحيح' : 'Incorrect PIN');
      setPinInput('');
    }
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        setState(prev => ({ ...prev, isLocked: false }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const teacherUid = user.uid;

    // Sync Classes
    const qClasses = query(collection(db, 'classes'), where('teacherUid', '==', teacherUid), limit(100));
    const unsubClasses = onSnapshot(qClasses, (snapshot) => {
      const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
      setState(prev => ({ ...prev, classes }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'classes'));

    // Sync Students
    const qStudents = query(collection(db, 'students'), where('teacherUid', '==', teacherUid), limit(1000));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setState(prev => ({ ...prev, students }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'students'));

    // Sync Sessions
    const qSessions = query(collection(db, 'sessions'), where('teacherUid', '==', teacherUid), orderBy('date', 'desc'), limit(500));
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setState(prev => ({ ...prev, sessions }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sessions'));

    // Sync Attendance
    const qAttendance = query(collection(db, 'attendance'), where('teacherUid', '==', teacherUid), limit(1000));
    const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
      const attendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SessionRecord));
      setState(prev => ({ ...prev, sessionRecords: attendance }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'attendance'));

    // Sync Evidence
    const qEvidence = query(collection(db, 'evidence'), where('teacherUid', '==', teacherUid), orderBy('date', 'desc'), limit(200));
    const unsubEvidence = onSnapshot(qEvidence, (snapshot) => {
      const evidence = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setState(prev => ({ ...prev, evidence }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'evidence'));

    // Sync Notifications
    const qNotifications = query(collection(db, 'notifications'), where('teacherUid', '==', teacherUid), orderBy('date', 'desc'), limit(50));
    const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setState(prev => ({ ...prev, notifications }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));

    // Sync Parent Communications
    const qCommunications = query(collection(db, 'communications'), where('teacherUid', '==', teacherUid), orderBy('date', 'desc'), limit(200));
    const unsubCommunications = onSnapshot(qCommunications, (snapshot) => {
      const parentCommunications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setState(prev => ({ ...prev, parentCommunications }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'communications'));

    // Sync User Settings (Professional Sync)
    const unsubUserSettings = onSnapshot(doc(db, 'users', teacherUid), (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data();
        if (userData.settings) {
          const settingsStr = JSON.stringify(userData.settings);
          lastSyncedSettings.current = settingsStr;
          setState(prev => ({ 
            ...prev, 
            settings: { ...prev.settings, ...userData.settings } 
          }));
        }
      }
    });

    return () => {
      unsubClasses();
      unsubStudents();
      unsubSessions();
      unsubAttendance();
      unsubEvidence();
      unsubNotifications();
      unsubCommunications();
      unsubUserSettings();
    };
  }, [user, isAuthReady]);


  const arabicPlural = (count: number, singular: string, dual: string, plural: string, pluralTail: string) => {
    if (count === 0) return `0 ${plural}`;
    if (count === 1) return singular;
    if (count === 2) return dual;
    if (count >= 3 && count <= 10) return `${count} ${plural}`;
    return `${count} ${pluralTail}`;
  };

  const absenceCountLabel = (count: number) => {
    if (state.settings.language !== 'ar') return `${count} Absences`;
    if (count === 0) return 'لا يوجد غياب';
    if (count === 1) return 'غياب واحد';
    if (count === 2) return 'غيابان';
    if (count >= 3 && count <= 10) return `${count} غيابات`;
    return `${count} غياب`;
  };

  const lateCountLabel = (count: number) => {
    if (state.settings.language !== 'ar') return `${count} Late Arrivals`;
    return arabicPlural(count, 'حالة تأخر واحدة', 'حالتا تأخر', 'حالات تأخر', 'حالة تأخر');
  };

  const studentCountLabel = (count: number) => {
    return state.settings.language === 'ar' 
      ? arabicPlural(count, 'طالبة واحدة', 'طالبتان', 'طالبات', 'طالبة')
      : `${count} ${count === 1 ? 'Student' : 'Students'}`;
  };

  // Actions with Firebase
  const addClass = async (name: string, level: string) => {
    const teacherUid = user?.uid || DEFAULT_TEACHER_ID;
    try {
      await addDoc(collection(db, 'classes'), {
        name,
        level,
        teacherUid,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'classes');
    }
  };

  const addStudent = async (name: string, classId: string) => {
    const teacherUid = user?.uid || DEFAULT_TEACHER_ID;
    
    // Safety Guard: Duplicate Prevention
    const isDuplicate = state.students.some(s => s.name.trim() === name.trim() && s.classId === classId);
    if (isDuplicate) {
      if (activeTab === 'Students') {
        alert(state.settings.language === 'ar' ? 'هذه الطالبة مسجلة مسبقاً في هذا الفصل' : 'This student is already registered in this class');
      }
      return;
    }

    try {
      await addDoc(collection(db, 'students'), {
        name,
        classId,
        teacherUid,
        tags: [],
        notes: '',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'students');
    }
  };

  const addSession = async (title: string, date: string, classId: string, resources: Resource[] = []) => {
    const teacherUid = user?.uid || DEFAULT_TEACHER_ID;
    try {
      await addDoc(collection(db, 'sessions'), {
        title,
        date,
        classId,
        teacherUid,
        resources,
        isCompleted: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sessions');
    }
  };

  const addEvidence = async (title: string, description: string, category: string, date: string, fileName?: string, fileUrl?: string) => {
    const teacherUid = user?.uid || DEFAULT_TEACHER_ID;
    try {
      await addDoc(collection(db, 'evidence'), {
        title,
        description,
        category,
        date,
        fileName,
        fileUrl,
        teacherUid,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'evidence');
    }
  };

  const addCommunication = async (studentId: string, type: string, summary: string, outcome: string) => {
    const teacherUid = user?.uid || DEFAULT_TEACHER_ID;
    try {
      await addDoc(collection(db, 'communications'), {
        studentId,
        type,
        summary,
        outcome,
        date: new Date().toISOString(),
        teacherUid,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'communications');
    }
  };

  const updateStudentSeat = async (studentId: string, row: number, col: number) => {
    try {
      await updateDoc(doc(db, 'students', studentId), {
        seatPosition: { row, col }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'students');
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({
          ...prev,
          settings: { ...prev.settings, profilePic: reader.result as string }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEvidenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEvidence(prev => ({ ...prev, fileUrl: reader.result as string, fileName: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteEntity = async () => {
    if (!entityToDelete) return;
    setIsActionSaving(true);
    try {
      const { id, type } = entityToDelete;
      const collectionName = type.toLowerCase() + (type === 'CLASS' ? 'es' : 's');
      
      // Cascading Deletions
      if (type === 'CLASS') {
        // Delete students in this class
        const studentsInClass = state.students.filter(s => s.classId === id);
        for (const s of studentsInClass) {
          await deleteDoc(doc(db, 'students', s.id));
          // Delete attendance for these students
          const studentAttendance = state.sessionRecords.filter(r => r.studentId === s.id);
          for (const r of studentAttendance) await deleteDoc(doc(db, 'attendance', r.id));
        }
        // Delete sessions in this class
        const sessionsInClass = state.sessions.filter(s => s.classId === id);
        for (const s of sessionsInClass) {
          await deleteDoc(doc(db, 'sessions', s.id));
          // Delete attendance for these sessions
          const sessionAttendance = state.sessionRecords.filter(r => r.sessionId === s.id);
          for (const r of sessionAttendance) await deleteDoc(doc(db, 'attendance', r.id));
        }
      } else if (type === 'STUDENT') {
        // Delete attendance for this student
        const studentAttendance = state.sessionRecords.filter(r => r.studentId === id);
        for (const r of studentAttendance) await deleteDoc(doc(db, 'attendance', r.id));
      } else if (type === 'SESSION') {
        // Delete attendance for this session
        const sessionAttendance = state.sessionRecords.filter(r => r.sessionId === id);
        for (const r of sessionAttendance) await deleteDoc(doc(db, 'attendance', r.id));
      }

      await deleteDoc(doc(db, collectionName, id));
      setIsDeleteModalOpen(false);
      setEntityToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, entityToDelete.type.toLowerCase());
    } finally {
      setIsActionSaving(false);
    }
  };

  const editEntity = async (updatedData: any) => {
    if (!entityToEdit) return;
    try {
      const collectionName = entityToEdit.type.toLowerCase() + (entityToEdit.type === 'CLASS' ? 'es' : 's');
      await updateDoc(doc(db, collectionName, entityToEdit.id), {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      setIsEditModalOpen(false);
      setEntityToEdit(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, entityToEdit.type.toLowerCase());
    }
  };

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [isAddEvidenceModalOpen, setIsAddEvidenceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddCommunicationModalOpen, setIsAddCommunicationModalOpen] = useState(false);
  const [newCommunication, setNewCommunication] = useState({ studentId: '', type: 'Call', summary: '', outcome: '' });
  const [selectedClassIdForLayout, setSelectedClassIdForLayout] = useState<string | null>(null);
  const [selectedClassIdForAttendance, setSelectedClassIdForAttendance] = useState<string | null>(null);
  const [selectedSessionIdForAttendance, setSelectedSessionIdForAttendance] = useState<string | null>(null);
  const [entityToDelete, setEntityToDelete] = useState<{ id: string, type: 'CLASS' | 'STUDENT' | 'SESSION' | 'EVIDENCE', name: string } | null>(null);
  const [entityToEdit, setEntityToEdit] = useState<{ id: string, type: 'CLASS' | 'STUDENT' | 'SESSION' | 'EVIDENCE', data: any } | null>(null);
  const [newClass, setNewClass] = useState({ name: '', level: '' });
  const [newStudent, setNewStudent] = useState({ name: '', classId: '' });
  const [newSession, setNewSession] = useState({ title: '', date: new Date().toISOString().split('T')[0], classId: '', resources: [] as Resource[] });
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [newResource, setNewResource] = useState({ title: '', type: 'Link' as const, url: '' });
  const [newEvidence, setNewEvidence] = useState({ title: '', description: '', category: 'General', date: new Date().toISOString().split('T')[0], fileUrl: '', fileName: '' });

  // Export Functions
  const exportToExcel = () => {
    try {
      const isAr = state.settings.language === 'ar';
      const headerData = [
        { [isAr ? 'المدرسة' : 'School']: state.settings.schoolName },
        { [isAr ? 'المعلمة' : 'Teacher']: state.settings.teacherName },
        { [isAr ? 'المادة' : 'Subject']: state.settings.subjectName },
        {} // Empty row
      ];

      const studentsData = state.students.map(s => ({
        [isAr ? 'اسم الطالب' : 'Name']: s.name,
        [isAr ? 'الفصل' : 'Class']: state.classes.find(c => c.id === s.classId)?.name || 'N/A',
        [isAr ? 'نسبة الحضور' : 'Attendance Rate']: `${getStudentStats(s.id, state.sessionRecords).attendanceRate.toFixed(1)}%`,
        [isAr ? 'متوسط المشاركة' : 'Avg Participation']: getStudentStats(s.id, state.sessionRecords).avgParticipation.toFixed(1),
        [isAr ? 'الاتجاه' : 'Trend']: getStudentTrend(s.id, state.sessionRecords)
      }));

      const ws = XLSX.utils.json_to_sheet([...headerData, ...studentsData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isAr ? "الطلاب" : "Students");
      XLSX.writeFile(wb, `Students_Report_${new Date().toLocaleDateString()}.xlsx`);
    } catch (error) {
      console.error("Excel Export Error:", error);
      alert(state.settings.language === 'ar' ? 'فشل تصدير ملف Excel' : 'Failed to export Excel file');
    }
  };

  const exportToAdmin = () => {
    // We switch to window.print() for high-fidelity Arabic support
    window.print();
  };

  const bulkGrade = (sessionId: string, grade: number) => {
    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) return;
    const classStudents = state.students.filter(s => s.classId === session.classId);
    classStudents.forEach(student => {
      const record = state.sessionRecords.find(r => r.sessionId === sessionId && r.studentId === student.id);
      handleRecordAttendance(sessionId, student.id, record?.attendance || 'Present', record?.participation || 0, record?.isDistinguished, grade);
    });
  };

  const exportToPDF = () => {
    // We switch to window.print() for high-fidelity Arabic support
    // and beautiful template rendering.
    window.print();
  };

  const exportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `TeacherApp_Backup_${new Date().toLocaleDateString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Derived Data
  const filteredStudents = useMemo(() => {
    return state.students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [state.students, searchQuery]);

  const filteredSessions = useMemo(() => {
    return state.sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [state.sessions, searchQuery]);

  const filteredEvidence = useMemo(() => {
    return state.evidence.filter(e => 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [state.evidence, searchQuery]);

  const evidenceSummary = useMemo(() => {
    return {
      total: state.evidence.length,
      categories: [...new Set(state.evidence.map(e => e.category))].length,
      latest: state.evidence[state.evidence.length - 1]?.title || (state.settings.language === 'ar' ? 'لا يوجد' : 'None')
    };
  }, [state.evidence, state.settings.language]);

  const attendanceStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const records = state.sessionRecords;
    const todaySessions = state.sessions.filter(s => s.date.split('T')[0] === today);
    const todaySessionIds = todaySessions.map(s => s.id);
    const todayRecords = records.filter(r => todaySessionIds.includes(r.sessionId));
    
    const attendanceTodayVal = todayRecords.length > 0 
      ? (todayRecords.filter(r => r.attendance === 'Present' || r.attendance === 'Late').length / todayRecords.length) * 100 
      : 0;

    const totalAbsences = records.filter(r => r.attendance === 'Absent').length;
    const lateCases = records.filter(r => r.attendance === 'Late').length;
    const avgParticipation = records.length > 0 
      ? records.reduce((acc, r) => acc + (r.participation || 0), 0) / records.length 
      : 0;

    return {
      attendanceToday: todayRecords.length > 0 ? `${attendanceTodayVal.toFixed(1)}%` : '---',
      totalAbsences,
      lateCases,
      avgParticipation: avgParticipation.toFixed(1)
    };
  }, [state.sessionRecords, state.sessions]);

  const dashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const totalUsers = state.students.length;
    const totalSessions = state.sessions.length;
    const records = state.sessionRecords;
    
    // Calculate Today's rate specifically
    const todaySessions = state.sessions.filter(s => s.date.split('T')[0] === today);
    const todaySessionIds = todaySessions.map(s => s.id);
    const todayRecords = records.filter(r => todaySessionIds.includes(r.sessionId));
    
    const attendanceTodayVal = todayRecords.length > 0 
      ? (todayRecords.filter(r => r.attendance === 'Present' || r.attendance === 'Late').length / todayRecords.length) * 100 
      : (records.length > 0 ? (records.filter(r => r.attendance === 'Present' || r.attendance === 'Late').length / records.length) * 100 : 0);
    
    return {
      totalUsers: totalUsers.toLocaleString(),
      totalSessions: totalSessions.toLocaleString(),
      attendanceRate: `${attendanceTodayVal.toFixed(1)}%`
    };
  }, [state.students, state.sessions, state.sessionRecords]);

  const chartData = useMemo(() => {
    const isAr = state.settings.language === 'ar';
    const dayNames = isAr 
      ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] 
      : ['SUN', 'MON', 'TUE', 'WED', 'THU'];
    
    return dayNames.map((day, idx) => {
      // Map days of week (Sunday=0, etc.)
      const dayIndex = (idx + 7) % 7; // Adjusting for school week starting Sunday
      
      const relevantSessions = state.sessions.filter(s => {
        const sessionDate = new Date(s.date);
        return sessionDate.getDay() === dayIndex;
      });

      const sessionIds = relevantSessions.map(s => s.id);
      const dayRecords = state.sessionRecords.filter(r => sessionIds.includes(r.sessionId));
      
      let value = 0;
      if (dayRecords.length > 0) {
        // Average participation (0-5) scaled to 0-100
        const avgParticipation = dayRecords.reduce((acc, r) => acc + (r.participation || 0), 0) / dayRecords.length;
        value = (avgParticipation / 5) * 100;
      }
      // Value remains 0 if no records, providing honest reporting
      
      return { name: day, value: Math.floor(value) };
    });
  }, [state.settings.language, state.sessions, state.sessionRecords]);

  const handleRecordAttendance = async (sessionId: string, studentId: string, attendance: 'Present' | 'Absent' | 'Late', participation: number, isDistinguished: boolean = false, grade?: number) => {
    const teacherUid = user?.uid || DEFAULT_TEACHER_ID;
    
    // Logic Guard: Validate range 0-5
    const safeParticipation = Math.max(0, Math.min(5, participation));
    
    setIsActionSaving(true);
    try {
      const existingRecord = state.sessionRecords.find(r => r.sessionId === sessionId && r.studentId === studentId);
      if (existingRecord) {
        await updateDoc(doc(db, 'attendance', existingRecord.id), {
          attendance,
          participation: safeParticipation,
          isDistinguished,
          grade: grade !== undefined ? grade : (existingRecord.grade || 0),
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'attendance'), {
          sessionId,
          studentId,
          attendance,
          participation: safeParticipation,
          isDistinguished,
          grade: grade || 0,
          teacherUid,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'attendance');
    } finally {
      // Small delay for feedback visibility
      setTimeout(() => setIsActionSaving(false), 600);
    }
  };

  if (!isAuthReady) {
    return (
      <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center ${isDarkMode ? 'bg-black' : 'bg-apple-bg'}`}>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-apple-blue border-t-transparent rounded-full mb-4"
        />
        <p className="text-apple-gray font-bold uppercase tracking-widest text-[10px]">
          {state.settings.language === 'ar' ? 'جاري التحقق من الهوية...' : 'Authenticating...'}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-6 ${isDarkMode ? 'bg-black text-white' : 'bg-apple-bg text-slate-900'}`}>
        <div className="max-w-md w-full text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-10 squircle-2xl border ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-xl'}`}
          >
            <div className="w-20 h-20 bg-apple-blue squircle-xl flex items-center justify-center shadow-lg mx-auto mb-8">
              <Sparkles className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">سهام</h1>
            <p className="text-apple-gray font-bold uppercase tracking-widest text-[10px] mb-10">Platform</p>
            
            <h2 className="text-xl font-bold mb-6">
              {state.settings.language === 'ar' ? 'مرحباً بك في منصة سهام' : 'Welcome to Seham Platform'}
            </h2>
            <p className="text-sm text-apple-gray mb-10 leading-relaxed font-medium">
              {state.settings.language === 'ar' 
                ? 'المنصة التعليمية الأذكى لإدارة طالباتك وصفوفك المدرسية بكل سهولة واحترافية.' 
                : 'The smartest educational platform to manage your students and classes with ease and professionalism.'}
            </p>
            
            <button 
              onClick={signInWithGoogle}
              className="w-full py-4 squircle-lg bg-apple-blue text-white font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-apple-blue/20"
            >
              <Globe className="w-5 h-5" />
              {state.settings.language === 'ar' ? 'تسجيل الدخول عبر Google' : 'Sign in with Google'}
            </button>
          </motion.div>
          <p className="mt-8 text-[10px] font-bold text-apple-gray uppercase tracking-widest">
            {state.settings.language === 'ar' ? 'جميع الحقوق محفوظة © 2026' : 'All rights reserved © 2026'}
          </p>
        </div>
      </div>
    );
  }

  if (!state.settings.isOnboardingComplete) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-sans p-6 ${isDarkMode ? 'bg-black' : 'bg-[#f2f2f7]'}`}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className={`p-10 squircle-2xl max-w-2xl w-full border shadow-2xl ${isDarkMode ? 'bg-apple-dark-card border-white/5' : 'bg-white border-black/5'}`}
        >
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-apple-blue squircle-xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-apple-blue/20">
              <Sparkles className="text-white w-10 h-10" />
            </div>
            <h2 className={`text-3xl font-extrabold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {state.settings.language === 'ar' ? 'مرحباً بك في نظامك الذكي' : 'Welcome to Your Smart System'}
            </h2>
            <p className="text-apple-gray font-bold text-sm uppercase tracking-widest">
              {state.settings.language === 'ar' ? 'لنقم بإعداد بيئتك التعليمية' : 'Let\'s set up your educational environment'}
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                  {state.settings.language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <input 
                  type="text"
                  value={state.settings.teacherName || ''}
                  onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, teacherName: e.target.value } }))}
                  placeholder={state.settings.language === 'ar' ? 'مثلاً: أمل الحربي' : 'e.g., Amal Al-Harbi'}
                  className={`w-full p-4 squircle-lg border focus:ring-2 focus:ring-apple-blue outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-black/5'}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                  {state.settings.language === 'ar' ? 'اسم المدرسة' : 'School Name'}
                </label>
                <input 
                  type="text"
                  value={state.settings.schoolName || ''}
                  onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, schoolName: e.target.value } }))}
                  placeholder={state.settings.language === 'ar' ? 'مثلاً: المتوسطة الثالثة' : 'e.g., 3rd Middle School'}
                  className={`w-full p-4 squircle-lg border focus:ring-2 focus:ring-apple-blue outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-black/5'}`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                  {state.settings.language === 'ar' ? 'المادة الدراسية' : 'Subject Name'}
                </label>
                <input 
                  type="text"
                  value={state.settings.subjectName || ''}
                  onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, subjectName: e.target.value } }))}
                  placeholder={state.settings.language === 'ar' ? 'مثلاً: الرياضيات' : 'e.g., Mathematics'}
                  className={`w-full p-4 squircle-lg border focus:ring-2 focus:ring-apple-blue outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-black/5'}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step 1: Teacher Gender */}
              <div>
                <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                  {state.settings.language === 'ar' ? 'أنا...' : 'I am a...'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, gender: 'female' } }))}
                    className={`p-4 squircle-lg border-2 transition-all flex flex-col items-center gap-2 ${state.settings.gender === 'female' ? 'border-apple-blue bg-apple-blue/5' : 'border-transparent bg-slate-50 dark:bg-white/5'}`}
                  >
                    <UserIcon className={`w-6 h-6 ${state.settings.gender === 'female' ? 'text-apple-blue' : 'text-apple-gray'}`} />
                    <span className={`text-[10px] font-bold ${state.settings.gender === 'female' ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-apple-gray'}`}>
                      {state.settings.language === 'ar' ? 'معلمة' : 'Female'}
                    </span>
                  </button>
                  <button 
                    onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, gender: 'male' } }))}
                    className={`p-4 squircle-lg border-2 transition-all flex flex-col items-center gap-2 ${state.settings.gender === 'male' ? 'border-apple-blue bg-apple-blue/5' : 'border-transparent bg-slate-50 dark:bg-white/5'}`}
                  >
                    <UserIcon className={`w-6 h-6 ${state.settings.gender === 'male' ? 'text-apple-blue' : 'text-apple-gray'}`} />
                    <span className={`text-[10px] font-bold ${state.settings.gender === 'male' ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-apple-gray'}`}>
                      {state.settings.language === 'ar' ? 'معلم' : 'Male'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Step 2: Student Gender */}
              <div>
                <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                  {state.settings.language === 'ar' ? 'أدرس...' : 'I teach...'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['girls', 'boys', 'mixed'] as const).map(type => (
                    <button 
                      key={type}
                      onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, studentGender: type } }))}
                      className={`p-4 squircle-lg border-2 transition-all flex flex-col items-center gap-2 ${state.settings.studentGender === type ? 'border-apple-blue bg-apple-blue/5' : 'border-transparent bg-slate-50 dark:bg-white/5'}`}
                    >
                      <Users className={`w-6 h-6 ${state.settings.studentGender === type ? 'text-apple-blue' : 'text-apple-gray'}`} />
                      <span className={`text-[10px] font-bold ${state.settings.studentGender === type ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-apple-gray'}`}>
                        {type === 'girls' ? (state.settings.language === 'ar' ? 'طالبات' : 'Girls') : 
                         type === 'boys' ? (state.settings.language === 'ar' ? 'طلاب' : 'Boys') : 
                         (state.settings.language === 'ar' ? 'مختلط' : 'Mixed')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Educational Level */}
            <div>
              <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                {state.settings.language === 'ar' ? 'المرحلة الدراسية' : 'Educational Level'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['primary', 'middle', 'high', 'all'] as const).map(level => (
                  <button 
                    key={level}
                    onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, educationalLevel: level } }))}
                    className={`p-3 squircle-md border-2 transition-all flex flex-col items-center gap-1 ${state.settings.educationalLevel === level ? 'border-apple-blue bg-apple-blue/5' : 'border-transparent bg-slate-50 dark:bg-white/5'}`}
                  >
                    <BookOpen className={`w-5 h-5 ${state.settings.educationalLevel === level ? 'text-apple-blue' : 'text-apple-gray'}`} />
                    <span className={`text-[9px] font-bold ${state.settings.educationalLevel === level ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-apple-gray'}`}>
                      {level === 'primary' ? (state.settings.language === 'ar' ? 'ابتدائي' : 'Primary') : 
                       level === 'middle' ? (state.settings.language === 'ar' ? 'متوسط' : 'Middle') : 
                       level === 'high' ? (state.settings.language === 'ar' ? 'ثانوي' : 'High') :
                       (state.settings.language === 'ar' ? 'الكل' : 'All')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => {
                if (!state.settings.teacherName || !state.settings.schoolName) {
                  alert(state.settings.language === 'ar' ? 'يرجى إدخال الاسم واسم المدرسة للمتابعة' : 'Please enter name and school to continue');
                } else {
                  setState(prev => ({ ...prev, settings: { ...prev.settings, isOnboardingComplete: true } }));
                }
              }}
              className="w-full bg-apple-blue text-white py-5 squircle-xl text-sm uppercase tracking-widest font-bold shadow-xl shadow-apple-blue/20 active:scale-95 transition-all mt-4"
            >
              {state.settings.language === 'ar' ? 'ابدأ الاستخدام' : 'Get Started'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (state.isLocked) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-sans ${isDarkMode ? 'bg-black' : 'bg-[#f2f2f7]'}`}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`p-10 squircle-xl text-center max-w-sm w-full border ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}
        >
          <div className="w-20 h-20 bg-apple-blue squircle-xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-apple-blue/20">
            <Lock className="text-white w-10 h-10" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {state.settings.language === 'ar' ? 'النظام مغلق' : 'System Locked'}
          </h2>
          <p className="text-apple-gray font-bold text-sm mb-8">
            {state.settings.language === 'ar' ? 'أدخل رمز PIN للمتابعة' : 'Enter PIN to continue'}
          </p>
          
          <div className="flex gap-4 justify-center mb-10">
            {[...Array(state.settings.pin.length)].map((_, i) => (
              <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${pinInput.length > i ? 'bg-apple-blue scale-110' : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`} />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((num) => (
              <button
                key={num}
                onClick={() => {
                  if (num === 'C') setPinInput('');
                  else if (num === 'OK') handleUnlock();
                  else if (pinInput.length < state.settings.pin.length) setPinInput(prev => prev + num);
                }}
                className={`w-full aspect-square squircle-lg flex items-center justify-center font-bold text-xl transition-all active:scale-90 ${
                  num === 'OK' 
                  ? 'bg-apple-blue text-white shadow-lg shadow-apple-blue/20' 
                  : (isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-50 text-slate-900 hover:bg-slate-100')
                }`}
              >
                {num === 'C' ? <RefreshCw className="w-6 h-6" /> : num === 'OK' ? <CheckCircle2 className="w-6 h-6" /> : num}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-apple-bg text-slate-900'} flex font-sans overflow-hidden transition-colors duration-500`} dir={state.settings.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        no-print
        fixed lg:static inset-y-0 ${state.settings.language === 'ar' ? 'right-0' : 'left-0'} 
        w-72 p-6 flex flex-col transition-all duration-500 z-50
        sidebar-vibrancy
        transition-transform duration-300 lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : (state.settings.language === 'ar' ? 'translate-x-full' : '-translate-x-full')}
      `}>
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-apple-blue squircle-md flex items-center justify-center shadow-lg">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <div>
              <span className={`block font-bold text-lg tracking-tight leading-none truncate max-w-[140px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {state.settings.teacherName}
              </span>
              <span className="text-[9px] font-bold text-apple-gray uppercase tracking-widest truncate max-w-[140px] block mt-1">
                {state.settings.schoolName}
              </span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-apple-gray">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          <p className="text-[11px] font-semibold text-apple-gray uppercase tracking-widest mb-4 px-4 opacity-70">
            {state.settings.language === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
          </p>
          {[
            { name: 'Dashboard', icon: LayoutDashboard, label: state.settings.language === 'ar' ? 'الرئيسية' : 'Dashboard' },
            { name: 'Attendance', icon: CheckCircle2, label: state.settings.language === 'ar' ? 'الحضور والغياب' : 'Attendance' },
            { name: 'Calendar', icon: Calendar, label: state.settings.language === 'ar' ? 'التقويم' : 'Calendar' },
            { name: 'Analytics', icon: BarChart3, label: state.settings.language === 'ar' ? 'التحليلات' : 'Analytics' },
            { name: 'Students', icon: Users, label: state.settings.language === 'ar' ? 'الطلاب' : 'Students' },
            { name: 'Sessions', icon: History, label: state.settings.language === 'ar' ? 'الحصص' : 'Sessions' },
            { name: 'Evidence', icon: Award, label: state.settings.language === 'ar' ? 'شواهد الأداء' : 'Evidence' },
            { name: 'AI Assistant', icon: Sparkles, label: state.settings.language === 'ar' ? 'المساعد الذكي' : 'AI Assistant' },
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setActiveTab(item.name);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 squircle-md transition-all duration-200 group relative ${
                activeTab === item.name 
                ? (isDarkMode 
                    ? 'bg-white/10 text-white' 
                    : 'bg-white shadow-sm text-apple-blue')
                : 'text-apple-gray hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.name ? 'text-apple-blue' : 'text-apple-gray'}`} />
              <span className={`text-[15px] ${activeTab === item.name ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
            </button>
          ))}
          
          <div className="pt-8">
            <p className="text-[11px] font-semibold text-apple-gray uppercase tracking-widest mb-4 px-4 opacity-70">
              {state.settings.language === 'ar' ? 'النظام' : 'System'}
            </p>
            <button 
              onClick={() => {
                setActiveTab('Settings');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 squircle-md transition-all duration-200 group ${
                activeTab === 'Settings' 
                ? (isDarkMode 
                    ? 'bg-white/10 text-white' 
                    : 'bg-white shadow-sm text-apple-blue')
                : 'text-apple-gray hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Settings className={`w-5 h-5 ${activeTab === 'Settings' ? 'text-apple-blue' : 'text-apple-gray'}`} />
              <span className={`text-[15px] ${activeTab === 'Settings' ? 'font-semibold' : 'font-medium'}`}>{state.settings.language === 'ar' ? 'الإعدادات' : 'Settings'}</span>
            </button>
          </div>
        </nav>

        <div className={`mt-auto p-4 squircle-lg border transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">
              {state.settings.language === 'ar' ? 'أمان النظام' : 'Security'}
            </p>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <button 
            onClick={() => setState(prev => ({ ...prev, isLocked: true }))}
            className="w-full py-3 squircle-md font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 bg-apple-blue text-white shadow-lg shadow-apple-blue/20"
          >
            <Lock className="w-3 h-3" />
            {state.settings.language === 'ar' ? 'قفل النظام' : 'Lock System'}
          </button>
          <button 
            onClick={logout}
            className={`w-full mt-2 py-3 squircle-md font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border ${isDarkMode ? 'bg-white/5 border-white/5 text-rose-400 hover:bg-rose-500/10' : 'bg-slate-50 border-black/5 text-rose-600 hover:bg-rose-50'}`}
          >
            <LogOut className="w-3 h-3" />
            {state.settings.language === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative pb-20 w-full">
        {/* Live Tools Floating Menu */}
        <div className={`fixed bottom-8 ${state.settings.language === 'ar' ? 'left-8' : 'right-8'} z-50`}>
          <AnimatePresence>
            {isLiveToolsOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className={`mb-4 p-6 squircle-xl w-64 transition-all duration-500 border ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-xl'}`}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[10px] uppercase tracking-widest text-apple-blue">
                      {state.settings.language === 'ar' ? 'أدوات الحصة' : 'Class Tools'}
                    </h4>
                    <Zap className="w-4 h-4 text-apple-orange" />
                  </div>

                  {/* Random Picker */}
                  <button 
                    onClick={pickRandomStudent}
                    className={`w-full p-4 squircle-md flex items-center gap-3 transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <RefreshCw className="w-5 h-5 text-emerald-500" />
                    <div className="text-left">
                      <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{state.settings.language === 'ar' ? 'اختيار عشوائي' : 'Random Picker'}</p>
                      <p className="text-[9px] font-bold text-apple-gray">{state.settings.language === 'ar' ? 'اختر طالباً للإجابة' : 'Pick a student'}</p>
                    </div>
                  </button>

                  {/* Timer */}
                  <div className={`p-4 squircle-md ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <Timer className="w-5 h-5 text-rose-500" />
                      <span className={`text-lg font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setTimerSeconds(300);
                          setIsTimerRunning(true);
                        }}
                        className="flex-1 py-2 squircle-md bg-apple-blue text-white text-[10px] font-bold"
                      >
                        5m
                      </button>
                      <button 
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={`flex-1 py-2 squircle-md text-white text-[10px] font-bold ${isTimerRunning ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      >
                        {isTimerRunning ? (state.settings.language === 'ar' ? 'إيقاف' : 'Stop') : (state.settings.language === 'ar' ? 'بدء' : 'Start')}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setIsLiveToolsOpen(!isLiveToolsOpen)}
            className={`w-16 h-16 squircle-xl flex items-center justify-center shadow-2xl transition-all active:scale-90 ${isLiveToolsOpen ? 'bg-rose-500 rotate-45' : 'bg-blue-600'} text-white`}
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        <AnimatePresence>
          {randomStudent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
            >
              <div className="bg-apple-blue p-12 squircle-2xl shadow-2xl text-center text-white border border-white/20">
                <Award className="w-20 h-20 mx-auto mb-6 animate-bounce" />
                <h2 className="text-4xl font-bold mb-2">{randomStudent.name}</h2>
                <p className="text-xl font-bold opacity-80">{state.settings.language === 'ar' ? 'أنت المختار للإجابة!' : 'You are chosen to answer!'}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Top Bar */}
            <header className={`flex flex-col md:flex-row justify-between items-center gap-6 mb-10 p-4 squircle-xl transition-all duration-500 ${isDarkMode ? 'bg-white/5 border border-white/5' : 'bg-white border border-black/5 shadow-sm'}`}>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className={`lg:hidden p-3 squircle-md transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                </button>
                <div className="relative flex-1 md:w-[400px] group">
                  <Search className={`absolute ${state.settings.language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-apple-gray group-focus-within:text-apple-blue transition-colors`} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={state.settings.language === 'ar' ? 'ابحث عن أي شيء...' : 'Search everything...'}
                    className={`w-full py-3 ${state.settings.language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} squircle-md focus:outline-none text-sm font-medium transition-all border-2 ${
                      isDarkMode 
                      ? 'bg-white/5 border-transparent focus:border-apple-blue/50 text-white' 
                      : 'bg-slate-100 border-transparent focus:border-apple-blue/20 text-slate-800'
                    }`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between w-full md:w-auto gap-6">
                <div className={`hidden xl:flex items-center gap-4 px-6 py-2 squircle-lg border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-black/5'}`}>
                  <div className={state.settings.language === 'ar' ? 'text-right' : 'text-left'}>
                    <p className="text-[11px] font-bold text-apple-blue uppercase tracking-wider mb-0.5">{timeString}</p>
                    <p className="text-[10px] font-medium text-apple-gray">{hijriDate} هـ</p>
                  </div>
                  <div className="w-px h-6 bg-black/10 dark:bg-white/10" />
                  <div className={state.settings.language === 'ar' ? 'text-right' : 'text-left'}>
                    <p className={`text-[11px] font-bold tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{gregorianDate}</p>
                  </div>
                  <Calendar className="w-4 h-4 text-apple-gray" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button 
                      onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                      className={`p-3 squircle-md transition-all relative group ${isDarkMode ? 'bg-white/10 text-apple-gray hover:text-white' : 'bg-slate-100 text-apple-gray hover:text-apple-blue'}`}
                    >
                      <Bell className="w-5 h-5" />
                      {state.notifications.some(n => !n.isRead) && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-black" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isNotificationsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className={`absolute top-full ${state.settings.language === 'ar' ? 'left-0' : 'right-0'} mt-4 w-80 z-50 p-4 squircle-xl border shadow-2xl ${isDarkMode ? 'bg-apple-dark-card border-white/10' : 'bg-white border-black/5'}`}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {state.settings.language === 'ar' ? 'التنبيهات الذكية' : 'Smart Notifications'}
                            </h4>
                            {state.notifications.length > 0 && (
                              <button 
                                onClick={async () => {
                                  for (const n of state.notifications) {
                                    await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                                  }
                                }}
                                className="text-[9px] font-bold text-apple-blue uppercase tracking-widest hover:underline"
                              >
                                {state.settings.language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
                              </button>
                            )}
                          </div>
                          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                            {state.notifications.length === 0 ? (
                              <p className="text-[10px] text-apple-gray font-bold text-center py-8 uppercase tracking-widest">
                                {state.settings.language === 'ar' ? 'لا توجد تنبيهات جديدة' : 'No new notifications'}
                              </p>
                            ) : (
                              state.notifications.map(n => (
                                <div key={n.id} className={`p-3 squircle-lg border transition-all ${n.isRead ? 'opacity-50' : (isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5')}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${n.type === 'warning' ? 'bg-rose-500' : 'bg-apple-blue'}`} />
                                    <p className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{n.title}</p>
                                  </div>
                                  <p className="text-[9px] font-medium text-apple-gray leading-relaxed">{n.message}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className={`flex items-center gap-3 ${state.settings.language === 'ar' ? 'pr-6 border-r' : 'pl-6 border-l'} border-black/5 dark:border-white/5`}>
                    <div className={state.settings.language === 'ar' ? 'text-left' : 'text-right'}>
                      <p className={`text-sm font-bold leading-none mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{state.settings.teacherName}</p>
                      <p className="text-[10px] font-bold text-apple-blue uppercase tracking-widest">
                        {state.settings.gender === 'male' 
                          ? (state.settings.language === 'ar' ? 'معلم' : 'Teacher')
                          : (state.settings.language === 'ar' ? 'معلمة' : 'Teacher')} • {state.settings.subjectName}
                      </p>
                    </div>
                    <div className="relative group">
                      <div className={`w-10 h-10 squircle-md overflow-hidden relative active:scale-95 transition-all duration-300 border-2 ${isDarkMode ? 'border-white/10' : 'border-white shadow-sm'}`}>
                        <img 
                          src={state.settings.profilePic || "https://picsum.photos/seed/seham/100/100"} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer" 
                        />
                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <Camera className="w-3 h-3 text-white" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </header>

        {activeTab === 'Dashboard' && (
          <>
            <section className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h1 className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {state.settings.language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                </h1>
                <p className="text-sm font-medium text-apple-gray">
                  {state.settings.language === 'ar' ? 'مرحباً بك مجدداً، إليك ملخص الأداء التعليمي.' : 'Welcome back, here is your educational performance summary.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => {
                    setNewClass({ name: '', level: '' });
                    setIsAddClassModalOpen(true);
                  }}
                  className="apple-btn-primary flex items-center gap-2 text-xs uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" />
                  {state.settings.language === 'ar' ? 'إضافة فصل' : 'Add Class'}
                </button>
                <button 
                  onClick={() => {
                    if (state.classes.length === 0) {
                      alert(state.settings.language === 'ar' ? 'يرجى إضافة فصل أولاً' : 'Please add a class first');
                      return;
                    }
                    setNewSession({ title: '', date: new Date().toISOString().split('T')[0], classId: state.classes[0].id });
                    setIsAddSessionModalOpen(true);
                  }}
                  className="apple-btn-secondary flex items-center gap-2 text-xs uppercase tracking-widest"
                >
                  <History className="w-4 h-4" />
                  {state.settings.language === 'ar' ? 'تحضير حصة' : 'Add Session'}
                </button>
              </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-10">
              <StatCard 
                title={state.settings.language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'} 
                value={studentCountLabel(state.students.length)} 
                icon={Users} 
                color="bg-blue-600" 
                isDarkMode={isDarkMode}
              />
              <StatCard 
                title={state.settings.language === 'ar' ? 'إجمالي الحصص' : 'Total Sessions'} 
                value={dashboardStats.totalSessions} 
                icon={History} 
                color="bg-emerald-600" 
                isDarkMode={isDarkMode}
              />
              <StatCard 
                title={state.settings.language === 'ar' ? 'نسبة الحضور' : 'Attendance Rate'} 
                value={dashboardStats.attendanceRate} 
                icon={TrendingUp} 
                color="bg-amber-600" 
                isDarkMode={isDarkMode}
              />
              <StatCard 
                title={state.settings.language === 'ar' ? 'شواهد الأداء' : 'Evidence Count'} 
                value={state.evidence.length} 
                icon={Award} 
                color="bg-rose-600" 
                isDarkMode={isDarkMode}
              />
            </div>

            {/* AI Insight Bento Box */}
            <div className={`p-8 squircle-xl flex flex-col md:flex-row gap-8 transition-all duration-500 mb-10 ${
              isDarkMode 
              ? 'bg-apple-blue shadow-2xl shadow-apple-blue/20' 
              : 'bg-apple-blue shadow-xl shadow-apple-blue/20'
            } text-white`}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6" />
                  <h2 className="font-bold text-lg">
                    {state.settings.language === 'ar' ? 'رؤية ذكية' : 'AI Insight'}
                  </h2>
                </div>
                <p className="text-[15px] font-medium opacity-90 leading-relaxed">
                  {state.settings.language === 'ar' 
                    ? 'بناءً على بيانات الأسبوع الماضي، هناك تحسن بنسبة 12% في تفاعل الطلاب خلال الحصص المسائية. ننصح بالتركيز على الأنشطة الجماعية لتعزيز هذا التقدم.' 
                    : 'Based on last week\'s data, there is a 12% improvement in student interaction during afternoon sessions. We recommend focusing on group activities to sustain this progress.'}
                </p>
              </div>
              <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                <div className="p-4 squircle-md bg-white/10 backdrop-blur-md border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest opacity-70">{state.settings.language === 'ar' ? 'الأداء العام' : 'Overall Performance'}</span>
                    <span className="text-xs font-bold">88%</span>
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-[88%] rounded-full" />
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('AI Assistant')}
                  className="w-full py-3 squircle-md bg-white text-apple-blue font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-colors"
                >
                  {state.settings.language === 'ar' ? 'استكشف المزيد' : 'Explore More'}
                </button>
              </div>
            </div>

            {/* Classes List Section */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {state.settings.language === 'ar' ? 'الفصول الدراسية' : 'Your Classes'}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {state.classes.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(cls => (
                  <div key={cls.id} className={`p-6 squircle-xl relative group transition-all duration-300 ${isDarkMode ? 'bg-apple-dark-card border border-white/5 shadow-2xl' : 'bg-white border border-black/5 shadow-sm hover:shadow-md'}`}>
                    <div className="absolute top-4 left-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEntityToEdit({ id: cls.id, type: 'CLASS', data: { name: cls.name, level: cls.level } });
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 text-apple-blue hover:bg-apple-blue/10 squircle-md transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setEntityToDelete({ id: cls.id, type: 'CLASS', name: cls.name });
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 squircle-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="w-12 h-12 squircle-md bg-apple-blue/10 flex items-center justify-center text-apple-blue mb-4">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h3 className={`font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{cls.name}</h3>
                    <p className="text-[11px] font-semibold text-apple-gray uppercase tracking-widest">{cls.level}</p>
                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex justify-between items-center">
                      <span className="text-[11px] font-bold text-apple-gray uppercase">
                        {studentCountLabel(state.students.filter(s => s.classId === cls.id).length)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chart Section */}
              <div className={`lg:col-span-2 p-8 squircle-xl transition-all duration-500 ${
                isDarkMode 
                ? 'bg-apple-dark-card border border-white/5 shadow-2xl' 
                : 'bg-white border border-black/5 shadow-sm'
              }`}>
                <div className="flex justify-between items-center mb-8">
                  <h2 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {state.settings.language === 'ar' ? 'نظرة عامة على الأداء' : 'Performance Overview'}
                  </h2>
                  <div className={`flex p-1 squircle-md ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <button className="px-4 py-1.5 squircle-sm text-[11px] font-bold text-apple-gray">
                      {state.settings.language === 'ar' ? 'أسبوعي' : 'Weekly'}
                    </button>
                    <button className="px-4 py-1.5 squircle-sm text-[11px] font-bold bg-apple-blue text-white shadow-sm">
                      {state.settings.language === 'ar' ? 'شهري' : 'Monthly'}
                    </button>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: isDarkMode ? '#8E8E93' : '#8E8E93', fontSize: 10, fontWeight: 600 }} 
                        dy={10}
                      />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ 
                          backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF', 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: isDarkMode ? '#fff' : '#000'
                        }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={32}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 3 ? '#007AFF' : (isDarkMode ? '#3A3A3C' : '#E5E5EA')} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side Cards */}
              <div className="space-y-8">
                <div className={`p-8 squircle-xl transition-all duration-500 border ${
                  isDarkMode 
                  ? 'bg-apple-dark-card border-white/5 shadow-2xl' 
                  : 'bg-white border-black/5 shadow-sm'
                }`}>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {state.settings.language === 'ar' ? 'تنبيهات النظام' : 'System Alerts'}
                    </h2>
                    <div className="w-2 h-2 rounded-full bg-apple-blue animate-pulse" />
                  </div>
                  <div className="space-y-6">
                    {(!state.students || state.students.filter(s => s && s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) ? (
                      <p className="text-[11px] font-bold text-apple-gray text-center py-8 uppercase tracking-widest opacity-50">
                        {state.settings.language === 'ar' ? 'لا توجد تنبيهات حالياً' : 'No alerts currently'}
                      </p>
                    ) : (
                      state.students.filter(s => s && s.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3).map((student) => {
                        const stats = getStudentStats(student.id, state.sessionRecords);
                        const trend = getStudentTrend(student.id, state.sessionRecords);
                        return (
                          <div key={student.id} className="flex items-center gap-4 group">
                            <div className={`w-12 h-12 squircle-md flex items-center justify-center transition-all duration-300 ${trend === 'Declining' ? 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white' : 'bg-apple-blue/10 text-apple-blue group-hover:bg-apple-blue group-hover:text-white'}`}>
                              <AlertCircle className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.name}</p>
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${trend === 'Declining' ? 'text-rose-500' : 'text-apple-gray'}`}>
                                {trend === 'Declining' 
                                  ? (state.settings.language === 'ar' ? 'تراجع في المستوى' : 'Declining performance') 
                                  : (trend === 'Improving' 
                                      ? (state.settings.language === 'ar' ? 'تحسن ملحوظ' : 'Improving performance')
                                      : (state.settings.language === 'ar' ? 'أداء مستقر' : 'Stable performance'))}
                              </p>
                            </div>
                            <button 
                              onClick={() => {
                                const msg = generateParentMessage(student.name, stats, state.settings.language);
                                const encodedMsg = encodeURIComponent(msg);
                                window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
                              }}
                              className={`p-3 squircle-md transition-all ${isDarkMode ? 'bg-white/5 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-slate-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className={`p-8 squircle-xl shadow-2xl relative overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-apple-dark-card border border-white/5' : 'bg-apple-blue text-white'}`}>
                  <div className="relative z-10">
                    <h2 className={`font-bold text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-white'}`}>
                      {state.settings.language === 'ar' ? 'الهدف الأسبوعي' : 'Weekly Goal'}
                    </h2>
                    <p className={`text-[12px] font-medium mb-6 leading-relaxed ${isDarkMode ? 'text-apple-gray' : 'text-white/80'}`}>
                      {state.settings.language === 'ar' ? 'لقد حققت 82% من أهدافك التعليمية لهذا الأسبوع.' : 'You have reached 82% of your target this week.'}
                    </p>
                    <div className={`h-2 rounded-full mb-3 overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-white/20'}`}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '82%' }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={`h-full rounded-full ${isDarkMode ? 'bg-apple-blue shadow-[0_0_15px_rgba(0,122,255,0.5)]' : 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]'}`} 
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-apple-gray' : 'text-white/60'}`}>Progress</span>
                      <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-white'}`}>82%</span>
                    </div>
                  </div>
                  {/* Decorative glow for light mode */}
                  {!isDarkMode && <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 blur-[80px]" />}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'Seating' && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
              <div>
                <h1 className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {state.settings.language === 'ar' ? 'مخطط الفصل' : 'Seating Chart'}
                </h1>
                <p className="text-sm font-medium text-apple-gray">
                  {state.settings.language === 'ar' ? 'قم بترتيب الطلاب حسب مقاعدهم في الفصل.' : 'Arrange students according to their seats.'}
                </p>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <select 
                  className={`flex-1 md:w-64 p-3 squircle-md text-xs font-bold uppercase tracking-widest border-2 transition-all ${isDarkMode ? 'bg-white/5 text-white border-transparent focus:border-apple-blue/50' : 'bg-white text-slate-700 border-black/5 focus:border-apple-blue/20 shadow-sm'}`}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  value={selectedClassId}
                >
                  {state.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className={`p-10 squircle-xl min-h-[600px] relative overflow-hidden transition-all duration-700 border ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
              
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 relative z-10">
                {state.students.filter(s => s.classId === (selectedClassId || state.classes[0]?.id)).map((student) => (
                  <motion.div
                    key={student.id}
                    drag
                    dragMomentum={false}
                    onDragEnd={(_, info) => {
                      console.log(`Student ${student.name} moved to`, info.point);
                    }}
                    className={`p-4 squircle-lg flex flex-col items-center justify-center gap-2 cursor-grab active:cursor-grabbing transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100 shadow-sm'}`}
                  >
                    <div className="w-10 h-10 squircle-md bg-apple-blue/10 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-apple-blue" />
                    </div>
                    <span className={`text-[10px] font-bold text-center ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{student.name}</span>
                  </motion.div>
                ))}
              </div>
              
              {state.students.filter(s => s.classId === (selectedClassId || state.classes[0]?.id)).length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                  <Grid className="w-16 h-16 mb-4" />
                  <p className="font-bold">{state.settings.language === 'ar' ? 'لا يوجد طلاب في هذا الفصل' : 'No students in this class'}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'AI Assistant' && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
              <div>
                <h1 className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {state.settings.language === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}
                </h1>
                <p className="text-sm font-medium text-apple-gray">
                  {state.settings.language === 'ar' ? 'استخدم قوة الذكاء الاصطناعي لتحسين تجربتك التعليمية.' : 'Use AI power to enhance your teaching experience.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Lesson Planner */}
              <div className={`p-8 squircle-xl transition-all duration-500 border relative overflow-hidden ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 squircle-md bg-amber-500 flex items-center justify-center text-white">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {state.settings.language === 'ar' ? 'مخطط الدروس الذكي' : 'Smart Lesson Planner'}
                  </h3>
                </div>
                
                <div className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-apple-gray uppercase tracking-widest ml-1">Lesson Title</label>
                    <input 
                      type="text"
                      placeholder={state.settings.language === 'ar' ? 'عنوان الدرس...' : 'Lesson Title...'}
                      className={`w-full p-4 squircle-md text-sm font-medium focus:outline-none border-2 transition-all ${isDarkMode ? 'bg-white/5 text-white border-transparent focus:border-apple-blue/50' : 'bg-slate-50 text-slate-900 border-transparent focus:border-apple-blue/20'}`}
                      id="lesson-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-apple-gray uppercase tracking-widest ml-1">Objectives</label>
                    <textarea 
                      placeholder={state.settings.language === 'ar' ? 'أهداف الدرس...' : 'Lesson Objectives...'}
                      className={`w-full p-4 squircle-md text-sm font-medium h-32 focus:outline-none border-2 transition-all resize-none ${isDarkMode ? 'bg-white/5 text-white border-transparent focus:border-apple-blue/50' : 'bg-slate-50 text-slate-900 border-transparent focus:border-apple-blue/20'}`}
                      id="lesson-objective"
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      const title = (document.getElementById('lesson-title') as HTMLInputElement).value;
                      const objective = (document.getElementById('lesson-objective') as HTMLTextAreaElement).value;
                      if (!title || !objective) return alert('يرجى إدخال العنوان والأهداف');
                      
                      setIsAILoading(true);
                      const plan = await generateLessonPlan(title, objective, state.classes[0]?.level || 'عام');
                      setAiResult(plan);
                      setIsAILoading(false);
                    }}
                    disabled={isAILoading}
                    className="apple-btn-primary w-full py-4 text-xs uppercase tracking-widest"
                  >
                    {isAILoading ? (state.settings.language === 'ar' ? 'جاري التوليد...' : 'Generating Plan...') : (state.settings.language === 'ar' ? 'توليد خطة الدرس' : 'Generate Lesson Plan')}
                  </button>
                </div>
              </div>

              {/* AI Analysis Result */}
              <div className={`p-8 squircle-xl transition-all duration-500 border relative overflow-hidden ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 squircle-md bg-emerald-500 flex items-center justify-center text-white">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {state.settings.language === 'ar' ? 'نتائج التحليل' : 'Analysis Results'}
                    </h3>
                  </div>
                  {aiResult && (
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(aiResult);
                        alert('تم النسخ');
                      }}
                      className={`p-3 squircle-md transition-all ${isDarkMode ? 'bg-white/5 text-apple-gray hover:text-apple-blue' : 'bg-slate-50 text-apple-gray hover:text-apple-blue'}`}
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <div className={`min-h-[350px] p-6 squircle-lg border-2 border-dashed font-mono transition-all duration-500 ${isDarkMode ? 'border-white/10 bg-black/20 text-slate-300' : 'border-black/5 bg-slate-50 text-slate-700'} overflow-y-auto max-h-[500px]`}>
                  {aiResult ? (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {aiResult}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-16">
                    <div className="w-16 h-16 bg-apple-gray/10 squircle-xl flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <p className="font-bold uppercase tracking-widest text-[10px]">{state.settings.language === 'ar' ? 'بانتظار طلبك...' : 'Waiting for request...'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Analytics' && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
              <div>
                <h1 className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {state.settings.language === 'ar' ? 'تحليلات الأداء' : 'Performance Analytics'}
                </h1>
                <p className="text-sm font-medium text-apple-gray">
                  {state.settings.language === 'ar' ? 'تحليل عميق لمستوى الطالبات وتفاعلهم.' : 'Deep analysis of student performance and engagement.'}
                </p>
              </div>
              <button 
                onClick={() => window.print()}
                className="apple-btn-secondary flex items-center gap-2 text-xs uppercase tracking-widest"
              >
                <Printer className="w-4 h-4" />
                {state.settings.language === 'ar' ? 'طباعة تقرير' : 'Print Report'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              <div className={`p-8 squircle-xl transition-all duration-500 border ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
                <h3 className={`font-bold text-lg mb-8 flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <div className="w-10 h-10 squircle-md bg-apple-blue/10 flex items-center justify-center text-apple-blue">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  {state.settings.language === 'ar' ? 'توزيع التفاعل' : 'Engagement Distribution'}
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF', 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Bar dataKey="value" fill="#007AFF" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`p-8 squircle-xl transition-all duration-500 border ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
                <h3 className={`font-bold text-lg mb-8 flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <div className="w-10 h-10 squircle-md bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Trophy className="w-5 h-5" />
                  </div>
                  {state.settings.language === 'ar' ? 'أفضل الطالبات تفاعلاً' : 'Top Performing Students'}
                </h3>
                <div className="space-y-4">
                  {state.students.length === 0 ? (
                    <div className="py-16 text-center opacity-30">
                      <p className="font-bold uppercase tracking-widest text-[10px]">No Data Available</p>
                    </div>
                  ) : (
                    state.students
                      .map(student => ({
                        ...student,
                        stats: getStudentStats(student.id, state.sessionRecords)
                      }))
                      .sort((a, b) => b.stats.attendanceRate - a.stats.attendanceRate)
                      .slice(0, 5)
                      .map((student, i) => (
                        <div key={student.id} className={`flex items-center justify-between p-4 squircle-lg border transition-all hover:scale-[1.01] ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                          <div className="flex items-center gap-4">
                            <span className={`w-8 h-8 squircle-md flex items-center justify-center text-[10px] font-bold shadow-sm ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-amber-700 text-white' : 'bg-apple-gray/10 text-apple-gray'}`}>
                              {i + 1}
                            </span>
                            <div>
                              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.name}</p>
                              <p className="text-[9px] font-bold text-apple-gray uppercase tracking-widest">{student.id}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-bold text-apple-blue">{student.stats.attendanceRate.toFixed(0)}%</p>
                            <p className="text-[8px] font-bold text-apple-gray uppercase tracking-widest">Attendance</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Students' && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
              <div>
                <h1 className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {state.settings.language === 'ar' ? 'إدارة الطالبات' : 'Students Management'}
                </h1>
                <p className="text-sm font-medium text-apple-gray">
                  {state.settings.language === 'ar' ? 'إضافة، حذف، ومتابعة سجل الطالبات.' : 'Add, delete, and track student records.'}
                </p>
              </div>
              <div className="flex gap-3">
                <label className="apple-btn-secondary flex items-center gap-2 text-xs uppercase tracking-widest cursor-pointer">
                  <FileUp className="w-4 h-4" />
                  {state.settings.language === 'ar' ? 'استيراد من Excel' : 'Import from Excel'}
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (state.classes.length === 0) {
                        alert(state.settings.language === 'ar' ? 'يرجى إضافة فصل أولاً' : 'Please add a class first');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = async (evt) => {
                        try {
                          const bstr = evt.target?.result;
                          const wb = XLSX.read(bstr, { type: 'binary' });
                          const wsname = wb.SheetNames[0];
                          const ws = wb.Sheets[wsname];
                          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                          
                          // Assume first column is names
                          const studentNames = data.slice(1)
                            .map(row => row[0])
                            .filter(name => typeof name === 'string' && name.trim().length > 0);
                          
                          // Precise Deduplication against existing state
                          const classId = state.classes[0].id;
                          const existingNames = state.students.filter(s => s.classId === classId).map(s => s.name.trim());
                          const uniqueNewNames = [...new Set(studentNames.map(n => String(n).trim()))].filter(n => !existingNames.includes(n));

                          if (uniqueNewNames.length === 0) {
                            alert(state.settings.language === 'ar' ? 'لا توجد أسماء جديدة للاستيراد (إما الملف فارغ أو الأسماء مسجلة مسبقاً)' : 'No new names to import (either file is empty or names already exist)');
                            return;
                          }
                          
                          if (confirm(state.settings.language === 'ar' ? `تم العثور على ${uniqueNewNames.length} اسماً جديداً. هل ترغب في الاستيراد؟` : `Found ${uniqueNewNames.length} new names. Proceed with import?`)) {
                            for (const name of uniqueNewNames) {
                              await addStudent(name, classId);
                            }
                            alert(state.settings.language === 'ar' ? 'تم الاستيراد بنجاح' : 'Imported successfully');
                          }
                        } catch (err) {
                          console.error(err);
                          alert(state.settings.language === 'ar' ? 'حدث خطأ أثناء الاستيراد' : 'Error during import');
                        }
                      };
                      reader.readAsBinaryString(file);
                    }}
                  />
                </label>
                <button 
                  onClick={() => {
                    if (state.classes.length === 0) {
                      alert(state.settings.language === 'ar' ? 'يرجى إضافة فصل أولاً' : 'Please add a class first');
                      return;
                    }
                    setNewStudent({ name: '', classId: state.classes[0].id });
                    setIsAddStudentModalOpen(true);
                  }}
                  className="apple-btn-primary flex items-center gap-2 text-xs uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" />
                  {state.settings.language === 'ar' ? 'إضافة طالبة' : 'Add Student'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredStudents.length === 0 ? (
                <div className="col-span-full py-24 text-center">
                  <div className="w-20 h-20 bg-apple-gray/10 squircle-xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-apple-gray opacity-30" />
                  </div>
                  <p className="text-apple-gray font-bold uppercase tracking-widest text-[10px]">
                    {state.settings.language === 'ar' ? 'لا توجد طالبات مسجلات حالياً' : 'No students recorded yet'}
                  </p>
                </div>
              ) : (
                filteredStudents.map(student => (
                  <div key={student.id} className={`p-6 squircle-xl relative group transition-all duration-300 border overflow-hidden ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm hover:shadow-md'}`}>
                    <div className="absolute top-4 left-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button 
                        onClick={() => {
                          setEntityToEdit({ id: student.id, type: 'STUDENT', data: { name: student.name, classId: student.classId } });
                          setIsEditModalOpen(true);
                        }}
                        className={`p-2 squircle-md transition-all ${isDarkMode ? 'bg-white/10 text-apple-blue hover:bg-apple-blue/20' : 'bg-slate-50 text-apple-blue hover:bg-apple-blue/10'}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setEntityToDelete({ id: student.id, type: 'STUDENT', name: student.name });
                          setIsDeleteModalOpen(true);
                        }}
                        className={`p-2 squircle-md transition-all ${isDarkMode ? 'bg-white/10 text-rose-500 hover:bg-rose-500/20' : 'bg-slate-50 text-rose-500 hover:bg-rose-500/10'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-14 h-14 squircle-md flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${isDarkMode ? 'bg-white/5 border border-white/5' : 'bg-slate-50 border border-black/5'}`}>
                        <UserIcon className="w-7 h-7 text-apple-blue" />
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg mb-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.name}</h3>
                        <p className="text-[10px] font-bold text-apple-blue uppercase tracking-widest">
                          {state.classes.find(c => c.id === student.classId)?.name || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className={`p-3 squircle-md border text-center transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                        <p className="text-[9px] font-bold text-apple-gray uppercase tracking-widest mb-1">{state.settings.language === 'ar' ? 'الحضور' : 'Attendance'}</p>
                        <p className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{getStudentStats(student.id, state.sessionRecords).attendanceRate.toFixed(0)}%</p>
                      </div>
                      <div className={`p-3 squircle-md border text-center transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                        <p className="text-[9px] font-bold text-apple-gray uppercase tracking-widest mb-1">{state.settings.language === 'ar' ? 'المشاركة' : 'Participation'}</p>
                        <p className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{getStudentStats(student.id, state.sessionRecords).avgParticipation.toFixed(1)}/5</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <button 
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          setIsStudentProfileOpen(true);
                        }}
                        className="apple-btn-primary flex-1 py-3 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        {state.settings.language === 'ar' ? 'الملف الشامل' : 'Full Profile'}
                      </button>
                      <button 
                        onClick={() => {
                          const stats = getStudentStats(student.id, state.sessionRecords);
                          const msg = generateParentMessage(student.name, stats, state.settings.language);
                          const encodedMsg = encodeURIComponent(msg);
                          window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
                        }}
                        className="apple-btn-secondary p-3 flex items-center justify-center"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>

                    <div className={`p-3 squircle-md flex items-center justify-between border transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                      <span className="text-[9px] font-bold text-apple-gray uppercase tracking-widest">
                        {state.settings.language === 'ar' ? 'اتجاه الأداء' : 'Performance Trend'}
                      </span>
                      {(() => {
                        const trend = getStudentTrend(student.id, state.sessionRecords) || 'Stable';
                        const colors: Record<string, string> = {
                          'Improving': 'text-emerald-500',
                          'Stable': 'text-apple-blue',
                          'Declining': 'text-rose-500'
                        };
                        const labels: Record<string, string> = {
                          'Improving': state.settings.language === 'ar' ? 'في تحسن' : 'Improving',
                          'Stable': state.settings.language === 'ar' ? 'مستقر' : 'Stable',
                          'Declining': state.settings.language === 'ar' ? 'في تراجع' : 'Declining'
                        };
                        const icons: Record<string, React.ReactNode> = {
                          'Improving': <TrendingUp className="w-3.5 h-3.5" />,
                          'Stable': <div className="w-3.5 h-0.5 bg-current rounded-full" />,
                          'Declining': <TrendingUp className="w-3.5 h-3.5 rotate-180" />
                        };
                        return (
                          <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ${colors[trend] || 'text-apple-blue'}`}>
                            {icons[trend] || <div className="w-3.5 h-0.5 bg-current rounded-full" />}
                            {labels[trend] || (state.settings.language === 'ar' ? 'مستقر' : 'Stable')}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

      {activeTab === 'Attendance' && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
              <div>
                <h1 className={`text-3xl font-extrabold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {state.settings.language === 'ar' ? 'الحضور والغياب' : 'Attendance & Absence'}
                </h1>
                <p className="text-sm font-medium text-apple-gray">
                  {state.settings.language === 'ar' ? 'رصد ومتابعة حضور وانتظام الطالبات.' : 'Monitor and track student attendance and regularity.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => exportToExcel()}
                  className="apple-btn-secondary flex items-center gap-2 text-xs uppercase tracking-widest"
                >
                  <Download className="w-4 h-4" />
                  {state.settings.language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                </button>
                <button 
                  onClick={() => window.print()}
                  className="apple-btn-primary flex items-center gap-2 text-xs uppercase tracking-widest"
                >
                  <Printer className="w-4 h-4" />
                  {state.settings.language === 'ar' ? 'طباعة التقرير' : 'Print Report'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatCard 
                title={state.settings.language === 'ar' ? 'الحضور اليوم' : 'Attendance Today'}
                value={attendanceStats.attendanceToday} 
                icon={CheckCircle2} 
                color="bg-emerald-500" 
                isDarkMode={isDarkMode} 
              />
              <StatCard 
                title={state.settings.language === 'ar' ? 'إجمالي الغياب' : 'Total Absences'}
                value={absenceCountLabel(attendanceStats.totalAbsences)} 
                icon={XCircle} 
                color="bg-rose-500" 
                isDarkMode={isDarkMode} 
              />
              <StatCard 
                title={state.settings.language === 'ar' ? 'حالات التأخر' : 'Late Cases'}
                value={lateCountLabel(attendanceStats.lateCases)} 
                icon={Clock} 
                color="bg-amber-500" 
                isDarkMode={isDarkMode} 
              />
              <StatCard 
                title={state.settings.language === 'ar' ? 'متوسط المشاركة' : 'Avg Participation'}
                value={attendanceStats.avgParticipation} 
                icon={Zap} 
                color="bg-apple-blue" 
                isDarkMode={isDarkMode} 
              />
            </div>

            {/* Quick Recording Section */}
            <div className={`p-8 squircle-2xl border mb-10 transition-all duration-500 overflow-hidden ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 squircle-md bg-apple-blue flex items-center justify-center text-white shadow-lg shadow-apple-blue/20">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {state.settings.language === 'ar' ? 'الرصد السريع' : 'Quick Recording'}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] font-bold text-apple-gray uppercase tracking-widest leading-none">Attendance Panel</p>
                      {isActionSaving && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-1.5 text-apple-blue"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          <span className="text-[9px] font-bold uppercase tracking-tight">
                            {state.settings.language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                  <select 
                    value={selectedClassIdForAttendance || ''}
                    onChange={(e) => {
                      setSelectedClassIdForAttendance(e.target.value);
                      setSelectedSessionIdForAttendance(null);
                    }}
                    className={`flex-1 md:w-48 p-3 squircle-md font-bold text-xs border-2 transition-all ${isDarkMode ? 'bg-white/5 text-white border-transparent focus:border-apple-blue/50' : 'bg-slate-50 text-slate-900 border-black/5 focus:border-apple-blue/10'}`}
                  >
                    <option value="">{state.settings.language === 'ar' ? 'اختر الفصل...' : 'Select Class...'}</option>
                    {state.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  
                  <select 
                    value={selectedSessionIdForAttendance || ''}
                    disabled={!selectedClassIdForAttendance}
                    onChange={(e) => setSelectedSessionIdForAttendance(e.target.value)}
                    className={`flex-1 md:w-48 p-3 squircle-md font-bold text-xs border-2 transition-all ${isDarkMode ? 'bg-white/5 text-white border-transparent focus:border-apple-blue/50' : 'bg-slate-50 text-slate-900 border-black/5 focus:border-apple-blue/10'}`}
                  >
                    <option value="">{state.settings.language === 'ar' ? 'اختر الحصة...' : 'Select Session...'}</option>
                    {state.sessions
                      .filter(s => s.classId === selectedClassIdForAttendance)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Newest first
                      .map(s => <option key={s.id} value={s.id}>{s.title} ({new Date(s.date).toLocaleDateString(state.settings.language === 'ar' ? 'ar-SA' : 'en-US')})</option>)
                    }
                  </select>
                </div>
              </div>

              {selectedSessionIdForAttendance ? (
                <div className="overflow-x-auto">
                  {state.students.filter(s => s.classId === selectedClassIdForAttendance).length === 0 ? (
                    <div className="py-20 text-center opacity-30">
                      <Users className="w-12 h-12 mb-4 mx-auto" />
                      <p className="font-bold uppercase tracking-widest text-xs">
                        {state.settings.language === 'ar' ? 'لا يوجد طلاب في هذا الفصل' : 'No students in this class'}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className={`text-right border-b ${isDarkMode ? 'border-white/5 text-apple-gray' : 'border-black/5 text-apple-gray'}`}>
                          <th className="pb-4 pt-0 font-bold text-[10px] uppercase tracking-widest">{state.settings.language === 'ar' ? 'الطالبة' : 'Student'}</th>
                          <th className="pb-4 pt-0 font-bold text-[10px] uppercase tracking-widest text-center">{state.settings.language === 'ar' ? 'رصد الحضور' : 'Attendance'}</th>
                          <th className="pb-4 pt-0 font-bold text-[10px] uppercase tracking-widest text-center">{state.settings.language === 'ar' ? 'المشاركة' : 'Participation'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {state.students
                          .filter(s => s.classId === selectedClassIdForAttendance)
                          .map(student => {
                            const record = state.sessionRecords.find(r => r.sessionId === selectedSessionIdForAttendance && r.studentId === student.id);
                            return (
                              <tr key={student.id} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all">
                                <td className="py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 squircle-md bg-apple-blue/10 flex items-center justify-center text-apple-blue font-bold text-xs">
                                      {student.name.charAt(0)}
                                    </div>
                                    <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.name}</span>
                                  </div>
                                </td>
                                <td className="py-4">
                                  <div className="flex justify-center gap-2">
                        {(['Present', 'Absent', 'Late'] as const).map(status => (
                                      <button
                                        key={status}
                                        title={status}
                                        onClick={() => handleRecordAttendance(selectedSessionIdForAttendance!, student.id, status, record?.participation || 0, record?.isDistinguished || false)}
                                        className={`px-3 sm:px-4 py-2 squircle-md text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest transition-all ${
                                          record?.attendance === status
                                          ? (status === 'Present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 
                                             status === 'Absent' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 
                                             'bg-amber-500 text-white shadow-lg shadow-amber-500/30')
                                          : (isDarkMode ? 'bg-white/5 text-apple-gray hover:bg-white/10' : 'bg-slate-100 text-apple-gray hover:bg-slate-200')
                                        }`}
                                      >
                                        {status === 'Present' ? (state.settings.language === 'ar' ? 'حاضر' : 'Present') :
                                         status === 'Absent' ? (state.settings.language === 'ar' ? 'غائب' : 'Absent') :
                                         (state.settings.language === 'ar' ? 'متأخر' : 'Late')}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-4">
                                  <div className="flex justify-center gap-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <button
                                        key={star}
                                        onClick={() => handleRecordAttendance(selectedSessionIdForAttendance!, student.id, record?.attendance || 'Present', star, record?.isDistinguished || false)}
                                        className={`w-6 h-6 flex items-center justify-center transition-all ${record?.participation >= star ? 'text-amber-500 scale-110' : 'text-apple-gray opacity-30 hover:opacity-100'}`}
                                      >
                                        <Sparkles className="w-4 h-4 fill-current" />
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center opacity-30">
                  <Database className="w-12 h-12 mb-4 mx-auto" />
                  <p className="font-bold uppercase tracking-widest text-xs">
                    {state.settings.language === 'ar' ? 'بانتظار اختيار الفصل والحصة...' : 'Waiting to select class and session...'}
                  </p>
                </div>
              )}
            </div>

            <div className={`p-8 squircle-xl border transition-all duration-500 ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
              <h2 className={`text-xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {state.settings.language === 'ar' ? 'سجل الغياب المتكرر' : 'Frequent Absence Log'}
              </h2>
              <div className="space-y-4">
                {state.students.filter(s => getStudentStats(s.id, state.sessionRecords).absenceCount >= 3).length === 0 ? (
                  <div className="py-16 text-center opacity-30">
                    <p className="font-bold uppercase tracking-widest text-[10px]">{state.settings.language === 'ar' ? 'لا يوجد حالات غياب متكرر' : 'No frequent absence cases'}</p>
                  </div>
                ) : (
                  state.students.filter(s => getStudentStats(s.id, state.sessionRecords).absenceCount >= 3).map(student => (
                    <div key={student.id} className={`flex items-center justify-between p-5 squircle-lg border transition-all ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 squircle-md flex items-center justify-center ${isDarkMode ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                          <UserIcon className="w-6 h-6 text-apple-blue" />
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.name}</p>
                          <p className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{state.classes.find(c => c.id === student.classId)?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-rose-500">
                          {absenceCountLabel(getStudentStats(student.id, state.sessionRecords).absenceCount)}
                        </p>
                        <button 
                          onClick={() => {
                            const stats = getStudentStats(student.id, state.sessionRecords);
                            const msg = generateParentMessage(student.name, stats, state.settings.language);
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="text-[10px] font-bold text-apple-blue uppercase tracking-widest mt-1 hover:underline"
                        >
                          {state.settings.language === 'ar' ? 'إرسال تنبيه' : 'Send Alert'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Calendar' && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
              <div>
                <h1 className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {state.settings.language === 'ar' ? 'التقويم الدراسي' : 'Academic Calendar'}
                </h1>
                <p className="text-sm font-medium text-apple-gray">
                  {state.settings.language === 'ar' ? 'تنظيم الحصص والمواعيد بشكل تفاعلي.' : 'Organize sessions and appointments interactively.'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                  className={`p-3 squircle-md transition-all ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <RefreshCw className={`w-5 h-5 ${state.settings.language === 'ar' ? '' : 'rotate-180'}`} />
                </button>
                <h2 className={`text-xl font-bold min-w-[150px] text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {getMonthName(calendarDate.getMonth(), state.settings.language)} {calendarDate.getFullYear()}
                </h2>
                <button 
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                  className={`p-3 squircle-md transition-all ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <RefreshCw className={`w-5 h-5 ${state.settings.language === 'ar' ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            <div className={`p-8 squircle-2xl border transition-all duration-500 ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
              <div className="grid grid-cols-7 gap-4 mb-6">
                {(state.settings.language === 'ar' ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map(day => (
                  <div key={day} className="text-center text-[10px] font-bold text-apple-gray uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-4">
                {(() => {
                  const days = getDaysInMonth(calendarDate.getMonth(), calendarDate.getFullYear());
                  const firstDayIndex = days[0].getDay();
                  const blanks = Array(firstDayIndex).fill(null);
                  
                  return [...blanks, ...days].map((day, idx) => {
                    if (!day) return <div key={`blank-${idx}`} />;
                    
                    const dateStr = day.toISOString().split('T')[0];
                    const daySessions = state.sessions.filter(s => s.date.split('T')[0] === dateStr);
                    const isToday = new Date().toDateString() === day.toDateString();
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          if (state.classes.length === 0) {
                            alert(state.settings.language === 'ar' ? 'يرجى إضافة فصل أولاً' : 'Please add a class first');
                            return;
                          }
                          setNewSession({ title: '', date: dateStr, classId: state.classes[0].id });
                          setIsAddSessionModalOpen(true);
                        }}
                        className={`min-h-[120px] p-3 squircle-xl border transition-all cursor-pointer group hover:scale-[1.02] ${
                          isDarkMode 
                          ? `bg-white/5 border-white/5 hover:bg-white/10 ${isToday ? 'ring-2 ring-apple-blue' : ''}` 
                          : `bg-slate-50 border-black/5 hover:bg-slate-100 ${isToday ? 'ring-2 ring-apple-blue' : ''}`
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-sm font-bold ${isToday ? 'text-apple-blue' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
                            {day.getDate()}
                          </span>
                          {daySessions.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-apple-blue shadow-sm shadow-apple-blue/50" />
                          )}
                        </div>
                        
                        <div className="space-y-1.5">
                          {daySessions.slice(0, 3).map(session => (
                            <div 
                              key={session.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEntityToEdit({ id: session.id, type: 'SESSION', data: { ...session } });
                                setIsEditModalOpen(true);
                              }}
                              className="px-2 py-1 squircle-sm bg-apple-blue/10 border border-apple-blue/20 text-[9px] font-bold text-apple-blue truncate hover:bg-apple-blue/20 transition-colors"
                            >
                              {session.title}
                            </div>
                          ))}
                          {daySessions.length > 3 && (
                            <p className="text-[8px] font-bold text-apple-gray text-center mt-1">
                              +{daySessions.length - 3} {state.settings.language === 'ar' ? 'مزيد' : 'more'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Seating' && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
              <div>
                <h1 className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {state.settings.language === 'ar' ? 'مخطط الفصل التفاعلي' : 'Interactive Seating Chart'}
                </h1>
                <p className="text-sm font-medium text-apple-gray">
                  {state.settings.language === 'ar' ? 'قم بتوزيع الطالبات على الطاولات ورصد الحضور بصرياً.' : 'Arrange students on desks and take attendance visually.'}
                </p>
              </div>
              <select 
                value={selectedClassIdForLayout || ''}
                onChange={(e) => setSelectedClassIdForLayout(e.target.value)}
                className={`p-3 squircle-md font-bold text-xs focus:outline-none border-2 transition-all ${isDarkMode ? 'bg-white/5 text-white border-transparent focus:border-apple-blue/50' : 'bg-white text-slate-900 border-black/5 focus:border-apple-blue/20 shadow-sm'}`}
              >
                <option value="">{state.settings.language === 'ar' ? 'اختر الفصل...' : 'Select Class...'}</option>
                {state.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {selectedClassIdForLayout ? (
              <div className={`p-10 squircle-2xl border relative overflow-x-auto ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
                {/* Teacher Desk Representation */}
                <div className="flex justify-center mb-16">
                  <div className={`w-48 h-12 squircle-md border-2 border-dashed flex items-center justify-center ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">
                      {state.settings.language === 'ar' ? 'طاولة المعلمة' : 'Teacher Desk'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 justify-center min-w-[800px]">
                  {Array.from({ length: 64 }).map((_, idx) => {
                    const row = Math.floor(idx / 8);
                    const col = idx % 8;
                    const student = state.students.find(s => s.classId === selectedClassIdForLayout && s.seatPosition?.row === row && s.seatPosition?.col === col);
                    
                    return (
                      <div 
                        key={idx}
                        className={`aspect-square squircle-lg border-2 flex flex-col items-center justify-center p-2 transition-all relative group ${
                          student 
                          ? (isDarkMode ? 'bg-apple-blue/20 border-apple-blue/50' : 'bg-apple-blue/5 border-apple-blue/20 shadow-sm')
                          : (isDarkMode ? 'bg-white/5 border-dashed border-white/10 hover:border-white/20' : 'bg-slate-50 border-dashed border-slate-200 hover:border-slate-300')
                        }`}
                      >
                        {student ? (
                          <>
                            <div className="w-8 h-8 squircle-md bg-apple-blue flex items-center justify-center text-white text-xs font-bold mb-1">
                              {student.name.charAt(0)}
                            </div>
                            <span className={`text-[8px] font-bold text-center line-clamp-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.name}</span>
                            <button 
                              onClick={() => updateStudentSeat(student.id, -1, -1)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <select 
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => updateStudentSeat(e.target.value, row, col)}
                              value=""
                            >
                              <option value="">+</option>
                              {state.students
                                .filter(s => s.classId === selectedClassIdForLayout && (!s.seatPosition || s.seatPosition.row === -1))
                                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                              }
                            </select>
                            <Plus className={`w-4 h-4 ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center">
                <div className="w-20 h-20 bg-apple-gray/10 squircle-xl flex items-center justify-center mx-auto mb-4">
                  <Grid className="w-10 h-10 text-apple-gray opacity-30" />
                </div>
                <p className="text-apple-gray font-bold uppercase tracking-widest text-[10px]">
                  {state.settings.language === 'ar' ? 'يرجى اختيار فصل لعرض المخطط' : 'Please select a class to view layout'}
                </p>
              </div>
            )}
          </section>
        )}
        {activeTab === 'Sessions' && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
              <div>
                <h1 className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {state.settings.language === 'ar' ? 'سجل الحصص' : 'Sessions Log'}
                </h1>
                <p className="text-sm font-medium text-apple-gray">
                  {state.settings.language === 'ar' ? 'إدارة الدروس اليومية والتحضير.' : 'Manage daily lessons and preparation.'}
                </p>
              </div>
              <button 
                onClick={() => {
                  if (state.classes.length === 0) {
                    alert(state.settings.language === 'ar' ? 'يرجى إضافة فصل أولاً' : 'Please add a class first');
                    return;
                  }
                  setNewSession({ title: '', date: new Date().toISOString().split('T')[0], classId: state.classes[0].id, resources: [] });
                  setIsAddSessionModalOpen(true);
                }}
                className="apple-btn-primary flex items-center gap-2 text-xs uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" />
                {state.settings.language === 'ar' ? 'تحضير حصة' : 'Add Session'}
              </button>
            </div>

            <div className="space-y-6">
              {filteredSessions.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-apple-gray/10 squircle-xl flex items-center justify-center mx-auto mb-4">
                    <History className="w-10 h-10 text-apple-gray opacity-30" />
                  </div>
                  <p className="text-apple-gray font-bold uppercase tracking-widest text-[10px]">
                    {state.settings.language === 'ar' ? 'لا توجد حصص مسجلة حالياً' : 'No sessions recorded yet'}
                  </p>
                </div>
              ) : (
                filteredSessions.map(session => (
                  <div key={session.id} className={`p-6 squircle-xl flex flex-col items-stretch gap-6 transition-all duration-300 border group ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm hover:shadow-md'}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="w-16 h-16 squircle-md bg-apple-blue flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
                          <Clock className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className={`font-bold text-xl mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{session.title}</h3>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold text-apple-blue uppercase tracking-widest">
                              {new Date(session.date).toLocaleDateString(state.settings.language === 'ar' ? 'ar-SA' : 'en-US')}
                            </p>
                            <div className="w-1 h-1 rounded-full bg-apple-gray/30" />
                            <p className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">
                              {state.classes.find(c => c.id === session.classId)?.name || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {session.resources && session.resources.length > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-apple-blue/10 text-apple-blue">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">{session.resources.length}</span>
                          </div>
                        )}
                        <button 
                          onClick={() => {
                            setEntityToEdit({ id: session.id, type: 'SESSION', data: { title: session.title, date: session.date, classId: session.classId, resources: session.resources || [] } });
                            setIsEditModalOpen(true);
                          }}
                          className="p-3 squircle-md bg-apple-blue/10 text-apple-blue hover:bg-apple-blue/20 transition-colors"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedSessionId(session.id);
                            setIsAttendanceModalOpen(true);
                          }}
                          className="apple-btn-secondary px-6 py-3 text-[10px] uppercase tracking-widest"
                        >
                          {state.settings.language === 'ar' ? 'رصد الحضور' : 'Take Attendance'}
                        </button>
                        <button 
                          onClick={() => {
                            setEntityToDelete({ id: session.id, type: 'SESSION', name: session.title });
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-3 squircle-md bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {session.resources && session.resources.length > 0 && (
                      <div className={`mt-2 p-4 squircle-lg ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'} flex flex-wrap gap-3`}>
                        {session.resources.map(res => (
                          <a
                            key={res.id}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-4 py-2 squircle-md text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${
                              isDarkMode ? 'bg-white/5 text-white border border-white/5' : 'bg-white text-slate-900 border border-black/5 shadow-sm'
                            }`}
                          >
                            {res.type === 'Link' ? <LinkIcon className="w-3 h-3 text-apple-blue" /> : 
                             res.type === 'Video' ? <Video className="w-3 h-3 text-rose-500" /> :
                             res.type === 'Image' ? <Camera className="w-3 h-3 text-emerald-500" /> :
                             <FileText className="w-3 h-3 text-amber-500" />}
                            {res.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}
        {activeTab === 'Evidence' && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
              <div>
                <h1 className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {state.settings.language === 'ar' ? 'شواهد الأداء الوظيفي' : 'Performance Evidence'}
                </h1>
                <p className="text-sm font-medium text-apple-gray">
                  {state.settings.language === 'ar' ? 'توثيق الإنجازات، الدورات، والمبادرات.' : 'Document achievements, courses, and initiatives.'}
                </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={() => window.print()}
                  className="apple-btn-secondary flex items-center gap-2 text-xs uppercase tracking-widest"
                >
                  <Download className="w-4 h-4" />
                  {state.settings.language === 'ar' ? 'تصدير الشواهد' : 'Export Evidence'}
                </button>
                <button 
                  onClick={() => {
                    setNewEvidence({ title: '', description: '', category: 'General', date: new Date().toISOString().split('T')[0], fileUrl: '', fileName: '' });
                    setIsAddEvidenceModalOpen(true);
                  }}
                  className="apple-btn-primary flex items-center gap-2 text-xs uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" />
                  {state.settings.language === 'ar' ? 'إضافة شاهد' : 'Add Evidence'}
                </button>
              </div>
            </div>

            {/* Evidence Summary Card */}
            <div className={`p-8 squircle-xl mb-10 flex flex-col md:flex-row items-center justify-between gap-8 border transition-all duration-300 ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 squircle-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Award className="w-10 h-10" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {state.settings.language === 'ar' ? 'ملخص الأداء الوظيفي' : 'Performance Summary'}
                  </h2>
                  <p className="text-sm font-medium text-apple-gray">
                    {state.settings.language === 'ar' ? 'نظرة شاملة على جميع الشواهد والإنجازات الموثقة.' : 'Comprehensive overview of all documented achievements.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-500 mb-0.5">{evidenceSummary.total}</p>
                  <p className="text-[9px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.language === 'ar' ? 'إجمالي الشواهد' : 'Total Evidence'}</p>
                </div>
                <div className="w-px h-12 bg-apple-gray/10" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-apple-blue mb-0.5">{evidenceSummary.categories}</p>
                  <p className="text-[9px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.language === 'ar' ? 'التصنيفات' : 'Categories'}</p>
                </div>
                <div className="w-px h-12 bg-apple-gray/10" />
                <div className="text-center">
                  <p className={`text-sm font-bold truncate max-w-[100px] mb-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{evidenceSummary.latest}</p>
                  <p className="text-[9px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.language === 'ar' ? 'آخر إضافة' : 'Latest'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvidence.length === 0 ? (
                <div className="col-span-full py-24 text-center">
                  <div className="w-20 h-20 bg-apple-gray/10 squircle-xl flex items-center justify-center mx-auto mb-4">
                    <Award className="w-10 h-10 text-apple-gray opacity-30" />
                  </div>
                  <p className="text-apple-gray font-bold uppercase tracking-widest text-[10px]">
                    {state.settings.language === 'ar' ? 'لا توجد شواهد مسجلة حالياً' : 'No evidence recorded yet'}
                  </p>
                </div>
              ) : (
                filteredEvidence.map(item => (
                  <motion.div 
                    layout
                    key={item.id} 
                    className={`squircle-xl relative group transition-all duration-500 border overflow-hidden flex flex-col ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm hover:shadow-xl'}`}
                  >
                    {/* Visual Header/Thumbnail */}
                    <div className={`h-32 w-full relative overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                      {item.fileUrl ? (
                        <img src={item.fileUrl} alt={item.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Briefcase className={`w-12 h-12 ${isDarkMode ? 'text-white/10' : 'text-slate-200'}`} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                        <span className="px-2 py-1 squircle-sm bg-apple-blue text-[8px] font-bold text-white uppercase tracking-widest">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-bold text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <button 
                            onClick={() => {
                              setEntityToEdit({ id: item.id, type: 'EVIDENCE', data: { ...item } });
                              setIsEditModalOpen(true);
                            }}
                            className={`p-2 squircle-md transition-all ${isDarkMode ? 'bg-white/10 text-apple-blue hover:bg-apple-blue/20' : 'bg-slate-50 text-apple-blue hover:bg-apple-blue/10'}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setEntityToDelete({ id: item.id, type: 'EVIDENCE', name: item.title });
                              setIsDeleteModalOpen(true);
                            }}
                            className={`p-2 squircle-md transition-all ${isDarkMode ? 'bg-white/10 text-rose-500 hover:bg-rose-500/20' : 'bg-slate-50 text-rose-500 hover:bg-rose-500/10'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-[10px] font-bold text-apple-gray uppercase tracking-widest mb-4">
                        {new Date(item.date).toLocaleDateString(state.settings.language === 'ar' ? 'ar-SA' : 'en-US')}
                      </p>

                      <p className={`text-sm font-medium mb-6 line-clamp-2 leading-relaxed flex-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.description}
                      </p>

                      {item.fileUrl && (
                        <div className={`p-3 squircle-md flex items-center justify-between border transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Paperclip className="w-3.5 h-3.5 text-apple-gray shrink-0" />
                            <span className="text-[9px] font-bold text-apple-gray uppercase tracking-widest truncate">{item.fileName}</span>
                          </div>
                          <a 
                            href={item.fileUrl} 
                            download={item.fileName}
                            className="text-[9px] font-bold text-apple-blue hover:underline shrink-0 uppercase tracking-widest"
                          >
                            {state.settings.language === 'ar' ? 'تحميل' : 'Download'}
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === 'Settings' && (
          <section className="max-w-4xl mx-auto">
            <h1 className={`text-3xl font-bold mb-10 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {state.settings.language === 'ar' ? 'الإعدادات' : 'Settings'}
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={`p-8 squircle-xl transition-all duration-500 border ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
                <h3 className={`font-bold text-lg mb-8 flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <div className="w-10 h-10 squircle-md bg-apple-blue/10 flex items-center justify-center text-apple-blue">
                    <Lock className="w-5 h-5" />
                  </div>
                  {state.settings.language === 'ar' ? 'الأمان' : 'Security'}
                </h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{state.settings.language === 'ar' ? 'تغيير رمز PIN' : 'Change PIN'}</p>
                      <p className="text-[10px] text-apple-gray font-bold uppercase tracking-widest">{state.settings.language === 'ar' ? 'تحديث رمز الدخول الخاص بك' : 'Update your access code'}</p>
                    </div>
                    <button 
                      onClick={() => {
                        const currentPin = prompt(state.settings.language === 'ar' ? 'أدخل رمز PIN الحالي:' : 'Enter current PIN:');
                        if (currentPin && verifyPin(currentPin, state.settings.pin)) {
                          const newPin = prompt(state.settings.language === 'ar' ? 'أدخل رمز PIN الجديد (4-6 أرقام):' : 'Enter new PIN (4-6 digits):');
                          if (newPin && newPin.length >= 4 && newPin.length <= 6) {
                            setState(prev => ({ ...prev, settings: { ...prev.settings, pin: hashPin(newPin) } }));
                            alert(state.settings.language === 'ar' ? 'تم تغيير الرمز بنجاح' : 'PIN changed successfully');
                          } else {
                            alert(state.settings.language === 'ar' ? 'الرمز يجب أن يكون بين 4 و 6 أرقام' : 'PIN must be 4-6 digits');
                          }
                        } else {
                          alert(state.settings.language === 'ar' ? 'الرمز الحالي غير صحيح' : 'Current PIN is incorrect');
                        }
                      }}
                      className="apple-btn-secondary px-6 py-2.5 text-[10px] uppercase tracking-widest"
                    >
                      {state.settings.language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{state.settings.language === 'ar' ? 'القفل التلقائي' : 'Auto-lock'}</p>
                      <p className="text-[10px] text-apple-gray font-bold uppercase tracking-widest">{state.settings.language === 'ar' ? `يتم القفل بعد ${state.settings.autoLockTimer} دقائق` : `Locks after ${state.settings.autoLockTimer} mins`}</p>
                    </div>
                    <select 
                      value={state.settings.autoLockTimer}
                      onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, autoLockTimer: parseInt(e.target.value) } }))}
                      className={`p-2.5 squircle-md text-[10px] font-bold uppercase tracking-widest focus:outline-none border-2 transition-all ${isDarkMode ? 'bg-white/5 text-white border-transparent focus:border-apple-blue/50' : 'bg-slate-50 text-slate-900 border-transparent focus:border-apple-blue/20'}`}
                    >
                      <option value={1}>1 min</option>
                      <option value={5}>5 mins</option>
                      <option value={15}>15 mins</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={`p-8 squircle-xl transition-all duration-500 border ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
                <h3 className={`font-bold text-lg mb-8 flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <div className="w-10 h-10 squircle-md bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Database className="w-5 h-5" />
                  </div>
                  {state.settings.language === 'ar' ? 'البيانات والتصدير' : 'Data & Export'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button 
                    onClick={exportToExcel}
                    className={`p-4 squircle-lg shadow-sm flex flex-col items-center gap-3 transition-all active:scale-95 hover:scale-105 ${isDarkMode ? 'bg-white/5 text-emerald-400 border border-white/5' : 'bg-slate-50 text-emerald-600 border border-black/5'}`}
                  >
                    <FileSpreadsheet className="w-6 h-6" />
                    <span className="text-[8px] font-bold uppercase tracking-widest">{state.settings.language === 'ar' ? 'Excel' : 'Excel'}</span>
                  </button>
                  <button 
                    onClick={exportToPDF}
                    className={`p-4 squircle-lg shadow-sm flex flex-col items-center gap-3 transition-all active:scale-95 hover:scale-105 ${isDarkMode ? 'bg-white/5 text-rose-400 border border-white/5' : 'bg-slate-50 text-rose-600 border border-black/5'}`}
                  >
                    <FileText className="w-6 h-6" />
                    <span className="text-[8px] font-bold uppercase tracking-widest">{state.settings.language === 'ar' ? 'PDF' : 'PDF'}</span>
                  </button>
                  <button 
                    onClick={exportToAdmin}
                    className={`p-4 squircle-lg shadow-sm flex flex-col items-center gap-3 transition-all active:scale-95 hover:scale-105 ${isDarkMode ? 'bg-white/5 text-apple-blue border border-white/5' : 'bg-slate-50 text-apple-blue border border-black/5'}`}
                  >
                    <FileUp className="w-6 h-6" />
                    <span className="text-[8px] font-bold uppercase tracking-widest">{state.settings.language === 'ar' ? 'تقرير الإدارة' : 'Admin Report'}</span>
                  </button>
                  <button 
                    onClick={exportBackup}
                    className={`p-4 squircle-lg shadow-sm flex flex-col items-center gap-3 transition-all active:scale-95 hover:scale-105 ${isDarkMode ? 'bg-white/5 text-apple-gray border border-white/5' : 'bg-slate-50 text-apple-gray border border-black/5'}`}
                  >
                    <Download className="w-6 h-6" />
                    <span className="text-[8px] font-bold uppercase tracking-widest">{state.settings.language === 'ar' ? 'Backup' : 'Backup'}</span>
                  </button>
                </div>
              </div>

              <div className={`p-8 squircle-xl transition-all duration-500 border md:col-span-2 ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
                <h3 className={`font-bold text-lg mb-8 flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <div className="w-10 h-10 squircle-md bg-apple-blue/10 flex items-center justify-center text-apple-blue">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  {state.settings.language === 'ar' ? 'البيانات الشخصية والمهنية' : 'Personal & Professional Info'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.gender === 'male' ? (state.settings.language === 'ar' ? 'اسم المعلم' : 'Teacher Name') : (state.settings.language === 'ar' ? 'اسم المعلمة' : 'Teacher Name')}</label>
                    <input 
                      type="text"
                      value={state.settings.teacherName}
                      onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, teacherName: e.target.value } }))}
                      className={`w-full p-3 squircle-md text-sm font-medium focus:outline-none border-2 transition-all ${isDarkMode ? 'bg-white/5 text-white border-transparent focus:border-apple-blue/50' : 'bg-slate-50 text-slate-900 border-transparent focus:border-apple-blue/20'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.language === 'ar' ? 'اسم المدرسة' : 'School Name'}</label>
                    <input 
                      type="text"
                      value={state.settings.schoolName}
                      onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, schoolName: e.target.value } }))}
                      className={`w-full p-3 squircle-md text-sm font-medium focus:outline-none border-2 transition-all ${isDarkMode ? 'bg-white/5 text-white border-transparent focus:border-apple-blue/50' : 'bg-slate-50 text-slate-900 border-transparent focus:border-apple-blue/20'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.language === 'ar' ? 'المادة الدراسية' : 'Subject'}</label>
                    <input 
                      type="text"
                      value={state.settings.subjectName}
                      onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, subjectName: e.target.value } }))}
                      className={`w-full p-3 squircle-md text-sm font-medium focus:outline-none border-2 transition-all ${isDarkMode ? 'bg-white/5 text-white border-transparent focus:border-apple-blue/50' : 'bg-slate-50 text-slate-900 border-transparent focus:border-apple-blue/20'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.language === 'ar' ? 'الجنس' : 'Gender'}</label>
                    <div className="flex gap-2">
                      {(['male', 'female'] as const).map(g => (
                        <button
                          key={g}
                          onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, gender: g } }))}
                          className={`flex-1 py-2.5 squircle-md text-[10px] font-bold uppercase tracking-widest transition-all ${state.settings.gender === g ? 'bg-apple-blue text-white' : (isDarkMode ? 'bg-white/5 text-apple-gray' : 'bg-slate-100 text-apple-gray')}`}
                        >
                          {g === 'male' ? (state.settings.language === 'ar' ? 'معلم' : 'Male') : (state.settings.language === 'ar' ? 'معلمة' : 'Female')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.language === 'ar' ? 'نوع الطلاب' : 'Student Type'}</label>
                    <div className="flex gap-2">
                      {(['boys', 'girls', 'mixed'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, studentGender: st } }))}
                          className={`flex-1 py-2.5 squircle-md text-[10px] font-bold uppercase tracking-widest transition-all ${state.settings.studentGender === st ? 'bg-apple-blue text-white' : (isDarkMode ? 'bg-white/5 text-apple-gray' : 'bg-slate-100 text-apple-gray')}`}
                        >
                          {st === 'boys' ? (state.settings.language === 'ar' ? 'طلاب' : 'Boys') : st === 'girls' ? (state.settings.language === 'ar' ? 'طالبات' : 'Girls') : (state.settings.language === 'ar' ? 'مختلط' : 'Mixed')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.language === 'ar' ? 'المرحلة' : 'Level'}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['primary', 'middle', 'high', 'all'] as const).map(l => (
                        <button
                          key={l}
                          onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, educationalLevel: l } }))}
                          className={`py-2.5 squircle-md text-[10px] font-bold uppercase tracking-widest transition-all ${state.settings.educationalLevel === l ? 'bg-apple-blue text-white' : (isDarkMode ? 'bg-white/5 text-apple-gray' : 'bg-slate-100 text-apple-gray')}`}
                        >
                          {l === 'primary' ? (state.settings.language === 'ar' ? 'ابتدائي' : 'Primary') : 
                           l === 'middle' ? (state.settings.language === 'ar' ? 'متوسط' : 'Middle') : 
                           l === 'high' ? (state.settings.language === 'ar' ? 'ثانوي' : 'High') :
                           (state.settings.language === 'ar' ? 'جميع المراحل' : 'All')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-8 squircle-xl transition-all duration-500 border md:col-span-2 ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
                <h3 className={`font-bold text-lg mb-8 flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <div className="w-10 h-10 squircle-md bg-purple-500/10 flex items-center justify-center text-purple-600">
                    <Printer className="w-5 h-5" />
                  </div>
                  {state.settings.language === 'ar' ? 'نماذج التقارير والطباعة' : 'Report Templates & Printing'}
                </h3>
                <p className="text-[10px] font-bold text-apple-gray uppercase tracking-widest mb-6 px-1">
                  {state.settings.language === 'ar' ? 'اختر النمط المفضل لتقاريرك المطبوعة لضمان جمالية واحترافية عالية' : 'Choose your preferred style for printed reports to ensure beauty and high professionalism'}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {(['modern', 'classic', 'professional', 'colorful'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, reportTemplate: t } }))}
                      className={`p-5 squircle-xl border-2 transition-all flex flex-col items-center gap-3 relative overflow-hidden group ${
                        state.settings.reportTemplate === t 
                        ? 'border-apple-blue bg-apple-blue/5' 
                        : 'border-transparent bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-10 h-10 squircle-md flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                        t === 'modern' ? 'bg-blue-500' : 
                        t === 'classic' ? 'bg-slate-800' : 
                        t === 'professional' ? 'bg-emerald-600' : 'bg-rose-500'
                      } text-white`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest ${state.settings.reportTemplate === t ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-apple-gray'}`}>
                        {t === 'modern' ? (state.settings.language === 'ar' ? 'عصري' : 'Modern') : 
                         t === 'classic' ? (state.settings.language === 'ar' ? 'كلاسيكي' : 'Classic') : 
                         t === 'professional' ? (state.settings.language === 'ar' ? 'احترافي' : 'Professional') : 
                         (state.settings.language === 'ar' ? 'ملون' : 'Colorful')}
                      </span>
                      {state.settings.reportTemplate === t && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-4 h-4 text-apple-blue" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-8 squircle-xl transition-all duration-500 border md:col-span-2 ${isDarkMode ? 'bg-apple-dark-card border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-sm'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{state.settings.language === 'ar' ? 'اللغة' : 'Language'}</p>
                      <p className="text-[10px] text-apple-gray font-bold uppercase tracking-widest">{state.settings.language === 'ar' ? 'العربية' : 'English'}</p>
                    </div>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, language: prev.settings.language === 'ar' ? 'en' : 'ar' } }))}
                      className="apple-btn-secondary px-8 py-2.5 text-[10px] uppercase tracking-widest"
                    >
                      {state.settings.language === 'ar' ? 'تبديل' : 'Switch'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 squircle-md bg-apple-blue/10 flex items-center justify-center text-apple-blue">
                        <Moon className="w-5 h-5" />
                      </div>
                      <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{state.settings.language === 'ar' ? 'الوضع الداكن' : 'Dark Mode'}</p>
                    </div>
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`w-14 h-7 rounded-full relative transition-all duration-500 ${isDarkMode ? 'bg-apple-blue' : 'bg-slate-200'}`}
                    >
                      <motion.div 
                        animate={{ x: isDarkMode ? 28 : 4 }}
                        className="absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

          </motion.div>
        </AnimatePresence>
        
        {/* Footer Credit */}
        <footer className="absolute bottom-6 left-0 right-0 text-center print:hidden">
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            تم التصميم من قبل ياقدها — جميع الحقوق محفوظة
          </p>
        </footer>
      </main>
      {/* Student Profile Modal */}
      <AnimatePresence>
        {isStudentProfileOpen && selectedStudentId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStudentProfileOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden squircle-2xl shadow-2xl border flex flex-col ${isDarkMode ? 'bg-apple-dark-card border-white/10' : 'bg-white border-black/5'}`}
            >
              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 squircle-xl bg-apple-blue flex items-center justify-center text-white shadow-xl shadow-apple-blue/20">
                      <UserIcon className="w-10 h-10" />
                    </div>
                    <div>
                      <h2 className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {state.students.find(s => s.id === selectedStudentId)?.name}
                      </h2>
                      <p className="text-sm font-bold text-apple-blue uppercase tracking-widest">
                        {state.classes.find(c => c.id === state.students.find(s => s.id === selectedStudentId)?.classId)?.name}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setIsStudentProfileOpen(false)} className="p-2 text-apple-gray hover:text-rose-500 transition-colors">
                    <XCircle className="w-8 h-8" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                  {/* Stats Column */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className={`p-6 squircle-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.language === 'ar' ? 'سجل التواصل مع الأهل' : 'Parent Communication Log'}</h4>
                        <button 
                          onClick={() => setIsAddCommunicationModalOpen(true)}
                          className="p-2 squircle-md bg-apple-blue/10 text-apple-blue hover:bg-apple-blue/20 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {state.parentCommunications
                          .filter(c => c.studentId === selectedStudentId)
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(comm => (
                            <div key={comm.id} className={`p-4 squircle-lg border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className={`text-[9px] font-bold px-2 py-0.5 squircle-sm ${
                                  comm.type === 'Call' ? 'bg-emerald-500/10 text-emerald-500' : 
                                  comm.type === 'WhatsApp' ? 'bg-apple-blue/10 text-apple-blue' : 
                                  'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {comm.type}
                                </span>
                                <span className="text-[8px] font-bold text-apple-gray">{new Date(comm.date).toLocaleDateString()}</span>
                              </div>
                              <p className={`text-[11px] font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{comm.summary}</p>
                              <p className="text-[9px] font-medium text-apple-gray italic">{comm.outcome}</p>
                            </div>
                          ))}
                        {state.parentCommunications.filter(c => c.studentId === selectedStudentId).length === 0 && (
                          <p className="text-[9px] font-bold text-apple-gray text-center py-4 uppercase tracking-widest opacity-50">
                            {state.settings.language === 'ar' ? 'لا يوجد سجل تواصل' : 'No communication log'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`p-6 squircle-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                      <h4 className="text-[10px] font-bold text-apple-gray uppercase tracking-widest mb-6">{state.settings.language === 'ar' ? 'ملخص الأداء' : 'Performance Summary'}</h4>
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-apple-gray">{state.settings.language === 'ar' ? 'نسبة الحضور' : 'Attendance'}</span>
                            <span className="text-xs font-bold text-apple-blue">{getStudentStats(selectedStudentId, state.sessionRecords).attendanceRate.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-apple-blue rounded-full" style={{ width: `${getStudentStats(selectedStudentId, state.sessionRecords).attendanceRate}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-apple-gray">{state.settings.language === 'ar' ? 'متوسط المشاركة' : 'Avg Participation'}</span>
                            <span className="text-xs font-bold text-amber-500">{getStudentStats(selectedStudentId, state.sessionRecords).avgParticipation.toFixed(1)}/5</span>
                          </div>
                          <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(getStudentStats(selectedStudentId, state.sessionRecords).avgParticipation / 5) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`p-6 squircle-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                      <h4 className="text-[10px] font-bold text-apple-gray uppercase tracking-widest mb-4">{state.settings.language === 'ar' ? 'التحليل الذكي' : 'AI Analysis'}</h4>
                      {isAILoading ? (
                        <div className="py-4 flex flex-col items-center gap-3">
                          <RefreshCw className="w-5 h-5 text-apple-blue animate-spin" />
                          <span className="text-[10px] font-bold text-apple-gray animate-pulse">Analyzing...</span>
                        </div>
                      ) : (
                        <p className="text-xs font-medium leading-relaxed opacity-80">
                          {aiResult || (state.settings.language === 'ar' ? 'اضغط على الزر أدناه لتوليد تحليل شامل.' : 'Click the button below to generate a full analysis.')}
                        </p>
                      )}
                      <button 
                        onClick={async () => {
                          setIsAILoading(true);
                          const student = state.students.find(s => s.id === selectedStudentId);
                          const stats = getStudentStats(selectedStudentId, state.sessionRecords);
                          const trend = getStudentTrend(selectedStudentId, state.sessionRecords);
                          const analysis = await analyzeStudentPerformance(student?.name || '', stats, trend);
                          setAiResult(analysis);
                          setIsAILoading(false);
                        }}
                        className="w-full mt-6 py-3 squircle-md bg-apple-blue text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-apple-blue/20 active:scale-95 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 inline mr-2" />
                        {state.settings.language === 'ar' ? 'تحديث التحليل' : 'Refresh Analysis'}
                      </button>
                    </div>
                  </div>

                  {/* Timeline Column */}
                  <div className="lg:col-span-2">
                    <div className={`p-6 squircle-xl border h-full ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/5'}`}>
                      <h4 className="text-[10px] font-bold text-apple-gray uppercase tracking-widest mb-8">{state.settings.language === 'ar' ? 'الجدول الزمني للحصة' : 'Session Timeline'}</h4>
                      <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-4 before:w-0.5 before:bg-black/5 dark:before:bg-white/5">
                        {state.sessionRecords
                          .filter(r => r.studentId === selectedStudentId)
                          .sort((a, b) => {
                            const dateA = state.sessions.find(s => s.id === a.sessionId)?.date || '';
                            const dateB = state.sessions.find(s => s.id === b.sessionId)?.date || '';
                            return new Date(dateB).getTime() - new Date(dateA).getTime();
                          })
                          .slice(0, 10)
                          .map((record, idx) => {
                            const session = state.sessions.find(s => s.id === record.sessionId);
                            return (
                              <div key={record.id} className="relative pl-12">
                                <div className={`absolute left-2.5 top-1 w-3.5 h-3.5 rounded-full border-4 ${isDarkMode ? 'border-apple-dark-card' : 'border-white'} ${record.attendance === 'Present' ? 'bg-emerald-500' : record.attendance === 'Absent' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                  <div>
                                    <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{session?.title}</p>
                                    <p className="text-[10px] font-bold text-apple-gray">{session ? new Date(session.date).toLocaleDateString(state.settings.language === 'ar' ? 'ar-SA' : 'en-US') : ''}</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <div key={i} className={`w-2 h-2 rounded-full ${i < record.participation ? 'bg-amber-400' : 'bg-black/10 dark:bg-white/10'}`} />
                                      ))}
                                    </div>
                                    <span className={`text-[9px] font-bold px-2 py-1 squircle-sm ${record.attendance === 'Present' ? 'bg-emerald-500/10 text-emerald-500' : record.attendance === 'Absent' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                      {record.attendance === 'Present' ? (state.settings.language === 'ar' ? 'حاضر' : 'Present') : record.attendance === 'Absent' ? (state.settings.language === 'ar' ? 'غائب' : 'Absent') : (state.settings.language === 'ar' ? 'متأخر' : 'Late')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        {state.sessionRecords.filter(r => r.studentId === selectedStudentId).length === 0 && (
                          <div className="py-12 text-center opacity-30">
                            <p className="text-[10px] font-bold uppercase tracking-widest">No History Yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`p-6 border-t flex justify-end gap-4 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                <button 
                  onClick={() => {
                    const student = state.students.find(s => s.id === selectedStudentId);
                    const stats = getStudentStats(selectedStudentId, state.sessionRecords);
                    const msg = generateParentMessage(student?.name || '', stats, state.settings.language);
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="apple-btn-secondary px-8 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  {state.settings.language === 'ar' ? 'مشاركة مع ولي الأمر' : 'Share with Parent'}
                </button>
                <button 
                  onClick={() => setIsStudentProfileOpen(false)}
                  className="apple-btn-primary px-8 py-3 text-[10px] font-bold uppercase tracking-widest"
                >
                  {state.settings.language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAttendanceModalOpen && selectedSessionId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAttendanceModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-2xl max-h-[85vh] overflow-hidden squircle-xl shadow-2xl border ${isDarkMode ? 'bg-apple-dark-card border-white/5' : 'bg-white border-black/5'}`}
            >
              <div className="p-8 overflow-y-auto max-h-[85vh]">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {state.settings.language === 'ar' ? 'رصد الحضور والمشاركة' : 'Attendance & Participation'}
                    </h2>
                    <button 
                      onClick={() => {
                        const grade = prompt(state.settings.language === 'ar' ? 'أدخل الدرجة لجميع الطلاب:' : 'Enter grade for all students:');
                        if (grade !== null) bulkGrade(selectedSessionId, parseInt(grade) || 0);
                      }}
                      className="px-4 py-2 squircle-md bg-apple-blue/10 text-apple-blue text-[10px] font-bold uppercase tracking-widest hover:bg-apple-blue/20 transition-all"
                    >
                      {state.settings.language === 'ar' ? 'رصد جماعي للدرجات' : 'Bulk Grade'}
                    </button>
                  </div>
                  <button onClick={() => setIsAttendanceModalOpen(false)} className="p-2 text-apple-gray hover:text-rose-500 transition-colors">
                    <XCircle className="w-7 h-7" />
                  </button>
                </div>

                <div className="space-y-4">
                  {state.students
                    .filter(s => s.classId === state.sessions.find(sess => sess.id === selectedSessionId)?.classId)
                    .map(student => {
                      const record = state.sessionRecords.find(r => r.sessionId === selectedSessionId && r.studentId === student.id);
                      return (
                        <div key={student.id} className={`p-5 squircle-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 squircle-md bg-apple-blue/10 flex items-center justify-center text-apple-blue font-bold">
                              {student.name.charAt(0)}
                            </div>
                            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.name}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-6">
                            <div className={`flex p-1 squircle-md ${isDarkMode ? 'bg-white/5' : 'bg-slate-200/50'}`}>
                              {(['Present', 'Absent', 'Late'] as const).map(status => (
                                <button
                                  key={status}
                                  onClick={() => handleRecordAttendance(selectedSessionId, student.id, status, record?.participation || 0)}
                                  className={`px-4 py-1.5 squircle-sm text-[10px] font-bold transition-all ${
                                    record?.attendance === status 
                                    ? (status === 'Present' ? 'bg-emerald-500 text-white shadow-sm' : status === 'Absent' ? 'bg-rose-500 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm')
                                    : 'text-apple-gray hover:bg-black/5'
                                  }`}
                                >
                                  {status === 'Present' ? (state.settings.language === 'ar' ? 'حاضر' : 'Present') : 
                                   status === 'Absent' ? (state.settings.language === 'ar' ? 'غائب' : 'Absent') : 
                                   (state.settings.language === 'ar' ? 'متأخر' : 'Late')}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.language === 'ar' ? 'الدرجة:' : 'Grade:'}</span>
                              <input 
                                type="number"
                                min="0"
                                max="100"
                                value={record?.grade || 0}
                                onChange={(e) => handleRecordAttendance(selectedSessionId, student.id, record?.attendance || 'Present', record?.participation || 0, record?.isDistinguished, parseInt(e.target.value) || 0)}
                                className={`w-14 p-2 squircle-md text-center text-xs font-bold focus:outline-none border-2 transition-all ${isDarkMode ? 'bg-white/5 text-white border-transparent focus:border-apple-blue/50' : 'bg-slate-100 text-slate-900 border-transparent focus:border-apple-blue/20'}`}
                              />
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{state.settings.language === 'ar' ? 'المشاركة:' : 'Participation:'}</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(score => (
                                  <button
                                    key={score}
                                    onClick={() => handleRecordAttendance(selectedSessionId, student.id, record?.attendance || 'Present', score, record?.isDistinguished)}
                                    className={`w-7 h-7 squircle-sm flex items-center justify-center text-[10px] font-bold transition-all ${
                                      (record?.participation || 0) >= score ? 'bg-amber-400 text-white shadow-sm' : (isDarkMode ? 'bg-white/10 text-white/30' : 'bg-slate-200 text-slate-400')
                                    }`}
                                  >
                                    {score}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button 
                              onClick={() => handleRecordAttendance(selectedSessionId, student.id, record?.attendance || 'Present', record?.participation || 0, !record?.isDistinguished)}
                              className={`p-2.5 squircle-md transition-all ${record?.isDistinguished ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/30 scale-110' : (isDarkMode ? 'bg-white/5 text-apple-gray' : 'bg-slate-200 text-slate-400')}`}
                            >
                              <Trophy className={`w-5 h-5 ${record?.isDistinguished ? 'animate-pulse' : ''}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Class Modal */}
      <AnimatePresence>
        {isAddClassModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddClassModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-md p-8 squircle-xl shadow-2xl border ${isDarkMode ? 'bg-apple-dark-card border-white/5' : 'bg-white border-black/5'}`}
            >
              <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {state.settings.language === 'ar' ? 'إضافة فصل جديد' : 'Add New Class'}
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'اسم الفصل' : 'Class Name'}
                  </label>
                  <input 
                    type="text"
                    value={newClass.name}
                    onChange={(e) => setNewClass(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                    placeholder={state.settings.language === 'ar' ? 'مثال: أول ثانوي' : 'e.g. Grade 10'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'المرحلة' : 'Level'}
                  </label>
                  <input 
                    type="text"
                    value={newClass.level}
                    onChange={(e) => setNewClass(prev => ({ ...prev, level: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                    placeholder={state.settings.language === 'ar' ? 'مثال: ثانوي' : 'e.g. High School'}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      if (newClass.name && newClass.level) {
                        addClass(newClass.name, newClass.level);
                        setIsAddClassModalOpen(false);
                      }
                    }}
                    className="apple-btn-primary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'إضافة' : 'Add'}
                  </button>
                  <button 
                    onClick={() => setIsAddClassModalOpen(false)}
                    className="apple-btn-secondary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Communication Modal */}
      <AnimatePresence>
        {isAddCommunicationModalOpen && selectedStudentId && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddCommunicationModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-md p-8 squircle-xl shadow-2xl border ${isDarkMode ? 'bg-apple-dark-card border-white/5' : 'bg-white border-black/5'}`}
            >
              <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {state.settings.language === 'ar' ? 'توثيق تواصل جديد' : 'Log New Communication'}
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'نوع التواصل' : 'Type'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Call', 'WhatsApp', 'Meeting', 'Email'] as const).map(t => (
                      <button 
                        key={t}
                        onClick={() => setNewCommunication(prev => ({ ...prev, type: t }))}
                        className={`py-3 squircle-md text-[10px] font-bold uppercase tracking-widest transition-all ${newCommunication.type === t ? 'bg-apple-blue text-white shadow-lg shadow-apple-blue/20' : (isDarkMode ? 'bg-white/5 text-apple-gray' : 'bg-slate-50 text-apple-gray')}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'ملخص التواصل' : 'Summary'}
                  </label>
                  <input 
                    type="text"
                    value={newCommunication.summary}
                    onChange={(e) => setNewCommunication(prev => ({ ...prev, summary: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                    placeholder={state.settings.language === 'ar' ? 'مثال: مناقشة تدني الدرجات' : 'e.g. Discussing low grades'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'النتيجة / التوصيات' : 'Outcome'}
                  </label>
                  <textarea 
                    value={newCommunication.outcome}
                    onChange={(e) => setNewCommunication(prev => ({ ...prev, outcome: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm h-24 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                    placeholder={state.settings.language === 'ar' ? 'مثال: وعد ولي الأمر بالمتابعة' : 'e.g. Parent promised to follow up'}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      if (newCommunication.summary) {
                        addCommunication(selectedStudentId, newCommunication.type, newCommunication.summary, newCommunication.outcome);
                        setIsAddCommunicationModalOpen(false);
                        setNewCommunication({ studentId: '', type: 'Call', summary: '', outcome: '' });
                      }
                    }}
                    className="apple-btn-primary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'حفظ' : 'Save'}
                  </button>
                  <button 
                    onClick={() => setIsAddCommunicationModalOpen(false)}
                    className="apple-btn-secondary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAddStudentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddStudentModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-md p-8 squircle-xl shadow-2xl border ${isDarkMode ? 'bg-apple-dark-card border-white/5' : 'bg-white border-black/5'}`}
            >
              <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {state.settings.language === 'ar' ? 'إضافة طالبة جديدة' : 'Add New Student'}
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'اسم الطالبة' : 'Student Name'}
                  </label>
                  <input 
                    type="text"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                    placeholder={state.settings.language === 'ar' ? 'أدخل الاسم الكامل' : 'Enter full name'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'الفصل' : 'Class'}
                  </label>
                  <select 
                    value={newStudent.classId}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, classId: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                  >
                    {state.classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      if (newStudent.name && newStudent.classId) {
                        addStudent(newStudent.name, newStudent.classId);
                        setIsAddStudentModalOpen(false);
                      }
                    }}
                    className="apple-btn-primary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'إضافة' : 'Add'}
                  </button>
                  <button 
                    onClick={() => setIsAddStudentModalOpen(false)}
                    className="apple-btn-secondary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Session Modal */}
      <AnimatePresence>
        {isAddSessionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddSessionModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-md p-8 squircle-xl shadow-2xl border ${isDarkMode ? 'bg-apple-dark-card border-white/5' : 'bg-white border-black/5'}`}
            >
              <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {state.settings.language === 'ar' ? 'تحضير حصة جديدة' : 'Prepare New Session'}
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'عنوان الدرس' : 'Lesson Title'}
                  </label>
                  <input 
                    type="text"
                    value={newSession.title}
                    onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                    placeholder={state.settings.language === 'ar' ? 'أدخل عنوان الدرس' : 'Enter lesson title'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'التاريخ' : 'Date'}
                  </label>
                  <input 
                    type="date"
                    value={newSession.date}
                    onChange={(e) => setNewSession(prev => ({ ...prev, date: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'الفصل' : 'Class'}
                  </label>
                  <select 
                    value={newSession.classId}
                    onChange={(e) => setNewSession(prev => ({ ...prev, classId: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                  >
                    {state.classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Resources Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">
                      {state.settings.language === 'ar' ? 'الموارد الإضافية' : 'Linked Resources'}
                    </label>
                    <button 
                      onClick={() => setIsAddResourceModalOpen(true)}
                      className="p-1.5 squircle-md bg-apple-blue/10 text-apple-blue hover:bg-apple-blue/20 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {newSession.resources.map((res, idx) => (
                      <div key={idx} className={`p-3 squircle-lg flex items-center justify-between gap-3 ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                          {res.type === 'Link' ? <LinkIcon className="w-4 h-4 text-apple-blue" /> : 
                           res.type === 'Video' ? <Video className="w-4 h-4 text-rose-500" /> :
                           res.type === 'Image' ? <Camera className="w-4 h-4 text-emerald-500" /> :
                           <FileText className="w-4 h-4 text-amber-500" />}
                          <div className="overflow-hidden">
                            <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{res.title}</p>
                            <p className="text-[9px] text-apple-gray truncate">{res.url}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setNewSession(prev => ({ ...prev, resources: prev.resources.filter((_, i) => i !== idx) }))}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 squircle-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {newSession.resources.length === 0 && (
                      <p className="text-[9px] text-apple-gray font-bold text-center py-4 border-2 border-dashed border-black/5 dark:border-white/5 squircle-lg">
                        {state.settings.language === 'ar' ? 'لا توجد موارد مضافة' : 'No resources added'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      if (newSession.title && newSession.classId) {
                        addSession(newSession.title, new Date(newSession.date).toISOString(), newSession.classId, newSession.resources);
                        setNewSession({ title: '', date: new Date().toISOString().split('T')[0], classId: '', resources: [] });
                        setIsAddSessionModalOpen(false);
                      }
                    }}
                    className="apple-btn-primary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'حفظ الحصة' : 'Save Session'}
                  </button>
                  <button 
                    onClick={() => setIsAddSessionModalOpen(false)}
                    className="apple-btn-secondary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Resource Modal */}
      <AnimatePresence>
        {isAddResourceModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddResourceModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-sm p-8 squircle-xl shadow-2xl border ${isDarkMode ? 'bg-apple-dark-card border-white/10' : 'bg-white border-black/10'}`}
            >
              <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {state.settings.language === 'ar' ? 'إضافة مورد' : 'Add Resource'}
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'نوع المورد' : 'Resource Type'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Link', 'Video', 'File', 'Image'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setNewResource(prev => ({ ...prev, type }))}
                        className={`py-3 squircle-md text-[10px] font-bold uppercase tracking-widest transition-all ${newResource.type === type ? 'bg-apple-blue text-white' : (isDarkMode ? 'bg-white/5 text-apple-gray' : 'bg-slate-100 text-apple-gray')}`}
                      >
                        {type === 'Link' ? (state.settings.language === 'ar' ? 'رابط' : 'Link') : 
                         type === 'Video' ? (state.settings.language === 'ar' ? 'فيديو' : 'Video') :
                         type === 'File' ? (state.settings.language === 'ar' ? 'ملف' : 'File') :
                         (state.settings.language === 'ar' ? 'صورة' : 'Image')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'العنوان' : 'Title'}
                  </label>
                  <input 
                    type="text"
                    value={newResource.title}
                    onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                    placeholder={state.settings.language === 'ar' ? 'اسم المورد (مثلاً: شرح اليوتيوب)' : 'Resource title (e.g., YouTube Explainer)'}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'الرابط (URL)' : 'URL'}
                  </label>
                  <input 
                    type="url"
                    value={newResource.url}
                    onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      if (newResource.title && newResource.url) {
                        const res = { ...newResource, id: Date.now().toString() };
                        if (entityToEdit && entityToEdit.type === 'SESSION') {
                          setEntityToEdit(prev => prev ? ({
                            ...prev,
                            data: {
                              ...prev.data,
                              resources: [...(prev.data.resources || []), res]
                            }
                          }) : null);
                        } else {
                          setNewSession(prev => ({ ...prev, resources: [...prev.resources, res] }));
                        }
                        setNewResource({ title: '', type: 'Link', url: '' });
                        setIsAddResourceModalOpen(false);
                      }
                    }}
                    className="apple-btn-primary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'إضافة' : 'Add'}
                  </button>
                  <button 
                    onClick={() => setIsAddResourceModalOpen(false)}
                    className="apple-btn-secondary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Evidence Modal */}
      <AnimatePresence>
        {isAddEvidenceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddEvidenceModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-md p-8 squircle-xl shadow-2xl border ${isDarkMode ? 'bg-apple-dark-card border-white/5' : 'bg-white border-black/5'}`}
            >
              <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {state.settings.language === 'ar' ? 'إضافة شاهد جديد' : 'Add New Evidence'}
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'العنوان' : 'Title'}
                  </label>
                  <input 
                    type="text"
                    value={newEvidence.title}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                    placeholder={state.settings.language === 'ar' ? 'مثال: دورة تدريبية' : 'e.g. Training Course'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'التصنيف' : 'Category'}
                  </label>
                  <select 
                    value={newEvidence.category}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, category: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                  >
                    <option value="General">{state.settings.language === 'ar' ? 'عام' : 'General'}</option>
                    <option value="Course">{state.settings.language === 'ar' ? 'دورة تدريبية' : 'Course'}</option>
                    <option value="Initiative">{state.settings.language === 'ar' ? 'مبادرة' : 'Initiative'}</option>
                    <option value="Achievement">{state.settings.language === 'ar' ? 'إنجاز' : 'Achievement'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'الوصف' : 'Description'}
                  </label>
                  <textarea 
                    value={newEvidence.description}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full p-4 squircle-md focus:outline-none font-bold h-24 resize-none text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                    placeholder={state.settings.language === 'ar' ? 'اكتب تفاصيل الشاهد...' : 'Write evidence details...'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                    {state.settings.language === 'ar' ? 'إرفاق ملف' : 'Attach File'}
                  </label>
                  <div className={`p-4 squircle-md border-2 border-dashed flex flex-col items-center gap-2 transition-all relative ${isDarkMode ? 'border-white/10 hover:border-apple-blue' : 'border-slate-300 hover:border-apple-blue'}`}>
                    <FileUp className="w-6 h-6 text-apple-gray" />
                    <span className="text-[10px] font-bold text-apple-gray">
                      {newEvidence.fileName || (state.settings.language === 'ar' ? 'اضغط لرفع ملف من الايباد' : 'Tap to upload from iPad')}
                    </span>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleEvidenceFileChange} />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      if (newEvidence.title && newEvidence.category) {
                        addEvidence(newEvidence.title, newEvidence.description, newEvidence.category, newEvidence.date, newEvidence.fileName, newEvidence.fileUrl);
                        setIsAddEvidenceModalOpen(false);
                      }
                    }}
                    className="apple-btn-primary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'حفظ' : 'Save'}
                  </button>
                  <button 
                    onClick={() => setIsAddEvidenceModalOpen(false)}
                    className="apple-btn-secondary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && entityToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-sm p-8 squircle-xl shadow-2xl text-center border ${isDarkMode ? 'bg-apple-dark-card border-white/5' : 'bg-white border-black/5'}`}
            >
              <div className="w-16 h-16 bg-rose-500/10 squircle-xl flex items-center justify-center mx-auto mb-6 text-rose-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {state.settings.language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
              </h2>
              <p className="text-sm font-bold text-apple-gray mb-8">
                {state.settings.language === 'ar' 
                  ? `هل أنت متأكد من حذف "${entityToDelete.name}"؟ لا يمكن التراجع عن هذا الإجراء.` 
                  : `Are you sure you want to delete "${entityToDelete.name}"? This action cannot be undone.`}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={deleteEntity}
                  className="flex-1 py-3 squircle-md bg-rose-500 text-white font-bold active:scale-95 transition-transform shadow-lg shadow-rose-500/20"
                >
                  {state.settings.language === 'ar' ? 'حذف' : 'Delete'}
                </button>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="apple-btn-secondary flex-1 py-3 text-xs uppercase tracking-widest"
                >
                  {state.settings.language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && entityToEdit && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-md p-8 squircle-xl shadow-2xl border ${isDarkMode ? 'bg-apple-dark-card border-white/5' : 'bg-white border-black/5'}`}
            >
              <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {state.settings.language === 'ar' ? 'تعديل البيانات' : 'Edit Details'}
              </h2>
              <div className="space-y-6">
                {entityToEdit.type === 'CLASS' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                        {state.settings.language === 'ar' ? 'اسم الفصل' : 'Class Name'}
                      </label>
                      <input 
                        type="text"
                        value={entityToEdit.data.name}
                        onChange={(e) => setEntityToEdit(prev => prev ? ({ ...prev, data: { ...prev.data, name: e.target.value } }) : null)}
                        className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                        {state.settings.language === 'ar' ? 'المرحلة' : 'Level'}
                      </label>
                      <input 
                        type="text"
                        value={entityToEdit.data.level}
                        onChange={(e) => setEntityToEdit(prev => prev ? ({ ...prev, data: { ...prev.data, level: e.target.value } }) : null)}
                        className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                      />
                    </div>
                  </>
                )}
                {entityToEdit.type === 'STUDENT' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                        {state.settings.language === 'ar' ? 'اسم الطالبة' : 'Student Name'}
                      </label>
                      <input 
                        type="text"
                        value={entityToEdit.data.name}
                        onChange={(e) => setEntityToEdit(prev => prev ? ({ ...prev, data: { ...prev.data, name: e.target.value } }) : null)}
                        className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                        {state.settings.language === 'ar' ? 'الفصل' : 'Class'}
                      </label>
                      <select 
                        value={entityToEdit.data.classId}
                        onChange={(e) => setEntityToEdit(prev => prev ? ({ ...prev, data: { ...prev.data, classId: e.target.value } }) : null)}
                        className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                      >
                        {state.classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                {entityToEdit.type === 'SESSION' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                        {state.settings.language === 'ar' ? 'عنوان الحصة' : 'Session Title'}
                      </label>
                      <input 
                        type="text"
                        value={entityToEdit.data.title}
                        onChange={(e) => setEntityToEdit(prev => prev ? ({ ...prev, data: { ...prev.data, title: e.target.value } }) : null)}
                        className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                        {state.settings.language === 'ar' ? 'التاريخ' : 'Date'}
                      </label>
                      <input 
                        type="date"
                        value={new Date(entityToEdit.data.date).toISOString().split('T')[0]}
                        onChange={(e) => setEntityToEdit(prev => prev ? ({ ...prev, data: { ...prev.data, date: new Date(e.target.value).toISOString() } }) : null)}
                        className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                      />
                    </div>

                    {/* Resources Section in Edit Modal */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">
                          {state.settings.language === 'ar' ? 'الموارد الإضافية' : 'Linked Resources'}
                        </label>
                        <button 
                          onClick={() => setIsAddResourceModalOpen(true)}
                          className="p-1.5 squircle-md bg-apple-blue/10 text-apple-blue hover:bg-apple-blue/20 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {(entityToEdit.data.resources || []).map((res: any, idx: number) => (
                          <div key={idx} className={`p-3 squircle-lg flex items-center justify-between gap-3 ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                              {res.type === 'Link' ? <LinkIcon className="w-4 h-4 text-apple-blue" /> : 
                               res.type === 'Video' ? <Video className="w-4 h-4 text-rose-500" /> :
                               res.type === 'Image' ? <Camera className="w-4 h-4 text-emerald-500" /> :
                               <FileText className="w-4 h-4 text-amber-500" />}
                              <div className="overflow-hidden">
                                <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{res.title}</p>
                                <p className="text-[9px] text-apple-gray truncate">{res.url}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setEntityToEdit(prev => prev ? ({
                                ...prev,
                                data: {
                                  ...prev.data,
                                  resources: prev.data.resources.filter((_: any, i: number) => i !== idx)
                                }
                              }) : null)}
                              className="p-1.5 text-rose-500 hover:bg-rose-500/10 squircle-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {(!entityToEdit.data.resources || entityToEdit.data.resources.length === 0) && (
                          <p className="text-[9px] text-apple-gray font-bold text-center py-4 border-2 border-dashed border-black/5 dark:border-white/5 squircle-lg">
                            {state.settings.language === 'ar' ? 'لا توجد موارد مضافة' : 'No resources added'}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {entityToEdit.type === 'EVIDENCE' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                        {state.settings.language === 'ar' ? 'العنوان' : 'Title'}
                      </label>
                      <input 
                        type="text"
                        value={entityToEdit.data.title}
                        onChange={(e) => setEntityToEdit(prev => prev ? ({ ...prev, data: { ...prev.data, title: e.target.value } }) : null)}
                        className={`w-full p-4 squircle-md focus:outline-none font-bold text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-apple-gray mb-2 uppercase tracking-widest">
                        {state.settings.language === 'ar' ? 'الوصف' : 'Description'}
                      </label>
                      <textarea 
                        value={entityToEdit.data.description}
                        onChange={(e) => setEntityToEdit(prev => prev ? ({ ...prev, data: { ...prev.data, description: e.target.value } }) : null)}
                        className={`w-full p-4 squircle-md focus:outline-none font-bold h-24 resize-none text-sm ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'}`}
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => editEntity(entityToEdit.data)}
                    className="apple-btn-primary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'حفظ' : 'Save'}
                  </button>
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="apple-btn-secondary flex-1 py-4 text-xs uppercase tracking-widest"
                  >
                    {state.settings.language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* Print Layer - Secretly Rendered but only visible to Printer */}
        <div className={`print-only template-${state.settings.reportTemplate || 'professional'}`} dir={state.settings.language === 'ar' ? 'rtl' : 'ltr'}>
          <header className="header">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-black mb-2">{state.settings.schoolName || (state.settings.language === 'ar' ? 'تقرير المدرسة الأكاديمي' : 'School Academic Report')}</h1>
                <p className="text-xl font-bold opacity-80">{state.settings.subjectName || (state.settings.language === 'ar' ? 'تقرير المادة الدراسية' : 'Subject Report')}</p>
              </div>
              <div className="text-left rtl:text-right">
                <p className="text-lg font-bold">{state.settings.language === 'ar' ? 'المعلم/ة' : 'Teacher'}: {state.settings.teacherName}</p>
                <p className="text-sm font-medium opacity-60">{new Date().toLocaleDateString('ar-SA')}</p>
              </div>
            </div>
          </header>

          <section className="mb-12">
            <h2 className="text-2xl font-black mb-6 border-b-2 border-black pb-2">{state.settings.language === 'ar' ? 'ملخص الأداء العام للمادة' : 'General Performance Summary'}</h2>
            <div className="grid grid-cols-4 gap-6">
              <div className="p-6 border-2 border-black/10 rounded-2xl text-center">
                <p className="text-[10px] font-black uppercase opacity-60 mb-2">{state.settings.language === 'ar' ? 'إجمالي المحصلة' : 'Total Students'}</p>
                <p className="text-3xl font-black">{state.students.length}</p>
              </div>
              <div className="p-6 border-2 border-black/10 rounded-2xl text-center">
                <p className="text-[10px] font-black uppercase opacity-60 mb-2">{state.settings.language === 'ar' ? 'الحضور اليوم' : 'Attendance Today'}</p>
                <p className="text-3xl font-black text-emerald-600">{attendanceStats.attendanceToday}</p>
              </div>
              <div className="p-6 border-2 border-black/10 rounded-2xl text-center">
                <p className="text-[10px] font-black uppercase opacity-60 mb-2">{state.settings.language === 'ar' ? 'متوسط المشاركة' : 'Avg Participation'}</p>
                <p className="text-3xl font-black text-apple-blue">{attendanceStats.avgParticipation}/5</p>
              </div>
              <div className="p-6 border-2 border-black/10 rounded-2xl text-center">
                <p className="text-[10px] font-black uppercase opacity-60 mb-2">{state.settings.language === 'ar' ? 'حالات الغياب' : 'Total Absences'}</p>
                <p className="text-3xl font-black text-rose-500">{attendanceStats.totalAbsences}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-6 border-b-2 border-black pb-2">{state.settings.language === 'ar' ? 'جدول سجل الطالبات والنتائج التحليلية' : 'Analysis & Students Results Table'}</h2>
            <table>
              <thead>
                <tr>
                  <th>{state.settings.language === 'ar' ? 'اسم الطالبة' : 'Name'}</th>
                  <th>{state.settings.language === 'ar' ? 'الفصل' : 'Class'}</th>
                  <th>{state.settings.language === 'ar' ? 'نسبة المواظبة' : 'Attendance'}</th>
                  <th>{state.settings.language === 'ar' ? 'تفاعل الحصة' : 'Participation'}</th>
                  <th>{state.settings.language === 'ar' ? 'التقدير العام' : 'General Evaluation'}</th>
                </tr>
              </thead>
              <tbody>
                {state.students.map(s => {
                  const stats = getStudentStats(s.id, state.sessionRecords);
                  return (
                    <tr key={s.id}>
                      <td className="font-extrabold">{s.name}</td>
                      <td>{state.classes.find(c => c.id === s.classId)?.name || '---'}</td>
                      <td className="font-bold">{stats.attendanceRate.toFixed(1)}%</td>
                      <td className="font-bold">{stats.avgParticipation.toFixed(1)}/5</td>
                      <td className={`font-black ${stats.attendanceRate > 90 ? 'text-emerald-600' : stats.attendanceRate > 75 ? 'text-apple-blue' : 'text-amber-600'}`}>
                        {stats.attendanceRate > 90 ? (state.settings.language === 'ar' ? 'متميز جداً' : 'Excellent') : stats.attendanceRate > 75 ? (state.settings.language === 'ar' ? 'جيد جداً' : 'Very Good') : (state.settings.language === 'ar' ? 'مرضي' : 'Satisfactory')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <footer className="mt-20 text-center">
            <p className="text-xs font-bold opacity-30 tracking-[0.2em] uppercase mb-1">
              Generated via YaQaddha Education Intelligence System
            </p>
            <p className="text-[10px] font-bold opacity-20 italic">
              {state.settings.language === 'ar' ? 'هذا التقرير معتمد برمجياً وحسابياً' : 'This report is computationally verified and certified.'}
            </p>
          </footer>
        </div>

      </AnimatePresence>
    </div>
  );
}



