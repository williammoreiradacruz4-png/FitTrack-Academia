import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, logFirestoreError, OperationType } from '../lib/firebase';
import {
  Academy,
  Exercise,
  PhysicalAssessment,
  StudentProfile,
  StudentWorkoutRecord,
  normalizeAcademyCode,
  normalizeCpf,
} from '../types/workout';

function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = sanitizeForFirestore(v);
      }
    }
    return out as T;
  }
  return value;
}

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function normalizeAcademyRecord(
  raw: Partial<Academy> & { gymCode?: string; code?: string },
  fallbackCode: string
): Academy {
  const cleanCode = normalizeAcademyCode(
    raw.gymCode ?? raw.code ?? fallbackCode
  );
  return {
    code: cleanCode,
    gymCode: cleanCode,
    name: raw.name ?? cleanCode,
    professorName: raw.professorName ?? '',
    professorCpf: raw.professorCpf ? normalizeCpf(raw.professorCpf) : undefined,
    password: raw.password ?? '',
    logoUrl: raw.logoUrl,
    createdAt: raw.createdAt ?? '',
  };
}

function normalizeUserRecord(
  raw: Partial<StudentProfile> & { gymCode?: string; academyCode?: string }
): StudentProfile {
  const cleanCpf = normalizeCpf(raw.cpf ?? '');
  const cleanGym = normalizeAcademyCode(raw.gymCode ?? raw.academyCode ?? '');
  return {
    cpf: cleanCpf,
    formattedCpf: raw.formattedCpf ?? cleanCpf,
    gymCode: cleanGym,
    academyCode: cleanGym,
    academyName: raw.academyName,
    role: raw.role === 'prof' ? 'prof' : 'student',
    name: raw.name ?? '',
    email: raw.email,
    password: raw.password,
    birthDate: raw.birthDate ?? '',
    age: typeof raw.age === 'number' ? raw.age : 0,
    phone: raw.phone ?? '',
    biologicalSex: raw.biologicalSex === 'Feminino' ? 'Feminino' : 'Masculino',
    goal: raw.goal,
    anamnesis: raw.anamnesis,
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? raw.createdAt ?? '',
  };
}

/* ==================== fittrack_gyms (Academias) ==================== */

export async function saveAcademy(
  academy: Academy
): Promise<{ syncedToCloud: boolean }> {
  const cleanCode = normalizeAcademyCode(academy.gymCode || academy.code);
  if (!cleanCode) return { syncedToCloud: false };

  const cleanAcademy = sanitizeForFirestore({
    ...academy,
    code: cleanCode,
    gymCode: cleanCode,
    professorCpf: academy.professorCpf
      ? normalizeCpf(academy.professorCpf)
      : undefined,
  });

  if (isBrowserOffline()) {
    return { syncedToCloud: false };
  }

  try {
    await setDoc(doc(db, 'fittrack_gyms', cleanCode), cleanAcademy);
    return { syncedToCloud: true };
  } catch (error) {
    logFirestoreError(
      error,
      OperationType.WRITE,
      `fittrack_gyms/${cleanCode}`
    );
    return { syncedToCloud: false };
  }
}

export async function fetchAcademyByCode(
  rawCode: string
): Promise<Academy | null> {
  const code = normalizeAcademyCode(rawCode);
  if (!code || isBrowserOffline()) return null;

  try {
    const snap = await getDoc(doc(db, 'fittrack_gyms', code));
    if (snap.exists()) {
      return normalizeAcademyRecord(snap.data() as Partial<Academy>, code);
    }
  } catch (error) {
    logFirestoreError(error, OperationType.GET, `fittrack_gyms/${code}`);
  }

  return null;
}

export function subscribeAcademyByCode(
  rawCode: string,
  onUpdate: (academy: Academy | null, fromServer: boolean) => void
): Unsubscribe {
  const code = normalizeAcademyCode(rawCode);
  if (!code) {
    onUpdate(null, false);
    return () => undefined;
  }

  return onSnapshot(
    doc(db, 'fittrack_gyms', code),
    (snap) => {
      const fromServer = !snap.metadata.fromCache;
      if (snap.exists()) {
        onUpdate(
          normalizeAcademyRecord(snap.data() as Partial<Academy>, code),
          fromServer
        );
      } else {
        onUpdate(null, fromServer);
      }
    },
    (error) => {
      logFirestoreError(error, OperationType.GET, `fittrack_gyms/${code}`);
    }
  );
}

