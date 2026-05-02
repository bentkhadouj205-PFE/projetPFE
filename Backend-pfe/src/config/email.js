import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Create transporter using Mailtrap/SMTP settings from .env
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT) || 2525,
    secure: process.env.EMAIL_SECURE === 'true', // false for Mailtrap
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Verify connection configuration
transporter.verify((error, success) => {
    if (error) {
        console.error(' [EMAIL] SMTP Connection Error:', error.message);
    } else {
        console.log(' [EMAIL] SMTP Server is ready for Mailtrap');
    }
});

export default transporter;
