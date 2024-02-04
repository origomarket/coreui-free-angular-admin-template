/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {
    onDocumentCreated,
} from "firebase-functions/v2/firestore";
import {createProduct, listProducts} from "./odoo/products-api";

exports.createProduct = onDocumentCreated("/suppliers/{emp_id}/products/{prod_id}",
    (event) => {
    // Get an object representing the document
    // e.g. {'name': 'Marie', 'age': 66}
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const data = snapshot.data();
    console.log("Created in firebase " + JSON.stringify(data));
    listProducts();
    createProduct(data);
});
