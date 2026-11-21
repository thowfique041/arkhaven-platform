import PDFDocument from "pdfkit";
import type { Response } from "express";
import { formatBDT, type FinancialSummary } from "./finance";

const INK = "#12312B";
const BRASS = "#B08D57";
const SLATE = "#5B6B66";
const LINE = "#E4DFD4";

export interface ReceiptData {
  receiptNumber: string;
  paidAt: Date;
  verifiedAt?: Date | null;
  amountMinor: number;
  method: string;
  type: string;
  transactionRef?: string | null;
  customer: { code: string; fullName: string; phone: string; email?: string | null; address?: string | null };
  project?: { name: string; address?: string | null } | null;
  flat?: { unitNumber: string; floor: number; sizeSqft: number } | null;
  summary: FinancialSummary;
  company: { name: string; address?: string | null; phone?: string | null; email?: string | null };
}

const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function streamReceipt(res: Response, r: ReceiptData) {
  const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `Receipt ${r.receiptNumber}`, Author: r.company.name } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${r.receiptNumber}.pdf"`);
  res.setHeader("Cache-Control", "private, no-store");
  doc.pipe(res);

  // Logo mark (same geometry as the SVG brand mark), scaled.
  doc.save().translate(50, 45).scale(0.7);
  doc.path("M7 57 L32 7.5 L57 57 L50.9 57 L32 19.6 L13.1 57 Z").fill(INK);
  doc.path("M23.5 57 V41 A8.5 8.5 0 0 1 40.5 41 V57").lineWidth(5.5).stroke(BRASS);
  doc.restore();

  doc.fillColor(INK).font("Times-Bold").fontSize(20).text("ARKHAVEN", 105, 52, { characterSpacing: 2 });
  doc.fillColor(BRASS).font("Helvetica-Bold").fontSize(7.5).text("PROPERTIES", 106, 76, { characterSpacing: 3.5 });

  doc.fillColor(SLATE).font("Helvetica").fontSize(8.5);
  const contact = [r.company.address, r.company.phone, r.company.email].filter(Boolean).join("\n");
  doc.text(contact, 330, 50, { width: 215, align: "right" });

  doc.moveTo(50, 110).lineTo(545, 110).lineWidth(1).stroke(LINE);

  doc.fillColor(INK).font("Times-Bold").fontSize(22).text("Payment Receipt", 50, 128);
  doc.fillColor(SLATE).font("Helvetica").fontSize(9).text(`Receipt No.  ${r.receiptNumber}`, 50, 158);
  doc.text(`Issued  ${date(r.verifiedAt ?? new Date())}`, 50, 172);

  // Amount block
  doc.rect(330, 128, 215, 62).fill("#EEF1EE");
  doc.fillColor(SLATE).font("Helvetica").fontSize(8).text("AMOUNT RECEIVED", 345, 140, { characterSpacing: 1 });
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(17).text(formatBDT(r.amountMinor), 345, 156, { width: 190 });

  let y = 215;
  const row = (k: string, v: string) => {
    doc.fillColor(SLATE).font("Helvetica").fontSize(9).text(k, 50, y, { width: 150 });
    doc.fillColor("#1B1F1E").font("Helvetica").fontSize(10).text(v || "-", 200, y, { width: 345 });
    y += 22;
  };
  const section = (t: string) => {
    y += 6;
    doc.fillColor(BRASS).font("Helvetica-Bold").fontSize(8).text(t.toUpperCase(), 50, y, { characterSpacing: 1.5 });
    y += 16;
  };

  section("Customer");
  row("Customer ID", r.customer.code);
  row("Name", r.customer.fullName);
  row("Phone", r.customer.phone);
  if (r.customer.email) row("Email", r.customer.email);

  section("Property");
  row("Project", r.project?.name ?? "-");
  if (r.flat) row("Unit", `${r.flat.unitNumber}  (Floor ${r.flat.floor}, ${r.flat.sizeSqft.toLocaleString("en-IN")} sft)`);

  section("Payment");
  row("Payment date", date(r.paidAt));
  row("Payment type", label(r.type));
  row("Method", label(r.method));
  row("Transaction / Ref.", r.transactionRef ?? "-");
  row("Status", "Verified");

  section("Account summary (as of issue date)");
  row("Agreed price", formatBDT(r.summary.totalPriceMinor));
  row("Total paid (verified)", formatBDT(r.summary.paidMinor));
  row("Remaining balance", formatBDT(r.summary.remainingMinor));
  row("Paid", `${r.summary.paidPercent.toFixed(2)}%`);

  doc.moveTo(50, 760).lineTo(545, 760).lineWidth(1).stroke(LINE);
  doc.fillColor(SLATE).font("Helvetica").fontSize(8).text(
    "This is a system-generated receipt for a payment verified by Arkhaven Properties Ltd. It does not require a signature. " +
      "Please quote the receipt number in all correspondence.",
    50,
    770,
    { width: 495, align: "center" },
  );
  doc.end();
}
