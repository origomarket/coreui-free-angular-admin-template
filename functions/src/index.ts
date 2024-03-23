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
// The Cloud Functions for Firebase SDK to set up triggers and logging.
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";
import {getDailySoldDocumentName, getPreviousDailySold, getSoldsTotal} from "./statistics/statistics";

admin.initializeApp();

exports.computeStatisticsPerSupplier = onSchedule("every 24 hours", async (event) => {
    const suppliersSnapshot = await admin.firestore().collection("suppliers").get();
    // Iterate through each supplier
    suppliersSnapshot.forEach(async (supplierDoc) => {
        const productsSnapshot = await supplierDoc.ref.collection("products").get();

        // Iterate through each product
        productsSnapshot.forEach(async (productDoc) => {
            const today = new Date();
            const dailySoldRef = productDoc.ref.collection("daily_sold").doc(getDailySoldDocumentName(today));
            const [soldProducts, previousDailySold] = await Promise.all([getSoldsTotal(productDoc.ref), getPreviousDailySold(productDoc.ref)]);
            const dailySold = soldProducts - previousDailySold;
            logger.info(`Today ${today.toString()} product ${productDoc.get("name")} sold ${dailySold} times`);
            logger.info(`dailySoldRef is ${dailySoldRef}`);
            // Update daily sold statistic
            await dailySoldRef.set({sold: dailySold}, {merge: true});
        });
    });
});


/**
 * Disable the use until the invitation code is not verified
 */
exports.initializeCustomStatusClaim = beforeUserCreated(async (event) => {
    return {customClaims: {status: "registered"}};
});


/**
 * Create the product in Odoo whenever a new prod is added in firebase
 */
exports.createProduct = onDocumentCreated("/suppliers/{emp_id}/products/{prod_id}",
    (event) => {
    const snapshot = getEventSnapshot(event);
    const data = snapshot.data();
    logger.info("Created in firebase " + JSON.stringify(data));
    listProducts();
    createProduct(data);
});

/**
 * Generates and Send the invitationCode whenever a new entry is created in the invitation collection.
 * Note: we want to create an invitation when we are sure that the user is really who claim to be and is related to the supplier.
 */
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

/**
 * Validates the invitation code sent be the yser
 */
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
        logger.error(`Attempt to register email ${email} with invalid code ${body.invitation_code}`);
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
                logger.error(`Attempt to register email ${email} with valid code ${body.invitation_code} failed because there was the following error updating the user status: ${JSON.stringify(e)}`);
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
        logger.error(error);
        throw error;
    }
    return snapshot;
}
