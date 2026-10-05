import { User, Profile, Form, FormSubmission } from '../types';

// No hardcoded personal or corporate profiles.
// The application starts clean, allowing the user to configure their real profiles,
// create or capture actual web forms, and record genuine submissions.

export const SEED_USERS: User[] = [
  {
    id: 'usr_primary',
    name: 'Primary User',
    email: 'user@example.com',
    role: 'admin',
    organization: 'My Workspace',
    createdAt: new Date().toISOString(),
    status: 'active',
  },
];

export const SEED_PROFILES: Profile[] = [];
export const SEED_FORMS: Form[] = [];
export const SEED_SUBMISSIONS: FormSubmission[] = [];
