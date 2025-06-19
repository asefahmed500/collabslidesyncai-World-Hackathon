
// Placeholder Email Service

interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  fromName?: string; // Optional: Name of the sender (e.g., "CollabSlideSyncAI Team")
  fromEmail?: string; // Optional: Sender email address (e.g., "noreply@collabslidesync.ai")
}

/**
 * Placeholder function for sending emails.
 * In a real application, this would integrate with an Email Service Provider (ESP)
 * like SendGrid, Mailgun, AWS SES, etc.
 * 
 * Ensure ESP SDK is installed and configured with API keys in environment variables.
 */
export async function sendEmail({ to, subject, htmlBody, fromName = "CollabSlideSyncAI", fromEmail = "noreply@example.com" }: EmailOptions): Promise<void> {
  console.log("--- Sending Email (Placeholder) ---");
  console.log(`From: "${fromName}" <${fromEmail}>`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("Body (HTML):");
  console.log(htmlBody);
  console.log("------------------------------------");
  
  // TODO: Replace with actual email sending logic using an ESP SDK.
  // Example (conceptual SendGrid):
  //
  // import sgMail from '@sendgrid/mail';
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  // const msg = {
  //   to,
  //   from: { name: fromName, email: fromEmail },
  //   subject,
  //   html: htmlBody,
  // };
  // try {
  //   await sgMail.send(msg);
  //   console.log('Email sent successfully (via placeholder).');
  // } catch (error) {
  //   console.error('Error sending email (via placeholder):', error);
  //   if (error.response) {
  //     console.error(error.response.body)
  //   }
  //   // Decide if you want to throw an error or just log it
  //   // throw new Error('Failed to send email.'); 
  // }

  // For now, just resolve successfully as it's a placeholder
  return Promise.resolve();
}

// --- Email Template Helper Functions (Basic Examples) ---

export function createCollaborationInviteEmail(
  recipientName: string,
  inviterName: string,
  presentationTitle: string,
  presentationLink: string,
  role: string
): { subject: string; htmlBody: string } {
  const subject = `You're invited to collaborate on "${presentationTitle}"`;
  const htmlBody = `
    <p>Hi ${recipientName || 'there'},</p>
    <p>${inviterName || 'Someone'} has invited you to collaborate on the presentation "<strong>${presentationTitle}</strong>" as an <strong>${role}</strong>.</p>
    <p>You can access the presentation here: <a href="${presentationLink}">${presentationLink}</a></p>
    <p>Happy collaborating!</p>
    <p>The CollabSlideSyncAI Team</p>
  `;
  return { subject, htmlBody };
}

export function createTeamInviteEmail(
  recipientName: string,
  inviterName: string,
  teamName: string,
  teamLink: string, // Link to team dashboard or similar
  role: string
): { subject: string; htmlBody: string } {
  const subject = `You've been added to the team "${teamName}"`;
  const htmlBody = `
    <p>Hi ${recipientName || 'there'},</p>
    <p>${inviterName || 'Someone'} has added you to the team "<strong>${teamName}</strong>" as a <strong>${role}</strong> on CollabSlideSyncAI.</p>
    <p>You can view your team dashboard here: <a href="${teamLink}">${teamLink}</a></p>
    <p>The CollabSlideSyncAI Team</p>
  `;
  return { subject, htmlBody };
}

export function createNewCommentEmail(
  recipientName: string,
  commenterName: string,
  presentationTitle: string,
  slideNumber: number | string,
  commentText: string,
  presentationLink: string // Link to specific slide with comment if possible
): { subject: string; htmlBody: string } {
  const subject = `New comment on "${presentationTitle}" (Slide ${slideNumber})`;
  const htmlBody = `
    <p>Hi ${recipientName || 'there'},</p>
    <p><strong>${commenterName || 'Someone'}</strong> left a new comment on slide ${slideNumber} of your presentation "<strong>${presentationTitle}</strong>":</p>
    <blockquote style="border-left: 2px solid #eee; margin-left: 0; padding-left: 1em; color: #666;">
      ${commentText}
    </blockquote>
    <p>View the comment here: <a href="${presentationLink}">${presentationLink}</a></p>
    <p>The CollabSlideSyncAI Team</p>
  `;
  return { subject, htmlBody };
}

export function createRoleChangeEmail(
  recipientName: string,
  adminName: string,
  presentationTitle: string,
  presentationLink: string,
  oldRole: string,
  newRole: string
): { subject: string; htmlBody: string } {
  const subject = `Your role has changed for "${presentationTitle}"`;
  const htmlBody = `
    <p>Hi ${recipientName || 'there'},</p>
    <p>${adminName || 'An administrator'} has changed your role for the presentation "<strong>${presentationTitle}</strong>" from <strong>${oldRole}</strong> to <strong>${newRole}</strong>.</p>
    <p>You can access the presentation here: <a href="${presentationLink}">${presentationLink}</a></p>
    <p>The CollabSlideSyncAI Team</p>
  `;
  return { subject, htmlBody };
}

export function createCollaboratorRemovedEmail(
  recipientName: string,
  adminName: string,
  presentationTitle: string
): { subject: string; htmlBody: string } {
  const subject = `Your access to "${presentationTitle}" has been removed`;
  const htmlBody = `
    <p>Hi ${recipientName || 'there'},</p>
    <p>${adminName || 'An administrator'} has removed your access to the presentation "<strong>${presentationTitle}</strong>".</p>
    <p>If you believe this is an error, please contact the presentation owner or your team administrator.</p>
    <p>The CollabSlideSyncAI Team</p>
  `;
  return { subject, htmlBody };
}

