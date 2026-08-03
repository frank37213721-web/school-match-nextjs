import "server-only";
import { Resend } from "resend";
import { formatTimeSlots, type TimeSlot } from "@/lib/timeSlots";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "跨校課程匯流平台 <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    return !error;
  } catch (err) {
    console.error("[Email Error]", err);
    return false;
  }
}

function wrapEmail(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, 'Helvetica Neue', sans-serif; max-width: 600px; margin: auto; border: 1px solid #b0c4e0; border-radius: 12px; padding: 24px; color: #1a2340;">
      ${bodyHtml}
      <p style="margin-top:24px; color:#4a6a9a; font-size:12px;">請勿回信給本 email，此信件為平台自動發送。— 跨校課程匯流平台</p>
    </div>
  `;
}

type CourseInfo = {
  title: string;
  timeSlots: TimeSlot[];
};

type SchoolContact = {
  name: string;
  phone: string;
  registrantName: string;
  registrantExtension: string | null;
  registrantEmail: string;
  academicDirectorEmail: string | null;
  principalEmail: string | null;
};

function recipientsOf(school: SchoolContact): { email: string; label: string }[] {
  const list: { email: string; label: string }[] = [
    { email: school.registrantEmail, label: "承辦人" },
  ];
  if (school.academicDirectorEmail) list.push({ email: school.academicDirectorEmail, label: "處室主任" });
  if (school.principalEmail) list.push({ email: school.principalEmail, label: "校長" });
  return list;
}

/** 承辦人／處室主任 only — excludes 校長 — for the extra admin-contact details. */
function adminRecipientsOf(school: SchoolContact): { email: string; label: string }[] {
  return recipientsOf(school).filter((r) => r.label !== "校長");
}

/** New match application → 6 recipients (host + applicant, registrant/director/principal each). */
export async function sendMatchApplicationEmails(
  course: CourseInfo,
  hostSchool: SchoolContact,
  applicantSchool: SchoolContact
): Promise<{ successCount: number; failedRecipients: string[] }> {
  const timeStr = formatTimeSlots(course.timeSlots);

  const hostSubject = `【跨校課程匯流平台】配對申請通知：${applicantSchool.name} 申請您的課程「${course.title}」`;
  const hostBaseBody = `
    <h2 style="margin-top:0;">📋 新的課程合作申請</h2>
    <p><strong>${applicantSchool.name}</strong> 申請與貴校合作課程「<strong>${course.title}</strong>」（${timeStr}）。</p>
    <p>申請學校聯絡資訊：</p>
    <ul>
      <li>承辦人：${applicantSchool.registrantName}（${applicantSchool.registrantEmail}）</li>
      ADMIN_CONTACT_LINE
    </ul>
    <p>請登入系統前往「配對情形」頁面審核此申請。</p>
  `;
  const hostAdminContactLine = `<li>學校電話：${applicantSchool.phone}　分機：${
    applicantSchool.registrantExtension || "無"
  }（作為行政業務聯繫用）</li>`;
  const hostHtmlSimple = wrapEmail(hostBaseBody.replace("ADMIN_CONTACT_LINE", ""));
  const hostHtmlDetailed = wrapEmail(hostBaseBody.replace("ADMIN_CONTACT_LINE", hostAdminContactLine));

  const applicantSubject = `【跨校課程匯流平台】配對申請確認：已申請「${course.title}」課程`;
  const applicantBaseBody = `
    <h2 style="margin-top:0;">📬 配對申請已送出</h2>
    <p>貴校已向 <strong>${hostSchool.name}</strong> 申請合作課程「<strong>${course.title}</strong>」（${timeStr}）。</p>
    ADMIN_CONTACT_BLOCK
    <p>請耐心等候對方學校審核，審核結果將以 Email 通知。</p>
  `;
  const applicantAdminContactBlock = `
    <p>開課學校（${hostSchool.name}）聯絡資訊：</p>
    <ul>
      <li>學校電話：${hostSchool.phone}</li>
      <li>承辦人姓名：${hostSchool.registrantName}</li>
      <li>分機：${hostSchool.registrantExtension || "無"}（僅做行政業務聯繫使用）</li>
    </ul>
  `;
  const applicantHtmlSimple = wrapEmail(applicantBaseBody.replace("ADMIN_CONTACT_BLOCK", ""));
  const applicantHtmlDetailed = wrapEmail(
    applicantBaseBody.replace("ADMIN_CONTACT_BLOCK", applicantAdminContactBlock)
  );

  const hostAdminEmails = new Set(adminRecipientsOf(hostSchool).map((r) => r.email));
  const applicantAdminEmails = new Set(adminRecipientsOf(applicantSchool).map((r) => r.email));

  const targets = [
    ...recipientsOf(hostSchool).map((r) => ({
      ...r,
      subject: hostSubject,
      html: hostAdminEmails.has(r.email) ? hostHtmlDetailed : hostHtmlSimple,
    })),
    ...recipientsOf(applicantSchool).map((r) => ({
      ...r,
      subject: applicantSubject,
      html: applicantAdminEmails.has(r.email) ? applicantHtmlDetailed : applicantHtmlSimple,
    })),
  ];

  const results = await Promise.all(
    targets.map(async (t) => ({ email: t.email, ok: await sendEmail(t.email, t.subject, t.html) }))
  );

  const failedRecipients = results.filter((r) => !r.ok).map((r) => r.email);
  return { successCount: results.length - failedRecipients.length, failedRecipients };
}

/** Match approved → 3 recipients (applicant school registrant/director/principal). */
export async function sendMatchApprovedEmails(
  course: CourseInfo,
  hostSchool: SchoolContact,
  applicantSchool: SchoolContact
): Promise<{ successCount: number; failedRecipients: string[] }> {
  const subject = `【跨校課程匯流平台】配對成功通知：您的課程申請「${course.title}」已配對成功`;
  const html = wrapEmail(`
    <h2 style="margin-top:0;">🎉 配對成功</h2>
    <p><strong>${hostSchool.name}</strong> 已同意貴校對課程「<strong>${course.title}</strong>」的申請，合作正式成立！</p>
    <p>開課學校聯絡資訊：${hostSchool.registrantName}（${hostSchool.registrantEmail}）</p>
    <p>請盡快與對方聯繫，確認課程細節與行政事宜。</p>
  `);

  const results = await Promise.all(
    recipientsOf(applicantSchool).map(async (r) => ({ email: r.email, ok: await sendEmail(r.email, subject, html) }))
  );
  const failedRecipients = results.filter((r) => !r.ok).map((r) => r.email);
  return { successCount: results.length - failedRecipients.length, failedRecipients };
}

/** Match rejected → 1 recipient (applicant registrant only). */
export async function sendMatchRejectedEmail(
  course: CourseInfo,
  hostSchool: SchoolContact,
  applicantRegistrantEmail: string
): Promise<boolean> {
  const subject = `【跨校課程匯流平台】配對申請通知：「${course.title}」合作申請未獲通過`;
  const html = wrapEmail(`
    <h2 style="margin-top:0;">課程合作申請結果</h2>
    <p>很抱歉，<strong>${hostSchool.name}</strong> 婉拒了貴校對課程「<strong>${course.title}</strong>」的申請。</p>
  `);
  return sendEmail(applicantRegistrantEmail, subject, html);
}

/** Password reset link — sent via our own Resend integration, not Neon Auth's. */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const subject = "【跨校課程匯流平台】重設密碼";
  const html = wrapEmail(`
    <h2 style="margin-top:0;">🔑 重設密碼</h2>
    <p>我們收到您的重設密碼請求。請點擊下方連結設定新密碼，此連結將於 30 分鐘後失效：</p>
    <p><a href="${resetUrl}" style="color:#5645d4;">${resetUrl}</a></p>
    <p>若您沒有提出此請求，請忽略此信件，您的密碼將維持不變。</p>
  `);
  return sendEmail(to, subject, html);
}
