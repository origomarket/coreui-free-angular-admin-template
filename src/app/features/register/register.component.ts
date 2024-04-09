import { Component, OnInit } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { ReactiveFormConfig, RxwebValidators } from '@rxweb/reactive-form-validators';
import { filter, map, Observable } from 'rxjs';
import { OrigoSupplierUser } from 'src/app/core/model/OrigoSupplierUser';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  registerForm: FormGroup;
  registered?: boolean;
  suppliers: {name?: string, id?: string}[] = [];
  readonly NAME_MIN_LENGTH = 2;
  readonly PWD_MIN_LENGTH = 6;
  readonly PWD_MAX_LENGTH = 30; 

  constructor(private fb: FormBuilder, private authSvc: AuthService, private afs: AngularFirestore) {
      let nameMinLenValidator = RxwebValidators.minLength({value: this.NAME_MIN_LENGTH})
      let requiredValidator = RxwebValidators.required();
      this.registerForm = fb.group({
        firstname: ['', [requiredValidator, nameMinLenValidator]],
        secondname: ['', [requiredValidator, nameMinLenValidator]],
        displayName: ['', [requiredValidator, nameMinLenValidator]],
        email: ['', [requiredValidator, RxwebValidators.email()]],
        password: ['', [requiredValidator, RxwebValidators.password({validation: {
          alphabet: true,
          digit: true,
          specialCharacter: true,
          minLength: this.PWD_MIN_LENGTH,
          maxLength: this.PWD_MAX_LENGTH
        }})] ],
        confirmpassword: ['', [requiredValidator, RxwebValidators.compare({fieldName:'password' })]],
        supplier: ['', requiredValidator]
      });
      
      ReactiveFormConfig.set({
        "validationMessage": {
            "minLength" : `Lunghezza minima ${this.NAME_MIN_LENGTH}`,
            "password" : `Almeno ${this.PWD_MIN_LENGTH} caratteri alfanumerici. Almeno un carattere speciale`,
            "compare": `Password e Conferma non sono uguali!`,
            "email": "Formato email non valido",
            "required": "Campo obbligatorio"
        }
      });


      afs.collection<{name?: string}>('suppliers')
          .snapshotChanges()
          .pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data() as {name?: string};
            const id = a.payload.doc.id;
            return { id, ...data };
          })),
          map(_suppliers => _suppliers.filter(this.filterName))
      ).subscribe(suppliers => this.suppliers = suppliers);

  }

  filterName = (value: {name?: string | undefined},index: number): boolean => {
    return !!value.name
  }

  getControlErrors(name: string): ValidationErrors | null {
    return this.registerForm.controls[name].errors
  }

  getCntrolErroMessage(control: string) {
    let valErr = this.getControlErrors(control);
    let errMsg = ''
    if(valErr) {
      errMsg = Object.values(valErr).map(err => err.message).join()
    }
    return errMsg;  
  }


  ngOnInit(): void {
  }

  onSubmitCredentials() {
    let user: Partial<OrigoSupplierUser> = {
      displayName: this.registerForm.controls['displayName'].value,
      name: this.registerForm.controls['firstname'].value,
      surname: this.registerForm.controls['secondname'].value,
      email: this.registerForm.controls['email'].value,
      supplier: this.registerForm.controls['supplier'].value,
      supplierId: this.suppliers.find(s => s.name === this.registerForm.controls['supplier'].value)?.id
    }

    this.authSvc.signUp(user, this.registerForm.controls['password'].value)
    .then( (errorMsg) => {
      if(!errorMsg) {
        this.registered = true;
      }else{
        this.registered = false;
        console.log(errorMsg);
      }
      this.registerForm.reset();
    })
  }

}
