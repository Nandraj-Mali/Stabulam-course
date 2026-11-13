import "server-only";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, degrees, rgb } from "pdf-lib";
import QRCode from "qrcode";

const RED = rgb(225 / 255, 29 / 255, 46 / 255);
const RED_DARK = rgb(160 / 255, 18 / 255, 32 / 255);
const INK = rgb(11 / 255, 11 / 255, 12 / 255);
const INK_2 = rgb(42 / 255, 42 / 255, 46 / 255);
const MUTED = rgb(118 / 255, 118 / 255, 126 / 255);
const CREAM = rgb(250 / 255, 247 / 255, 242 / 255);
const WHITE = rgb(1, 1, 1);

export type CertData = {
  id: string;
  full_name: string;
  course_title: string;
  issued_at: string;
  brand_name: string;
  logo_url?: string | null;
  signature_url?: string | null;
  signatory_name?: string;
  signatory_title?: string;
  verify_url: string;
};

/** Standard PDF fonts only cover Latin-1; drop anything else so rendering never fails. */
const clean = (t: string) => (t ?? "").replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();

async function loadImage(pdf: PDFDocument, url?: string | null): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await pdf.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await pdf.embedJpg(bytes);
    return null; // webp/svg not supported by pdf-lib
  } catch {
    return null;
  }
}

function fit(img: PDFImage, maxW: number, maxH: number) {
  const s = Math.min(maxW / img.width, maxH / img.height);
  return { width: img.width * s, height: img.height * s };
}

/** Draws text with letter-spacing, centred on cx. */
function spaced(page: PDFPage, text: string, cx: number, y: number, size: number, font: PDFFont, color = INK, tracking = 0) {
  const t = clean(text);
  const widths = [...t].map((ch) => font.widthOfTextAtSize(ch, size));
  const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, t.length - 1);
  let x = cx - total / 2;
  [...t].forEach((ch, i) => {
    page.drawText(ch, { x, y, size, font, color });
    x += widths[i] + tracking;
  });
}

function centered(page: PDFPage, text: string, cx: number, y: number, size: number, font: PDFFont, color = INK) {
  const t = clean(text);
  page.drawText(t, { x: cx - font.widthOfTextAtSize(t, size) / 2, y, size, font, color });
}

/** Text placed around a circle (clockwise from the top), spacing letters by their real width. */
function circleText(page: PDFPage, text: string, cx: number, cy: number, r: number, size: number, font: PDFFont, color = WHITE) {
  const chars = [...clean(text)];
  const widths = chars.map((ch) => font.widthOfTextAtSize(ch, size));
  const natural = widths.reduce((a, b) => a + b, 0);
  const gap = (2 * Math.PI * r - natural) / chars.length; // spread evenly around the full circle
  let arc = 0;
  chars.forEach((ch, i) => {
    const mid = arc + widths[i] / 2;
    const a = Math.PI / 2 - mid / r; // radians, clockwise from top
    const rot = a - Math.PI / 2;
    const x = cx + r * Math.cos(a) - (widths[i] / 2) * Math.cos(rot);
    const y = cy + r * Math.sin(a) - (widths[i] / 2) * Math.sin(rot);
    page.drawText(ch, { x, y, size, font, color, rotate: degrees((rot * 180) / Math.PI) });
    arc += widths[i] + gap;
  });
}