export async function deleteAcademyByCode(rawCode: string): Promise<void> {
  const code = normalizeAcademyCode(rawCode);
  if (!code || isBrowserOffline()) return;

  try {
    await deleteDoc(doc(db, 'fittrack_gyms', code));
  } catch (error) {
    logFirestoreError(error, OperationType.DELETE, `fittrack_gyms/${code}`);
  }
}

export async function updateAcademyPassword(
  academy: Academy,
  newPassword: string
): Promise<{ syncedToCloud: boolean }> {
  return saveAcademy({
    ...academy,
    password: newPassword,
  });
}

export async function updateAcademyLogo(
  rawCode: string,
  logoUrl: string | undefined
): Promise<Academy | null> {
  const academy = await fetchAcademyByCode(rawCode);
  if (!academy) return null;
  const updated: Academy = {
    ...academy,
    logoUrl,
  };
  await saveAcademy(updated);
  return updated;
}

/* ==================== fittrack_users (Alunos e Professores) ==================== */

export async function saveStudentProfile(
  profile: StudentProfile
): Promise<{ syncedToCloud: boolean }> {
  const cleanCpf = normalizeCpf(profile.cpf);
  const cleanCode = normalizeAcademyCode(profile.gymCode || profile.academyCode);
  if (cleanCpf.length !== 11 || !cleanCode) {
    return { syncedToCloud: false };
  }

  const cleanProfile = sanitizeForFirestore({
    ...profile,
    cpf: cleanCpf,
    gymCode: cleanCode,
    academyCode: cleanCode,
    role: profile.role === 'prof' ? 'prof' : 'student',
  });

  if (isBrowserOffline()) {
    return { syncedToCloud: false };
  }

  try {
    await setDoc(doc(db, 'fittrack_users', cleanCpf), cleanProfile);
    return { syncedToCloud: true };
  } catch (error) {
    logFirestoreError(error, OperationType.WRITE, `fittrack_users/${cleanCpf}`);
    return { syncedToCloud: false };
  }
}

export async function fetchStudentProfileByCpf(
  rawCpf: string
): Promise<StudentProfile | null> {
  const cpf = normalizeCpf(rawCpf);
  if (cpf.length !== 11 || isBrowserOffline()) return null;

  try {
    const snap = await getDoc(doc(db, 'fittrack_users', cpf));
    if (snap.exists()) {
      return normalizeUserRecord(snap.data() as Partial<StudentProfile>);
    }
  } catch (error) {
    logFirestoreError(error, OperationType.GET, `fittrack_users/${cpf}`);
  }

  return null;
}

