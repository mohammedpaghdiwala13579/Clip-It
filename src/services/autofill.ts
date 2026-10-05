import { Form, FormField, Profile, ProfileData } from '../types';

interface AutofillResult {
  matchedValues: Record<string, any>;
  matchedCount: number;
  fieldMatches: Array<{
    fieldId: string;
    fieldLabel: string;
    matchedKey: string;
    value: any;
  }>;
}

// Normalize a text string for heuristic comparison
function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Determine best matching profile value for a given form field
 */
export function getFieldAutofillValue(field: FormField, profile: Profile): { key: string; value: any } | null {
  const data = profile.data;

  // 1. Direct explicit mapping
  if (field.autofillKey) {
    if (field.autofillKey in data) {
      const val = data[field.autofillKey as keyof ProfileData];
      if (val !== undefined && val !== '') {
        return { key: field.autofillKey, value: val };
      }
    }

    // Check custom fields
    const customMatch = data.customFields?.find(
      (c) => normalize(c.key) === normalize(field.autofillKey as string) || normalize(c.label) === normalize(field.autofillKey as string)
    );
    if (customMatch && customMatch.value) {
      return { key: customMatch.label, value: customMatch.value };
    }
  }

  // 2. Semantic Heuristic Matching against Field Label and Placeholder
  const labelNorm = normalize(field.label);
  const placeholderNorm = normalize(field.placeholder || '');
  const combined = `${labelNorm} ${placeholderNorm}`;

  // Name rules
  if (labelNorm.includes('firstname') || labelNorm === 'first') {
    if (data.firstName) return { key: 'firstName', value: data.firstName };
    if (data.fullName) return { key: 'firstName', value: data.fullName.split(' ')[0] };
  }
  if (labelNorm.includes('lastname') || labelNorm.includes('surname') || labelNorm === 'last') {
    if (data.lastName) return { key: 'lastName', value: data.lastName };
    if (data.fullName) {
      const parts = data.fullName.split(' ');
      return { key: 'lastName', value: parts.slice(1).join(' ') };
    }
  }
  if (
    labelNorm.includes('fullname') ||
    labelNorm === 'name' ||
    labelNorm.includes('applicantname') ||
    labelNorm.includes('contactname') ||
    labelNorm.includes('employeename') ||
    labelNorm.includes('signatoryname') ||
    labelNorm.includes('clientname') ||
    labelNorm.includes('yourname')
  ) {
    if (data.fullName) return { key: 'fullName', value: data.fullName };
  }

  // Email rules
  if (field.type === 'email' || labelNorm.includes('email')) {
    if (data.email) return { key: 'email', value: data.email };
  }

  // Phone rules
  if (field.type === 'phone' || labelNorm.includes('phone') || labelNorm.includes('mobile') || labelNorm.includes('cell')) {
    if (labelNorm.includes('emergency')) {
      if (data.emergencyContactPhone) return { key: 'emergencyContactPhone', value: data.emergencyContactPhone };
    }
    if (data.phone) return { key: 'phone', value: data.phone };
  }

  // Emergency contact name
  if (labelNorm.includes('emergency') && (labelNorm.includes('name') || labelNorm.includes('contact'))) {
    if (data.emergencyContactName) return { key: 'emergencyContactName', value: data.emergencyContactName };
  }

  // Date of birth
  if (
    labelNorm.includes('birth') ||
    labelNorm.includes('dob') ||
    labelNorm.includes('dateofbirth') ||
    labelNorm.includes('birthdate')
  ) {
    if (data.dateOfBirth) return { key: 'dateOfBirth', value: data.dateOfBirth };
  }

  // Company / Organization
  if (
    labelNorm.includes('company') ||
    labelNorm.includes('organization') ||
    labelNorm.includes('employer') ||
    labelNorm.includes('business') ||
    labelNorm.includes('firm')
  ) {
    if (data.company) return { key: 'company', value: data.company };
  }

  // Job title / Position
  if (
    labelNorm.includes('jobtitle') ||
    labelNorm.includes('title') ||
    labelNorm.includes('position') ||
    labelNorm.includes('role') ||
    labelNorm.includes('designation')
  ) {
    if (data.jobTitle) return { key: 'jobTitle', value: data.jobTitle };
  }

  // Department
  if (labelNorm.includes('department') || labelNorm.includes('division')) {
    if (data.department) return { key: 'department', value: data.department };
  }

  // Street Address
  if (field.type === 'address' || (labelNorm.includes('address') && !labelNorm.includes('email') && !labelNorm.includes('ip'))) {
    if (data.address) return { key: 'address', value: data.address };
  }

  // City
  if (labelNorm.includes('city') || labelNorm === 'town') {
    if (data.city) return { key: 'city', value: data.city };
  }

  // State
  if (labelNorm.includes('state') || labelNorm.includes('province') || labelNorm === 'region') {
    if (data.state) return { key: 'state', value: data.state };
  }

  // Postal code / Zip
  if (labelNorm.includes('zip') || labelNorm.includes('postal') || labelNorm.includes('postcode')) {
    if (data.postalCode) return { key: 'postalCode', value: data.postalCode };
  }

  // Country
  if (labelNorm.includes('country') || labelNorm === 'nation') {
    if (data.country) return { key: 'country', value: data.country };
  }

  // Tax ID / SSN / EIN
  if (labelNorm.includes('taxid') || labelNorm.includes('ssn') || labelNorm.includes('ein') || labelNorm.includes('vat')) {
    if (data.taxId) return { key: 'taxId', value: data.taxId };
  }

  // Website
  if (labelNorm.includes('website') || labelNorm.includes('url') || labelNorm.includes('homepage')) {
    if (data.website) return { key: 'website', value: data.website };
  }

  // Gender
  if (labelNorm.includes('gender') || labelNorm.includes('sex')) {
    if (data.gender) return { key: 'gender', value: data.gender };
  }

  // 3. Search in Custom Fields
  if (data.customFields && data.customFields.length > 0) {
    for (const cf of data.customFields) {
      const cfKey = normalize(cf.key);
      const cfLabel = normalize(cf.label);
      if (labelNorm.includes(cfKey) || labelNorm.includes(cfLabel) || combined.includes(cfKey)) {
        if (cf.value) {
          return { key: cf.label, value: cf.value };
        }
      }
    }
  }

  return null;
}

/**
 * Scan all fields in a form and match them against the chosen profile
 */
export function matchProfileToForm(form: Form, profile: Profile): AutofillResult {
  const matchedValues: Record<string, any> = {};
  const fieldMatches: AutofillResult['fieldMatches'] = [];

  for (const field of form.fields) {
    // Skip auto-ids as they are generated fresh or fixed
    if (field.type === 'auto_id') continue;

    const match = getFieldAutofillValue(field, profile);
    if (match && match.value !== undefined && match.value !== '') {
      matchedValues[field.id] = match.value;
      fieldMatches.push({
        fieldId: field.id,
        fieldLabel: field.label,
        matchedKey: match.key,
        value: match.value,
      });
    }
  }

  return {
    matchedValues,
    matchedCount: fieldMatches.length,
    fieldMatches,
  };
}
