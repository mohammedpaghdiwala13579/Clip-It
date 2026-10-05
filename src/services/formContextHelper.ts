import { CapturedWebField, CapturedWebForm, FormMetadata, Profile, ProfileType } from '../types';

export interface FormContextResult {
  originUrl: string;
  pathname: string;
  sourceUrl: string;
  sourceDomain: string;
  pageTitle: string;
  suggestedLabel: string;
  suggestedProfileType: ProfileType;
  formMetadata: FormMetadata;
  fields: CapturedWebField[];
}

/**
 * Universal helper that captures the browser window's origin URL and form metadata,
 * generates an intelligent context recommendation, and preps for automated profile matching.
 */
export function extractBrowserFormContext(
  rawUrl: string,
  pageTitle: string,
  fieldList: Array<{
    name: string;
    id?: string;
    label: string;
    type: string;
    value?: any;
    placeholder?: string;
    required?: boolean;
    autofillKey?: string;
    autocomplete?: string;
  }>,
  formMeta?: Partial<FormMetadata>
): FormContextResult {
  let originUrl = 'https://example.com';
  let pathname = '/';
  let sourceDomain = 'example.com';

  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    originUrl = parsed.origin;
    pathname = parsed.pathname || '/';
    sourceDomain = parsed.hostname;
  } catch {
    originUrl = rawUrl;
    sourceDomain = rawUrl.replace(/^https?:\/\//, '').split('/')[0];
  }

  // Count required fields
  const requiredCount = fieldList.filter((f) => f.required).length;

  const formMetadata: FormMetadata = {
    action: formMeta?.action || `${originUrl}${pathname}`,
    method: formMeta?.method || 'POST',
    id: formMeta?.id || 'clipit-detected-form',
    name: formMeta?.name || 'online_form',
    className: formMeta?.className || 'standard-form',
    totalInputs: fieldList.length,
    requiredFieldsCount: requiredCount,
    enctype: formMeta?.enctype || 'application/x-www-form-urlencoded',
  };

  // Heuristic context labeling based on origin URL, pathname, title, and fields
  const haystack = `${originUrl} ${pathname} ${pageTitle} ${fieldList.map((f) => `${f.name} ${f.label}`).join(' ')}`.toLowerCase();

  let suggestedLabel = 'Web Form Submission';
  let suggestedProfileType: ProfileType = 'personal';

  if (/(job|career|applicant|resume|employment|hiring|work_history)/i.test(haystack)) {
    suggestedLabel = 'Job & Employment Application';
    suggestedProfileType = 'personal';
  } else if (/(checkout|billing|shipping|cart|payment|order|card|credit)/i.test(haystack)) {
    suggestedLabel = 'Checkout & Shipping Address';
    suggestedProfileType = 'personal';
  } else if (/(identity|license|tax|ssn|gov|official|portal\.gov|renewal)/i.test(haystack)) {
    suggestedLabel = 'Identity & Official Verification';
    suggestedProfileType = 'personal';
  } else if (/(company|business|vendor|client|b2b|corporate|ein|vat|partner)/i.test(haystack)) {
    suggestedLabel = 'Business & Corporate Invoicing';
    suggestedProfileType = 'business';
  } else if (/(school|student|admission|faculty|course|grade|tuition|parent)/i.test(haystack)) {
    suggestedLabel = 'Academic & School Registration';
    suggestedProfileType = 'family';
  } else if (/(patient|medical|clinic|doctor|health|insurance)/i.test(haystack)) {
    suggestedLabel = 'Healthcare & Medical Intake';
    suggestedProfileType = 'personal';
  } else if (/(contact|inquiry|lead|support|feedback|ticket)/i.test(haystack)) {
    suggestedLabel = 'Contact & Support Request';
    suggestedProfileType = 'customer';
  }

  const enrichedFields: CapturedWebField[] = fieldList.map((f, i) => {
    let autofillKey = f.autofillKey;
    if (!autofillKey) {
      const lbl = `${f.name} ${f.label} ${f.placeholder || ''}`.toLowerCase();
      if (lbl.includes('first') && !lbl.includes('last')) autofillKey = 'firstName';
      else if (lbl.includes('last')) autofillKey = 'lastName';
      else if (lbl.includes('full name') || (lbl.includes('name') && !lbl.includes('user') && !lbl.includes('company'))) autofillKey = 'fullName';
      else if (lbl.includes('email')) autofillKey = 'email';
      else if (lbl.includes('phone') || lbl.includes('tel') || lbl.includes('mobile')) autofillKey = 'phone';
      else if (lbl.includes('address') || lbl.includes('street')) autofillKey = 'address';
      else if (lbl.includes('city')) autofillKey = 'city';
      else if (lbl.includes('state') || lbl.includes('province')) autofillKey = 'state';
      else if (lbl.includes('zip') || lbl.includes('postal')) autofillKey = 'postalCode';
      else if (lbl.includes('country')) autofillKey = 'country';
      else if (lbl.includes('company') || lbl.includes('organization')) autofillKey = 'company';
      else if (lbl.includes('title') || lbl.includes('role') || lbl.includes('position')) autofillKey = 'jobTitle';
      else if (lbl.includes('tax') || lbl.includes('ssn') || lbl.includes('ein')) autofillKey = 'taxId';
      else if (lbl.includes('website') || lbl.includes('url') || lbl.includes('linkedin')) autofillKey = 'website';
    }

    return {
      name: f.name,
      id: f.id || `input_${i}`,
      label: f.label || f.name,
      type: f.type || 'text',
      value: f.value ?? '',
      selector: f.id ? `#${f.id}` : `[name="${f.name}"]`,
      autofillKey,
      placeholder: f.placeholder,
      required: Boolean(f.required),
      autocomplete: f.autocomplete,
    };
  });

  return {
    originUrl,
    pathname,
    sourceUrl: rawUrl,
    sourceDomain,
    pageTitle,
    suggestedLabel,
    suggestedProfileType,
    formMetadata,
    fields: enrichedFields,
  };
}

