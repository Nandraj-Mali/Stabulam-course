import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

const RED = rgb(225 / 255, 29 / 255, 46 / 255);
const INK = rgb(11 / 255, 11 / 255, 12 / 255);
const MUTED = rgb(107 / 255, 107 / 255, 115 / 255);
const CREAM = rgb(250 / 255, 247 / 255, 242 / 255);

export type CertData = {
  id: string;
  full_name: string;
  school_name: string | null;
  designation: string | null;
  course_title: string;
  issued_at: string;
  brand_name: string;
  signatory_name?: string;
  signatory_title?: string;
  verify_url: string;
};

export async function renderCertificate(d: CertData) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificate ${d.id}`);
  const page = pdf.addPage([842, 595]); // A4 landscape
  const { width: W, height: H } = page.getSize();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: INK });
  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 18, y: H - 30, width: W - 36, height: 12, color: RED });
  page.drawRectangle({ x: 40, y: 40, width: W - 80, height: H - 90, color: CREAM, opacity: 0.6 });

  const center = (text: string, y: number, size: number, font = reg, color = INK) => {
    const safe = text.replace(/[^\x20-\x7E]/g, "");
    const w = font.widthOfTextAtSize(safe, size);
    page.drawText(safe, { x: (W - w) / 2, y, size, font, color });
  };

  center(d.brand_name.toUpperCase(), H - 90, 14, bold, INK);
  center("CERTIFICATE OF COMPLETION", H - 140, 30, bold, RED);
  center("This is to certify that", H - 190, 14, reg, MUTED);

  let nameSize = 40;
  while (bold.widthOfTextAtSize(d.full_name, nameSize) > W - 200 && nameSize > 20) nameSize -= 2;
  center(d.full_name, H - 245, nameSize, bold, INK);
  page.drawRectangle({ x: W / 2 - 160, y: H - 258, width: 320, height: 1.5, color: RED });

  const role = [d.designation, d.school_name].filter(Boolean).join(", ");
  if (role) center(role, H - 285, 14, reg, MUTED);
  center("has successfully completed the course", H - 325, 14, reg, MUTED);
  center(d.course_title, H - 360, 24, bold, INK);

  const date = new Date(d.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  // bottom-left: date + id
  page.drawText("Date of issue", { x: 80, y: 120, size: 10, font: reg, color: MUTED });
  page.drawText(date, { x: 80, y: 102, size: 13, font: bold, color: INK });
  page.drawText("Certificate ID", { x: 80, y: 78, size: 10, font: reg, color: MUTED });
  page.drawText(d.id, { x: 80, y: 60, size: 13, font: bold, color: INK });

  // bottom-center: signature
  if (d.signatory_name) {
    page.drawRectangle({ x: W / 2 - 90, y: 100, width: 180, height: 1, color: INK });
    center(d.signatory_name, 82, 12, bold, INK);
    if (d.signatory_title) center(d.signatory_title, 66, 10, reg, MUTED);
  }

  // bottom-right: QR
  const qrPng = await QRCode.toBuffer(d.verify_url, { margin: 0, width: 240, color: { dark: "#0b0b0c", light: "#ffffff" } });
  const qr = await pdf.embedPng(qrPng);
  page.drawImage(qr, { x: W - 160, y: 56, width: 80, height: 80 });
  page.drawText("Scan to verify", { x: W - 156, y: 44, size: 9, font: reg, color: MUTED });

  return pdf.save();
}
