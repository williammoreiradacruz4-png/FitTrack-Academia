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
  where,
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

const ACADEMIES_LOCAL_KEY = 'fittrack_academies';
const USERS_LOCAL_KEY = 'fittrack_users';
const WORKOUTS_LOCAL_KEY = 'fittrack_student_workouts';
const ASSESSMENTS_LOCAL_KEY = 'fittrack_assessments_v1';

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

function readLocalMap<T>(key: string): Record<string, T> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, T>)
      : {};
  } catch {
    return {};
  }
}

function writeLocalMap<T>(key: string, map: Record<string, T>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // Ignore quota errors
  }
}

/* ==================== fittrack_academies (Multi-Tenant) ==================== */

const ACADEMY_FALLBACK_PREFIX = 'ACADEMY_';

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  const message =
    'message' in error ? String((error as { message?: unknown }).message) : '';
  return (
    code === 'permission-denied' ||
    message.includes('Missing or insufficient permissions')
  );
}

export function getLocalAcademyByCode(rawCode: string): Academy | null {
  const code = normalizeAcademyCode(rawCode);
  if (!code) return null;
  const map = readLocalMap<Academy>(ACADEMIES_LOCAL_KEY);
  return map[code] ?? null;
}

export async function saveAcademy(
  academy: Academy
): Promise<{ syncedToCloud: boolean }> {
  const cleanCode = normalizeAcademyCode(academy.code);
  const cleanAcademy = sanitizeForFirestore({ ...academy, code: cleanCode });

  const map = readLocalMap<Academy>(ACADEMIES_LOCAL_KEY);
  map[cleanCode] = cleanAcademy;
  writeLocalMap(ACADEMIES_LOCAL_KEY, map);

  if (isBrowserOffline()) {
    return { syncedToCloud: false };
  }

  try {
    await setDoc(doc(db, 'fittrack_academies', cleanCode), cleanAcademy);
    return { syncedToCloud: true };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      try {
        await setDoc(
          doc(db, 'fittrack_users', `${ACADEMY_FALLBACK_PREFIX}${cleanCode}`),
          { ...cleanAcademy, recordType: 'academy' }
        );
        return { syncedToCloud: true };
      } catch (fallbackError) {
        logFirestoreError(
          fallbackError,
          OperationType.WRITE,
          `fittrack_users/${ACADEMY_FALLBACK_PREFIX}${cleanCode}`
        );
        return { syncedToCloud: false };
      }
    }
    logFirestoreError(
      error,
      OperationType.WRITE,
      `fittrack_academies/${cleanCode}`
    );
    return { syncedToCloud: false };
  }
}

export async function fetchAcademyByCode(
  rawCode: string
): Promise<Academy | null> {
  const code = normalizeAcademyCode(rawCode);
  if (!code) return null;

  if (isBrowserOffline()) {
    return getLocalAcademyByCode(code);
  }

  try {
    const snap = await getDoc(doc(db, 'fittrack_academies', code));
    if (snap.exists()) {
      const data = snap.data() as Academy;
      const map = readLocalMap<Academy>(ACADEMIES_LOCAL_KEY);
      map[code] = data;
      writeLocalMap(ACADEMIES_LOCAL_KEY, map);
      return data;
    }
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      logFirestoreError(
        error,
        OperationType.GET,
        `fittrack_academies/${code}`
      );
    }
  }

  try {
    const fallbackSnap = await getDoc(
      doc(db, 'fittrack_users', `${ACADEMY_FALLBACK_PREFIX}${code}`)
    );
    if (fallbackSnap.exists()) {
      const rawData = fallbackSnap.data() as Academy & { recordType?: string };
      const cleanAcademy: Academy = {
        code: rawData.code ?? code,
        name: rawData.name,
        professorName: rawData.professorName,
        password: rawData.password,
        logoUrl: rawData.logoUrl,
        createdAt: rawData.createdAt,
      };
      const map = readLocalMap<Academy>(ACADEMIES_LOCAL_KEY);
      map[code] = cleanAcademy;
      writeLocalMap(ACADEMIES_LOCAL_KEY, map);
      return cleanAcademy;
    }
  } catch (fallbackError) {
    logFirestoreError(
      fallbackError,
      OperationType.GET,
      `fittrack_users/${ACADEMY_FALLBACK_PREFIX}${code}`
    );
  }

  return getLocalAcademyByCode(code);
}