export async function renderCertificate(d: CertData) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificate ${d.id} - ${clean(d.full_name)}`);
  pdf.setAuthor(clean(d.brand_name));
  const page = pdf.addPage([842, 595]); // A4 landscape
  const W = 842;
  const H = 595;

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const times = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const timesBI = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);
  const [logo, signature] = await Promise.all([loadImage(pdf, d.logo_url), loadImage(pdf, d.signature_url)]);

  // ---- frame
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: INK });
  page.drawRectangle({ x: 12, y: 12, width: W - 24, height: H - 24, color: WHITE });
  page.drawRectangle({ x: 20, y: 20, width: W - 40, height: H - 40, borderColor: RED, borderWidth: 1 });

  // ---- left panel
  const PX = 20;
  const PW = 214;
  page.drawRectangle({ x: PX, y: 20, width: PW, height: H - 40, color: INK });
  for (let gx = PX + 22; gx < PX + PW; gx += 22)
    page.drawLine({ start: { x: gx, y: 20 }, end: { x: gx, y: H - 20 }, thickness: 0.4, color: WHITE, opacity: 0.06 });
  for (let gy = 42; gy < H - 20; gy += 22)
    page.drawLine({ start: { x: PX, y: gy }, end: { x: PX + PW, y: gy }, thickness: 0.4, color: WHITE, opacity: 0.06 });
  page.drawRectangle({ x: PX, y: H - 26, width: PW, height: 6, color: RED });

  const pcx = PX + PW / 2;

  // brand / logo
  if (logo) {
    const box = { w: 160, h: 58 };
    page.drawRectangle({ x: pcx - box.w / 2, y: H - 110, width: box.w, height: box.h, color: WHITE });
    const sz = fit(logo, box.w - 20, box.h - 16);
    page.drawImage(logo, { x: pcx - sz.width / 2, y: H - 110 + (box.h - sz.height) / 2, ...sz });
  } else {
    centered(page, d.brand_name.toUpperCase(), pcx, H - 82, 20, helvB, WHITE);
    page.drawRectangle({ x: pcx - 16, y: H - 94, width: 32, height: 2, color: RED });
  }

  // seal
  const sy = H / 2 + 4;
  page.drawCircle({ x: pcx, y: sy, size: 66, color: RED_DARK });
  page.drawCircle({ x: pcx, y: sy, size: 62, color: RED });
  page.drawCircle({ x: pcx, y: sy, size: 56, borderColor: WHITE, borderWidth: 1.2 });
  page.drawCircle({ x: pcx, y: sy, size: 38, borderColor: WHITE, borderWidth: 0.7 });
  circleText(page, `CERTIFIED · ${d.brand_name.toUpperCase()} · VERIFIED · `, pcx, sy, 45, 7.4, helvB, WHITE);
  centered(page, new Date(d.issued_at).getFullYear().toString(), pcx, sy + 2, 18, helvB, WHITE);
  centered(page, "COMPLETED", pcx, sy - 11, 6.5, helvB, WHITE);
  // ribbon tails
  page.drawSvgPath("M0,0 L20,0 L20,46 L10,37 L0,46 Z", { x: pcx - 26, y: sy - 52, color: RED_DARK });
  page.drawSvgPath("M0,0 L20,0 L20,46 L10,37 L0,46 Z", { x: pcx + 6, y: sy - 52, color: RED });

  // id + date
  const date = new Date(d.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  page.drawText("ISSUED ON", { x: PX + 26, y: 108, size: 7, font: helvB, color: WHITE, opacity: 0.5 });
  page.drawText(clean(date), { x: PX + 26, y: 93, size: 11.5, font: helvB, color: WHITE });
  page.drawText("CERTIFICATE ID", { x: PX + 26, y: 70, size: 7, font: helvB, color: WHITE, opacity: 0.5 });
  page.drawText(clean(d.id), { x: PX + 26, y: 55, size: 11.5, font: helvB, color: WHITE });

  // ---- right content
  const L = PX + PW + 40;
  const R = W - 60;
  const cx = (L + R) / 2;

  // corner accents (top-right)
  page.drawRectangle({ x: W - 20 - 64, y: H - 24, width: 64, height: 4, color: RED });
  page.drawRectangle({ x: W - 24, y: H - 20 - 64, width: 4, height: 64, color: RED });

  spaced(page, "CERTIFICATE", cx, H - 120, 40, helvB, INK, 7);
  spaced(page, "OF COMPLETION", cx, H - 146, 12, helvB, RED, 6);

  // divider with diamond
  page.drawLine({ start: { x: cx - 120, y: H - 166 }, end: { x: cx - 10, y: H - 166 }, thickness: 0.8, color: INK, opacity: 0.25 });
  page.drawLine({ start: { x: cx + 10, y: H - 166 }, end: { x: cx + 120, y: H - 166 }, thickness: 0.8, color: INK, opacity: 0.25 });
  page.drawSvgPath("M0,-5 L5,0 L0,5 L-5,0 Z", { x: cx, y: H - 166, color: RED });

  spaced(page, "THIS CERTIFICATE IS PROUDLY PRESENTED TO", cx, H - 200, 8.5, helvB, MUTED, 2.2);

  // name
  const name = clean(d.full_name) || "Learner";
  let ns = 46;
  while (timesBI.widthOfTextAtSize(name, ns) > R - L - 50 && ns > 22) ns -= 2;
  centered(page, name, cx, H - 256, ns, timesBI, INK);
  page.drawLine({ start: { x: cx - 170, y: H - 272 }, end: { x: cx + 170, y: H - 272 }, thickness: 0.8, color: INK, opacity: 0.35 });
  page.drawRectangle({ x: cx - 34, y: H - 273.5, width: 68, height: 3, color: RED });

  centered(page, "for successfully completing the course", cx, H - 304, 14, times, INK_2);
  let cs = 22;
  const course = clean(d.course_title);
  while (helvB.widthOfTextAtSize(course, cs) > R - L - 20 && cs > 13) cs -= 1;
  centered(page, course, cx, H - 336, cs, helvB, INK);
  centered(page, `a self-paced professional program by ${clean(d.brand_name)}`, cx, H - 356, 10, helv, MUTED);

  // signature block
  const sigX = L + 120;
  const lineY = 110;
  if (signature) {
    const sz = fit(signature, 170, 52);
    page.drawImage(signature, { x: sigX - sz.width / 2, y: lineY + 4, ...sz });
  }
  page.drawLine({ start: { x: sigX - 95, y: lineY }, end: { x: sigX + 95, y: lineY }, thickness: 0.9, color: INK });
  if (d.signatory_name) centered(page, d.signatory_name, sigX, lineY - 16, 11.5, helvB, INK);
  if (d.signatory_title) centered(page, d.signatory_title, sigX, lineY - 30, 9, helv, MUTED);

  // QR verify block
  const qrPng = await QRCode.toBuffer(d.verify_url, { margin: 0, width: 300, color: { dark: "#0b0b0c", light: "#ffffff" } });
  const qr = await pdf.embedPng(qrPng);
  const qx = R - 70;
  page.drawRectangle({ x: qx - 6, y: 58, width: 82, height: 82, borderColor: INK, borderWidth: 0.6, color: WHITE });
  page.drawImage(qr, { x: qx, y: 64, width: 70, height: 70 });
  spaced(page, "SCAN TO VERIFY", qx + 35, 45, 6.5, helvB, MUTED, 1.2);

  // bottom accent
  page.drawRectangle({ x: L, y: 32, width: R - L, height: 0.6, color: INK, opacity: 0.12 });
  page.drawRectangle({ x: PX + PW, y: 20, width: W - 20 - (PX + PW), height: 4, color: CREAM });

  return pdf.save();
}
