import { Resend } from "resend";
import { formatCents, formatSessionDate, formatSessionTime } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.BOOKING_FROM_EMAIL || `bookings@${new URL(siteConfig.url).hostname}`;
const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || siteConfig.email;

export interface BookingEmailDetails {
  customerName: string;
  customerEmail: string;
  className: string;
  startsAt: Date;
  location: string;
  seats: number;
  amountPaidCents: number | null;
  currency: string;
}

export async function sendBookingConfirmationEmail(details: BookingEmailDetails) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping booking confirmation email.");
    return;
  }

  const amount =
    details.amountPaidCents != null ? formatCents(details.amountPaidCents, details.currency.toUpperCase()) : "";

  await resend.emails.send({
    from: `${siteConfig.name} <${FROM_EMAIL}>`,
    to: details.customerEmail,
    subject: `You're booked in — ${details.className}`,
    text: [
      `Hey ${details.customerName},`,
      ``,
      `You're confirmed for ${details.className}.`,
      ``,
      `Date: ${formatSessionDate(details.startsAt)}`,
      `Time: ${formatSessionTime(details.startsAt)}`,
      `Location: ${details.location}`,
      `Seats: ${details.seats}`,
      amount ? `Amount paid: ${amount}` : null,
      ``,
      `See you there.`,
      `${siteConfig.name}`,
    ]
      .filter((line) => line !== null)
      .join("\n"),
  });
}

export interface EnquiryEmailDetails {
  name: string;
  email: string;
  phone: string | null;
  formType: string;
  experienceLevel: string | null;
  message: string;
}

const FORM_TYPE_LABELS: Record<string, string> = {
  general: "General",
  holiday_program: "School Holiday Program",
  "1on1": "1-on-1 Coaching",
  group_class: "Group Class",
  corporate: "Corporate / Event",
};

export async function sendAdminEnquiryAlert(details: EnquiryEmailDetails) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping admin enquiry alert.");
    return;
  }

  const topic = FORM_TYPE_LABELS[details.formType] ?? details.formType;

  const { error } = await resend.emails.send({
    from: `${siteConfig.name} <${FROM_EMAIL}>`,
    to: ADMIN_ALERT_EMAIL,
    // Hitting "Reply" goes straight to the person who enquired.
    replyTo: details.email,
    subject: `New enquiry — ${details.name} (${topic})`,
    text: [
      `New enquiry from the website.`,
      ``,
      `Name: ${details.name}`,
      `Email: ${details.email}`,
      details.phone ? `Phone: ${details.phone}` : null,
      `Enquiry about: ${topic}`,
      details.experienceLevel ? `Experience: ${details.experienceLevel}` : null,
      ``,
      `Message:`,
      details.message,
      ``,
      `Reply to this email to respond directly. All enquiries: ${siteConfig.url}/admin/enquiries`,
    ]
      .filter((line) => line !== null)
      .join("\n"),
  });

  if (error) throw new Error(`Resend rejected enquiry alert: ${error.message}`);
}

export async function sendAdminBookingAlert(details: BookingEmailDetails) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping admin booking alert.");
    return;
  }

  const amount =
    details.amountPaidCents != null ? formatCents(details.amountPaidCents, details.currency.toUpperCase()) : "";

  await resend.emails.send({
    from: `${siteConfig.name} <${FROM_EMAIL}>`,
    to: ADMIN_ALERT_EMAIL,
    subject: `New booking — ${details.className}`,
    text: [
      `New booking just came in.`,
      ``,
      `Class: ${details.className}`,
      `Date: ${formatSessionDate(details.startsAt)}`,
      `Time: ${formatSessionTime(details.startsAt)}`,
      `Customer: ${details.customerName} (${details.customerEmail})`,
      `Seats: ${details.seats}`,
      amount ? `Amount paid: ${amount}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n"),
  });
}
