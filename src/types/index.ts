/**
 * Clip It Type Definitions
 */

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  organization?: string;
  createdAt: string;
  status: 'active' | 'suspended';
}

export type ProfileType = 'personal' | 'business' | 'family' | 'customer' | 'custom';

export interface CustomField {
  id: string;
  key: string;
  label: string;
  value: string;
}

export interface ProfileData {
  fullName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  company: string;
  jobTitle: string;
  department: string;
  taxId: string;
  nationalId: string;
  website: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  signatureUrl?: string;
  notes: string;
  customFields: CustomField[];
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  type: ProfileType;
  isDefault: boolean;
  data: ProfileData;
  updatedAt: string;
  createdAt: string;
}

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'signature'
  | 'address'
  | 'image'
  | 'auto_id';

export interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  customError?: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[]; // For dropdown, radio, checkbox
  defaultValue?: any;
  validation?: ValidationRule;
  autofillKey?: keyof ProfileData | string; // Mapping to profile key
  sectionId?: string;
  width?: 'full' | 'half' | 'third';
  autoIdPrefix?: string;
  autoIdDigits?: number;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
}

export interface DocumentOverlayField {
  id: string;
  page: number; // 1-indexed
  x: number; // percentage (0-100) or px
  y: number; // percentage (0-100) or px
  width: number;
  height: number;
  type: FormFieldType;
  label: string;
  value?: any;
  required?: boolean;
}

export interface PdfDocument {
  id: string;
  name: string;
  originalFileName?: string;
  templateType: 'w4' | 'nda' | 'rental' | 'medical' | 'custom';
  pageCount: number;
  overlayFields: DocumentOverlayField[];
  backgroundPreviewUrl?: string;
}

export type FormStatus = 'draft' | 'published' | 'archived';

export interface Form {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  status: FormStatus;
  isTemplate: boolean;
  sections: FormSection[];
  fields: FormField[];
  pdfDocument?: PdfDocument;
  submissionsCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface FormSubmission {
  id: string;
  formId: string;
  formTitle: string;
  userId: string;
  profileIdUsed?: string;
  profileNameUsed?: string;
  status: 'draft' | 'completed';
  data: Record<string, any>; // fieldId -> value
  signatureDataUrl?: string;
  progressPercentage: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TemplateCategory =
  | 'Applications'
  | 'Invoices'
  | 'Registration forms'
  | 'Employee forms'
  | 'Customer forms'
  | 'School forms'
  | 'Business forms'
  | 'Contact forms';

export interface Template {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  fields: FormField[];
  sections: FormSection[];
  tags: string[];
  pdfDocument?: PdfDocument;
  estimatedFillTime: string;
  iconName?: string;
}

export interface FormMetadata {
  action?: string;
  method?: string;
  id?: string;
  name?: string;
  className?: string;
  totalInputs: number;
  requiredFieldsCount: number;
  enctype?: string;
}

export interface CapturedWebField {
  name: string;
  id?: string;
  label: string;
  type: string;
  tagName?: 'input' | 'select' | 'textarea';
  value: any;
  selector?: string;
  autofillKey?: string;
  placeholder?: string;
  required?: boolean;
  autocomplete?: string;
  options?: Array<{ value: string; text: string }>; // For <select> elements
  formId?: string;
}

export interface CapturedWebForm {
  id: string;
  userId: string;
  clipTitle?: string;
  clipNotes?: string;
  sourceUrl: string;
  originUrl: string;
  pathname?: string;
  sourceDomain: string;
  pageTitle: string;
  contextLabel: string; // e.g., 'Job Application', 'Shipping & Checkout', 'Tax Document', etc.
  matchingProfileType?: ProfileType;
  matchingProfileId?: string;
  matchingProfileName?: string;
  autoMatchEnabled?: boolean;
  formIdOrName?: string;
  formMetadata?: FormMetadata;
  fields: CapturedWebField[];
  fieldMappings?: Record<string, string>; // fieldName -> profile attribute key
  capturedAt: string;
  status: 'saved' | 'pending';
  appliedCount: number;
  lastAppliedAt?: string;
}

export type SavedClip = CapturedWebForm;

export type NavigationTab =
  | 'dashboard'
  | 'forms'
  | 'templates'
  | 'profiles'
  | 'completed'
  | 'pdf-studio'
  | 'extension'
  | 'settings'
  | 'admin';
