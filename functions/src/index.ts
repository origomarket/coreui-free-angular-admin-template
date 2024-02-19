/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {
    FirestoreEvent,
    onDocumentCreated,
} from "firebase-functions/v2/firestore";
import {createProduct, listProducts} from "./odoo/products-api";

import {
    beforeUserCreated, beforeUserSignedIn, // HttpsError,
} from "firebase-functions/v2/identity";
import {generateInvitationCode, sendInvitationEmail} from "./admin/invitation-code-generation";
import admin = require("firebase-admin");
import {firestore} from "firebase-admin";
import QueryDocumentSnapshot = firestore.QueryDocumentSnapshot;
import {ParamsOf} from "firebase-functions/lib/common/params";
// import {getAuth} from "firebase-admin/lib/auth";

admin.initializeApp();

/**
 * Disable the use until the invitation code is not verified
 */
exports.validateInvitationCode = beforeUserCreated(async (event) => {
    return {customClaims: {status: "registered"}};
});

/**
 * Function to validate the invitation code at registration time.
 * If the code is valid for the email the records from "invitations" are deleted and the registration proceed
 * otherwise an error is thrown
 */
exports.validateInvitationCode = beforeUserSignedIn(async (event) => {

    /*     const email = event.data.email;
        const uid = event.auth ? event.auth.uid : undefined;
        if ( !uid ) {
            throw new HttpsError("permission-denied", "Uid undefined at login time!");
        }
        const domainUser = await admin.firestore().collection("users").doc(uid).get();
        const code = domainUser.data()!.invitationCode;
        const snapshot = await admin.firestore().collection("invitations")
            .where("email", "==", email)
            .where("invitationCode", "==", code)
            .get();
        if (snapshot.empty) {
            console.log(`Attempt to register email ${email} with invalid code ${code}`);
            throw new HttpsError("permission-denied", "You tried to register with a code or an invalid email!");
        } else {
            // Delete all the matching documents
            snapshot.docs.forEach( doc => {
                admin.firestore().collection("invitations").doc(doc.id).delete();
            });
        }
        // Re-enable the user after code verification
        return {disabled: false};*/
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
            await sendInvitationEmail(code, invitationData.email);
            const invitationDataUpdate = {
                ...invitationData,
                invitationCode: code,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
            };
            await admin.firestore().collection("invitations").doc(invitationId).update(invitationDataUpdate);
        } catch (e) {
            console.log(`Failed to send email to  ${invitationData.email} or to update the invitation with error ${JSON.stringify(e)}. Please delete the add it again in order to retry`);
        }
    });

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
