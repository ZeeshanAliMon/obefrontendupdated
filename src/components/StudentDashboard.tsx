import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  BookOpen, 
  LogOut, 
  Sparkles,
  Award,
  BookMarked,
  UserCheck,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Percent,
  Calendar,
  Layers,
  Award as PlaqueIcon,
  MapPin,
  ClipboardCheck,
  FileText
} from 'lucide-react';
import { Student, Course, Program, Department, InstructorCourse, UnitItem } from '../types';
import { apiService } from '../services/apiService';

const normalizeRegNo = (reg: string) => {
  if (!reg) return '';
  return reg.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

function naturalCompare(s1: string, s2: string): number {
  const aParts = s1.split(/(\d+)/);
  const bParts = s2.split(/(\d+)/);
  const length = Math.min(aParts.length, bParts.length);
  for (let i = 0; i < length; i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];
    if (aPart !== bPart) {
      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return aPart.localeCompare(bPart);
    }
  }
  return aParts.length - bParts.length;
}

const normalizeStudentCourse = (sc: any, matchingLocalCourse: any, regToUse: string, matchingStudentName: string): InstructorCourse => {
  const code = String(sc.code || matchingLocalCourse?.code || '').trim().toUpperCase();
  const title = sc.title || matchingLocalCourse?.title || '';
  
  let courseType: 'Theory' | 'Lab' = 'Theory';
  const titleStr = String(title).trim().toLowerCase();
  if (code.endsWith('L') || titleStr.includes('lab')) {
    courseType = 'Lab';
  } else {
    const raw = sc.courseType || sc.course_subtype || sc.courseSubtype || sc.subtype || sc.course_type || matchingLocalCourse?.courseType;
    if (raw) {
      courseType = String(raw).toLowerCase().includes('lab') ? 'Lab' : 'Theory';
    }
  }

  const THEORY_CATEGORY_NAMES = ["Assignments", "Quizzes", "Class Participation", "Class Project", "Presentation", "Mid Term", "Final"];
  const LAB_CATEGORY_NAMES = ["Mid Term", "Final", "Lab Reports", "Lab Performance", "Viva", "Assignments", "Quizzes", "Open Ended Lab", "Other Activities", "Project"];
  const allowedNames = courseType === 'Lab' ? LAB_CATEGORY_NAMES : THEORY_CATEGORY_NAMES;

  const rawCategories = matchingLocalCourse?.categories || sc.categories || sc.categories || [];
  let updatedCategories = rawCategories.filter((c: any) => 
    c.name !== 'Sessionals' && 
    c.name !== 'Sessional' &&
    allowedNames.includes(c.name)
  );

  const INITIAL_CATEGORIES = [
    { name: "Assignments", percentage: 15, units: 3 },
    { name: "Quizzes", percentage: 10, units: 3 },
    { name: "Class Participation", percentage: 5, units: 1 },
    { name: "Class Project", percentage: 15, units: 1 },
    { name: "Presentation", percentage: 5, units: 1 },
    { name: "Mid Term", percentage: 20, units: 1 },
    { name: "Final", percentage: 30, units: 1 }
  ];
  const INITIAL_LAB_CATEGORIES = [
    { name: "Mid Term", percentage: 20, units: 1 },
    { name: "Final", percentage: 30, units: 1 },
    { name: "Lab Reports", percentage: 10, units: 3 },
    { name: "Lab Performance", percentage: 10, units: 3 },
    { name: "Viva", percentage: 5, units: 1 },
    { name: "Assignments", percentage: 5, units: 3 },
    { name: "Quizzes", percentage: 5, units: 3 },
    { name: "Open Ended Lab", percentage: 5, units: 1 },
    { name: "Other Activities", percentage: 5, units: 1 },
    { name: "Project", percentage: 5, units: 1 }
  ];
  const typeCats = courseType === 'Lab' ? INITIAL_LAB_CATEGORIES : INITIAL_CATEGORIES;

  typeCats.forEach(initCat => {
    const exists = updatedCategories.some((c: any) => c.name === initCat.name);
    if (!exists) {
      updatedCategories.push({ ...initCat });
    }
  });

  const catOrder = typeCats.map(c => c.name);
  updatedCategories.sort((a: any, b: any) => catOrder.indexOf(a.name) - catOrder.indexOf(b.name));

  const rawObeQuestions = matchingLocalCourse?.obeQuestions || sc.obeQuestions || sc.obe_questions || [];
  const parsedObeQuestions = rawObeQuestions.map((q: any) => {
    return {
      id: q.id || '',
      categoryName: q.categoryName || q.category_name || '',
      unitNo: q.unitNo !== undefined ? q.unitNo : (q.unit_no !== undefined ? q.unit_no : 1),
      questionName: q.questionName || q.question_name || q.name || '',
      maxMarks: q.maxMarks !== undefined ? q.maxMarks : (q.max_marks !== undefined ? q.max_marks : 10),
      mappedCLOs: q.mappedCLOs || q.mapped_clos || q.mappedClos || []
    };
  });

  const rawUnitsData = matchingLocalCourse?.unitsData || sc.unitsData || sc.units_data || {};
  const updatedUnitsData: Record<string, UnitItem[]> = {};

  updatedCategories.forEach((cat: any) => {
    const key = cat.name;
    const numUnits = cat.units || 0;
    const rawList = rawUnitsData[key] || [];
    const unitsList: UnitItem[] = [];

    for (let uNo = 1; uNo <= numUnits; uNo++) {
      const rawUnit = Array.isArray(rawList) ? rawList.find((ru: any) => {
        const rNo = ru.unitNo !== undefined ? ru.unitNo : (ru.unit_no !== undefined ? ru.unit_no : 1);
        return rNo === uNo;
      }) : null;

      const unitNo = uNo;
      const passing = rawUnit?.passing !== undefined ? rawUnit.passing : (rawUnit?.passing_marks !== undefined ? rawUnit.passing_marks : 5);
      const totalMarks = rawUnit?.totalMarks !== undefined ? rawUnit.totalMarks : (rawUnit?.total_marks !== undefined ? rawUnit.total_marks : 10);
      const weightage = rawUnit?.weightage !== undefined ? rawUnit.weightage : (numUnits > 0 ? parseFloat((100 / numUnits).toFixed(1)) : 0);
      const mappedCLOs = rawUnit?.mappedCLOs || rawUnit?.mapped_clos || rawUnit?.mappedClos || [];

      let rawQs = rawUnit?.questions || rawUnit?.unit_questions || [];

      if ((!rawQs || rawQs.length === 0) && parsedObeQuestions.length > 0) {
        const matchingObeQs = parsedObeQuestions.filter(
          (oq: any) => oq.categoryName === key && oq.unitNo === unitNo
        );
        if (matchingObeQs.length > 0) {
          rawQs = matchingObeQs.map((oq: any) => ({
            id: oq.id,
            name: oq.questionName,
            maxMarks: oq.maxMarks,
            mappedCLOs: oq.mappedCLOs
          }));
        }
      }

      const questions = (rawQs || []).map((q: any) => {
        const qCLOs = q.mappedCLOs || q.mapped_clos || q.mappedClos || [];
        return {
          id: q.id || '',
          name: q.name || q.questionName || q.question_name || '',
          maxMarks: q.maxMarks !== undefined ? q.maxMarks : (q.max_marks !== undefined ? q.max_marks : 10),
          mappedCLOs: qCLOs.length > 0 ? [qCLOs[0]] : []
        };
      });

      const finalUnitMappedCLOs = questions.length > 0
        ? [...new Set(questions.flatMap((q: any) => q.mappedCLOs))].sort()
        : (mappedCLOs.length > 0 ? [mappedCLOs[0]] : ['CLO-1']);

      unitsList.push({
        unitNo,
        passing,
        totalMarks,
        weightage,
        mappedCLOs: finalUnitMappedCLOs as string[],
        questions
      });
    }

    updatedUnitsData[key] = unitsList;
  });

  typeCats.forEach(initCat => {
    if (!updatedUnitsData[initCat.name]) {
      updatedUnitsData[initCat.name] = [];
    }
  });

  const collectedQuestionsFromUnits: any[] = [];
  Object.keys(updatedUnitsData).forEach(catName => {
    const units = updatedUnitsData[catName] || [];
    units.forEach(u => {
      const qList = u.questions || [];
      qList.forEach(q => {
        collectedQuestionsFromUnits.push({
          id: q.id,
          categoryName: catName,
          unitNo: u.unitNo,
          questionName: q.name,
          maxMarks: q.maxMarks,
          mappedCLOs: q.mappedCLOs || []
        });
      });
    });
  });

  const normalizedObeQuestions = [...collectedQuestionsFromUnits];
  parsedObeQuestions.forEach((pq: any) => {
    const alreadyCollected = normalizedObeQuestions.some(
      fq => fq.id === pq.id || (fq.categoryName === pq.categoryName && fq.unitNo === pq.unitNo && fq.questionName === pq.questionName)
    );
    if (!alreadyCollected) {
      normalizedObeQuestions.push(pq);
    }
  });

  const rawObeMarks = sc.obeMarks || sc.obe_marks || matchingLocalCourse?.obeMarks || matchingLocalCourse?.obe_marks || {};
  const rawStudents = sc.students || matchingLocalCourse?.students || [];
  
  const matchedStudent = rawStudents.find((s: any) => normalizeRegNo(s.regNo || s.reg_no) === normalizeRegNo(regToUse));
  
  // Prefer fresh server-side student marks first!
  const serverMarks = sc.studentMarks || sc.student_marks || sc.marks || sc.obtained_marks || sc.obtainedMarks || null;
  const studentMarks = {
    ...(matchedStudent?.marks || matchedStudent?.obtained_marks || matchedStudent?.obtainedMarks || {}),
    ...(serverMarks || {})
  };

  const matchedObeKey = Object.keys(rawObeMarks).find(k => normalizeRegNo(k) === normalizeRegNo(regToUse));
  const studentObeMarks = matchedObeKey ? rawObeMarks[matchedObeKey] : {};
  
  Object.entries(studentObeMarks).forEach(([qId, score]) => {
    const matchingQ = normalizedObeQuestions.find(q => q.id === qId);
    if (matchingQ) {
      const key = `q-${matchingQ.categoryName}-${matchingQ.unitNo}-${qId}`;
      studentMarks[key] = Number(score);
    } else {
      const fallbackQ = parsedObeQuestions.find((q: any) => q.id === qId);
      if (fallbackQ) {
        const key = `q-${fallbackQ.categoryName}-${fallbackQ.unitNo}-${qId}`;
        studentMarks[key] = Number(score);
      }
    }
  });

  const pId = sc.programId || sc.program_id || matchingLocalCourse?.programId || 'bscs';
  const dId = sc.departmentId || sc.department_id || matchingLocalCourse?.departmentId || 'computing';
  const creditHours = sc.creditHours || sc.credit_hours || matchingLocalCourse?.creditHours || 3;
  const cloCount = sc.cloCount || sc.clo_count || matchingLocalCourse?.cloCount || 4;
  const academicYear = sc.academicYear || sc.academic_year || matchingLocalCourse?.academicYear || '';
  const selectedGradingSystem = sc.selectedGradingSystem || sc.selected_grading_system || matchingLocalCourse?.selectedGradingSystem || 'ready1';
  const customGradingSystem = sc.customGradingSystem || sc.custom_grading_system || matchingLocalCourse?.customGradingSystem || [];

  return {
    id: sc.id || matchingLocalCourse?.id || `course-assigned-${code}`,
    code,
    title,
    courseType,
    departmentId: dId,
    departmentName: sc.departmentName || sc.department_name || matchingLocalCourse?.departmentName || '',
    programId: pId,
    programName: sc.programName || sc.program_name || matchingLocalCourse?.programName || '',
    creditHours,
    cloCount,
    academicYear,
    selectedGradingSystem,
    customGradingSystem,
    categories: updatedCategories,
    unitsData: updatedUnitsData,
    obeQuestions: normalizedObeQuestions,
    obeMarks: rawObeMarks,
    students: [
      {
        regNo: regToUse,
        name: matchedStudent?.name || matchingStudentName || 'Logged-In Student',
        marks: studentMarks
      }
    ]
  };
};