export function subscribeStudentProfileByCpf(
  rawCpf: string,
  onUpdate: (profile: StudentProfile | null) => void
): Unsubscribe {
  const cpf = normalizeCpf(rawCpf);
  if (cpf.length !== 11) {
    onUpdate(null);
    return () => undefined;
  }

  return onSnapshot(
    doc(db, 'fittrack_users', cpf),
    (snap) => {
      if (snap.exists()) {
        onUpdate(normalizeUserRecord(snap.data() as Partial<StudentProfile>));
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      logFirestoreError(error, OperationType.GET, `fittrack_users/${cpf}`);
    }
  );
}

export async function fetchStudentsByAcademy(
  rawGymCode: string
): Promise<StudentProfile[]> {
  const cleanCode = normalizeAcademyCode(rawGymCode);
  if (!cleanCode || isBrowserOffline()) return [];

  try {
    const byCpf = new Map<string, StudentProfile>();
    const [gymSnap, legacySnap] = await Promise.all([
      getDocs(
        query(collection(db, 'fittrack_users'), where('gymCode', '==', cleanCode))
      ),
      getDocs(
        query(
          collection(db, 'fittrack_users'),
          where('academyCode', '==', cleanCode)
        )
      ),
    ]);

    [gymSnap, legacySnap].forEach((snap) => {
      snap.forEach((docSnap) => {
        const normalized = normalizeUserRecord(
          docSnap.data() as Partial<StudentProfile>
        );
        if (normalized.cpf.length === 11 && normalized.role !== 'prof') {
          byCpf.set(normalized.cpf, normalized);
        }
      });
    });

    return Array.from(byCpf.values()).sort((a, b) =>
      (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
    );
  } catch (error) {
    logFirestoreError(error, OperationType.LIST, 'fittrack_users');
    return [];
  }
}

export function subscribeStudentsByGym(
  rawGymCode: string,
  onUpdate: (students: StudentProfile[]) => void
): Unsubscribe {
  const cleanCode = normalizeAcademyCode(rawGymCode);
  if (!cleanCode) {
    onUpdate([]);
    return () => undefined;
  }

  const gymStudents = new Map<string, StudentProfile>();
  const legacyStudents = new Map<string, StudentProfile>();

  const emitMerged = () => {
    const merged = new Map<string, StudentProfile>();
    legacyStudents.forEach((val, key) => merged.set(key, val));
    gymStudents.forEach((val, key) => merged.set(key, val));
    const list = Array.from(merged.values()).sort((a, b) =>
      (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
    );
    onUpdate(list);
  };

  const unsubGym = onSnapshot(
    query(collection(db, 'fittrack_users'), where('gymCode', '==', cleanCode)),
    (snap) => {
      gymStudents.clear();
      snap.forEach((docSnap) => {
        const normalized = normalizeUserRecord(
          docSnap.data() as Partial<StudentProfile>
        );
        if (normalized.cpf.length === 11 && normalized.role !== 'prof') {
          gymStudents.set(normalized.cpf, normalized);
        }
      });
      emitMerged();
    },
    (error) => {
      logFirestoreError(error, OperationType.LIST, 'fittrack_users');
    }
  );

  const unsubLegacy = onSnapshot(
    query(
      collection(db, 'fittrack_users'),
      where('academyCode', '==', cleanCode)
    ),
    (snap) => {
      legacyStudents.clear();
      snap.forEach((docSnap) => {
        const normalized = normalizeUserRecord(
          docSnap.data() as Partial<StudentProfile>
        );
        if (normalized.cpf.length === 11 && normalized.role !== 'prof') {
          legacyStudents.set(normalized.cpf, normalized);
        }
      });
      emitMerged();
    },
    (error) => {
      logFirestoreError(error, OperationType.LIST, 'fittrack_users');
    }
  );

  return () => {
    unsubGym();
    unsubLegacy();
  };
}

/* ==================== fittrack_library (Biblioteca de Exercícios) ==================== */

function getLibraryDocId(gymCode: string, exerciseId: string): string {
  return `${normalizeAcademyCode(gymCode)}_${exerciseId}`;
}

function sortLibraryExercises(list: Exercise[]): Exercise[] {
  return [...list].sort((a, b) => {
    const aMatch = /^ex-(\d+)$/.exec(a.id);
    const bMatch = /^ex-(\d+)$/.exec(b.id);
    const aNum = aMatch ? Number(aMatch[1]) : Number.MAX_SAFE_INTEGER;
    const bNum = bMatch ? Number(bMatch[1]) : Number.MAX_SAFE_INTEGER;
    const aIsCustom = aNum > 1_000_000_000_000 || !aMatch;
    const bIsCustom = bNum > 1_000_000_000_000 || !bMatch;

    if (aIsCustom && !bIsCustom) return -1;
    if (!aIsCustom && bIsCustom) return 1;
    if (aIsCustom && bIsCustom) {
      if (aMatch && bMatch) return bNum - aNum;
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    }
    return aNum - bNum;
  });
}

export async function saveLibraryExercise(
  rawGymCode: string,
  exercise: Exercise
): Promise<{ syncedToCloud: boolean }> {
  const cleanCode = normalizeAcademyCode(rawGymCode);
  if (!cleanCode || !exercise.id || isBrowserOffline()) {
    return { syncedToCloud: false };
  }

  const docId = getLibraryDocId(cleanCode, exercise.id);
  const payload = sanitizeForFirestore({
    ...exercise,
    gymCode: cleanCode,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(doc(db, 'fittrack_library', docId), payload);
    return { syncedToCloud: true };
  } catch (error) {
    logFirestoreError(
      error,
      OperationType.WRITE,
      `fittrack_library/${docId}`
    );
    return { syncedToCloud: false };
  }
}

export async function deleteLibraryExercise(
  rawGymCode: string,
  exerciseId: string
): Promise<{ syncedToCloud: boolean }> {
  const cleanCode = normalizeAcademyCode(rawGymCode);
  if (!cleanCode || !exerciseId || isBrowserOffline()) {
    return { syncedToCloud: false };
  }

  const docId = getLibraryDocId(cleanCode, exerciseId);
  try {
    await deleteDoc(doc(db, 'fittrack_library', docId));
    return { syncedToCloud: true };
  } catch (error) {
    logFirestoreError(
      error,
      OperationType.DELETE,
      `fittrack_library/${docId}`
    );
    return { syncedToCloud: false };
  }
}

export function subscribeLibraryByGym(
  rawGymCode: string,
  defaults: Exercise[],
  onUpdate: (exercises: Exercise[]) => void
): Unsubscribe {
  const cleanCode = normalizeAcademyCode(rawGymCode);
  if (!cleanCode) {
    onUpdate([]);
    return () => undefined;
  }

  let initialSeedChecked = false;
  const q = query(
    collection(db, 'fittrack_library'),
    where('gymCode', '==', cleanCode)
  );

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty && !initialSeedChecked && !snap.metadata.fromCache) {
        initialSeedChecked = true;
        if (defaults.length > 0 && !isBrowserOffline()) {
          const nowIso = new Date().toISOString();
          const batch = writeBatch(db);
          defaults.forEach((ex) => {
            const docId = getLibraryDocId(cleanCode, ex.id);
            batch.set(
              doc(db, 'fittrack_library', docId),
              sanitizeForFirestore({
                ...ex,
                gymCode: cleanCode,
                updatedAt: nowIso,
              })
            );
          });
          void batch.commit().catch((error) => {
            logFirestoreError(error, OperationType.WRITE, 'fittrack_library');
          });
        }
        onUpdate(
          sortLibraryExercises(
            defaults.map((ex) => ({ ...ex, gymCode: cleanCode }))
          )
        );
        return;
      }

      if (!snap.metadata.fromCache) {
        initialSeedChecked = true;
      }
      const list: Exercise[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Exercise;
        if (data && data.id) {
          list.push(data);
        }
      });
      onUpdate(sortLibraryExercises(list));
    },
    (error) => {
      logFirestoreError(error, OperationType.LIST, 'fittrack_library');
    }
  );
}