export async function deleteAcademyByCode(rawCode: string): Promise<void> {
  const code = normalizeAcademyCode(rawCode);
  if (!code) return;

  const map = readLocalMap<Academy>(ACADEMIES_LOCAL_KEY);
  if (map[code]) {
    delete map[code];
    writeLocalMap(ACADEMIES_LOCAL_KEY, map);
  }

  if (isBrowserOffline()) return;

  try {
    await deleteDoc(doc(db, 'fittrack_academies', code));
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      logFirestoreError(error, OperationType.DELETE, `fittrack_academies/${code}`);
    }
  }

  try {
    await deleteDoc(
      doc(db, 'fittrack_users', `${ACADEMY_FALLBACK_PREFIX}${code}`)
    );
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      logFirestoreError(
        error,
        OperationType.DELETE,
        `fittrack_users/${ACADEMY_FALLBACK_PREFIX}${code}`
      );
    }
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

const MAIS_VIDA_CLEANUP_KEY = 'fittrack_cleanup_mais_vida_v1';

export function runOneTimeMaisVidaCleanup(): boolean {
  try {
    if (window.localStorage.getItem(MAIS_VIDA_CLEANUP_KEY) === 'done') {
      return false;
    }

    const map = readLocalMap<Academy>(ACADEMIES_LOCAL_KEY);
    let removedAny = false;
    const codesToDelete: string[] = [];

    for (const [key, item] of Object.entries(map)) {
      const normalizedName = (item?.name ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      if (
        key === 'MAIS-VIDA' ||
        key === 'MAIS-VIDA-ACADEMIA' ||
        normalizedName.includes('mais vida')
      ) {
        codesToDelete.push(key);
        delete map[key];
        removedAny = true;
      }
    }

    if (removedAny) {
      writeLocalMap(ACADEMIES_LOCAL_KEY, map);
    }

    // Best-effort cloud cleanup for known code variants
    const candidates = Array.from(
      new Set(['MAIS-VIDA', 'MAIS-VIDA-ACADEMIA', ...codesToDelete])
    );
    candidates.forEach((c) => {
      void deleteAcademyByCode(c);
    });

    window.localStorage.setItem(MAIS_VIDA_CLEANUP_KEY, 'done');
    return removedAny;
  } catch {
    return false;
  }
}

/* ==================== fittrack_users ==================== */

export function getLocalStudentProfile(rawCpf: string): StudentProfile | null {
  const cpf = normalizeCpf(rawCpf);
  if (cpf.length !== 11) return null;
  const map = readLocalMap<StudentProfile>(USERS_LOCAL_KEY);
  return map[cpf] ?? null;
}

export function listLocalStudentProfiles(academyCode?: string): StudentProfile[] {
  const map = readLocalMap<StudentProfile>(USERS_LOCAL_KEY);
  const cleanCode = academyCode ? normalizeAcademyCode(academyCode) : '';
  return Object.values(map)
    .filter((s) => !cleanCode || normalizeAcademyCode(s.academyCode ?? '') === cleanCode)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveStudentProfile(
  profile: StudentProfile
): Promise<{ syncedToCloud: boolean }> {
  const cleanCpf = normalizeCpf(profile.cpf);
  const cleanCode = normalizeAcademyCode(profile.academyCode);
  const cleanProfile = sanitizeForFirestore({
    ...profile,
    cpf: cleanCpf,
    academyCode: cleanCode,
  });

  const map = readLocalMap<StudentProfile>(USERS_LOCAL_KEY);
  map[cleanCpf] = cleanProfile;
  writeLocalMap(USERS_LOCAL_KEY, map);

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
  if (cpf.length !== 11) return null;

  if (isBrowserOffline()) {
    return getLocalStudentProfile(cpf);
  }

  try {
    const snap = await getDoc(doc(db, 'fittrack_users', cpf));
    if (snap.exists()) {
      const data = snap.data() as StudentProfile;
      const map = readLocalMap<StudentProfile>(USERS_LOCAL_KEY);
      map[cpf] = data;
      writeLocalMap(USERS_LOCAL_KEY, map);
      return data;
    }
  } catch (error) {
    logFirestoreError(error, OperationType.GET, `fittrack_users/${cpf}`);
  }

  return getLocalStudentProfile(cpf);
}

export async function fetchStudentsByAcademy(
  rawAcademyCode: string
): Promise<StudentProfile[]> {
  const cleanCode = normalizeAcademyCode(rawAcademyCode);
  if (!cleanCode) return [];

  const localMap = readLocalMap<StudentProfile>(USERS_LOCAL_KEY);
  const merged: Record<string, StudentProfile> = { ...localMap };

  if (!isBrowserOffline()) {
    try {
      const q = query(
        collection(db, 'fittrack_users'),
        where('academyCode', '==', cleanCode)
      );
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        const data = docSnap.data() as StudentProfile;
        if (data && data.cpf) {
          merged[data.cpf] = data;
        }
      });
      writeLocalMap(USERS_LOCAL_KEY, merged);
    } catch (error) {
      logFirestoreError(error, OperationType.LIST, 'fittrack_users');
    }
  }

  return Object.values(merged)
    .filter((s) => normalizeAcademyCode(s.academyCode ?? '') === cleanCode)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/* ==================== fittrack_student_workouts ==================== */

export function getLocalStudentWorkout(rawCpf: string): StudentWorkoutRecord | null {
  const cpf = normalizeCpf(rawCpf);
  if (cpf.length !== 11) return null;
  const map = readLocalMap<StudentWorkoutRecord>(WORKOUTS_LOCAL_KEY);
  return map[cpf] ?? null;
}

export async function saveStudentWorkout(
  record: StudentWorkoutRecord
): Promise<{ syncedToCloud: boolean }> {
  const cleanCpf = normalizeCpf(record.cpf);
  const cleanCode = normalizeAcademyCode(record.academyCode);
  const cleanRecord = sanitizeForFirestore({
    ...record,
    cpf: cleanCpf,
    academyCode: cleanCode,
  });

  const map = readLocalMap<StudentWorkoutRecord>(WORKOUTS_LOCAL_KEY);
  map[cleanCpf] = cleanRecord;
  writeLocalMap(WORKOUTS_LOCAL_KEY, map);

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
  if (cpf.length !== 11) return;

  const existing = getLocalStudentWorkout(cpf);
  if (!existing) return;

  const updated: StudentWorkoutRecord = sanitizeForFirestore({
    ...existing,
    exercises,
    updatedAt: new Date().toISOString(),
  });

  const map = readLocalMap<StudentWorkoutRecord>(WORKOUTS_LOCAL_KEY);
  map[cpf] = updated;
  writeLocalMap(WORKOUTS_LOCAL_KEY, map);

  if (isBrowserOffline()) return;

  try {
    await setDoc(doc(db, 'fittrack_student_workouts', cpf), updated);
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
  if (cpf.length !== 11) return null;

  if (isBrowserOffline()) {
    return getLocalStudentWorkout(cpf);
  }

  try {
    const snap = await getDoc(doc(db, 'fittrack_student_workouts', cpf));
    if (snap.exists()) {
      const data = snap.data() as StudentWorkoutRecord;
      const map = readLocalMap<StudentWorkoutRecord>(WORKOUTS_LOCAL_KEY);
      map[cpf] = data;
      writeLocalMap(WORKOUTS_LOCAL_KEY, map);
      return data;
    }
  } catch (error) {
    logFirestoreError(
      error,
      OperationType.GET,
      `fittrack_student_workouts/${cpf}`
    );
  }

  return getLocalStudentWorkout(cpf);
}

export async function fetchWorkoutStatusMapForCpfs(
  cpfs: string[]
): Promise<Record<string, boolean>> {
  const statusMap: Record<string, boolean> = {};
  await Promise.all(
    cpfs.map(async (cpf) => {
      const cleanCpf = normalizeCpf(cpf);
      if (cleanCpf.length !== 11) return;
      const record = await fetchStudentWorkoutByCpf(cleanCpf);
      statusMap[cleanCpf] = Boolean(record && record.exercises.length > 0);
    })
  );
  return statusMap;
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

  onUpdate(getLocalStudentWorkout(cpf));

  let activeSnapshotUnsub: Unsubscribe | null = null;
  let disposed = false;

  const attachSnapshot = () => {
    if (disposed || activeSnapshotUnsub || isBrowserOffline()) return;
    const docRef = doc(db, 'fittrack_student_workouts', cpf);
    activeSnapshotUnsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as StudentWorkoutRecord;
          const map = readLocalMap<StudentWorkoutRecord>(WORKOUTS_LOCAL_KEY);
          map[cpf] = data;
          writeLocalMap(WORKOUTS_LOCAL_KEY, map);
          onUpdate(data);
        }
      },
      (error) => {
        logFirestoreError(
          error,
          OperationType.GET,
          `fittrack_student_workouts/${cpf}`
        );
        onUpdate(getLocalStudentWorkout(cpf));
      }
    );
  };

  const detachSnapshot = () => {
    if (activeSnapshotUnsub) {
      activeSnapshotUnsub();
      activeSnapshotUnsub = null;
    }
  };

  attachSnapshot();

  const handleOnline = () => attachSnapshot();
  const handleOffline = () => detachSnapshot();

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  return () => {
    disposed = true;
    detachSnapshot();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };
}