/**
 * Executes automated profile matching against the captured fields
 */
export function executeAutomatedProfileMatch(
  fields: CapturedWebField[],
  profile: Profile
): {
  matchedValues: Record<string, any>;
  matchedCount: number;
  matchedFieldNames: string[];
} {
  const matchedValues: Record<string, any> = {};
  const matchedFieldNames: string[] = [];

  fields.forEach((field) => {
    // 1. Direct autofillKey match
    if (field.autofillKey && field.autofillKey in profile.data) {
      const val = profile.data[field.autofillKey as keyof typeof profile.data];
      if (val !== undefined && val !== null && val !== '') {
        matchedValues[field.name] = val;
        matchedFieldNames.push(field.label || field.name);
        return;
      }
    }

    // 2. Custom field match
    if (profile.data.customFields && profile.data.customFields.length > 0) {
      const targetName = (field.name || field.label).toLowerCase();
      const customMatch = profile.data.customFields.find((cf) =>
        cf.label.toLowerCase() === targetName || cf.key.toLowerCase() === targetName
      );
      if (customMatch && customMatch.value) {
        matchedValues[field.name] = customMatch.value;
        matchedFieldNames.push(field.label || field.name);
        return;
      }
    }

    // 3. Fallback name breakdown
    const norm = (field.label || field.name).toLowerCase();
    if ((norm.includes('first name') || norm === 'first') && profile.data.fullName) {
      matchedValues[field.name] = profile.data.firstName || profile.data.fullName.split(' ')[0];
      matchedFieldNames.push(field.label || field.name);
    } else if ((norm.includes('last name') || norm === 'last') && profile.data.fullName) {
      matchedValues[field.name] = profile.data.lastName || profile.data.fullName.split(' ').slice(1).join(' ');
      matchedFieldNames.push(field.label || field.name);
    }
  });

  return {
    matchedValues,
    matchedCount: Object.keys(matchedValues).length,
    matchedFieldNames,
  };
}

/**
 * Searches stored captured forms for automated profile match candidate based on current origin
 */
export function findAutomatedMatchCandidate(
  currentOriginOrUrl: string,
  savedForms: CapturedWebForm[],
  availableProfiles: Profile[]
): {
  savedForm?: CapturedWebForm;
  targetProfile?: Profile;
  hasMatch: boolean;
} {
  let targetOrigin = currentOriginOrUrl;
  let targetHostname = currentOriginOrUrl;

  try {
    const url = new URL(currentOriginOrUrl.startsWith('http') ? currentOriginOrUrl : `https://${currentOriginOrUrl}`);
    targetOrigin = url.origin;
    targetHostname = url.hostname;
  } catch {
    // Keep as is
  }

  // Find saved form matching origin or domain with auto-matching enabled
  const matchingForm = savedForms.find((sf) => {
    if (sf.autoMatchEnabled === false) return false;
    if (sf.originUrl && (sf.originUrl === targetOrigin || targetOrigin.includes(sf.originUrl))) return true;
    if (sf.sourceDomain && (sf.sourceDomain === targetHostname || targetHostname.includes(sf.sourceDomain))) return true;
    return false;
  });

  if (!matchingForm) {
    return { hasMatch: false };
  }

  // Find associated profile
  let targetProfile = availableProfiles.find((p) => p.id === matchingForm.matchingProfileId);
  if (!targetProfile && matchingForm.matchingProfileType) {
    targetProfile = availableProfiles.find((p) => p.type === matchingForm.matchingProfileType);
  }
  if (!targetProfile) {
    targetProfile = availableProfiles.find((p) => p.isDefault) || availableProfiles[0];
  }

  return {
    savedForm: matchingForm,
    targetProfile,
    hasMatch: Boolean(targetProfile),
  };
}
