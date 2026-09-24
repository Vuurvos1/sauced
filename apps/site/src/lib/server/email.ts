import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

type EmailParams = {
	email: string;
	subject: string;
	htmlContent: string;
};

export async function sendEmailVerificationEmail(email: string, url: string) {
	const htmlContent = `
	<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
		<h1>Email Verification</h1>
		<p>Thank you for taking the time to verify your email address. Click the link below to verify:</p>
		<p>
			<a href="${url}" style="color: #337ab7; text-decoration: none;">Verify your email</a>
		</p>
		<p>If you did not request this verification, please ignore this email.</p>
	</div>
	`;
	return sendEmail({
		email,
		subject: 'Verify your email',
		htmlContent
	});
}

export const sendPasswordResetEmail = async (email: string, url: string) => {
	const htmlContent = `
	<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
		<h1>Password Reset Request</h1>
		<p>We've received a request to reset your password. If you didn't make the request, just ignore this email. Otherwise, you can reset your password using the link below.</p>

		<p>
		<a href="${url}" style="color: #337ab7; text-decoration: none;">Reset your password</a>
		</p>

		<p>If you need help or have any questions, please contact our support team.</p>
	</div>
	`;

	return sendEmail({
		email,
		subject: 'Password Reset Request',
		htmlContent
	});
};

export async function sendEmail({ email, subject, htmlContent }: EmailParams) {
	const { error } = await resend.emails.send({
		from: 'Sauced <onboarding@resend.dev>',
		to: [email],
		subject,
		html: htmlContent
	});

	if (error) {
		console.error({ error });
		return { success: false, message: `Failed to send email: ${error.message}` };
	}

	return {
		success: true,
		message: `An email has been sent to ${email} with the subject: ${subject}.`
	};
}