/* ==================== fittrack_assessments ==================== */

export function loadLocalAssessments(academyCode?: string): PhysicalAssessment[] {
  try {
    const raw = window.localStorage.getItem(ASSESSMENTS_LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? (parsed as PhysicalAssessment[]) : [];
    const cleanCode = academyCode ? normalizeAcademyCode(academyCode) : '';
    if (!cleanCode) return list;
    return list.filter(
      (a) => !a.academyCode || normalizeAcademyCode(a.academyCode) === cleanCode
    );
  } catch {
    return [];
  }
}

export function saveLocalAssessments(list: PhysicalAssessment[]) {
  try {
    window.localStorage.setItem(ASSESSMENTS_LOCAL_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage errors
  }
}

export async function saveAssessmentRecord(
  item: PhysicalAssessment
): Promise<{ syncedToCloud: boolean }> {
  const clean = sanitizeForFirestore(item);
  const current = loadLocalAssessments().filter((a) => a.id !== clean.id);
  saveLocalAssessments([clean, ...current]);

  if (isBrowserOffline()) {
    return { syncedToCloud: false };
  }

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
  rawAcademyCode: string
): Promise<PhysicalAssessment[]> {
  const cleanCode = normalizeAcademyCode(rawAcademyCode);
  const allLocal = loadLocalAssessments();
  const byId = new Map<string, PhysicalAssessment>();
  allLocal.forEach((a) => byId.set(a.id, a));

  if (!isBrowserOffline()) {
    try {
      const q = cleanCode
        ? query(
            collection(db, 'fittrack_assessments'),
            where('academyCode', '==', cleanCode)
          )
        : collection(db, 'fittrack_assessments');
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data() as PhysicalAssessment;
        if (data && data.id) {
          byId.set(data.id, data);
        }
      });
      const mergedAll = Array.from(byId.values()).sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      saveLocalAssessments(mergedAll);
    } catch (error) {
      logFirestoreError(error, OperationType.LIST, 'fittrack_assessments');
    }
  }

  return loadLocalAssessments(cleanCode);
}

