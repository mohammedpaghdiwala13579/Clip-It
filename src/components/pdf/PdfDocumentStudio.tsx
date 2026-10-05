import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { User, Profile, DocumentOverlayField } from '../../types';
import { getProfiles } from '../../services/storage';
import { useToast } from '../common/Toast';
import { SignaturePad } from '../common/SignaturePad';
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Download,
  Sparkles,
  CheckSquare,
  Calendar,
  Type,
  PenTool,
  Printer,
  Eye,
  ArrowLeft,
  Move
} from 'lucide-react';

interface PdfDocumentStudioProps {
  currentUser: User;
  onBack: () => void;
}

interface StandardPdfTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  initialFields: DocumentOverlayField[];
}

const SAMPLE_DOCUMENT_TEMPLATES: StandardPdfTemplate[] = [
  {
    id: 'doc_employment_w4',
    name: 'Standard Employee W-4 & Withholding Form',
    category: 'Employment',
    description: 'Federal tax withholding allowance certificate with personal records and signature.',
    initialFields: [
      { id: 'f_w4_1', page: 1, x: 12, y: 19, width: 35, height: 4, type: 'text', label: 'First Name and Middle Initial', value: '' },
      { id: 'f_w4_2', page: 1, x: 52, y: 19, width: 35, height: 4, type: 'text', label: 'Last Name', value: '' },
      { id: 'f_w4_3', page: 1, x: 12, y: 25, width: 50, height: 4, type: 'address', label: 'Home Address (number and street)', value: '' },
      { id: 'f_w4_4', page: 1, x: 65, y: 25, width: 22, height: 4, type: 'text', label: 'Social Security Number', value: '' },
      { id: 'f_w4_5', page: 1, x: 12, y: 31, width: 28, height: 4, type: 'text', label: 'City or Town', value: '' },
      { id: 'f_w4_6', page: 1, x: 42, y: 31, width: 18, height: 4, type: 'text', label: 'State', value: '' },
      { id: 'f_w4_7', page: 1, x: 62, y: 31, width: 15, height: 4, type: 'text', label: 'ZIP Code', value: '' },
      { id: 'f_w4_chk', page: 1, x: 12, y: 38, width: 4, height: 4, type: 'checkbox', label: 'Single or Married filing separately', value: true },
      { id: 'f_w4_date', page: 1, x: 60, y: 84, width: 25, height: 4, type: 'date', label: 'Signature Date', value: '' },
      { id: 'f_w4_sig', page: 1, x: 12, y: 82, width: 45, height: 8, type: 'signature', label: "Employee's Signature", value: '' },
    ],
  },
  {
    id: 'doc_nda',
    name: 'Mutual Non-Disclosure Agreement (One Page)',
    category: 'Legal',
    description: 'Commercial confidentiality agreement with reciprocal covenants and authorized signatures.',
    initialFields: [
      { id: 'f_nda_date', page: 1, x: 28, y: 16, width: 25, height: 3.5, type: 'date', label: 'Effective Agreement Date', value: '' },
      { id: 'f_nda_party1', page: 1, x: 14, y: 23, width: 34, height: 3.5, type: 'text', label: 'Disclosing Party Legal Entity', value: '' },
      { id: 'f_nda_party2', page: 1, x: 52, y: 23, width: 34, height: 3.5, type: 'text', label: 'Receiving Party Legal Entity', value: '' },
      { id: 'f_nda_sign1', page: 1, x: 14, y: 78, width: 34, height: 7, type: 'signature', label: 'Authorized Officer Signature', value: '' },
      { id: 'f_nda_sign2', page: 1, x: 52, y: 78, width: 34, height: 7, type: 'signature', label: 'Counterparty Signature', value: '' },
    ],
  },
  {
    id: 'doc_lease',
    name: 'Residential Lease & Rental Application',
    category: 'Real Estate',
    description: 'Tenant background check, applicant references, and authorization release.',
    initialFields: [
      { id: 'f_lse_name', page: 1, x: 14, y: 20, width: 40, height: 4, type: 'text', label: 'Applicant Full Legal Name', value: '' },
      { id: 'f_lse_dob', page: 1, x: 58, y: 20, width: 28, height: 4, type: 'date', label: 'Date of Birth', value: '' },
      { id: 'f_lse_phone', page: 1, x: 14, y: 26, width: 35, height: 4, type: 'phone', label: 'Primary Contact Phone', value: '' },
      { id: 'f_lse_email', page: 1, x: 52, y: 26, width: 34, height: 4, type: 'email', label: 'Email Address', value: '' },
      { id: 'f_lse_sig', page: 1, x: 14, y: 80, width: 40, height: 8, type: 'signature', label: 'Applicant Signature', value: '' },
    ],
  },
];

