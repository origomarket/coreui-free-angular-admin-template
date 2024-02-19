// const functions = require('firebase-functions');
// const admin = require('firebase-admin');

import nodemailer = require("nodemailer");

const skipEmailSend = true;
// Function to generate a random alphanumeric code
export const generateInvitationCode = (length: number) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Function to send email with the invitation code
export const sendInvitationEmail = async (email: string, code: string) => {
    if (skipEmailSend) {
        return Promise.resolve();
    }
    const transporter = nodemailer.createTransport({
        // Configure your email service here (e.g., Gmail, SendGrid)
    });

    const mailOptions = {
        from: "your@email.com",
        to: email,
        subject: "Invitation Code for Registration",
        text: `Your invitation code for registration: ${code}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Invitation email sent successfully.");
    } catch (error) {
        console.error("Error sending invitation email:", error);
    }
}

// HTTP Cloud Function to create an invitation code
/* exports.createInvitationCode = functions.https.onRequest(async (req, res) => {
    // Validate request method
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    // Verify Firebase Auth token
    try {
        const decodedToken = await admin.auth().verifyIdToken(req.headers.authorization);
        if (!decodedToken.admin) {
            res.status(403).send('Forbidden');
            return;
        }
    } catch (error) {
        console.error('Error verifying Firebase Auth token:', error);
        res.status(403).send('Forbidden');
        return;
    }

    // Get email from request body
    const { email } = req.body;
    if (!email) {
        res.status(400).send('Bad Request: Email is required');
        return;
    }

    // Generate invitation code
    const code = generateInvitationCode(8);

    try {
        // Store invitation code in Firestore
        await admin.firestore().collection('invitationCodes').doc(code).set({ email });

        // Send invitation email
        await sendInvitationEmail(email, code);

        res.status(200).send('Invitation code created successfully');
    } catch (error) {
        console.error('Error creating invitation code:', error);
        res.status(500).send('Internal Server Error');
    }
}); */