export function loadLocalAssessmentsByCpf(rawCpf: string): PhysicalAssessment[] {
  const cleanCpf = normalizeCpf(rawCpf);
  if (cleanCpf.length !== 11) return [];
  return loadLocalAssessments()
    .filter((a) => normalizeCpf(a.studentCpf ?? '') === cleanCpf)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchAssessmentsByStudentCpf(
  rawCpf: string
): Promise<PhysicalAssessment[]> {
  const cleanCpf = normalizeCpf(rawCpf);
  if (cleanCpf.length !== 11) return [];

  const allLocal = loadLocalAssessments();
  const byId = new Map<string, PhysicalAssessment>();
  allLocal.forEach((a) => byId.set(a.id, a));

  if (!isBrowserOffline()) {
    try {
      const q = query(
        collection(db, 'fittrack_assessments'),
        where('studentCpf', '==', cleanCpf)
      );
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data() as PhysicalAssessment;
        if (data && data.id) {
          byId.set(data.id, data);
        }
      });
      const mergedAll = Array.from(byId.values()).sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      saveLocalAssessments(mergedAll);
    } catch (error) {
      logFirestoreError(error, OperationType.LIST, 'fittrack_assessments');
    }
  }

  return loadLocalAssessmentsByCpf(cleanCpf);
}

export async function deleteAssessmentRecord(id: string): Promise<void> {
  const next = loadLocalAssessments().filter((a) => a.id !== id);
  saveLocalAssessments(next);
  if (isBrowserOffline()) return;
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
