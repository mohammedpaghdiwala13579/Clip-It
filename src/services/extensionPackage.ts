import JSZip from 'jszip';

export interface ExtensionFile {
  name: string;
  content: string;
}

export function generateExtensionFiles(): ExtensionFile[] {
  const manifest = {
    manifest_version: 3,
    name: 'Clip It - Universal Web Form Clipper & Autofill',
    version: '1.2.0',
    description: 'Captures browser window origin URL and form metadata, scans DOM form elements, lets you label clippable form contexts as Saved Clips, and automatically matches profiles for autofill.',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: 'popup.html',
      default_title: 'Clip It',
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['formContextHelper.js', 'clippingHelper.js', 'content.js'],
        css: ['content.css'],
        run_at: 'document_idle',
      },
    ],
    background: {
      service_worker: 'background.js',
    },
  };

  const formContextHelperJs = `/**
 * Clip It - Form Context & Window Origin Capture Helper
 * Utility to capture the current browser window's origin URL, form metadata,
 * and provide intelligent context labeling for future automated profile matching.
 */

window.ClipItFormHelper = (function () {
  function getFieldLabel(input) {
    if (input.getAttribute('aria-label')) return input.getAttribute('aria-label');
    const id = input.id;
    if (id) {
      const labelEl = document.querySelector('label[for="' + id + '"]');
      if (labelEl && labelEl.innerText.trim()) return labelEl.innerText.trim();
    }
    const parentLabel = input.closest('label');
    if (parentLabel && parentLabel.innerText.trim()) {
      return parentLabel.innerText.replace(input.value || '', '').trim();
    }
    if (input.placeholder) return input.placeholder;
    if (input.name) return input.name.replace(/[-_]/g, ' ');
    return (input.type || 'text') + ' field';
  }

  function inferAutofillKey(name, label, placeholder, type) {
    const combined = (name + ' ' + label + ' ' + (placeholder || '')).toLowerCase();
    if (combined.includes('first') && !combined.includes('last')) return 'firstName';
    if (combined.includes('last')) return 'lastName';
    if (combined.includes('full name') || (combined.includes('name') && !combined.includes('user') && !combined.includes('company'))) return 'fullName';
    if (type === 'email' || combined.includes('email')) return 'email';
    if (type === 'tel' || combined.includes('phone') || combined.includes('mobile')) return 'phone';
    if (combined.includes('address') || combined.includes('street')) return 'address';
    if (combined.includes('city')) return 'city';
    if (combined.includes('state') || combined.includes('province')) return 'state';
    if (combined.includes('zip') || combined.includes('postal')) return 'postalCode';
    if (combined.includes('country')) return 'country';
    if (combined.includes('company') || combined.includes('organization')) return 'company';
    if (combined.includes('title') || combined.includes('role') || combined.includes('position')) return 'jobTitle';
    if (combined.includes('tax') || combined.includes('ssn') || combined.includes('ein')) return 'taxId';
    if (combined.includes('website') || combined.includes('url') || combined.includes('linkedin')) return 'website';
    if (combined.includes('note') || combined.includes('message')) return 'notes';
    return undefined;
  }

  function predictContextLabel(origin, pathname, title, fieldNames) {
    const haystack = (origin + ' ' + pathname + ' ' + title + ' ' + fieldNames.join(' ')).toLowerCase();
    if (/(job|career|applicant|resume|employment|hiring)/i.test(haystack)) return { label: 'Job Application', profileType: 'personal' };
    if (/(checkout|billing|shipping|cart|payment|order|card)/i.test(haystack)) return { label: 'Checkout & Shipping', profileType: 'personal' };
    if (/(identity|license|tax|ssn|gov|official|portal)/i.test(haystack)) return { label: 'Official Identity & Verification', profileType: 'personal' };
    if (/(company|business|vendor|client|b2b|corporate|partner)/i.test(haystack)) return { label: 'Business Inquiry', profileType: 'business' };
    if (/(school|student|admission|faculty|course|grade)/i.test(haystack)) return { label: 'School Registration', profileType: 'family' };
    if (/(contact|inquiry|lead|support|feedback)/i.test(haystack)) return { label: 'Contact Request', profileType: 'customer' };
    return { label: 'Web Form', profileType: 'personal' };
  }

  function captureCurrentFormContext(formElement) {
    const originUrl = window.location.origin;
    const pathname = window.location.pathname;
    const sourceUrl = window.location.href;
    const sourceDomain = window.location.hostname;
    const pageTitle = document.title || sourceDomain;

    const elements = formElement ? formElement.querySelectorAll('input, select, textarea') : document.querySelectorAll('input, select, textarea');
    const fields = [];
    const fieldNames = [];
    let requiredCount = 0;

    elements.forEach(function (el) {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;
      const isRequired = el.required || el.getAttribute('aria-required') === 'true';
      if (isRequired) requiredCount++;

      const val = el.type === 'checkbox' ? el.checked : el.value;
      const label = getFieldLabel(el);
      const name = el.name || el.id || ('field_' + fields.length);
      fieldNames.push(name + ' ' + label);

      fields.push({
        name: name,
        id: el.id || '',
        label: label,
        type: el.type || el.nodeName.toLowerCase(),
        tagName: el.tagName.toLowerCase(),
        value: val !== undefined && val !== null ? val : '',
        placeholder: el.placeholder || '',
        required: isRequired,
        autocomplete: el.autocomplete || '',
        autofillKey: inferAutofillKey(name, label, el.placeholder, el.type),
        selector: el.id ? ('#' + el.id) : (el.name ? ('[name="' + el.name + '"]') : '')
      });
    });

    const prediction = predictContextLabel(originUrl, pathname, pageTitle, fieldNames);

    const formMetadata = {
      action: formElement ? (formElement.getAttribute('action') || sourceUrl) : sourceUrl,
      method: formElement ? ((formElement.getAttribute('method') || 'POST').toUpperCase()) : 'POST',
      id: formElement ? (formElement.id || '') : '',
      name: formElement ? (formElement.getAttribute('name') || '') : '',
      className: formElement ? (formElement.className || '') : '',
      totalInputs: fields.length,
      requiredFieldsCount: requiredCount,
      enctype: formElement ? (formElement.enctype || 'application/x-www-form-urlencoded') : 'application/x-www-form-urlencoded'
    };

    return {
      id: 'clip_' + Date.now(),
      originUrl: originUrl,
      pathname: pathname,
      sourceUrl: sourceUrl,
      sourceDomain: sourceDomain,
      pageTitle: pageTitle,
      contextLabel: prediction.label,
      matchingProfileType: prediction.profileType,
      autoMatchEnabled: true,
      formMetadata: formMetadata,
      fields: fields,
      capturedAt: new Date().toISOString()
    };
  }

  return {
    captureCurrentFormContext: captureCurrentFormContext,
    getFieldLabel: getFieldLabel,
    inferAutofillKey: inferAutofillKey
  };
})();
`;

  const clippingHelperJs = `/**
 * Clip It - ClippingHelper Script
 * Scans the active tab DOM for <form>, <input>, and <select> elements,
 * serializes metadata (name, type, ID, labels, options), and presents
 * an interface to label the configuration as a 'Saved Clip' for future autofill mapping.
 */

window.ClipItClippingHelper = (function () {
  function scanDOMForms() {
    const originUrl = window.location.origin;
    const sourceUrl = window.location.href;
    const pageTitle = document.title || window.location.hostname;

    function getLabel(el) {
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
      if (el.id) {
        const lbl = document.querySelector('label[for="' + el.id + '"]');
        if (lbl && lbl.innerText.trim()) return lbl.innerText.trim();
      }
      const parentLbl = el.closest('label');
      if (parentLbl && parentLbl.innerText.trim()) {
        return parentLbl.innerText.replace(el.value || '', '').trim();
      }
      if (el.placeholder) return el.placeholder;
      if (el.name) return el.name.replace(/[-_]/g, ' ');
      return (el.type || el.tagName.toLowerCase()) + ' element';
    }

    const forms = Array.from(document.querySelectorAll('form'));
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])'));
    const selects = Array.from(document.querySelectorAll('select'));
    const textareas = Array.from(document.querySelectorAll('textarea'));

    let requiredCount = 0;
    const fields = [];

    // Inputs
    inputs.forEach((el, idx) => {
      const isReq = el.required || el.getAttribute('aria-required') === 'true';
      if (isReq) requiredCount++;
      fields.push({
        name: el.name || el.id || ('input_' + idx),
        id: el.id || '',
        label: getLabel(el),
        type: el.type || 'text',
        tagName: 'input',
        value: el.type === 'checkbox' ? el.checked : (el.value || ''),
        placeholder: el.placeholder || '',
        required: isReq,
        autocomplete: el.autocomplete || '',
        selector: el.id ? ('#' + el.id) : (el.name ? ('input[name="' + el.name + '"]') : '')
      });
    });

    // Selects
    selects.forEach((sel, idx) => {
      const isReq = sel.required || sel.getAttribute('aria-required') === 'true';
      if (isReq) requiredCount++;
      const options = Array.from(sel.options).map(o => ({ value: o.value, text: o.text.trim() }));
      fields.push({
        name: sel.name || sel.id || ('select_' + idx),
        id: sel.id || '',
        label: getLabel(sel),
        type: 'select-one',
        tagName: 'select',
        value: sel.value || '',
        required: isReq,
        options: options,
        selector: sel.id ? ('#' + sel.id) : (sel.name ? ('select[name="' + sel.name + '"]') : '')
      });
    });

    // Textareas
    textareas.forEach((ta, idx) => {
      const isReq = ta.required || ta.getAttribute('aria-required') === 'true';
      if (isReq) requiredCount++;
      fields.push({
        name: ta.name || ta.id || ('textarea_' + idx),
        id: ta.id || '',
        label: getLabel(ta),
        type: 'textarea',
        tagName: 'textarea',
        value: ta.value || '',
        placeholder: ta.placeholder || '',
        required: isReq,
        selector: ta.id ? ('#' + ta.id) : (ta.name ? ('textarea[name="' + ta.name + '"]') : '')
      });
    });

    const primaryForm = forms[0];
    const formMetadata = {
      action: primaryForm ? (primaryForm.getAttribute('action') || sourceUrl) : sourceUrl,
      method: primaryForm ? ((primaryForm.getAttribute('method') || 'POST').toUpperCase()) : 'POST',
      id: primaryForm ? (primaryForm.id || '') : '',
      name: primaryForm ? (primaryForm.getAttribute('name') || '') : '',
      className: primaryForm ? (primaryForm.className || '') : '',
      totalInputs: fields.length,
      requiredFieldsCount: requiredCount,
      enctype: primaryForm ? (primaryForm.enctype || 'application/x-www-form-urlencoded') : 'application/x-www-form-urlencoded'
    };

    return {
      originUrl: originUrl,
      sourceUrl: sourceUrl,
      pageTitle: pageTitle,
      timestamp: new Date().toISOString(),
      formsCount: forms.length,
      formMetadata: formMetadata,
      fields: fields,
      rawCount: { forms: forms.length, inputs: inputs.length, selects: selects.length, textareas: textareas.length }
    };
  }

  function openSavedClipModal(scanData) {
    const existing = document.getElementById('clipit-clipping-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'clipit-clipping-modal';
    modal.style.cssText = [
      'position: fixed',
      'top: 24px',
      'right: 24px',
      'z-index: 2147483647',
      'background: #0f172a',
      'color: #ffffff',
      'border-radius: 16px',
      'padding: 20px',
      'box-shadow: 0 25px 35px -5px rgba(0, 0, 0, 0.5)',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'width: 360px',
      'max-height: 85vh',
      'overflow-y: auto',
      'display: flex',
      'flex-direction: column',
      'gap: 12px',
      'border: 1px solid rgba(255, 255, 255, 0.15)',
      'animation: clipitSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    ].join(';');

    modal.innerHTML = [
      '<div style="display:flex; justify-content:space-between; align-items:center;">',
      '  <div style="display:flex; align-items:center; gap:8px;">',
      '    <div style="background:#4f46e5; width:24px; height:24px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; color:#fff;">C</div>',
      '    <span style="font-weight:700; font-size:13px;">Save Form Configuration as Clip</span>',
      '  </div>',
      '  <button id="clipit-close-clip-modal" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">&times;</button>',
      '</div>',
      '<div style="background:rgba(255,255,255,0.06); padding:8px 10px; border-radius:8px; font-size:11px; color:#cbd5e1;">',
      '  <div><b>Origin:</b> <span style="font-family:monospace; color:#93c5fd;">' + scanData.originUrl + '</span></div>',
      '  <div><b>DOM Elements:</b> <span id="clipit-selected-count">' + scanData.fields.length + '</span> of ' + scanData.fields.length + ' selected for Clip</div>',
      '</div>',
      '<div>',
      '  <label style="display:block; font-size:11px; font-weight:600; color:#e2e8f0; margin-bottom:4px;">Clip Title</label>',
      '  <input id="clipit-title-input" type="text" value="' + scanData.pageTitle + ' Clip" style="width:100%; box-sizing:border-box; background:#1e293b; border:1px solid #334155; color:#fff; border-radius:6px; padding:6px 10px; font-size:12px; outline:none;" />',
      '</div>',
      '<div>',
      '  <label style="display:block; font-size:11px; font-weight:600; color:#e2e8f0; margin-bottom:4px;">Context Category</label>',
      '  <input id="clipit-category-input" type="text" value="Web Form" style="width:100%; box-sizing:border-box; background:#1e293b; border:1px solid #334155; color:#fff; border-radius:6px; padding:6px 10px; font-size:12px; outline:none;" />',
      '</div>',
      '<div>',
      '  <label style="display:block; font-size:11px; font-weight:600; color:#e2e8f0; margin-bottom:4px;">Target Profile Type</label>',
      '  <select id="clipit-clip-profile" style="width:100%; box-sizing:border-box; background:#1e293b; border:1px solid #334155; color:#fff; border-radius:6px; padding:6px 8px; font-size:11px; outline:none;">',
      '    <option value="personal">Personal Profile</option>',
      '    <option value="business">Business Profile</option>',
      '    <option value="family">Family Member Profile</option>',
      '    <option value="customer">Customer Profile</option>',
      '  </select>',
      '</div>',
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">',
      '  <span style="font-weight:600; color:#e2e8f0; font-size:11px;">Toggle Fields for Clip:</span>',
      '  <div style="display:flex; gap:4px;">',
      '    <button type="button" id="clipit-toggle-all" style="font-size:9px; background:rgba(255,255,255,0.1); border:none; color:#cbd5e1; padding:2px 5px; border-radius:4px; cursor:pointer;">All</button>',
      '    <button type="button" id="clipit-toggle-none" style="font-size:9px; background:rgba(255,255,255,0.1); border:none; color:#cbd5e1; padding:2px 5px; border-radius:4px; cursor:pointer;">None</button>',
      '    <button type="button" id="clipit-toggle-req" style="font-size:9px; background:rgba(59,130,246,0.3); border:none; color:#93c5fd; padding:2px 5px; border-radius:4px; cursor:pointer;">Req Only</button>',
      '  </div>',
      '</div>',
      '<div style="max-height:140px; overflow-y:auto; background:rgba(0,0,0,0.25); padding:6px 8px; border-radius:8px; border:1px solid #334155; font-size:11px; display:flex; flex-direction:column; gap:4px;">' +
         scanData.fields.map(function(f) {
           return '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:2px 0;">' +
                  '  <input type="checkbox" class="clipit-field-toggle" data-name="' + f.name + '" data-req="' + (f.required ? 'true' : 'false') + '" checked style="cursor:pointer;" />' +
                  '  <span style="color:#cbd5e1; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + (f.label || f.name) + (f.required ? ' <b style="color:#ef4444;">*</b>' : '') + '</span>' +
                  '  <span style="color:#60a5fa; font-family:monospace; font-size:9px; background:rgba(255,255,255,0.06); padding:1px 4px; border-radius:3px;">' + f.tagName + '</span>' +
                  '</label>';
         }).join('') +
      '</div>',
      '<div style="display:flex; gap:8px; margin-top:4px;">',
      '  <button id="clipit-btn-save-clip" style="flex:1; background:#4f46e5; color:#ffffff; border:none; padding:8px 12px; border-radius:8px; font-weight:600; font-size:12px; cursor:pointer;">Save as Clip</button>',
      '  <button id="clipit-btn-dismiss-clip" style="background:rgba(255,255,255,0.1); color:#cbd5e1; border:none; padding:8px 12px; border-radius:8px; font-size:12px; cursor:pointer;">Cancel</button>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);

    function updateSelectedCount() {
      const checkedCount = modal.querySelectorAll('.clipit-field-toggle:checked').length;
      document.getElementById('clipit-selected-count').innerText = checkedCount;
    }

    modal.querySelectorAll('.clipit-field-toggle').forEach(function(cb) {
      cb.addEventListener('change', updateSelectedCount);
    });

    document.getElementById('clipit-toggle-all').addEventListener('click', function() {
      modal.querySelectorAll('.clipit-field-toggle').forEach(function(cb) { cb.checked = true; });
      updateSelectedCount();
    });

    document.getElementById('clipit-toggle-none').addEventListener('click', function() {
      modal.querySelectorAll('.clipit-field-toggle').forEach(function(cb) { cb.checked = false; });
      updateSelectedCount();
    });

    document.getElementById('clipit-toggle-req').addEventListener('click', function() {
      modal.querySelectorAll('.clipit-field-toggle').forEach(function(cb) {
        cb.checked = cb.getAttribute('data-req') === 'true';
      });
      updateSelectedCount();
    });

    document.getElementById('clipit-close-clip-modal').addEventListener('click', function () { modal.remove(); });
    document.getElementById('clipit-btn-dismiss-clip').addEventListener('click', function () { modal.remove(); });

    document.getElementById('clipit-btn-save-clip').addEventListener('click', function () {
      const selectedNames = [];
      modal.querySelectorAll('.clipit-field-toggle:checked').forEach(function(cb) {
        selectedNames.push(cb.getAttribute('data-name'));
      });

      if (selectedNames.length === 0) {
        alert('Please toggle on at least one field to save the Clip.');
        return;
      }

      const clipTitle = document.getElementById('clipit-title-input').value || (scanData.pageTitle + ' Clip');
      const catLabel = document.getElementById('clipit-category-input').value || 'Web Form';
      const profType = document.getElementById('clipit-clip-profile').value || 'personal';

      const includedFields = scanData.fields.filter(function(f) {
        return selectedNames.includes(f.name);
      });

      const savedClip = {
        id: 'clip_' + Date.now(),
        clipTitle: clipTitle,
        sourceUrl: scanData.sourceUrl,
        originUrl: scanData.originUrl,
        pageTitle: scanData.pageTitle,
        contextLabel: catLabel,
        matchingProfileType: profType,
        autoMatchEnabled: true,
        formMetadata: Object.assign({}, scanData.formMetadata, {
          totalInputs: includedFields.length,
          requiredFieldsCount: includedFields.filter(function(f) { return f.required; }).length
        }),
        fields: includedFields,
        capturedAt: new Date().toISOString(),
        status: 'saved',
        appliedCount: 0
      };

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['clipit_saved_web_forms'], function (result) {
          const list = result.clipit_saved_web_forms || [];
          list.unshift(savedClip);
          chrome.storage.local.set({ clipit_saved_web_forms: list }, function () {
            modal.innerHTML = '<div style="padding:16px; text-align:center; color:#4ade80; font-weight:600; font-size:12px;">Saved Clip "' + clipTitle + '" successfully!</div>';
            setTimeout(function () { modal.remove(); }, 2000);
          });
        });
      } else {
        modal.innerHTML = '<div style="padding:16px; text-align:center; color:#4ade80; font-weight:600; font-size:12px;">Saved locally!</div>';
        setTimeout(function () { modal.remove(); }, 2000);
      }
    });
  }

  function scanAndOpenSavedClipModal() {
    const scan = scanDOMForms();
    openSavedClipModal(scan);
    return scan;
  }

  return {
    scanDOMForms: scanDOMForms,
    openSavedClipModal: openSavedClipModal,
    scanAndOpenSavedClipModal: scanAndOpenSavedClipModal
  };
})();
`;

  const contentJs = `/**
 * Clip It - Content Script
 * Intercepts form submissions, runs the Context Capture Helper,
 * allows user labeling, and saves form context for automated profile matching.
 */

(function () {
  if (window.__clipit_injected) return;
  window.__clipit_injected = true;

  // Intercept all form submissions
  document.addEventListener('submit', function (e) {
    const form = e.target;
    if (!form || form.nodeName !== 'FORM') return;

    if (!window.ClipItFormHelper) return;
    const capturedContext = window.ClipItFormHelper.captureCurrentFormContext(form);

    if (capturedContext.fields.length > 0) {
      showContextLabelingModal(capturedContext);
    }
  }, true);

  // Show the context labeling modal
  function showContextLabelingModal(context) {
    const existing = document.getElementById('clipit-context-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'clipit-context-modal';
    modal.style.cssText = [
      'position: fixed',
      'bottom: 24px',
      'right: 24px',
      'z-index: 2147483647',
      'background: #0f172a',
      'color: #ffffff',
      'border-radius: 16px',
      'padding: 18px 20px',
      'box-shadow: 0 25px 30px -5px rgba(0, 0, 0, 0.4)',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'width: 350px',
      'display: flex',
      'flex-direction: column',
      'gap: 12px',
      'border: 1px solid rgba(255, 255, 255, 0.15)',
      'animation: clipitSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    ].join(';');

    const quickChips = ['Job Application', 'Checkout & Shipping', 'Identity & Official', 'Business & Invoicing', 'Registration'];

    modal.innerHTML = [
      '<div style="display:flex; justify-content:space-between; align-items:center;">',
      '  <div style="display:flex; align-items:center; gap:8px;">',
      '    <div style="background:#3b82f6; width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; color:#fff;">C</div>',
      '    <span style="font-weight:700; font-size:13px;">Label Form Context & Save</span>',
      '  </div>',
      '  <button id="clipit-modal-close" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">&times;</button>',
      '</div>',
      '<div style="background:rgba(255,255,255,0.06); padding:8px 10px; border-radius:8px; font-size:11px; color:#cbd5e1; display:flex; flex-direction:column; gap:4px;">',
      '  <div><b>Origin URL:</b> <span style="font-family:monospace; color:#93c5fd;">' + context.originUrl + '</span></div>',
      '  <div><b>Form Metadata:</b> ' + context.formMetadata.method + ' · ' + context.formMetadata.totalInputs + ' inputs (' + context.formMetadata.requiredFieldsCount + ' req)</div>',
      '</div>',
      '<div>',
      '  <label style="display:block; font-size:11px; font-weight:600; color:#e2e8f0; margin-bottom:4px;">Context Label (for automated matching)</label>',
      '  <input id="clipit-context-input" type="text" value="' + context.contextLabel + '" style="width:100%; box-sizing:border-box; background:#1e293b; border:1px solid #334155; color:#fff; border-radius:6px; padding:6px 10px; font-size:12px; outline:none;" />',
      '  <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:6px;">' + quickChips.map(function(c) {
           return '<button type="button" class="clipit-chip" data-label="' + c + '" style="background:rgba(255,255,255,0.1); border:none; color:#cbd5e1; font-size:10px; border-radius:4px; padding:2px 6px; cursor:pointer;">' + c + '</button>';
         }).join('') + '</div>',
      '</div>',
      '<div>',
      '  <label style="display:block; font-size:11px; font-weight:600; color:#e2e8f0; margin-bottom:4px;">Target Profile Type</label>',
      '  <select id="clipit-profile-select" style="width:100%; box-sizing:border-box; background:#1e293b; border:1px solid #334155; color:#fff; border-radius:6px; padding:6px 8px; font-size:11px; outline:none;">',
      '    <option value="personal"' + (context.matchingProfileType === 'personal' ? ' selected' : '') + '>Personal Profile (Default)</option>',
      '    <option value="business"' + (context.matchingProfileType === 'business' ? ' selected' : '') + '>Business / Work Profile</option>',
      '    <option value="family"' + (context.matchingProfileType === 'family' ? ' selected' : '') + '>Family / Member Profile</option>',
      '    <option value="customer"' + (context.matchingProfileType === 'customer' ? ' selected' : '') + '>Customer / Client Profile</option>',
      '  </select>',
      '</div>',
      '<div style="display:flex; align-items:center; gap:6px;">',
      '  <input id="clipit-auto-toggle" type="checkbox" checked style="cursor:pointer;" />',
      '  <label for="clipit-auto-toggle" style="font-size:11px; color:#cbd5e1; cursor:pointer;">Auto-match profile on this origin in the future</label>',
      '</div>',
      '<div style="display:flex; gap:8px; margin-top:4px;">',
      '  <button id="clipit-btn-save" style="flex:1; background:#ffffff; color:#0f172a; border:none; padding:8px 12px; border-radius:8px; font-weight:600; font-size:12px; cursor:pointer;">Save Context</button>',
      '  <button id="clipit-btn-cancel" style="background:rgba(255,255,255,0.1); color:#cbd5e1; border:none; padding:8px 12px; border-radius:8px; font-size:12px; cursor:pointer;">Dismiss</button>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);

    modal.querySelectorAll('.clipit-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.getElementById('clipit-context-input').value = this.getAttribute('data-label');
      });
    });

    document.getElementById('clipit-modal-close').addEventListener('click', function () { modal.remove(); });
    document.getElementById('clipit-btn-cancel').addEventListener('click', function () { modal.remove(); });

    document.getElementById('clipit-btn-save').addEventListener('click', function () {
      context.contextLabel = document.getElementById('clipit-context-input').value || context.contextLabel;
      context.matchingProfileType = document.getElementById('clipit-profile-select').value;
      context.autoMatchEnabled = document.getElementById('clipit-auto-toggle').checked;

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['clipit_saved_web_forms'], function (result) {
          const list = result.clipit_saved_web_forms || [];
          list.unshift(context);
          chrome.storage.local.set({ clipit_saved_web_forms: list }, function () {
            modal.innerHTML = '<div style="padding:14px; text-align:center; color:#4ade80; font-weight:600; font-size:12px;">Saved Context: "' + context.contextLabel + '" for automated matching!</div>';
            setTimeout(function () { modal.remove(); }, 2200);
          });
        });
      } else {
        modal.innerHTML = '<div style="padding:14px; text-align:center; color:#4ade80; font-weight:600; font-size:12px;">Saved locally!</div>';
        setTimeout(function () { modal.remove(); }, 2000);
      }
    });
  }

  // Check on page load if this origin has a saved form context with auto-matching enabled
  function checkOriginForAutoMatch() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    const currentOrigin = window.location.origin;

    chrome.storage.local.get(['clipit_saved_web_forms'], function (res) {
      const list = res.clipit_saved_web_forms || [];
      const match = list.find(function (item) {
        return item.autoMatchEnabled !== false && (item.originUrl === currentOrigin || window.location.hostname.includes(item.sourceDomain));
      });

      if (match) {
        injectAutoMatchBadge(match);
      }
    });
  }

  function injectAutoMatchBadge(match) {
    if (document.getElementById('clipit-automatch-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'clipit-automatch-badge';
    badge.style.cssText = [
      'position: fixed',
      'bottom: 24px',
      'left: 24px',
      'z-index: 2147483646',
      'background: #0f172a',
      'color: #ffffff',
      'border-radius: 9999px',
      'padding: 8px 16px',
      'box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.3)',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-size: 12px',
      'font-weight: 600',
      'cursor: pointer',
      'display: flex',
      'align-items: center',
      'gap: 8px',
      'border: 1px solid rgba(59, 130, 246, 0.5)',
      'transition: transform 0.15s, background 0.15s'
    ].join(';');

    badge.innerHTML = '<span style="background:#3b82f6; width:8px; height:8px; border-radius:50%; display:inline-block;"></span> Context: ' + match.contextLabel + ' · 1-Click Auto-Match';

    badge.addEventListener('click', function () {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'open_autofill_popup' });
      }
    });

    document.body.appendChild(badge);
  }

  setTimeout(checkOriginForAutoMatch, 1200);
})();
`;

  const contentCss = `
@keyframes clipitSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

  const backgroundJs = `/**
 * Clip It Background Service Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('Clip It Extension v1.2 Installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'save_form') {
    chrome.storage.local.get(['clipit_saved_web_forms'], (result) => {
      const list = result.clipit_saved_web_forms || [];
      list.unshift(request.data);
      chrome.storage.local.set({ clipit_saved_web_forms: list }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});
`;

  const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 340px;
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #ffffff;
      color: #0f172a;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 14px;
    }
    .badge {
      background: #0f172a;
      color: #fff;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-top: 14px;
      margin-bottom: 8px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .btn {
      width: 100%;
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 9px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 8px;
      transition: background 0.15s;
    }
    .btn-indigo {
      background: #4f46e5;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .btn:hover { opacity: 0.9; }
    .status-msg {
      font-size: 11px;
      color: #16a34a;
      display: none;
      text-align: center;
      margin-top: 8px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <span style="background:#0f172a; color:#fff; width:20px; height:20px; border-radius:4px; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight: bold;">C</span>
      Clip It
    </div>
    <span class="badge">Active</span>
  </div>

  <div class="section-title">Current Window Context</div>
  <div class="card">
    <div style="font-size:11px; color:#64748b; margin-bottom:2px;">Browser Origin:</div>
    <div id="current-origin" style="font-weight:600; font-family:monospace; font-size:11px; color:#1d4ed8; word-break:break-all;">Detecting origin...</div>
    <div id="detected-context" style="margin-top:6px; font-size:11px; color:#475569;">Context: <span id="context-label-text" style="font-weight:600; color:#0f172a;">Scanning...</span></div>
  </div>

  <button id="btn-scan-clip" class="btn btn-indigo">
    🔍 Scan DOM & Save Clip
  </button>

  <button id="btn-automatch" class="btn">
    ⚡ Automated Profile Match
  </button>
  <div id="status-msg" class="status-msg"></div>

  <div class="section-title">Saved Clips on this Origin</div>
  <div id="saved-forms-list" style="max-height: 140px; overflow-y: auto;">
    <div style="color: #94a3b8; font-size: 11px; padding: 6px 0;">Loading clips...</div>
  </div>

  <button id="btn-open-studio" class="btn btn-secondary">
    Open Clip It Web App
  </button>

  <script src="popup.js"></script>
</body>
</html>
`;

  const popupJs = `/**
 * Clip It Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentOrigin = '';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab && activeTab.url) {
      try {
        const url = new URL(activeTab.url);
        currentOrigin = url.origin;
        document.getElementById('current-origin').textContent = currentOrigin;
      } catch (e) {
        document.getElementById('current-origin').textContent = 'Active Webpage';
      }
    }

    // Load saved clips for this origin
    chrome.storage.local.get(['clipit_saved_web_forms'], (res) => {
      const list = res.clipit_saved_web_forms || [];
      const matching = list.filter(item => !currentOrigin || item.originUrl === currentOrigin || (item.sourceDomain && currentOrigin.includes(item.sourceDomain)));
      const container = document.getElementById('saved-forms-list');
      const labelText = document.getElementById('context-label-text');

      if (matching.length === 0) {
        labelText.textContent = 'None saved yet';
        container.innerHTML = '<div style="color: #94a3b8; font-size: 11px; padding: 6px 0;">Click "Scan DOM & Save Clip" to serialize & label forms on this page.</div>';
      } else {
        labelText.textContent = matching[0].clipTitle || matching[0].contextLabel || 'Saved Clip';
        container.innerHTML = '';
        matching.forEach(item => {
          const row = document.createElement('div');
          row.style.cssText = 'padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;';
          row.innerHTML = '<div><div style="font-weight: 600; font-size: 11px; color:#0f172a;">' + (item.clipTitle || item.contextLabel) + '</div><div style="font-size: 10px; color: #64748b;">' + item.fields.length + ' fields • ' + (item.matchingProfileType || 'personal') + '</div></div><button class="apply-btn" style="background: #0f172a; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-weight: 600; cursor: pointer;">Apply</button>';

          row.querySelector('.apply-btn').addEventListener('click', () => {
            applySavedFieldsToTab(item.fields);
          });
          container.appendChild(row);
        });
      }
    });
  });

  // Scan DOM and open labeling modal in active tab
  document.getElementById('btn-scan-clip').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].id) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          if (window.ClipItClippingHelper) {
            window.ClipItClippingHelper.scanAndOpenSavedClipModal();
          }
        }
      });
      window.close();
    });
  });

  function applySavedFieldsToTab(fields) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].id) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        args: [fields],
        func: (fieldsToApply) => {
          let count = 0;
          fieldsToApply.forEach(f => {
            let el = null;
            if (f.id) el = document.getElementById(f.id);
            if (!el && f.selector) el = document.querySelector(f.selector);
            if (!el && f.name) el = document.querySelector('[name="' + f.name + '"]');

            if (el) {
              if (el.tagName === 'SELECT') {
                el.value = f.value;
              } else if (el.type === 'checkbox') {
                el.checked = Boolean(f.value);
              } else {
                el.value = f.value;
              }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              count++;
            }
          });
          return count;
        }
      }, (results) => {
        const count = results && results[0] && results[0].result ? results[0].result : 0;
        const statusEl = document.getElementById('status-msg');
        statusEl.style.display = 'block';
        statusEl.textContent = 'Matched & populated ' + count + ' fields!';
        setTimeout(() => { statusEl.style.display = 'none'; }, 2500);
      });
    });
  }

  document.getElementById('btn-automatch').addEventListener('click', () => {
    chrome.storage.local.get(['clipit_saved_web_forms'], (res) => {
      const list = res.clipit_saved_web_forms || [];
      const matching = list.find(item => !currentOrigin || item.originUrl === currentOrigin || (item.sourceDomain && currentOrigin.includes(item.sourceDomain)));
      if (matching && matching.fields) {
        applySavedFieldsToTab(matching.fields);
      } else {
        const statusEl = document.getElementById('status-msg');
        statusEl.style.display = 'block';
        statusEl.style.color = '#ef4444';
        statusEl.textContent = 'No clip saved for this origin yet.';
        setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
      }
    });
  });

  document.getElementById('btn-open-studio').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://ais-dev-bgamb225ldubd3yoxdnyvf-453665246871.asia-southeast1.run.app' });
  });
});
`;

  return [
    { name: 'manifest.json', content: JSON.stringify(manifest, null, 2) },
    { name: 'formContextHelper.js', content: formContextHelperJs },
    { name: 'clippingHelper.js', content: clippingHelperJs },
    { name: 'content.js', content: contentJs },
    { name: 'content.css', content: contentCss },
    { name: 'background.js', content: backgroundJs },
    { name: 'popup.html', content: popupHtml },
    { name: 'popup.js', content: popupJs },
    {
      name: 'README.md',
      content: `# Clip It - Universal Web Form Context & DOM Clipping Extension

This browser extension includes:

1. **ClippingHelper Utility Component**:
   - Injects a DOM scanning script into the active browser tab via \`chrome.scripting.executeScript\`.
   - Discovers all \`<form>\`, \`<input>\`, and \`<select>\` elements.
   - Serializes their metadata (name, type, ID, labels, options, autocomplete, and selectors).
   - Provides an interactive on-page interface to label this configuration as a **'Saved Clip'** for future automated autofill mapping.

2. **Form Context & Origin Capture Helper**:
   - Captures \`window.location.origin\` and form telemetry on submission.
   - Labels context (e.g. *"Job Application"*, *"Checkout & Shipping"*, etc.).

3. **Automated Profile Matching Engine**:
   - Re-applies saved clips across matching origins with 1 click.

## Installation in Chrome / Edge / Brave:
1. Extract this ZIP archive to a folder on your computer.
2. Go to \`chrome://extensions\`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and choose the extracted folder.
`,
    },
  ];
}

export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();
  const files = generateExtensionFiles();

  files.forEach((f) => {
    zip.file(f.name, f.content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clip-it-browser-extension-v1.2.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
