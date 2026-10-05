import { jsPDF } from 'jspdf';
import { Form, FormSubmission } from '../types';

/**
 * Generates and downloads a clean, professional PDF for a completed form submission
 */
export function exportSubmissionToPdf(form: Form, submission: FormSubmission, userOrg?: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let cursorY = margin;

  // Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('CLIP IT', margin, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('OFFICIAL RECORD & VERIFIED SUBMISSION', pageWidth - margin - 220, 38);

  cursorY = 85;

  // Document Title & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(form.title, pageWidth - margin * 2);
  doc.text(titleLines, margin, cursorY);
  cursorY += titleLines.length * 20;

  if (form.description) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const descLines = doc.splitTextToSize(form.description, pageWidth - margin * 2);
    doc.text(descLines, margin, cursorY);
    cursorY += descLines.length * 14 + 10;
  }

  // Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 44, 4, 4, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SUBMISSION ID', margin + 14, cursorY + 16);
  doc.text('COMPLETED DATE', margin + 160, cursorY + 16);
  doc.text('DATA PROFILE', margin + 300, cursorY + 16);
  doc.text('STATUS', margin + 440, cursorY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(submission.id, margin + 14, cursorY + 32);
  doc.text(
    submission.completedAt ? new Date(submission.completedAt).toLocaleDateString() : new Date(submission.createdAt).toLocaleDateString(),
    margin + 160,
    cursorY + 32
  );
  doc.text(submission.profileNameUsed || 'Direct Input', margin + 300, cursorY + 32);
  doc.setTextColor(22, 163, 74); // emerald-600
  doc.text(submission.status.toUpperCase(), margin + 440, cursorY + 32);

  cursorY += 60;

  // Group fields by sections or render sequentially
  const sections = form.sections && form.sections.length > 0
    ? form.sections
    : [{ id: 'default', title: 'Form Responses' }];

  for (const section of sections) {
    const sectionFields = form.fields.filter(
      (f) => f.sectionId === section.id || (!f.sectionId && section.id === 'default')
    );

    if (sectionFields.length === 0) continue;

    // Check page break
    if (cursorY > pageHeight - 100) {
      doc.addPage();
      cursorY = margin;
    }

    // Section Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, cursorY, pageWidth - margin * 2, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(section.title.toUpperCase(), margin + 10, cursorY + 15);
    cursorY += 28;

    // Fields
    for (const field of sectionFields) {
      if (cursorY > pageHeight - 80) {
        doc.addPage();
        cursorY = margin;
      }

      const val = submission.data[field.id];
      let displayVal = '—';
      if (val !== undefined && val !== null && val !== '') {
        if (typeof val === 'boolean') {
          displayVal = val ? 'Yes / Agreed' : 'No';
        } else if (Array.isArray(val)) {
          displayVal = val.join(', ');
        } else {
          displayVal = String(val);
        }
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(field.label, margin + 8, cursorY + 12);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);

      if (field.type === 'signature' && (submission.signatureDataUrl || (typeof val === 'string' && val.startsWith('data:image')))) {
        const sigUrl = submission.signatureDataUrl || val;
        try {
          doc.addImage(sigUrl, 'PNG', margin + 180, cursorY - 4, 140, 36);
          cursorY += 38;
        } catch {
          doc.text('(Digital Signature Captured)', margin + 180, cursorY + 12);
          cursorY += 20;
        }
      } else {
        const splitVal = doc.splitTextToSize(displayVal, pageWidth - margin * 2 - 190);
        doc.text(splitVal, margin + 180, cursorY + 12);
        cursorY += Math.max(splitVal.length * 13, 20);
      }

      // Hairline divider
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 6;
    }

    cursorY += 10;
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by Clip It · ${new Date().toLocaleDateString()} · Secure Document`,
      margin,
      pageHeight - 20
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 60, pageHeight - 20);
  }

  // Save PDF
  const cleanTitle = form.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  doc.save(`${cleanTitle}_Submission.pdf`);
}

/**
 * Exports submissions for a form to a CSV spreadsheet
 */
export function exportFormToCsv(form: Form, submissions: FormSubmission[]): boolean {
  if (submissions.length === 0) {
    return false;
  }

  const headers = ['Submission ID', 'Date', 'Status', 'Profile Used'];
  const fieldHeaders = form.fields.map((f) => f.label);
  const allHeaders = [...headers, ...fieldHeaders];

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = submissions.map((sub) => {
    const meta = [
      sub.id,
      sub.completedAt || sub.createdAt,
      sub.status,
      sub.profileNameUsed || 'Direct Input',
    ];
    const fieldValues = form.fields.map((f) => {
      const v = sub.data[f.id];
      if (v === undefined || v === null) return '';
      if (typeof v === 'boolean') return v ? 'Yes' : 'No';
      if (Array.isArray(v)) return v.join('; ');
      return String(v);
    });
    return [...meta, ...fieldValues].map(escapeCsv).join(',');
  });

  const csvContent = [allHeaders.map(escapeCsv).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanTitle = form.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  link.setAttribute('download', `${cleanTitle}_Submissions.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
