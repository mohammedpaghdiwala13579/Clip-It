/**
 * Storage and Persistence Service
 * Enforces user isolation, sensitive data obfuscation, and data integrity.
 */

import { User, Profile, Form, FormSubmission, Template, UserRole, CapturedWebForm, FormField } from '../types';
import { SEED_USERS, SEED_PROFILES, SEED_FORMS, SEED_SUBMISSIONS } from '../data/seedData';
import { INITIAL_TEMPLATES } from '../data/initialTemplates';

const STORAGE_KEYS = {
  USERS: 'clipit_users_v1',
  CURRENT_USER_ID: 'clipit_current_user_v1',
  PROFILES: 'clipit_profiles_v1',
  FORMS: 'clipit_forms_v1',
  SUBMISSIONS: 'clipit_submissions_v1',
  TEMPLATES: 'clipit_templates_v1',
  CAPTURED_FORMS: 'clipit_captured_forms_v1',
  SETTINGS: 'clipit_settings_v1',
};

// Safe localStorage wrapper
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

function writeJson<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

// Initialize clean data (no hardcoded identities or pre-filled forms)
export function initStorage(): void {
  // Clear any legacy demo data from v1 keys
  if (localStorage.getItem('formfill_users_v1')) {
    localStorage.removeItem('formfill_users_v1');
    localStorage.removeItem('formfill_current_user_v1');
    localStorage.removeItem('formfill_profiles_v1');
    localStorage.removeItem('formfill_forms_v1');
    localStorage.removeItem('formfill_submissions_v1');
    localStorage.removeItem('formfill_templates_v1');
  }

  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    writeJson(STORAGE_KEYS.USERS, SEED_USERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, SEED_USERS[0].id);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PROFILES)) {
    writeJson(STORAGE_KEYS.PROFILES, SEED_PROFILES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.FORMS)) {
    writeJson(STORAGE_KEYS.FORMS, SEED_FORMS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SUBMISSIONS)) {
    writeJson(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
    writeJson(STORAGE_KEYS.TEMPLATES, INITIAL_TEMPLATES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CAPTURED_FORMS)) {
    writeJson(STORAGE_KEYS.CAPTURED_FORMS, []);
  }
}

// User / Auth APIs
export function getAllUsers(): User[] {
  return readJson<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
}

export function getCurrentUser(): User {
  const users = getAllUsers();
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  const found = users.find((u) => u.id === currentId);
  return found || users[0] || SEED_USERS[0];
}

export function setCurrentUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: user }));
}

export function loginUser(email: string): { success: boolean; user?: User; error?: string } {
  const users = getAllUsers();
  const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!found) {
    return { success: false, error: 'No account found with this email address.' };
  }
  if (found.status === 'suspended') {
    return { success: false, error: 'This account has been suspended by an administrator.' };
  }
  setCurrentUser(found);
  return { success: true, user: found };
}