const matchGA = (courseMappedGA: string, currentGAId: string): boolean => {
  const cleanCourseGA = String(courseMappedGA || '').trim().toUpperCase();
  const cleanCurrentGA = String(currentGAId || '').trim().toUpperCase();
  
  if (cleanCourseGA === cleanCurrentGA) return true;
  
  // Extract number from GA-1, GA-CS-1, GA-B1, GA-E1 etc.
  const courseMatch = cleanCourseGA.match(/\d+/);
  const currentMatch = cleanCurrentGA.match(/\d+/);
  
  if (courseMatch && currentMatch) {
    const courseNum = courseMatch[0];
    const currentNum = currentMatch[0];
    
    // Check prefix type to avoid mixing departments
    const isBusinessCourse = cleanCourseGA.includes('-B') || cleanCourseGA.includes('B');
    const isBusinessGA = cleanCurrentGA.includes('-B') || cleanCurrentGA.includes('B');
    if (isBusinessCourse !== isBusinessGA) return false;

    const isEngCourse = cleanCourseGA.includes('-E') || cleanCourseGA.includes('E');
    const isEngGA = cleanCurrentGA.includes('-E') || cleanCurrentGA.includes('E');
    if (isEngCourse !== isEngGA) return false;

    return courseNum === currentNum;
  }
  
  return false;
};

// Interfaces for local bindings and mapping data
interface StudentCourseBinding {
  studentRegNo: string;
  courseCode: string;
}

interface StudentDashboardProps {
  onLogout: () => void;
  studentRegNo: string;
}

