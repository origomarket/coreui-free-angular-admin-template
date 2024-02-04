/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as logger from "firebase-functions/logger";
import * as xmlrpc from "xmlrpc";
import {firestore} from "firebase-admin";
import DocumentData = firestore.DocumentData;

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

const url = "http://www.origo.market/xmlrpc/2";
const db = "magma-main-10636721";
const username = "admin@origo.market";
const password = "e6324e65551fa9b7467e165658c05f07a558ce14";
const model = "product.product";
let authId: any | undefined = undefined;
let objectClient: xmlrpc.Client | undefined = undefined;

export const authenticate = () => {
    const commonClient = xmlrpc.createClient(`${url}/common`);
    if (objectClient && authId) {
        logger.info("Alread authenticated with uid " + authId);
        return;
    }
    commonClient.methodCall(
        "authenticate", [db, username, password, {}], (error, uid)=> {
        if (error || !uid) {
            logger.error("Error authenticating with Odoo:", error);
            // response.status(500).send('Error authenticating with Odoo');
            authId = undefined;
            objectClient = undefined;
            return;
        } else {
            authId = uid;
            objectClient = xmlrpc.createClient(`${url}/object`);
        }
    });
};

export const listProducts = ()=> {
    const method = "search_read";
    const args: any[] = [];
    const options = ["name", "list_price"];
    authenticate();
    if (objectClient && authId) {
        objectClient.methodCall(
            "execute_kw",
            [db, authId, password, model, method, [args],
                {fields: options}],
            (error, value) => {
            if (error) {
                logger.error("Error fetching products from Odoo:", error);
            } else {
                logger.info("Origo products are " + JSON.stringify(value));
            }
        });
    }
};

export const createProduct = (p: DocumentData) => {
    authenticate();
    const odooProduct = Object.assign({}, {name: p.name, list_price: p.unitPrice});
    if (objectClient && authId) {
        // Create a new product
        objectClient.methodCall("execute_kw", [db, authId, password, model, "create", [odooProduct]], (err, res) => {
            if (err) {
                console.error("Create product error in Odoo:", err);
            } else {
                console.log("Product created successfully in Odoo. Product ID:", res);
            }
        });
    }
};

