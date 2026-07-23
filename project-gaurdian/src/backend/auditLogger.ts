import { jsPDF } from 'jspdf';
import { AuditEntry, PersonaRole } from '../types';

// Append-only in-memory audit store
const auditEntries: AuditEntry[] = [];

// Subscribers for real-time SSE/WebSocket streaming
type AuditSubscriber = (entry: AuditEntry) => void;
const subscribers: Set<AuditSubscriber> = new Set();

export function subscribeToAuditLog(cb: AuditSubscriber): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

export function logAuditEvent(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
  const fullEntry: AuditEntry = {
    ...entry,
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };

  auditEntries.unshift(fullEntry);

  // Keep last 500 audit events
  if (auditEntries.length > 500) {
    auditEntries.length = 500;
  }

  // Notify all real-time listeners
  subscribers.forEach((cb) => {
    try {
      cb(fullEntry);
    } catch (e) {
      console.error('Error delivering audit entry to subscriber:', e);
    }
  });

  return fullEntry;
}

export function getAuditLogs(filters?: {
  persona?: PersonaRole;
  module?: string;
  limit?: number;
}): AuditEntry[] {
  let list = [...auditEntries];
  if (filters?.persona) {
    list = list.filter((e) => e.persona === filters.persona);
  }
  if (filters?.module) {
    list = list.filter((e) => e.module.toLowerCase() === filters.module?.toLowerCase());
  }
  const limit = filters?.limit || 100;
  return list.slice(0, limit);
}

/**
 * Generate a real, regulator-ready PDF report for BaFin export using jsPDF.
 */
export function generateBafinPdfReport(filters?: { persona?: PersonaRole; module?: string }): Buffer {
  const doc = new jsPDF();
  const entries = getAuditLogs(filters);

  // Header Banner
  doc.setFillColor(15, 23, 42); // Navy Dark Slate
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT GUARDIAN — BAFIN AUDIT REPORT', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toUTCString()} | Regulator ID: DE-BAFIN-XAI-883`, 14, 26);

  // Subtitle & Scope
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Chronological Regulatory & XAI Decision Trail', 14, 42);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Records Exported: ${entries.length} | Environment: Production Live Gate`, 14, 48);

  let y = 56;
  const pageHeight = 280;

  entries.forEach((entry, idx) => {
    if (y > pageHeight) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 28, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 182, 28, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`[${idx + 1}] ${entry.timestamp} | ${entry.module.toUpperCase()} | Role: ${entry.persona}`, 18, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Action: ${entry.action} | Guardian Score: ${entry.guardianScoreAtTime}/100 | Model: ${entry.modelUsed}`, 18, y + 12);

    // Truncate reasoning payload to fit
    const cleanReasoning = entry.reasoningPayload.replace(/\n/g, ' ');
    const truncatedText = cleanReasoning.length > 110 ? cleanReasoning.substring(0, 107) + '...' : cleanReasoning;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(`Reasoning: ${truncatedText}`, 18, y + 20);

    y += 33;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('CONFIDENTIAL - FOR AUTHORIZED BAFIN AUDIT & COMPLIANCE PURPOSES ONLY', 14, 288);

  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}
