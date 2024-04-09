export class OrigoSupplierUser {
    constructor(
        readonly uid:string,
        readonly name:string,
        readonly surname:string,
        readonly email:string,
        readonly supplier:string,
        readonly supplierId:string,
        public displayName?: string,
        public phoneNumber?: string,
        public photoURL?: string,
        public invitationCode?: string) {}
}