export default function StudentDashboard({ onLogout, studentRegNo }: StudentDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Datasets
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentBindings, setStudentBindings] = useState<StudentCourseBinding[]>([]);
  const [instructorCourses, setInstructorCourses] = useState<InstructorCourse[]>([]);
  
  // Selected tab & active student login switcher for demo
  const [activeRegNo, setActiveRegNo] = useState<string>(studentRegNo);
  const [activeTab, setActiveTab] = useState<'transcript' | 'obe_clo' | 'ga_attainment'>('transcript');
  
  // Dynamic API Report States
  const [studentSummary, setStudentSummary] = useState<any>(null);
  const [studentGA, setStudentGA] = useState<any>(null);
  const [finalTranscripts, setFinalTranscripts] = useState<any[]>([]);
  const [semesterPlans, setSemesterPlans] = useState<any[]>([]);
  const [courseCLOMappings, setCourseCLOMappings] = useState<Record<string, { code: string; mappedGA: string | null }[]>>({});

  // UI States
  const [expandedCourseCode, setExpandedCourseCode] = useState<string | null>(null);
  const [cloFilterCourseCode, setCloFilterCourseCode] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');

  useEffect(() => {
    if (!activeRegNo) return;
    
    const fetchReports = async () => {
      try {
        const summary = await apiService.getStudentSummary(activeRegNo);
        setStudentSummary(summary);
      } catch (err) {
        console.warn("Failed to fetch student summary from backend:", err);
        setStudentSummary(null);
      }

      try {
        const gaAtt = await apiService.getStudentGAAttainment(activeRegNo);
        setStudentGA(gaAtt);
      } catch (err) {
        console.warn("Failed to fetch student GA attainment from backend:", err);
        setStudentGA(null);
      }

      try {
        const finalResults = await apiService.getFinalResults({ regNo: activeRegNo });
        if (finalResults && Array.isArray(finalResults.results)) {
          setFinalTranscripts(finalResults.results);
        } else {
          setFinalTranscripts([]);
        }
      } catch (err) {
        console.warn("Failed to fetch final results / transcripts from backend:", err);
        setFinalTranscripts([]);
      }
    };

    fetchReports();
  }, [activeRegNo]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get programs, courses, departments
      let obData;
      try {
        obData = await apiService.getAllData();
      } catch (err) {
        obData = apiService.getLocalStorageData();
      }
       setDepartments(obData.departments || []);
      setPrograms(obData.programs || []);
      setCourses(obData.courses || []);

      // 1b. Load predefined semester plans
      try {
        const plans = await apiService.getSemesterPlans();
        if (Array.isArray(plans)) {
          setSemesterPlans(plans.map((p: any) => ({
            programId: p.programId || p.program_id || '',
            semester: p.semester || '',
            courseCodes: p.courseCodes || p.course_codes || []
          })));
        }
      } catch (err) {
        console.warn("Failed to load semester plans:", err);
      }

      // 2. Load students
      const studentList = await apiService.getStudents();

      // Retrieve logged-in user details as a reliable backup
      const loggedInUserStr = localStorage.getItem('IQRA_OBE_LOGGED_IN_USER');
      let loggedInStudent: Student | null = null;
      if (loggedInUserStr) {
        try {
          const parsedUser = JSON.parse(loggedInUserStr);
          if (parsedUser.user_type === 'student' || parsedUser.user_type === 'STUDENT' || parsedUser.userType === 'student' || parsedUser.role === 'student') {
            loggedInStudent = {
              regNo: parsedUser.regNo || parsedUser.reg_no || studentRegNo,
              name: parsedUser.name || studentRegNo.split('.').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              email: parsedUser.email || '',
              departmentId: parsedUser.departmentId || parsedUser.department_id || 'computing',
              programId: parsedUser.programId || parsedUser.program_id || 'bscs',
              batch: parsedUser.batch || 'Fall',
              semester: parsedUser.semester || '4th'
            };
          }
        } catch (e) {
          console.error("Error parsing logged-in user in student dashboard", e);
        }
      }

      // 3. Match login username or select first default
      const cleanRegToMatch = studentRegNo.includes('@') ? studentRegNo.split('@')[0].trim().toLowerCase() : studentRegNo.trim().toLowerCase();
      const rawRegToMatch = studentRegNo.trim().toLowerCase();

      const matchingStudent = studentList.find(
        s => s.regNo.toLowerCase() === cleanRegToMatch || 
             s.regNo.toLowerCase() === rawRegToMatch ||
             s.regNo.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanRegToMatch.replace(/[^a-z0-9]/g, '') ||
             s.name.toLowerCase() === rawRegToMatch ||
             s.email?.toLowerCase() === rawRegToMatch ||
             s.email?.toLowerCase().split('@')[0] === cleanRegToMatch ||
             s.email?.toLowerCase().split('@')[0] === rawRegToMatch
      );

      if (matchingStudent) {
        setActiveRegNo(matchingStudent.regNo);
        setStudents([matchingStudent]);
      } else if (loggedInStudent) {
        setActiveRegNo(loggedInStudent.regNo);
        setStudents([loggedInStudent]);
      } else {
        setStudents(studentList);
        if (studentList.length > 0) {
          setActiveRegNo(studentList[0].regNo);
        }
      }

      // 4. Load student bindings
      // We initialize this to an empty array to prevent pre-seeded dummy registrations from showing.
      // We will only use authentic course bindings returned directly by the backend API.
      setStudentBindings([]);

      // 5. Load student courses from backend with marks
      try {
        let mappedInstructorCourses: InstructorCourse[] = [];
        try {
          const studentCourses = await apiService.getStudentCourses();
          const regToUse = matchingStudent ? matchingStudent.regNo : activeRegNo;
          
          if (Array.isArray(studentCourses)) {
            const dynamicBindings = studentCourses.map((sc: any) => ({
              studentRegNo: regToUse,
              courseCode: sc.code
            }));
            setStudentBindings(prev => {
              const filtered = prev.filter(b => normalizeRegNo(b.studentRegNo) !== normalizeRegNo(regToUse));
              return [...filtered, ...dynamicBindings];
            });

            const loadedDepts = obData.departments || [];
            const loadedProgs = obData.programs || [];

            const localSavedCoursesStr = localStorage.getItem('IQRA_OBE_INSTRUCTOR_COURSES');
            const localSavedCourses: InstructorCourse[] = localSavedCoursesStr ? JSON.parse(localSavedCoursesStr) : [];

            const studentName = matchingStudent ? matchingStudent.name : 'Logged-In Student';

            mappedInstructorCourses = studentCourses.map((sc: any) => {
              const matchingLocalCourse = localSavedCourses.find((lc: any) => lc.code.trim().toLowerCase() === sc.code.trim().toLowerCase());
              const normalized = normalizeStudentCourse(sc, matchingLocalCourse, regToUse, studentName);

              // Enrich names if missing
              const pId = normalized.programId;
              const prog = loadedProgs.find((p: any) => p.id === pId);
              normalized.programName = prog ? prog.name : normalized.programName || 'Bachelor of Science in Computer Science (BSCS)';
              
              const dId = normalized.departmentId;
              const dept = loadedDepts.find((d: any) => d.id === dId);
              normalized.departmentName = dept ? dept.name : normalized.departmentName || 'Department of Computing and Technology';

              return normalized;
            });

            // Merge any local saved courses that have this student but are not in the backend response
            localSavedCourses.forEach((lc: any) => {
              const studentEnrolled = lc.students?.some((s: any) => normalizeRegNo(s.regNo) === normalizeRegNo(regToUse));
              const alreadyMapped = mappedInstructorCourses.some((mic: any) => mic.code.trim().toLowerCase() === lc.code.trim().toLowerCase());
              if (studentEnrolled && !alreadyMapped) {
                const normalized = normalizeStudentCourse(lc, null, regToUse, studentName);

                // Enrich names if missing
                const pId = normalized.programId;
                const prog = loadedProgs.find((p: any) => p.id === pId);
                normalized.programName = prog ? prog.name : normalized.programName || 'Bachelor of Science in Computer Science (BSCS)';
                
                const dId = normalized.departmentId;
                const dept = loadedDepts.find((d: any) => d.id === dId);
                normalized.departmentName = dept ? dept.name : normalized.departmentName || 'Department of Computing and Technology';

                mappedInstructorCourses.push(normalized);

                // Also bind this student dynamically
                setStudentBindings(prev => {
                  if (prev.some(b => normalizeRegNo(b.studentRegNo) === normalizeRegNo(regToUse) && b.courseCode === lc.code)) return prev;
                  return [...prev, { studentRegNo: regToUse, courseCode: lc.code }];
                });
              }
            });
          } else {
            const instCourses = apiService.getLocalInstructorCourses();
            const studentName = matchingStudent ? matchingStudent.name : 'Logged-In Student';
            mappedInstructorCourses = (instCourses || []).map(lc => normalizeStudentCourse(lc, null, regToUse, studentName));
          }
        } catch (apiErr) {
          console.warn("Failed to fetch student courses from backend, falling back to local storage.", apiErr);
          const instCourses = apiService.getLocalInstructorCourses();
          const regToUse = matchingStudent ? matchingStudent.regNo : activeRegNo;
          const studentName = matchingStudent ? matchingStudent.name : 'Logged-In Student';
          mappedInstructorCourses = [];
          instCourses.forEach(lc => {
            const studentEnrolled = lc.students?.some((s: any) => normalizeRegNo(s.regNo) === normalizeRegNo(regToUse));
            if (studentEnrolled) {
              const normalized = normalizeStudentCourse(lc, null, regToUse, studentName);
              mappedInstructorCourses.push(normalized);
              setStudentBindings(prev => {
                if (prev.some(b => normalizeRegNo(b.studentRegNo) === normalizeRegNo(regToUse) && b.courseCode === lc.code)) return prev;
                return [...prev, { studentRegNo: regToUse, courseCode: lc.code }];
              });
            }
          });
        }
        setInstructorCourses(mappedInstructorCourses);
      } catch (err) {
        console.warn("Instructor courses not loaded directly, using empty set.", err);
        setInstructorCourses([]);
      }

    } catch (err) {
      console.error(err);
      setError('Failed to retrieve Student Portal academic ledger.');
    } finally {
      setLoading(false);
    }
  };

  // Find active student details
  const activeStudent = useMemo(() => {
    return students.find(s => normalizeRegNo(s.regNo) === normalizeRegNo(activeRegNo)) || null;
  }, [students, activeRegNo]);

  // Find student's program and department details
  const activeProgram = useMemo(() => {
    if (!activeStudent) return null;
    return programs.find(p => p.id === activeStudent.programId) || null;
  }, [activeStudent, programs]);

  const activeDepartment = useMemo(() => {
    if (!activeProgram) return null;
    return departments.find(d => d.id === activeProgram.departmentId) || null;
  }, [activeProgram, departments]);

  // Extract semester from course code dynamically (e.g. CMC111 -> 1st Semester, SEN212 -> 2nd Semester)
  const getCourseSemester = (courseCode: string): string => {
    // 1. Try to find the course in the loaded semester plans
    if (Array.isArray(semesterPlans) && semesterPlans.length > 0) {
      const studentProgramId = activeStudent?.programId || '';
      // Try to match the student's program first
      const matchByProgram = semesterPlans.find(p => 
        p.programId === studentProgramId && 
        p.courseCodes?.some((c: string) => c.trim().toUpperCase().replace(/[- ]/g, '') === courseCode.trim().toUpperCase().replace(/[- ]/g, ''))
      );
      if (matchByProgram) {
        return matchByProgram.semester;
      }
      // If not matched by student's program, try any plan
      const matchAny = semesterPlans.find(p => 
        p.courseCodes?.some((c: string) => c.trim().toUpperCase().replace(/[- ]/g, '') === courseCode.trim().toUpperCase().replace(/[- ]/g, ''))
      );
      if (matchAny) {
        return matchAny.semester;
      }
    }

    const match = courseCode.match(/\d/);
    if (match) {
      const digit = match[0];
      switch (digit) {
        case '1': return '1st Semester';
        case '2': return '2nd Semester';
        case '3': return '3rd Semester';
        case '4': return '4th Semester';
        case '5': return '5th Semester';
        case '6': return '6th Semester';
        case '7': return '7th Semester';
        case '8': return '8th Semester';
        default: return 'Other Semester';
      }
    }
    return '1st Semester';
  };

  const getStudentMark = (
    student: any,
    categoryName: string,
    unitNo: number,
    totalMarks: number,
    unitsData?: Record<string, any[]>
  ): number => {
    if (unitsData && unitsData[categoryName]) {
      const matchingUnit = unitsData[categoryName].find((u: any) => u.unitNo === unitNo);
      if (matchingUnit && matchingUnit.questions && matchingUnit.questions.length > 0) {
        return matchingUnit.questions.reduce((sum: number, q: any) => {
          const qKey = `q-${categoryName}-${unitNo}-${q.id}`;
          return sum + (student.marks?.[qKey] ?? 0);
        }, 0);
      }
    }

    if (student.marks && student.marks[`${categoryName}-${unitNo}`] !== undefined) {
      return student.marks[`${categoryName}-${unitNo}`];
    }

    if (student.marks && student.marks[categoryName] !== undefined && unitNo === 1) {
      return student.marks[categoryName];
    }
    
    return 0;
  };

  // Helper to retrieve stable, realistic grades/attainments based on the student's registration ID
  // This guarantees high-fidelity, complete visuals for all courses instead of all empty tables.
  const computeStudentCourseResult = (stdRegNo: string, courseCode: string) => {
    // Look up if there is an Instructor Course with these marks
    const instCourse = instructorCourses.find(ic => ic.code.trim().toUpperCase().replace(/[- ]/g, '') === courseCode.trim().toUpperCase().replace(/[- ]/g, ''));
    const std = instCourse?.students.find(s => normalizeRegNo(s.regNo) === normalizeRegNo(stdRegNo));

    let aggregate = 0;
    let hasAnyMarks = false;
    let computedCLOs: { code: string; percentage: number; status: string }[] = [];

    if (instCourse && std) {
      const activeCats = instCourse.categories.filter(c => c.percentage > 0);
      let totalAggregate = 0;
      
      activeCats.forEach(cat => {
        const existingUnits = instCourse.unitsData[cat.name] || [];
        
        if (cat.units > 0) {
          for (let u = 1; u <= cat.units; u++) {
            const matchingUnit = existingUnits.find(unit => unit.unitNo === u);
            const unitWeightage = matchingUnit?.weightage ?? (100 / cat.units);
            const totalMarks = matchingUnit ? matchingUnit.totalMarks : 10;
            const questions = matchingUnit?.questions || [];
            
            let unitObtained = 0;
            if (questions.length > 0) {
              questions.forEach(q => {
                const qKey = `q-${cat.name}-${u}-${q.id}`;
                unitObtained += std.marks?.[qKey] ?? 0;
              });
            } else {
              const dKey = `${cat.name}-${u}`;
              unitObtained += std.marks?.[dKey] ?? 0;
            }

            if (totalMarks > 0) {
              totalAggregate += (unitObtained / totalMarks) * (unitWeightage / 100) * cat.percentage;
            }

            if (std.marks && (
              std.marks[`${cat.name}-${u}`] !== undefined || 
              std.marks[cat.name] !== undefined ||
              Object.keys(std.marks).some(k => k.startsWith(`q-${cat.name}-${u}-`))
            )) {
              hasAnyMarks = true;
            }
          }
        }
      });

      if (hasAnyMarks) {
        aggregate = totalAggregate;
      }
    }

    // Fallback/Stable pseudo-random generation based on registration number & course code for other registered courses
    if (!hasAnyMarks) {
      aggregate = 0;
    }

    // Calculate Letter Grade and GP points based on Active system of instCourse
    let letterGrade = '-';
    let points = 0.0;
    const system = instCourse?.selectedGradingSystem || 'ready1';

    if (hasAnyMarks) {
      if (system === 'ready1') {
        if (aggregate >= 88) { letterGrade = 'A'; points = 4.0; }
        else if (aggregate >= 81) { letterGrade = 'B+'; points = 3.5; }
        else if (aggregate >= 74) { letterGrade = 'B'; points = 3.0; }
        else if (aggregate >= 67) { letterGrade = 'C+'; points = 2.5; }
        else if (aggregate >= 60) { letterGrade = 'C'; points = 2.0; }
        else { letterGrade = 'F'; points = 0.0; }
      } else if (system === 'ready2') {
        if (aggregate >= 90) { letterGrade = 'A+'; points = 4.0; }
        else if (aggregate >= 85) { letterGrade = 'A'; points = 4.0; }
        else if (aggregate >= 80) { letterGrade = 'A-'; points = 3.7; }
        else if (aggregate >= 75) { letterGrade = 'B+'; points = 3.3; }
        else if (aggregate >= 70) { letterGrade = 'B'; points = 3.0; }
        else if (aggregate >= 65) { letterGrade = 'B-'; points = 2.7; }
        else if (aggregate >= 60) { letterGrade = 'C+'; points = 2.3; }
        else if (aggregate >= 55) { letterGrade = 'C'; points = 2.0; }
        else if (aggregate >= 50) { letterGrade = 'D'; points = 1.0; }
        else { letterGrade = 'F'; points = 0.0; }
      } else if (system === 'custom') {
        const DEFAULT_CUSTOM_GRADES = [
          { grade: 'A', percentage: '88% - 100%', points: '4' },
          { grade: 'B+', percentage: '81% - 87%', points: '3.5' },
          { grade: 'B', percentage: '74% - 80%', points: '3' },
          { grade: 'C+', percentage: '67% - 73%', points: '2.5' },
          { grade: 'C', percentage: '60% - 66%', points: '2' },
          { grade: 'F', percentage: 'Below 60%', points: '0' },
        ];
        const list = instCourse.customGradingSystem || DEFAULT_CUSTOM_GRADES;
        
        const parsePercentRangeLocal = (pctStr: string): { min: number; max: number } => {
          if (!pctStr) return { min: 0, max: 0 };
          const clean = pctStr.replace(/%/g, '').trim();
          if (clean.toLowerCase().includes('below')) {
            const val = parseInt(clean.replace(/below/i, '').trim(), 10);
            return { min: 0, max: isNaN(val) ? 0 : val };
          }
          const parts = clean.split(/[-–to]/);
          if (parts.length === 2) {
            const minVal = parseInt(parts[0].trim(), 10);
            const maxVal = parseInt(parts[1].trim(), 10);
            return {
              min: isNaN(minVal) ? 0 : minVal,
              max: isNaN(maxVal) ? 0 : maxVal
            };
          }
          const single = parseInt(clean, 10);
          return { min: isNaN(single) ? 0 : single, max: isNaN(single) ? 0 : single };
        };

        let found = false;
        for (const tier of list) {
          const range = parsePercentRangeLocal(tier.percentage);
          if (aggregate >= range.min && aggregate <= range.max) {
            letterGrade = tier.grade;
            points = parseFloat(tier.points) || 0.0;
            found = true;
            break;
          }
        }
        if (!found) {
          const sorted = [...list].sort((a, b) => {
            const rA = parsePercentRangeLocal(a.percentage);
            const rB = parsePercentRangeLocal(b.percentage);
            return rA.min - rB.min;
          });
          if (sorted.length > 0) {
            const lowestRange = parsePercentRangeLocal(sorted[0].percentage);
            if (aggregate < lowestRange.min) {
              letterGrade = 'F';
              points = 0.0;
            } else {
              const highestTier = sorted[sorted.length - 1];
              letterGrade = highestTier.grade;
              points = parseFloat(highestTier.points) || 0.0;
            }
          } else {
            letterGrade = 'F';
            points = 0.0;
          }
        }
      } else {
        // Fallback
        if (aggregate >= 88) { letterGrade = 'A'; points = 4.0; }
        else if (aggregate >= 81) { letterGrade = 'B+'; points = 3.5; }
        else if (aggregate >= 74) { letterGrade = 'B'; points = 3.0; }
        else if (aggregate >= 67) { letterGrade = 'C+'; points = 2.5; }
        else if (aggregate >= 60) { letterGrade = 'C'; points = 2.0; }
        else { letterGrade = 'F'; points = 0.0; }
      }
    }

    // CLO Performance Calculations
    const qs = instCourse?.obeQuestions || [];
    const marks = instCourse?.obeMarks || {};
    const cloCount = instCourse?.cloCount || 4;

    const matchedObeKey = Object.keys(marks).find(k => normalizeRegNo(k) === normalizeRegNo(stdRegNo));
    const studentObeMarks = matchedObeKey ? marks[matchedObeKey] : {};

    computedCLOs = Array.from({ length: cloCount }, (_, i) => `CLO-${i + 1}`).map((clo, idx) => {
      const cloQs = qs.filter(q => q.mappedCLOs.includes(clo));
      let max = 0;
      let score = 0;
      
      cloQs.forEach(q => {
        max += q.maxMarks;
        score += studentObeMarks?.[q.id] ?? 0;
      });

      // If no questions are mapped to this CLO, it is unassessed.
      if (max === 0) {
        return {
          code: clo,
          percentage: 0,
          status: 'Not Assessed'
        };
      }

      const pct = max > 0 ? (score / max) * 100 : 0;
      return {
        code: clo,
        percentage: pct,
        status: pct >= 50 ? 'Attained' : 'Needs Improvement'
      };
    });

    return {
      aggregate,
      letterGrade,
      points,
      clos: computedCLOs,
      hasAnyMarks
    };
  };

  // Get student's enrolled courses with dynamic calculations attached
  const enrolledCoursesWithGrades = useMemo(() => {
    const studentCodes = studentBindings
      .filter(b => normalizeRegNo(b.studentRegNo) === normalizeRegNo(activeRegNo))
      .map(b => b.courseCode.trim().toUpperCase().replace(/[- ]/g, ''));
    
    const matched = courses
      .filter(c => {
        const normalizedCode = c.code.trim().toUpperCase().replace(/[- ]/g, '');
        return studentCodes.includes(normalizedCode);
      })
      .map(c => {
        const results = computeStudentCourseResult(activeRegNo, c.code);
        return {
          ...c,
          results
        };
      });

    const seen = new Set<string>();
    return matched.filter(c => {
      if (seen.has(c.code)) {
        return false;
      }
      seen.add(c.code);
      return true;
    });
  }, [courses, studentBindings, activeRegNo, instructorCourses]);

  useEffect(() => {
    if (enrolledCoursesWithGrades.length === 0) return;

    let active = true;
    const fetchCLOMappings = async () => {
      const mappings: Record<string, { code: string; mappedGA: string | null }[]> = {};
      
      // Populate with default fallback mappings first (CLO-1 maps to GA-1, CLO-2 to GA-2, etc.)
      enrolledCoursesWithGrades.forEach(c => {
        const defaultCLOs = Array.from({ length: c.results?.clos?.length || c.cloCount || 4 }, (_, i) => ({
          code: `CLO-${i + 1}`,
          mappedGA: `GA-${i + 1}`
        }));
        mappings[c.code.toUpperCase()] = defaultCLOs;
      });

      // Fetch actual mappings from database
      const promises = enrolledCoursesWithGrades.map(async (c) => {
        try {
          const localSavedCoursesStr = localStorage.getItem('IQRA_OBE_INSTRUCTOR_COURSES');
          const localSavedCourses: InstructorCourse[] = localSavedCoursesStr ? JSON.parse(localSavedCoursesStr) : [];
          const matchingLocalCourse = localSavedCourses.find((lc: any) => lc.code.trim().toLowerCase() === c.code.trim().toLowerCase());
          
          let dbCLOs: any[] = [];
          try {
            if (c.id) {
              dbCLOs = await apiService.getCourseCLOs(c.id);
            }
          } catch (apiErr) {
            console.warn(`Failed to fetch CLOs from backend for course ${c.code}`, apiErr);
          }

          if (Array.isArray(dbCLOs) && dbCLOs.length > 0) {
            mappings[c.code.toUpperCase()] = dbCLOs.map((cloObj: any) => ({
              code: cloObj.code || cloObj.clo_code || '',
              mappedGA: cloObj.mappedGA || cloObj.mapped_ga || null
            }));
          }
        } catch (err) {
          console.warn(`Failed to process CLOs for course ${c.code}`, err);
        }
      });

      await Promise.all(promises);
      
      if (active) {
        setCourseCLOMappings(mappings);
      }
    };

    fetchCLOMappings();
    return () => {
      active = false;
    };
  }, [enrolledCoursesWithGrades]);

  // Group enrolled courses by Semester
  const coursesBySemester = useMemo(() => {
    const grouped: Record<string, typeof enrolledCoursesWithGrades> = {};
    enrolledCoursesWithGrades.forEach(c => {
      const sem = getCourseSemester(c.code);
      if (!grouped[sem]) grouped[sem] = [];
      grouped[sem].push(c);
    });

    // Sort semester keys logically
    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = grouped[key];
        return acc;
      }, {} as Record<string, typeof enrolledCoursesWithGrades>);
  }, [enrolledCoursesWithGrades, semesterPlans]);

  // Compute SGPA / CGPA overall
  const GPAStats = useMemo(() => {
    let totalPointsProduct = 0;
    let totalCredits = 0;
    let passedCoursesCount = 0;
    let totalCoursesCount = 0;

    // Collect all unique courses that have been graded
    const courseGPAs: Record<string, { points: number; credits: number; passed: boolean }> = {};

    // 1. Process enrolled courses with grades
    enrolledCoursesWithGrades.forEach(c => {
      if (c.results && c.results.hasAnyMarks) {
        courseGPAs[c.code] = {
          points: c.results.points,
          credits: c.creditHours || 3,
          passed: c.results.letterGrade !== 'F'
        };
      }
    });

    // 2. Merge with finalTranscripts (which is the server-side finalized records)
    finalTranscripts.forEach(t => {
      const pts = t.gradePoints ?? t.points ?? 0;
      courseGPAs[t.courseCode] = {
        points: pts,
        credits: t.creditHours || 3,
        passed: t.grade !== 'F'
      };
    });

    // 3. Sum up the credits and grade points
    Object.keys(courseGPAs).forEach(code => {
      const info = courseGPAs[code];
      totalPointsProduct += info.points * info.credits;
      totalCredits += info.credits;
      totalCoursesCount++;
      if (info.passed) {
        passedCoursesCount++;
      }
    });

    let cgpa = totalCredits > 0 ? (totalPointsProduct / totalCredits) : 0.0;
    cgpa = Math.round(cgpa * 100) / 100;

    // Fallback if no courses are graded on frontend/transcript but we have studentSummary.cgpa
    if (totalCredits === 0 && studentSummary && studentSummary.cgpa) {
      cgpa = typeof studentSummary.cgpa === 'number' ? studentSummary.cgpa : parseFloat(studentSummary.cgpa || '0');
      totalCredits = studentSummary.totalCreditsCompleted || 0;
      passedCoursesCount = studentSummary.enrolledCourses?.filter((c: any) => c.grade !== 'F').length || 0;
    }

    return {
      cgpa,
      totalCredits: totalCredits || (studentSummary?.totalCreditsCompleted || 0),
      passedCourses: passedCoursesCount || (studentSummary?.enrolledCourses?.filter((c: any) => c.grade !== 'F').length || 0)
    };
  }, [enrolledCoursesWithGrades, finalTranscripts, studentSummary]);

  // Calculate Semester GPA dynamically for each semester group
  const semesterGPAs = useMemo(() => {
    const gpas: Record<string, number> = {};
    Object.keys(coursesBySemester).forEach(semKey => {
      const semCourses = coursesBySemester[semKey];
      let totalPointsProduct = 0;
      let totalCredits = 0;
      let hasGrades = false;

      semCourses.forEach(c => {
        const crHrs = c.creditHours || 3;
        if (c.results && c.results.points !== undefined && c.results.hasAnyMarks) {
          totalPointsProduct += c.results.points * crHrs;
          totalCredits += crHrs;
          hasGrades = true;
        }
      });

      gpas[semKey] = hasGrades && totalCredits > 0 ? totalPointsProduct / totalCredits : 0.0;
    });
    return gpas;
  }, [coursesBySemester]);

  // Determine which semester to use for displaying "Semester GPA" in the header
  const currentSemesterForGPA = useMemo(() => {
    if (selectedSemester !== 'all') {
      return selectedSemester;
    }
    const semKeys = Object.keys(coursesBySemester);
    if (semKeys.length > 0) {
      // Return highest/latest semester
      const sorted = [...semKeys].sort((a, b) => b.localeCompare(a));
      return sorted[0];
    }
    return '';
  }, [selectedSemester, coursesBySemester]);

  // Get active GPA score for the selected or default latest semester
  const activeSemesterGPA = useMemo(() => {
    if (!currentSemesterForGPA || !semesterGPAs[currentSemesterForGPA]) {
      return 0.0;
    }
    return semesterGPAs[currentSemesterForGPA];
  }, [currentSemesterForGPA, semesterGPAs]);

  // Automatically select the latest semester on load
  useEffect(() => {
    const semKeys = Object.keys(coursesBySemester);
    if (semKeys.length > 0 && selectedSemester === 'all') {
      const sorted = [...semKeys].sort((a, b) => b.localeCompare(a));
      setSelectedSemester(sorted[0]);
    }
  }, [coursesBySemester]);

  // Filter GAs (Graduate Attributes) associated with the student's program (or standard 10)
  const programGAs = useMemo(() => {
    if (!activeStudent) return [];
    
    // Filter programs' custom GAs or fallback to standard ones
    const codeUpper = (activeProgram?.code || 'CS').toUpperCase();
    
    const allGAs = [
      { id: `GA-${codeUpper}-1`, name: 'Academic Grounding', description: 'Deep comprehension of fundamental computing principles, lifecycle models, and technical algorithms.' },
      { id: `GA-${codeUpper}-2`, name: 'Problem Analysis', description: 'Skill to identify, analyze, organize, validate, and solve complex software and database challenges.' },
      { id: `GA-${codeUpper}-3`, name: 'Design/Development of Solutions', description: 'Mastery in designing sustainable components, architectural layers, and clean software blueprints.' },
      { id: `GA-${codeUpper}-4`, name: 'Investigation / Research', description: 'Ability to conduct validation studies, analyze performance datasets, and draw conclusions.' },
      { id: `GA-${codeUpper}-5`, name: 'Modern Tool Usage', description: 'Competency in leveraging Git, CI/CD pipelines, virtualization fabrics, and database systems.' },
      { id: `GA-${codeUpper}-6`, name: 'The Engineer & Society', description: 'Assessing the safety, cultural, cyber security, and legal impacts of technology deployments.' },
      { id: `GA-${codeUpper}-7`, name: 'Environment & Sustainability', description: 'Understanding the impact of software structures on environment, power limits, and scaling constraints.' },
      { id: `GA-${codeUpper}-8`, name: 'Professional Ethics', description: 'Uphold software standards, legal compliance, copyright protection, and data privacy principles.' },
      { id: `GA-${codeUpper}-9`, name: 'Individual & Team Work', description: 'Function effectively as an agile team member or lead inside diverse collaborative teams.' },
      { id: `GA-${codeUpper}-10`, name: 'Continuous Life-Long Learning', description: 'Commitment to independent learning, research adaptation, and professional career growth.' }
    ];

    return allGAs;
  }, [activeStudent, activeProgram]);

  // Compute Graduate Attribute (GA) Attainment scores dynamically
  // Each GA is mapped to courses. We aggregate the student's aggregate marks in those courses.
  const gaAttainmentProfile = useMemo(() => {
    const list = programGAs.map(ga => {
      let sumPercentage = 0;
      let count = 0;
      const contributingCoursesSet = new Set<string>();

      enrolledCoursesWithGrades.forEach(c => {
        const cCode = c.code.toUpperCase();
        // Check if we have CLO-to-GA mappings for this course
        const mappings = courseCLOMappings[cCode] || [];
        
        // Find if any CLO in this course maps to this GA
        const mappedCLOsInCourse = mappings.filter(m => m.mappedGA && matchGA(m.mappedGA, ga.id));
        
        if (mappedCLOsInCourse.length > 0) {
          let courseCLOSum = 0;
          let courseCLOCount = 0;

          mappedCLOsInCourse.forEach(m => {
            const cloResult = c.results?.clos?.find((r: any) => r.code.toUpperCase() === m.code.toUpperCase());
            // Only count if the CLO is assessed (status is not 'Not Assessed')
            if (cloResult && cloResult.status !== 'Not Assessed') {
              courseCLOSum += cloResult.percentage;
              courseCLOCount++;
            }
          });

          if (courseCLOCount > 0) {
            sumPercentage += (courseCLOSum / courseCLOCount);
            count++;
            contributingCoursesSet.add(`${c.code} - ${c.title}`);
          }
        }
      });

      let finalScore = 0;
      if (count > 0) {
        finalScore = sumPercentage / count;
      }

      return {
        ...ga,
        score: Math.round(finalScore * 10) / 10,
        contributingCount: count,
        coursesList: Array.from(contributingCoursesSet)
      };
    });
    return [...list].sort((a, b) => naturalCompare(a.id, b.id));
  }, [programGAs, enrolledCoursesWithGrades, activeRegNo, studentGA, courseCLOMappings]);

  // Aggregate Course Learning Outcomes (CLO) for the selected filter course
  const filteredCLOList = useMemo(() => {
    const list: { courseCode: string; courseTitle: string; cloCode: string; percentage: number; status: string }[] = [];
    
    enrolledCoursesWithGrades.forEach(c => {
      if (cloFilterCourseCode !== 'all' && c.code !== cloFilterCourseCode) return;
      
      c.results.clos.forEach(clo => {
        list.push({
          courseCode: c.code,
          courseTitle: c.title,
          cloCode: clo.code,
          percentage: Math.round(clo.percentage),
          status: clo.status
        });
      });
    });

    return list;
  }, [enrolledCoursesWithGrades, cloFilterCourseCode]);

  // Helper to retrieve detailed marks breakdown for expanded views
  const getCourseMarksBreakdown = (courseCode: string) => {
    const instCourse = instructorCourses.find(ic => ic.code.trim().toUpperCase().replace(/[- ]/g, '') === courseCode.trim().toUpperCase().replace(/[- ]/g, ''));
    const std = instCourse?.students.find(s => normalizeRegNo(s.regNo) === normalizeRegNo(activeRegNo));
    
    if (!instCourse || !std || !std.marks) {
      // Do not generate dummy mock marks. Return categories with 0 scores.
      return [
        { category: 'Assignments', scored: 0, max: 15, pct: 0 },
        { category: 'Quizzes', scored: 0, max: 10, pct: 0 },
        { category: 'Class Project', scored: 0, max: 15, pct: 0 },
        { category: 'Presentation', scored: 0, max: 5, pct: 0 },
        { category: 'Mid Term Exam', scored: 0, max: 20, pct: 0 },
        { category: 'Final Term Exam', scored: 0, max: 30, pct: 0 },
        { category: 'Class Attendance', scored: 0, max: 5, pct: 0 }
      ];
    }

    const categoriesList = instCourse.categories.filter(cat => cat.percentage > 0);
    const breakdown: { category: string; scored: number; max: number; pct: number }[] = [];

    categoriesList.forEach(cat => {
      let categoryObtainedSum = 0;
      let categoryMaxMarksSum = 0;
      const existingUnits = instCourse.unitsData[cat.name] || [];
      
      if (cat.units > 0) {
        for (let u = 1; u <= cat.units; u++) {
          const matchingUnit = existingUnits.find(unit => unit.unitNo === u);
          const questions = matchingUnit?.questions || [];
          
          if (questions.length > 0) {
            questions.forEach(q => {
              categoryMaxMarksSum += q.maxMarks || 0;
              const qKey = `q-${cat.name}-${u}-${q.id}`;
              categoryObtainedSum += std.marks?.[qKey] ?? 0;
            });
          } else {
            const totalMarks = matchingUnit ? matchingUnit.totalMarks : 10;
            categoryMaxMarksSum += totalMarks;
            const dKey = `${cat.name}-${u}`;
            categoryObtainedSum += std.marks?.[dKey] ?? 0;
          }
        }
      }

      const finalContribution = categoryMaxMarksSum > 0
        ? (categoryObtainedSum / categoryMaxMarksSum) * cat.percentage
        : 0;
      
      breakdown.push({
        category: cat.name,
        scored: Math.round(finalContribution * 10) / 10,
        max: cat.percentage,
        pct: Math.round((finalContribution / (cat.percentage || 1)) * 100)
      });
    });

    return breakdown;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Retrieving Student Academic Record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 backdrop-blur-md bg-white/95 px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/iqralogo.png" 
            alt="Iqra University" 
            className="h-10 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-indigo-950 uppercase">IU Student Portal</h1>
            <p className="text-[10px] font-mono text-slate-400 font-bold tracking-wider">Academic Result & OBE Registry</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* SECURE STUDENT INFO BADGE */}
          {activeStudent && (
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
              <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>{activeStudent.name} ({activeRegNo})</span>
            </div>
          )}

          <button
            onClick={onLogout}
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-indigo-950 border border-slate-200/80 font-bold p-2.5 rounded-xl transition-all flex items-center gap-2 text-xs cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {/* PROFILE HEADER CARD */}
        {activeStudent && (
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/40 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="h-16 w-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-600/10">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">{activeStudent.name}</h2>
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-indigo-100 font-mono tracking-wide">
                    {activeStudent.batch} Batch
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-tight">{activeStudent.regNo}</p>
                <p className="text-xs text-slate-500 font-medium">
                  {activeProgram?.name || 'Bachelor of Science'} • <strong className="text-slate-700">{activeStudent.semester || '4th'} Semester</strong>
                </p>
              </div>
            </div>

            {/* GPA AND PROGRESS WIDGETS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center gap-4 w-full md:w-auto relative z-10">
              {/* Semester GPA widget */}
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-center min-w-[130px] flex-1 lg:flex-none shadow-xs">
                <p className="text-xs uppercase font-extrabold text-blue-700 tracking-wider">
                  {currentSemesterForGPA ? `${currentSemesterForGPA.split(' ')[0]} GPA` : 'Semester GPA'}
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <Award className="h-5 w-5 text-blue-600 shrink-0" />
                  <span className="text-xl font-extrabold text-blue-950 font-mono">{activeSemesterGPA.toFixed(2)}</span>
                </div>
              </div>

              {/* Cumulative GPA widget */}
              <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl text-center min-w-[130px] flex-1 lg:flex-none shadow-xs">
                <p className="text-xs uppercase font-extrabold text-indigo-700 tracking-wider">Cumulative GPA</p>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <Award className="h-5 w-5 text-indigo-600 shrink-0" />
                  <span className="text-xl font-extrabold text-indigo-950 font-mono">{GPAStats.cgpa.toFixed(2)}</span>
                </div>
              </div>

              {/* Passed Credits widget */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-center min-w-[130px] flex-1 lg:flex-none shadow-xs">
                <p className="text-xs uppercase font-extrabold text-emerald-700 tracking-wider">Passed Credits</p>
                <div className="flex items-center justify-center gap-1 mt-1.5">
                  <span className="text-xl font-extrabold text-emerald-950 font-mono">{GPAStats.passedCourses * 3}</span>
                  <span className="text-xs text-emerald-700 font-extrabold uppercase font-mono">Hrs</span>
                </div>
              </div>

              {/* Courses widget */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center min-w-[130px] flex-1 lg:flex-none shadow-xs">
                <p className="text-xs uppercase font-extrabold text-slate-600 tracking-wider">Total Courses</p>
                <div className="flex items-center justify-center gap-1 mt-1.5">
                  <span className="text-xl font-extrabold text-slate-900 font-mono">{enrolledCoursesWithGrades.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* SECURE STUDENT INFO ON MOBILE */}
        {activeStudent && (
          <div className="md:hidden bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 text-slate-600">
              <UserCheck className="h-4 w-4 text-indigo-600" /> Student Profile:
            </span>
            <span>{activeStudent.name} ({activeRegNo})</span>
          </div>
        )}

        {/* TAB CONTROLS */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`py-3.5 px-5 font-bold text-xs tracking-wide uppercase border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'transcript'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Semester Transcript</span>
          </button>
          <button
            onClick={() => setActiveTab('obe_clo')}
            className={`py-3.5 px-5 font-bold text-xs tracking-wide uppercase border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'obe_clo'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>CLO Attainment Indices</span>
          </button>
          <button
            onClick={() => setActiveTab('ga_attainment')}
            className={`py-3.5 px-5 font-bold text-xs tracking-wide uppercase border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ga_attainment'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <PlaqueIcon className="h-4 w-4" />
            <span>GA Attainment Profile</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: DETAILED TRANSCRIPT */}
            {activeTab === 'transcript' && (
              <motion.div
                key="transcript-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {finalTranscripts.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden animate-fade-in">
                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-5 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-2.5 text-white">
                        <Award className="h-5 w-5 text-indigo-400" />
                        <div>
                          <h3 className="text-sm font-bold tracking-tight uppercase">Official Academic Transcript Record</h3>
                          <p className="text-[10px] text-slate-300 font-medium">Permanent snapshot ledger of finalized semesters (Snapshotted & Sealed)</p>
                        </div>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        SEALED
                      </span>
                    </div>

                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-6">Course / Code</th>
                            <th className="py-3 px-4">Instructor</th>
                            <th className="py-3 px-4">Term / Year</th>
                            <th className="py-3 px-4 text-center">Credit Hours</th>
                            <th className="py-3 px-4 text-center">Final Mark</th>
                            <th className="py-3 px-4 text-center">Grade / GPA</th>
                            <th className="py-3 px-4">Finalized On</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {finalTranscripts.map((t, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors font-medium">
                              <td className="py-4 px-6">
                                <div className="font-bold text-slate-900">{t.courseTitle}</div>
                                <div className="font-mono text-[10px] text-slate-400 mt-0.5">{t.courseCode}</div>
                              </td>
                              <td className="py-4 px-4 text-slate-600 font-semibold">{t.instructorName}</td>
                              <td className="py-4 px-4 text-slate-500 font-semibold">{t.academicYear} <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-600 font-mono ml-1">{t.semester || '6th'}</span></td>
                              <td className="py-4 px-4 text-center font-mono text-slate-500">{t.creditHours || 3}</td>
                              <td className="py-4 px-4 text-center font-mono font-black text-indigo-950">{t.finalPercentage ? t.finalPercentage.toFixed(2) : '0.00'}%</td>
                              <td className="py-4 px-4 text-center">
                                <div className="font-black text-indigo-650">{t.grade}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.gradePoints ? t.gradePoints.toFixed(2) : '0.00'} GP</div>
                              </td>
                              <td className="py-4 px-4 font-mono text-[10px] text-slate-400">
                                {t.finalizedAt ? new Date(t.finalizedAt).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {enrolledCoursesWithGrades.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-3xl py-16 px-4 text-center space-y-3 shadow-sm">
                    <BookOpen className="h-12 w-12 text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-700">No Course Enrollments Found</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Your courses have not been registered by the Academic Department yet. Please contact your department administration for catalog binding.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Compact Professional Semester Navigation Pills */}
                    <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 p-2 rounded-xl border border-slate-200 max-w-fit shadow-xs">
                      <span className="text-xs uppercase font-bold text-slate-500 px-2">
                        Academic Semesters:
                      </span>
                      {Object.keys(coursesBySemester).map(semKey => (
                        <button
                          key={semKey}
                          onClick={() => {
                            setSelectedSemester(semKey);
                            setExpandedCourseCode(null);
                          }}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            selectedSemester === semKey
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-indigo-950 hover:bg-slate-200/50'
                          }`}
                        >
                          {semKey.replace(' Semester', '')}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setSelectedSemester('all');
                          setExpandedCourseCode(null);
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedSemester === 'all'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-indigo-950 hover:bg-slate-200/50'
                        }`}
                      >
                        All Semesters
                      </button>
                    </div>

                    {/* Semesters list */}
                    {Object.keys(coursesBySemester)
                      .filter(semesterKey => selectedSemester === 'all' || selectedSemester === semesterKey)
                      .map(semesterKey => (
                        <div key={semesterKey} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                          {/* Semester Header */}
                          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <Calendar className="h-5 w-5 text-indigo-600" />
                              <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">{semesterKey} Academic Ledger</h3>
                            </div>
                            {semesterGPAs[semesterKey] !== undefined && (
                              <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-lg border border-indigo-200 font-mono">
                                SGPA: {semesterGPAs[semesterKey].toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Course Cards Grid */}
                          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/10">
                            {coursesBySemester[semesterKey].map(course => {
                              const isExpanded = expandedCourseCode === course.code;
                              const hasPassed = course.results.letterGrade !== 'F';

                              return (
                                <div 
                                  key={course.code} 
                                  className={`bg-white border rounded-xl transition-all duration-200 flex flex-col justify-between overflow-hidden relative ${
                                    isExpanded 
                                      ? 'border-indigo-500 ring-2 ring-indigo-500/5 col-span-1 md:col-span-2 lg:col-span-3 shadow-xs' 
                                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                  }`}
                                >
                                  {/* Main Card Content */}
                                  <div className="p-5 space-y-4">
                                    {/* Badges Row */}
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                                        {course.code}
                                      </span>
                                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize border tracking-wide ${
                                        course.title?.toLowerCase().includes('lab')
                                          ? 'bg-purple-100 text-purple-850 border-purple-200'
                                          : course.type === 'core'
                                            ? 'bg-blue-100 text-blue-850 border-blue-200'
                                            : 'bg-amber-100 text-amber-850 border-amber-200'
                                      }`}>
                                        {course.type} Course
                                      </span>
                                    </div>

                                    {/* Course Title */}
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-snug min-h-[40px]" title={course.title}>
                                        {course.title}
                                      </h4>
                                      <p className="text-xs text-slate-500 font-medium font-sans mt-1">
                                        {course.creditHours || 3} Credit Hours • Lecture-Based OBE Class
                                      </p>
                                    </div>

                                    {/* Main Stats Row */}
                                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 bg-slate-50 p-2.5 rounded-lg">
                                      <div className="text-center">
                                        <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Score</p>
                                        <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">{Math.round(course.results.aggregate)}%</p>
                                      </div>

                                      <div className="text-center border-x border-slate-200">
                                        <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Grade</p>
                                        <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded mt-0.5 ${
                                          hasPassed 
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                            : 'bg-red-100 text-red-800 border border-red-200'
                                        }`}>
                                          {course.results.letterGrade}
                                        </span>
                                      </div>

                                      <div className="text-center">
                                        <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">GPA</p>
                                        <p className="text-sm font-bold text-indigo-950 font-mono mt-0.5">{course.results.points.toFixed(2)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Card Footer Action */}
                                  <div 
                                    onClick={() => setExpandedCourseCode(isExpanded ? null : course.code)}
                                    className="bg-slate-50 border-t border-slate-200 px-5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer transition-colors"
                                  >
                                    <span>{isExpanded ? 'Hide Details' : 'View Assessment & CLO Map'}</span>
                                    <div className="text-slate-400">
                                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </div>
                                  </div>

                                  {/* Course Expanded Details: Question/Assessment Breakdown */}
                                  {isExpanded && (
                                    <div className="px-5 pb-5 pt-3 bg-slate-50/50 border-t border-slate-200 space-y-4 animate-fade-in">
                                      <div>
                                        <h5 className="text-xs font-bold uppercase text-indigo-950 tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
                                          <ClipboardCheck className="h-4.5 w-4.5 text-indigo-600" />
                                          Assessment Marks Breakdown & CLO Map
                                        </h5>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                                          {getCourseMarksBreakdown(course.code).map((item, idx) => (
                                            <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg flex justify-between items-center shadow-xs">
                                              <div>
                                                <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]" title={item.category}>{item.category}</p>
                                                <p className="text-xs text-slate-500 font-mono font-medium mt-0.5">Weight: {item.max}%</p>
                                              </div>
                                              <div className="text-right">
                                                <p className="text-xs font-bold text-indigo-950 font-mono">
                                                  {item.scored} <span className="text-slate-500">/{item.max}</span>
                                                </p>
                                                <p className="text-xs font-bold text-emerald-600 font-mono mt-0.5">{item.pct}%</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* CLO Attainments for Expanded Course */}
                                      <div className="pt-2">
                                        <h5 className="text-xs font-bold uppercase text-indigo-950 tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
                                          <Layers className="h-4.5 w-4.5 text-indigo-600" />
                                          Course Learning Outcome (CLO) Attainments
                                        </h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                                          {course.results.clos.map((clo, idx) => {
                                            const attained = clo.status === 'Attained';
                                            return (
                                              <div key={idx} className="bg-white border border-slate-200 p-4 rounded-lg space-y-2.5 shadow-xs">
                                                <div className="flex items-center justify-between">
                                                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{clo.code}</span>
                                                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                                    attained 
                                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                                                      : 'bg-amber-100 text-amber-800 border-amber-200'
                                                  }`}>
                                                    {clo.status}
                                                  </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-0.5">
                                                  <span>Outcome Mastery:</span>
                                                  <span className="font-bold text-slate-700 font-mono">{Math.round(clo.percentage)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
                                                  <div 
                                                    className={`h-full rounded-full ${attained ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${clo.percentage}%` }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 2: CLO PERFORMANCE ANALYTICS */}
            {activeTab === 'obe_clo' && (
              <motion.div
                key="clo-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-800">Course Learning Outcome (CLO) Audit</h3>
                    <p className="text-xs text-slate-400">CLOs measure course-specific milestones. A score of 50% or above denotes outcome attainment.</p>
                  </div>

                  {/* Course Filter Dropdown */}
                  <div className="relative w-full sm:max-w-xs shrink-0">
                    <select
                      value={cloFilterCourseCode}
                      onChange={(e) => setCloFilterCourseCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl outline-none text-xs font-bold transition-all cursor-pointer text-slate-700"
                    >
                      <option value="all">View All Enrolled Courses</option>
                      {enrolledCoursesWithGrades.map(c => (
                        <option key={c.id || c.code} value={c.code}>{c.code} - {c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredCLOList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                    No active CLO targets found in the registry.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCLOList.map((clo, idx) => {
                      const attained = clo.status === 'Attained';
                      return (
                        <div key={idx} className="bg-slate-50/50 hover:bg-white border border-slate-200/60 p-4.5 rounded-2xl shadow-sm transition-all flex flex-col justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/40">
                                {clo.courseCode} • {clo.cloCode}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                attained 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                                {clo.status}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{clo.courseTitle}</h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                              This learning outcome measures specific subject-matter competencies, laboratory validations, or design objectives assessed inside final assessments.
                            </p>
                          </div>

                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                              <span>Attainment Progress Index:</span>
                              <span className="font-mono text-indigo-950 font-black">{clo.percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${attained ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${clo.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: GA ATTAINMENT PROFILE */}
            {activeTab === 'ga_attainment' && (
              <motion.div
                key="ga-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6"
              >
                <div className="pb-4 border-b border-slate-100 space-y-1">
                  <h3 className="text-base font-bold text-slate-800">Graduate Attribute (GA) Attainment Profile</h3>
                  <p className="text-xs text-slate-400">GAs are program-wide criteria required for international Washington Accord/Accreditation compliance. They aggregate grades across all mapped courses.</p>
                </div>

                <div className="space-y-5">
                  {gaAttainmentProfile.map(ga => {
                    const statusColor = ga.score >= 75 ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : ga.score >= 50 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100';
                    const barColor = ga.score >= 75 ? 'bg-indigo-600' : ga.score >= 50 ? 'bg-emerald-500' : 'bg-amber-500';

                    return (
                      <div 
                        key={ga.id}
                        className="bg-slate-50/40 border border-slate-200/80 p-5 rounded-2xl flex flex-col md:flex-row gap-5 justify-between items-start md:items-center"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tight">
                              {ga.id}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusColor}`}>
                              {ga.score >= 75 ? 'Excellent' : ga.score >= 50 ? 'Satisfied' : 'Review Needed'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 tracking-tight">{ga.name}</h4>
                          <p className="text-xs text-slate-400 leading-normal font-medium">{ga.description}</p>
                          
                          {ga.contributingCount > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 mr-1">Linked Courses:</span>
                              {ga.coursesList.map((c, idx) => (
                                <span key={idx} className="bg-white border border-slate-200 text-slate-500 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  {c.split(' - ')[0]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Progress meter */}
                        <div className="w-full md:w-56 shrink-0 space-y-1.5 self-stretch flex flex-col justify-center">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                            <span>Attainment Index:</span>
                            <span className="font-mono text-indigo-950 font-black">{ga.score.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-150/70 h-3 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${ga.score}%` }}
                            />
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}
