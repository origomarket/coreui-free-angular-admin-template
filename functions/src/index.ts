/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {FirestoreEvent, onDocumentCreated} from "firebase-functions/v2/firestore";
import {createProduct, listProducts} from "./odoo/products-api";

import {beforeUserCreated} from "firebase-functions/v2/identity";
import {generateInvitationCode, sendInvitationEmail} from "./admin/invitation-code-generation";
import {firestore} from "firebase-admin";
import {ParamsOf} from "firebase-functions/lib/common/params";
import admin = require("firebase-admin");
import QueryDocumentSnapshot = firestore.QueryDocumentSnapshot;
import functions = require("firebase-functions");
import cors = require("cors");

admin.initializeApp();

/**
 * Disable the use until the invitation code is not verified
 */
exports.initializeCustomStatusClaim = beforeUserCreated(async (event) => {
    return {customClaims: {status: "registered"}};
});


exports.createProduct = onDocumentCreated("/suppliers/{emp_id}/products/{prod_id}",
    (event) => {
    const snapshot = getEventSnapshot(event);
    const data = snapshot.data();
    console.log("Created in firebase " + JSON.stringify(data));
    listProducts();
    createProduct(data);
});


exports.sendInvitation = onDocumentCreated("/invitations/{invitation_id}",
    async (event) => {
        const snapshot = getEventSnapshot(event);
        const invitationId = event.params.invitation_id;
        const invitationData = snapshot.data();
        const code = generateInvitationCode(8);
        try {
            await sendInvitationEmail(invitationData.email, code);
            const invitationDataUpdate = {
                ...invitationData,
                invitationCode: code,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                status: "pending",
            };
            await admin.firestore().collection("invitations").doc(invitationId).update(invitationDataUpdate);
        } catch (e) {
            console.log(`Failed to send email to  ${invitationData.email} or to update the invitation with error ${JSON.stringify(e)}. Please delete the add it again in order to retry`);
        }
    });

exports.validateUser = functions.https.onRequest(async (req, res) => {
    // Allow all origin. Pls set the array of allowed origins once done with dev
    cors({origin: true})(req, res, async () => {
        // Allow CORS
        // res.set("Access-Control-Allow-Origin", "*");
        if (req.method === "POST" && req.headers["content-type"]?.toLowerCase() === "application/json") {
            const valid = await validateInvitationCode(req);
            res.status( valid ? 200 : 403).send({message: valid ? "enrollment ok" : "enrollment failed"});
        } else {
            res.status(400).send("Invalid method or content-type");
        }
    });
});

/**
 * Validates the invitation code sent be the yser. If the code associated to the email  is valid, the status of the user is set to enrolled both in
 * invitations collection and in authentication
 * @param req the http request - must be a post with the invitationCode
 */
async function validateInvitationCode(req: functions.https.Request): Promise<boolean> {
    const body = req.body;
    // Verify Firebase ID token
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
        return false;
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;
    const snapshot = await admin.firestore().collection("invitations")
        .where("email", "==", email)
        .where("invitationCode", "==", body.invitation_code)
        .get();
    if (snapshot.empty) {
        console.log(`ERROR - Attempt to register email ${email} with invalid code ${body.invitation_code}`);
        return false;
    } else {
        // Update the status to enrolled in the related invitation collection
        for (let i = 0; i < snapshot.docs.length; i++) {
            try {
                await admin.firestore().collection("invitations")
                    .doc(snapshot.docs[i].id)
                    .update("status", "enrolled");
                await admin.auth().setCustomUserClaims(decodedToken.uid, {status: "enrolled"});
            } catch (e) {
                console.log(`ERROR - Attempt to register email ${email} with valid code ${body.invitation_code} failed because there was the following error updating the user status: ${JSON.stringify(e)}`);
                return false;
            }
        }
        return true;
    }
}


/**
 *
 * @param event
 */
function getEventSnapshot(event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<string>>) {
    const snapshot = event.data;
    if (!snapshot) {
        const error = `No data associated with the event ${JSON.stringify(event)}`;
        console.log(error);
        throw error;
    }
    return snapshot;
}