/* ==================== fittrack_student_workouts (Treinos Liberados) ==================== */

export async function saveStudentWorkout(
  record: StudentWorkoutRecord
): Promise<{ syncedToCloud: boolean }> {
  const cleanCpf = normalizeCpf(record.cpf);
  const cleanCode = normalizeAcademyCode(record.gymCode || record.academyCode);
  if (cleanCpf.length !== 11 || !cleanCode) {
    return { syncedToCloud: false };
  }

  const cleanRecord = sanitizeForFirestore({
    ...record,
    cpf: cleanCpf,
    gymCode: cleanCode,
    academyCode: cleanCode,
    exercises: Array.isArray(record.exercises) ? record.exercises : [],
  });

  if (isBrowserOffline()) {
    return { syncedToCloud: false };
  }

  try {
    await setDoc(doc(db, 'fittrack_student_workouts', cleanCpf), cleanRecord);
    return { syncedToCloud: true };
  } catch (error) {
    logFirestoreError(
      error,
      OperationType.WRITE,
      `fittrack_student_workouts/${cleanCpf}`
    );
    return { syncedToCloud: false };
  }
}

export async function updateStudentWorkoutExercises(
  rawCpf: string,
  exercises: Exercise[]
): Promise<void> {
  const cpf = normalizeCpf(rawCpf);
  if (cpf.length !== 11 || isBrowserOffline()) return;

  const cleanExercises = sanitizeForFirestore(exercises);
  try {
    await updateDoc(doc(db, 'fittrack_student_workouts', cpf), {
      exercises: cleanExercises,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logFirestoreError(
      error,
      OperationType.UPDATE,
      `fittrack_student_workouts/${cpf}`
    );
  }
}

export async function fetchStudentWorkoutByCpf(
  rawCpf: string
): Promise<StudentWorkoutRecord | null> {
  const cpf = normalizeCpf(rawCpf);
  if (cpf.length !== 11 || isBrowserOffline()) return null;

  try {
    const snap = await getDoc(doc(db, 'fittrack_student_workouts', cpf));
    if (snap.exists()) {
      return snap.data() as StudentWorkoutRecord;
    }
  } catch (error) {
    logFirestoreError(
      error,
      OperationType.GET,
      `fittrack_student_workouts/${cpf}`
    );
  }

  return null;
}

export function subscribeStudentWorkout(
  rawCpf: string,
  onUpdate: (record: StudentWorkoutRecord | null) => void
): Unsubscribe {
  const cpf = normalizeCpf(rawCpf);
  if (cpf.length !== 11) {
    onUpdate(null);
    return () => undefined;
  }

  return onSnapshot(
    doc(db, 'fittrack_student_workouts', cpf),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as StudentWorkoutRecord);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      logFirestoreError(
        error,
        OperationType.GET,
        `fittrack_student_workouts/${cpf}`
      );
    }
  );
}

