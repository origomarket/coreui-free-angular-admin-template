/**
 * Get the total sold from the product document
 * @param productRef
 */
export const getSoldsTotal = async (productRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>)=> {
    const productSnapshot = await productRef.get();
    return productSnapshot.exists ? getNumericValue(productSnapshot.data()?.sold) : 0;
}

/**
 * get the previous day sold from the previous day document in the daily sold collection
 * @param productRef
 */
export const getPreviousDailySold = async (productRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>)=> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayDateString = getDailySoldDocumentName(yesterday);

    const yesterdayDailySoldSnapshot = await productRef.collection("daily_sold").doc(yesterdayDateString).get();
    return yesterdayDailySoldSnapshot.exists ? getNumericValue(yesterdayDailySoldSnapshot.data()?.sold): 0;
}

/**
 *
 */
export function getDailySoldDocumentName(date: Date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

/**
 *
 * @param val
 */
function getNumericValue(val: string | undefined): number {
    return val && !isNaN(+val) ? +val : 0;
}