export const PdfDocumentStudio: React.FC<PdfDocumentStudioProps> = ({ currentUser, onBack }) => {
  const { showToast } = useToast();
  const profiles = getProfiles(currentUser.id);
  const [selectedTemplate, setSelectedTemplate] = useState<StandardPdfTemplate>(SAMPLE_DOCUMENT_TEMPLATES[0]);
  const [fields, setFields] = useState<DocumentOverlayField[]>(SAMPLE_DOCUMENT_TEMPLATES[0].initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string>(profiles[0]?.id || '');
  const [signatureModalFieldId, setSignatureModalFieldId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState(SAMPLE_DOCUMENT_TEMPLATES[0].name);

  const containerRef = useRef<HTMLDivElement>(null);

  // Switch template
  const handleSelectTemplate = (tpl: StandardPdfTemplate) => {
    setSelectedTemplate(tpl);
    setFields(JSON.parse(JSON.stringify(tpl.initialFields)));
    setDocumentName(tpl.name);
    setSelectedFieldId(null);
    showToast('Loaded Template', tpl.name);
  };

  // Add field at center
  const handleAddField = (type: DocumentOverlayField['type']) => {
    const id = `fld_pdf_${Date.now()}`;
    const newField: DocumentOverlayField = {
      id,
      page: 1,
      x: 35,
      y: 40,
      width: type === 'signature' ? 35 : type === 'checkbox' ? 5 : 30,
      height: type === 'signature' ? 8 : type === 'checkbox' ? 5 : 4,
      type,
      label: type === 'signature' ? 'Signature' : type === 'checkbox' ? 'Check' : 'Text Box',
      value: type === 'checkbox' ? true : type === 'date' ? new Date().toISOString().split('T')[0] : '',
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(id);
    showToast('Field Placed', 'Drag or position the field on the document.');
  };

  const handleUpdateField = (id: string, updates: Partial<DocumentOverlayField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleDeleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  // Autofill fields from selected profile
  const handleAutofillDocument = () => {
    const prof = profiles.find((p) => p.id === activeProfileId);
    if (!prof) {
      showToast('Profile Required', 'Please select a saved profile first to autofill the document.', 'info');
      return;
    }

    let count = 0;
    const updated = fields.map((f) => {
      const lbl = f.label.toLowerCase();
      let matchedVal: any = undefined;

      if (lbl.includes('first') && !lbl.includes('last')) {
        matchedVal = prof.data.firstName || prof.data.fullName.split(' ')[0];
      } else if (lbl.includes('last')) {
        matchedVal = prof.data.lastName || prof.data.fullName.split(' ').slice(1).join(' ');
      } else if (lbl.includes('full name') || lbl.includes('name') || lbl.includes('applicant')) {
        matchedVal = prof.data.fullName;
      } else if (lbl.includes('email')) {
        matchedVal = prof.data.email;
      } else if (lbl.includes('phone')) {
        matchedVal = prof.data.phone;
      } else if (lbl.includes('address') || lbl.includes('street')) {
        matchedVal = prof.data.address;
      } else if (lbl.includes('city')) {
        matchedVal = prof.data.city;
      } else if (lbl.includes('state')) {
        matchedVal = prof.data.state;
      } else if (lbl.includes('zip') || lbl.includes('postal')) {
        matchedVal = prof.data.postalCode;
      } else if (lbl.includes('ssn') || lbl.includes('security') || lbl.includes('tax')) {
        matchedVal = prof.data.taxId;
      } else if (lbl.includes('date') && f.type === 'date') {
        matchedVal = new Date().toISOString().split('T')[0];
      } else if (lbl.includes('entity') || lbl.includes('company')) {
        matchedVal = prof.data.company;
      }

      if (matchedVal !== undefined && matchedVal !== '') {
        count++;
        return { ...f, value: matchedVal };
      }
      return f;
    });

    setFields(updated);
    showToast('Document Autofilled', `Populated ${count} mapped fields from "${prof.name}".`);
  };

  // Export filled document to real PDF
  const handleExportPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Document background frame simulating the printed form
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header title
    doc.setFillColor(241, 245, 249);
    doc.rect(30, 30, pageWidth - 60, 45, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(30, 30, pageWidth - 60, 45, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(documentName.toUpperCase(), 45, 58);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('OFFICIAL RECORD · COMPLETED VIA CLIP IT', pageWidth - 240, 58);

    // Form background grid lines and decorative structure
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.rect(30, 85, pageWidth - 60, pageHeight - 130, 'S');

    // Render each overlay field exactly in position
    for (const field of fields) {
      const xPt = 30 + (field.x / 100) * (pageWidth - 60);
      const yPt = 85 + (field.y / 100) * (pageHeight - 130);
      const wPt = (field.width / 100) * (pageWidth - 60);
      const hPt = (field.height / 100) * (pageHeight - 130);

      // Draw box boundary
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(xPt, yPt, wPt, hPt, 2, 2, 'FD');

      // Label micro text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(field.label.toUpperCase().substring(0, 32), xPt + 4, yPt + 8);

      // Value
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      if (field.type === 'signature' && field.value && typeof field.value === 'string' && field.value.startsWith('data:image')) {
        try {
          doc.addImage(field.value, 'PNG', xPt + 2, yPt + 10, wPt - 4, hPt - 12);
        } catch {
          doc.text('[Signature Captured]', xPt + 6, yPt + hPt / 2 + 3);
        }
      } else if (field.type === 'checkbox') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(field.value ? '✓' : '', xPt + wPt / 2 - 4, yPt + hPt / 2 + 4);
      } else if (field.value) {
        doc.text(String(field.value), xPt + 4, yPt + hPt - 5);
      }
    }

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Completed on ${new Date().toLocaleDateString()} · Secure Electronic Record`, 40, pageHeight - 20);

    const safeTitle = documentName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${safeTitle}_Completed.pdf`);
    showToast('Exported PDF', `Downloaded "${safeTitle}_Completed.pdf"`);
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                PDF & Document Studio
              </span>
              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-mono">
                Interactive Canvas
              </span>
            </div>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="text-lg font-bold text-neutral-900 border-none focus:outline-none p-0 hover:bg-neutral-100/50 rounded px-1 -ml-1 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profiles.length > 0 && (
            <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
              <select
                value={activeProfileId}
                onChange={(e) => setActiveProfileId(e.target.value)}
                className="bg-transparent text-xs text-neutral-800 font-medium border-none focus:outline-none pr-2"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAutofillDocument}
                className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Autofill
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 border border-neutral-200 hover:border-neutral-300 rounded-xl text-neutral-700 hover:bg-neutral-50 transition-colors"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio: Left Preset Documents | Center Canvas | Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Sample PDF Templates & Tool Palette */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
              Standard Documents
            </span>

            <div className="space-y-1.5">
              {SAMPLE_DOCUMENT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors ${
                    tpl.id === selectedTemplate.id
                      ? 'border-neutral-900 bg-neutral-900 text-white font-medium shadow-2xs'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800'
                  }`}
                >
                  <div className="font-semibold truncate">{tpl.name}</div>
                  <div className={`text-[11px] truncate ${tpl.id === selectedTemplate.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {tpl.category} · {tpl.initialFields.length} mapped fields
                  </div>
                </button>
              ))}
            </div>

            {/* Custom file upload mock */}
            <label className="flex items-center justify-center gap-1.5 p-3 border border-dashed border-neutral-300 hover:border-neutral-400 rounded-xl cursor-pointer text-xs text-neutral-600 hover:bg-neutral-50 transition-colors">
              <Upload className="w-3.5 h-3.5 text-neutral-400" />
              <span>Upload PDF Document</span>
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
                    showToast('PDF Form Uploaded', file.name);
                  }
                }}
              />
            </label>
          </div>

          {/* Place Tools */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
              Insert Overlay Field
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleAddField('text')}
                className="flex items-center gap-2 p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800"
              >
                <Type className="w-3.5 h-3.5 text-blue-600" /> Text Box
              </button>
              <button
                type="button"
                onClick={() => handleAddField('date')}
                className="flex items-center gap-2 p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-600" /> Date Stamp
              </button>
              <button
                type="button"
                onClick={() => handleAddField('checkbox')}
                className="flex items-center gap-2 p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800"
              >
                <CheckSquare className="w-3.5 h-3.5 text-purple-600" /> Checkmark
              </button>
              <button
                type="button"
                onClick={() => handleAddField('signature')}
                className="flex items-center gap-2 p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800"
              >
                <PenTool className="w-3.5 h-3.5 text-slate-800" /> Signature
              </button>
            </div>
          </div>
        </div>

        {/* Center Column: Interactive Document Canvas */}
        <div className="lg:col-span-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
            <span>Click any box on the document to type or sign. Drag handles to reposition.</span>
            <span className="font-mono text-[11px]">{fields.length} active fields</span>
          </div>

          <div
            ref={containerRef}
            className="relative w-full aspect-[1/1.414] bg-white border border-neutral-300 rounded-xl shadow-md overflow-hidden select-none p-6"
            style={{
              backgroundImage: 'radial-gradient(circle, #f1f5f9 10%, transparent 11%)',
              backgroundSize: '20px 20px',
            }}
          >
            {/* Document Header representation */}
            <div className="border-b-2 border-neutral-800 pb-3 mb-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                Official Standard Document Record
              </div>
              <h3 className="text-sm font-bold text-neutral-900 tracking-tight">{documentName}</h3>
            </div>

            {/* Document body wireframe lines */}
            <div className="space-y-4 opacity-15 pointer-events-none">
              <div className="h-2 bg-neutral-400 rounded w-5/6" />
              <div className="h-2 bg-neutral-400 rounded w-full" />
              <div className="h-2 bg-neutral-400 rounded w-4/6" />
              <div className="h-2 bg-neutral-400 rounded w-full" />
              <div className="h-2 bg-neutral-400 rounded w-3/4" />
              <div className="h-2 bg-neutral-400 rounded w-5/6" />
              <div className="h-2 bg-neutral-400 rounded w-full" />
              <div className="h-2 bg-neutral-400 rounded w-2/3" />
            </div>

            {/* Overlay Interactive Fields */}
            {fields.map((field) => {
              const isSelected = field.id === selectedFieldId;

              return (
                <div
                  key={field.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFieldId(field.id);
                  }}
                  className={`absolute rounded transition-all cursor-pointer p-1 text-xs border ${
                    isSelected
                      ? 'border-neutral-900 bg-white shadow-lg ring-2 ring-neutral-900/20 z-20'
                      : 'border-blue-400/80 bg-blue-50/60 hover:bg-blue-100/70 text-neutral-800 z-10'
                  }`}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                  }}
                >
                  <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-tight truncate leading-none mb-0.5">
                    {field.label}
                  </div>

                  {field.type === 'signature' ? (
                    field.value ? (
                      <img src={field.value} alt="Signature" className="h-full object-contain pointer-events-none" />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFieldId(field.id);
                          setSignatureModalFieldId(field.id);
                        }}
                        className="text-[10px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <PenTool className="w-2.5 h-2.5" /> Sign Here
                      </button>
                    )
                  ) : field.type === 'checkbox' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateField(field.id, { value: !field.value });
                      }}
                      className="w-full h-full flex items-center justify-center font-bold text-xs"
                    >
                      {field.value ? '✓' : ''}
                    </button>
                  ) : (
                    <input
                      type={field.type === 'date' ? 'date' : 'text'}
                      value={field.value || ''}
                      onChange={(e) => handleUpdateField(field.id, { value: e.target.value })}
                      placeholder="Fill value..."
                      className="w-full h-full bg-transparent text-neutral-900 text-xs font-medium focus:outline-none truncate"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Field Inspector */}
        <div className="lg:col-span-3">
          {selectedField ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="font-bold uppercase tracking-wider text-neutral-700">
                  Field Inspector
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteField(selectedField.id)}
                  className="text-neutral-400 hover:text-red-600 p-1"
                  title="Delete field"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Field Label</label>
                <input
                  type="text"
                  value={selectedField.label}
                  onChange={(e) => handleUpdateField(selectedField.id, { label: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Current Value</label>
                {selectedField.type === 'signature' ? (
                  <button
                    type="button"
                    onClick={() => setSignatureModalFieldId(selectedField.id)}
                    className="w-full py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    {selectedField.value ? 'Re-Draw Signature' : 'Add Signature'}
                  </button>
                ) : (
                  <input
                    type="text"
                    value={selectedField.value || ''}
                    onChange={(e) => handleUpdateField(selectedField.id, { value: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs"
                    placeholder="Enter value"
                  />
                )}
              </div>

              {/* Coordinates & Geometry */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                <span className="text-[11px] font-semibold text-neutral-500">Position Coordinates (%)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-neutral-400">X (Horizontal)</label>
                    <input
                      type="number"
                      min={0}
                      max={95}
                      value={selectedField.x}
                      onChange={(e) => handleUpdateField(selectedField.id, { x: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-neutral-200 rounded text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400">Y (Vertical)</label>
                    <input
                      type="number"
                      min={0}
                      max={95}
                      value={selectedField.y}
                      onChange={(e) => handleUpdateField(selectedField.id, { y: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-neutral-200 rounded text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400">Width (%)</label>
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={selectedField.width}
                      onChange={(e) => handleUpdateField(selectedField.id, { width: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-neutral-200 rounded text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400">Height (%)</label>
                    <input
                      type="number"
                      min={3}
                      max={30}
                      value={selectedField.height}
                      onChange={(e) => handleUpdateField(selectedField.id, { height: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-neutral-200 rounded text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs text-center text-xs text-neutral-400 space-y-2">
              <Move className="w-8 h-8 text-neutral-300 mx-auto" />
              <p>Click any field on the document to edit its value, label, or coordinate bounds.</p>
            </div>
          )}
        </div>
      </div>

      {/* Signature Capture Modal */}
      {signatureModalFieldId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-neutral-200 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">Sign Document Field</h3>
            <SignaturePad
              value={fields.find((f) => f.id === signatureModalFieldId)?.value || ''}
              defaultName={currentUser.name}
              onChange={(dataUrl) => {
                handleUpdateField(signatureModalFieldId, { value: dataUrl });
              }}
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setSignatureModalFieldId(null)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors"
              >
                Apply Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