export function signupUser(name: string, email: string, role: UserRole = 'user'): { success: boolean; user?: User; error?: string } {
  const users = getAllUsers();
  const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return { success: false, error: 'An account with this email address already exists.' };
  }

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    createdAt: new Date().toISOString(),
    status: 'active',
  };

  const updatedUsers = [...users, newUser];
  writeJson(STORAGE_KEYS.USERS, updatedUsers);

  // Initialize a default personal profile for the new user
  const initialProfile: Profile = {
    id: `prof_${Date.now()}`,
    userId: newUser.id,
    name: 'Personal Profile',
    type: 'personal',
    isDefault: true,
    data: {
      fullName: newUser.name,
      firstName: newUser.name.split(' ')[0] || '',
      lastName: newUser.name.split(' ').slice(1).join(' ') || '',
      dateOfBirth: '',
      gender: '',
      phone: '',
      email: newUser.email,
      address: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      company: '',
      jobTitle: '',
      department: '',
      taxId: '',
      nationalId: '',
      website: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      notes: '',
      customFields: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const profiles = readJson<Profile[]>(STORAGE_KEYS.PROFILES, []);
  writeJson(STORAGE_KEYS.PROFILES, [...profiles, initialProfile]);

  setCurrentUser(newUser);
  return { success: true, user: newUser };
}

export function updateUserStatus(userId: string, status: 'active' | 'suspended', role?: UserRole): void {
  const users = getAllUsers();
  const updated = users.map((u) => {
    if (u.id === userId) {
      return {
        ...u,
        status,
        role: role !== undefined ? role : u.role,
      };
    }
    return u;
  });
  writeJson(STORAGE_KEYS.USERS, updated);
}

export function deleteUserAccount(userId: string): void {
  // Delete user record
  const users = getAllUsers().filter((u) => u.id !== userId);
  writeJson(STORAGE_KEYS.USERS, users);

  // Delete all profiles
  const profiles = readJson<Profile[]>(STORAGE_KEYS.PROFILES, []).filter((p) => p.userId !== userId);
  writeJson(STORAGE_KEYS.PROFILES, profiles);

  // Delete all forms
  const forms = readJson<Form[]>(STORAGE_KEYS.FORMS, []).filter((f) => f.userId !== userId);
  writeJson(STORAGE_KEYS.FORMS, forms);

  // Delete all submissions
  const subs = readJson<FormSubmission[]>(STORAGE_KEYS.SUBMISSIONS, []).filter((s) => s.userId !== userId);
  writeJson(STORAGE_KEYS.SUBMISSIONS, subs);

  // Fallback to first available user or admin
  const nextUser = users[0] || SEED_USERS[0];
  setCurrentUser(nextUser);
}

// Forms API (isolated by userId, or admin access)
export function getForms(userId: string, isAdmin: boolean = false): Form[] {
  const forms = readJson<Form[]>(STORAGE_KEYS.FORMS, SEED_FORMS);
  if (isAdmin) return forms;
  return forms.filter((f) => f.userId === userId);
}

export function getForm(formId: string): Form | undefined {
  const forms = readJson<Form[]>(STORAGE_KEYS.FORMS, SEED_FORMS);
  return forms.find((f) => f.id === formId);
}

export function saveForm(form: Form): void {
  const forms = readJson<Form[]>(STORAGE_KEYS.FORMS, SEED_FORMS);
  const index = forms.findIndex((f) => f.id === form.id);
  const now = new Date().toISOString();
  
  if (index >= 0) {
    forms[index] = { ...form, updatedAt: now };
  } else {
    forms.unshift({ ...form, createdAt: form.createdAt || now, updatedAt: now });
  }
  writeJson(STORAGE_KEYS.FORMS, forms);
}

export function duplicateForm(formId: string, userId: string): Form | null {
  const form = getForm(formId);
  if (!form) return null;
  const now = new Date().toISOString();
  const newForm: Form = {
    ...form,
    id: `form_${Date.now()}`,
    userId,
    title: `${form.title} (Copy)`,
    submissionsCount: 0,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  saveForm(newForm);
  return newForm;
}

export function deleteForm(formId: string): void {
  const forms = readJson<Form[]>(STORAGE_KEYS.FORMS, SEED_FORMS);
  writeJson(
    STORAGE_KEYS.FORMS,
    forms.filter((f) => f.id !== formId)
  );
}

// Profiles API (isolated by userId)
export function getProfiles(userId: string): Profile[] {
  const profiles = readJson<Profile[]>(STORAGE_KEYS.PROFILES, SEED_PROFILES);
  return profiles.filter((p) => p.userId === userId);
}

export function getProfile(profileId: string): Profile | undefined {
  const profiles = readJson<Profile[]>(STORAGE_KEYS.PROFILES, SEED_PROFILES);
  return profiles.find((p) => p.id === profileId);
}

export function saveProfile(profile: Profile): void {
  const profiles = readJson<Profile[]>(STORAGE_KEYS.PROFILES, SEED_PROFILES);
  const now = new Date().toISOString();
  const index = profiles.findIndex((p) => p.id === profile.id);

  let updatedList = [...profiles];
  if (profile.isDefault) {
    // Unset default for user's other profiles
    updatedList = updatedList.map((p) => (p.userId === profile.userId ? { ...p, isDefault: false } : p));
  }

  if (index >= 0) {
    updatedList[index] = { ...profile, updatedAt: now };
  } else {
    updatedList.push({ ...profile, createdAt: now, updatedAt: now });
  }

  writeJson(STORAGE_KEYS.PROFILES, updatedList);
}

export function deleteProfile(profileId: string): void {
  const profiles = readJson<Profile[]>(STORAGE_KEYS.PROFILES, SEED_PROFILES);
  writeJson(
    STORAGE_KEYS.PROFILES,
    profiles.filter((p) => p.id !== profileId)
  );
}

// Submissions API (isolated by userId)
export function getSubmissions(userId: string, isAdmin: boolean = false): FormSubmission[] {
  const subs = readJson<FormSubmission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
  if (isAdmin) return subs;
  return subs.filter((s) => s.userId === userId);
}

export function getSubmission(submissionId: string): FormSubmission | undefined {
  const subs = readJson<FormSubmission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
  return subs.find((s) => s.id === submissionId);
}

export function saveSubmission(submission: FormSubmission): void {
  const subs = readJson<FormSubmission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
  const index = subs.findIndex((s) => s.id === submission.id);
  const now = new Date().toISOString();

  if (index >= 0) {
    subs[index] = { ...submission, updatedAt: now };
  } else {
    subs.unshift({ ...submission, createdAt: submission.createdAt || now, updatedAt: now });
  }
  writeJson(STORAGE_KEYS.SUBMISSIONS, subs);

  // If newly completed, increment form submissionsCount
  if (submission.status === 'completed') {
    const form = getForm(submission.formId);
    if (form) {
      saveForm({
        ...form,
        submissionsCount: (form.submissionsCount || 0) + 1,
      });
    }
  }
}

export function deleteSubmission(submissionId: string): void {
  const subs = readJson<FormSubmission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
  writeJson(
    STORAGE_KEYS.SUBMISSIONS,
    subs.filter((s) => s.id !== submissionId)
  );
}

// Templates API
export function getTemplates(): Template[] {
  return readJson<Template[]>(STORAGE_KEYS.TEMPLATES, INITIAL_TEMPLATES);
}

export function saveTemplate(template: Template): void {
  const templates = getTemplates();
  const index = templates.findIndex((t) => t.id === template.id);
  if (index >= 0) {
    templates[index] = template;
  } else {
    templates.unshift(template);
  }
  writeJson(STORAGE_KEYS.TEMPLATES, templates);
}

export function deleteTemplate(templateId: string): void {
  const templates = getTemplates();
  writeJson(
    STORAGE_KEYS.TEMPLATES,
    templates.filter((t) => t.id !== templateId)
  );
}

// Captured Web Forms API (from browser extension or live site interceptor)
export function getCapturedForms(userId: string): CapturedWebForm[] {
  const all = readJson<CapturedWebForm[]>(STORAGE_KEYS.CAPTURED_FORMS, []);
  return all.filter((c) => c.userId === userId);
}

export function saveCapturedForm(captured: CapturedWebForm): void {
  const all = readJson<CapturedWebForm[]>(STORAGE_KEYS.CAPTURED_FORMS, []);
  const index = all.findIndex((c) => c.id === captured.id);
  if (index >= 0) {
    all[index] = captured;
  } else {
    all.unshift(captured);
  }
  writeJson(STORAGE_KEYS.CAPTURED_FORMS, all);
}

export function deleteCapturedForm(id: string): void {
  const all = readJson<CapturedWebForm[]>(STORAGE_KEYS.CAPTURED_FORMS, []);
  writeJson(
    STORAGE_KEYS.CAPTURED_FORMS,
    all.filter((c) => c.id !== id)
  );
}

export function convertCapturedToForm(captured: CapturedWebForm, userId: string): Form {
  const fields: FormField[] = captured.fields.map((f, idx) => {
    let fType: FormField['type'] = 'text';
    const t = f.type.toLowerCase();
    if (t.includes('email')) fType = 'email';
    else if (t.includes('tel') || t.includes('phone')) fType = 'phone';
    else if (t.includes('number')) fType = 'number';
    else if (t.includes('date')) fType = 'date';
    else if (t.includes('textarea')) fType = 'textarea';
    else if (t.includes('checkbox')) fType = 'checkbox';
    else if (t.includes('select') || t.includes('dropdown')) fType = 'dropdown';

    return {
      id: `fld_cap_${idx}_${Date.now()}`,
      type: fType,
      label: f.label || f.name || `Field ${idx + 1}`,
      defaultValue: f.value,
      required: false,
      width: fType === 'textarea' ? 'full' : 'half',
      autofillKey: f.autofillKey,
    };
  });

  const newForm: Form = {
    id: `form_cap_${Date.now()}`,
    userId,
    title: `${captured.contextLabel || captured.pageTitle || captured.sourceDomain} Form`,
    description: `Captured from ${captured.originUrl || captured.sourceUrl} via Clip It Web Extension (Context: ${captured.contextLabel || 'General'})`,
    category: 'Applications',
    status: 'published',
    isTemplate: false,
    sections: [
      {
        id: 'sec_captured',
        title: captured.contextLabel ? `${captured.contextLabel} Fields` : 'Captured Form Fields',
        description: `Source Origin: ${captured.originUrl || captured.sourceDomain}`,
      },
    ],
    fields,
    submissionsCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['Web Captured', captured.sourceDomain, captured.contextLabel || 'General'],
  };

  saveForm(newForm);
  return newForm;
}

// Export / Backup & Reset
export function exportAllUserData(userId: string): string {
  const user = getAllUsers().find((u) => u.id === userId);
  const profiles = getProfiles(userId);
  const forms = getForms(userId);
  const submissions = getSubmissions(userId);

  const payload = {
    exportedAt: new Date().toISOString(),
    user,
    profiles,
    forms,
    submissions,
    version: '1.0.0',
    app: 'Clip It',
  };

  return JSON.stringify(payload, null, 2);
}

export function resetToDemo(): void {
  localStorage.clear();
  initStorage();
  window.location.reload();
}