export function subscribeWorkoutStatusByGym(
  rawGymCode: string,
  onUpdate: (statusMap: Record<string, boolean>) => void
): Unsubscribe {
  const cleanCode = normalizeAcademyCode(rawGymCode);
  if (!cleanCode) {
    onUpdate({});
    return () => undefined;
  }

  const gymStatus = new Map<string, boolean>();
  const legacyStatus = new Map<string, boolean>();

  const emitMerged = () => {
    const merged: Record<string, boolean> = {};
    legacyStatus.forEach((val, key) => {
      merged[key] = val;
    });
    gymStatus.forEach((val, key) => {
      merged[key] = val;
    });
    onUpdate(merged);
  };

  const unsubGym = onSnapshot(
    query(
      collection(db, 'fittrack_student_workouts'),
      where('gymCode', '==', cleanCode)
    ),
    (snap) => {
      gymStatus.clear();
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Partial<StudentWorkoutRecord>;
        const cpf = normalizeCpf(data.cpf ?? docSnap.id);
        if (cpf.length === 11) {
          gymStatus.set(
            cpf,
            Boolean(Array.isArray(data.exercises) && data.exercises.length > 0)
          );
        }
      });
      emitMerged();
    },
    (error) => {
      logFirestoreError(error, OperationType.LIST, 'fittrack_student_workouts');
    }
  );

  const unsubLegacy = onSnapshot(
    query(
      collection(db, 'fittrack_student_workouts'),
      where('academyCode', '==', cleanCode)
    ),
    (snap) => {
      legacyStatus.clear();
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Partial<StudentWorkoutRecord>;
        const cpf = normalizeCpf(data.cpf ?? docSnap.id);
        if (cpf.length === 11) {
          legacyStatus.set(
            cpf,
            Boolean(Array.isArray(data.exercises) && data.exercises.length > 0)
          );
        }
      });
      emitMerged();
    },
    (error) => {
      logFirestoreError(error, OperationType.LIST, 'fittrack_student_workouts');
    }
  );

  return () => {
    unsubGym();
    unsubLegacy();
  };
}

/* ==================== fittrack_assessments (Avaliações Físicas) ==================== */

export async function saveAssessmentRecord(
  item: PhysicalAssessment
): Promise<{ syncedToCloud: boolean }> {
  const cleanCpf = normalizeCpf(item.studentCpf);
  const cleanCode = normalizeAcademyCode(item.gymCode || item.academyCode || '');
  if (cleanCpf.length !== 11 || !cleanCode || !item.id || isBrowserOffline()) {
    return { syncedToCloud: false };
  }

  const clean = sanitizeForFirestore({
    ...item,
    studentCpf: cleanCpf,
    gymCode: cleanCode,
    academyCode: cleanCode,
  });

  try {
    await setDoc(doc(db, 'fittrack_assessments', clean.id), clean);
    return { syncedToCloud: true };
  } catch (error) {
    logFirestoreError(
      error,
      OperationType.WRITE,
      `fittrack_assessments/${clean.id}`
    );
    return { syncedToCloud: false };
  }
}

export async function fetchAssessmentsByAcademy(
  rawGymCode: string
): Promise<PhysicalAssessment[]> {
  const cleanCode = normalizeAcademyCode(rawGymCode);
  if (!cleanCode || isBrowserOffline()) return [];

  try {
    const byId = new Map<string, PhysicalAssessment>();
    const [gymSnap, legacySnap] = await Promise.all([
      getDocs(
        query(
          collection(db, 'fittrack_assessments'),
          where('gymCode', '==', cleanCode)
        )
      ),
      getDocs(
        query(
          collection(db, 'fittrack_assessments'),
          where('academyCode', '==', cleanCode)
        )
      ),
    ]);

    [gymSnap, legacySnap].forEach((snap) => {
      snap.forEach((d) => {
        const data = d.data() as PhysicalAssessment;
        if (data && data.id) {
          byId.set(data.id, data);
        }
      });
    });

    return Array.from(byId.values()).sort((a, b) => {
      const dateCmp = (b.date ?? '').localeCompare(a.date ?? '');
      return dateCmp !== 0 ? dateCmp : b.id.localeCompare(a.id);
    });
  } catch (error) {
    logFirestoreError(error, OperationType.LIST, 'fittrack_assessments');
    return [];
  }
}

