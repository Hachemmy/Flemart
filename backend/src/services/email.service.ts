interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
    // In a real app, this would integrate with an email service like SendGrid, Nodemailer, etc.
    // For now, we'll just log the email
    console.log('Email sent:', {
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
    });
}

export async function sendMotivationEmail(to: string, projectTitle: string): Promise<void> {
    await sendEmail({
        to,
        subject: 'Félicitations pour votre projet!',
        text: `Félicitations! Votre projet "${projectTitle}" a été marqué comme réussi. Continuez le bon travail!`,
        html: `<h2>Félicitations!</h2><p>Votre projet <strong>${projectTitle}</strong> a été marqué comme réussi. Continuez le bon travail!</p>`
    });
}

export async function sendEncouragementEmail(to: string, projectTitle: string): Promise<void> {
    await sendEmail({
        to,
        subject: 'Motivation pour votre projet',
        text: `Continuez le travail sur votre projet "${projectTitle}". Nous vous encourageons à le terminer!`,
        html: `<h2>Continuez!</h2><p>Nous vous encourageons à terminer votre projet <strong>${projectTitle}</strong>.</p>`
    });
}