export function subscribeAssessmentsByGym(
  rawGymCode: string,
  onUpdate: (assessments: PhysicalAssessment[]) => void
): Unsubscribe {
  const cleanCode = normalizeAcademyCode(rawGymCode);
  if (!cleanCode) {
    onUpdate([]);
    return () => undefined;
  }

  const gymItems = new Map<string, PhysicalAssessment>();
  const legacyItems = new Map<string, PhysicalAssessment>();

  const emitMerged = () => {
    const merged = new Map<string, PhysicalAssessment>();
    legacyItems.forEach((val, key) => merged.set(key, val));
    gymItems.forEach((val, key) => merged.set(key, val));
    const list = Array.from(merged.values()).sort((a, b) => {
      const dateCmp = (b.date ?? '').localeCompare(a.date ?? '');
      return dateCmp !== 0 ? dateCmp : b.id.localeCompare(a.id);
    });
    onUpdate(list);
  };

  const unsubGym = onSnapshot(
    query(
      collection(db, 'fittrack_assessments'),
      where('gymCode', '==', cleanCode)
    ),
    (snap) => {
      gymItems.clear();
      snap.forEach((d) => {
        const data = d.data() as PhysicalAssessment;
        if (data && data.id) {
          gymItems.set(data.id, data);
        }
      });
      emitMerged();
    },
    (error) => {
      logFirestoreError(error, OperationType.LIST, 'fittrack_assessments');
    }
  );

  const unsubLegacy = onSnapshot(
    query(
      collection(db, 'fittrack_assessments'),
      where('academyCode', '==', cleanCode)
    ),
    (snap) => {
      legacyItems.clear();
      snap.forEach((d) => {
        const data = d.data() as PhysicalAssessment;
        if (data && data.id) {
          legacyItems.set(data.id, data);
        }
      });
      emitMerged();
    },
    (error) => {
      logFirestoreError(error, OperationType.LIST, 'fittrack_assessments');
    }
  );

  return () => {
    unsubGym();
    unsubLegacy();
  };
}

export async function fetchAssessmentsByStudentCpf(
  rawCpf: string
): Promise<PhysicalAssessment[]> {
  const cleanCpf = normalizeCpf(rawCpf);
  if (cleanCpf.length !== 11 || isBrowserOffline()) return [];

  try {
    const q = query(
      collection(db, 'fittrack_assessments'),
      where('studentCpf', '==', cleanCpf)
    );
    const snap = await getDocs(q);
    const list: PhysicalAssessment[] = [];
    snap.forEach((d) => {
      const data = d.data() as PhysicalAssessment;
      if (data && data.id) {
        list.push(data);
      }
    });
    return list.sort((a, b) => {
      const dateCmp = (b.date ?? '').localeCompare(a.date ?? '');
      return dateCmp !== 0 ? dateCmp : b.id.localeCompare(a.id);
    });
  } catch (error) {
    logFirestoreError(error, OperationType.LIST, 'fittrack_assessments');
    return [];
  }
}

export function subscribeAssessmentsByStudentCpf(
  rawCpf: string,
  onUpdate: (assessments: PhysicalAssessment[]) => void
): Unsubscribe {
  const cleanCpf = normalizeCpf(rawCpf);
  if (cleanCpf.length !== 11) {
    onUpdate([]);
    return () => undefined;
  }

  const q = query(
    collection(db, 'fittrack_assessments'),
    where('studentCpf', '==', cleanCpf)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: PhysicalAssessment[] = [];
      snap.forEach((d) => {
        const data = d.data() as PhysicalAssessment;
        if (data && data.id) {
          list.push(data);
        }
      });
      list.sort((a, b) => {
        const dateCmp = (b.date ?? '').localeCompare(a.date ?? '');
        return dateCmp !== 0 ? dateCmp : b.id.localeCompare(a.id);
      });
      onUpdate(list);
    },
    (error) => {
      logFirestoreError(error, OperationType.LIST, 'fittrack_assessments');
    }
  );
}

export async function deleteAssessmentRecord(id: string): Promise<void> {
  if (!id || isBrowserOffline()) return;
  try {
    await deleteDoc(doc(db, 'fittrack_assessments', id));
  } catch (error) {
    logFirestoreError(
      error,
      OperationType.DELETE,
      `fittrack_assessments/${id}`
    );
  }
}
