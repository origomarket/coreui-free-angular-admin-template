import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {getDownloadURL} from '@angular/fire/storage';
import {FormControl, FormGroup, ValidationErrors} from '@angular/forms';
import {Result, UserActionNotificationService} from '@core/services/user-action-notification.service';

import {alphaNumeric, image, mask, ReactiveFormConfig, required, RxFormBuilder} from '@rxweb/reactive-form-validators';
import {combineLatest, concatMap, map, ObservableInput, of, tap} from 'rxjs';
import {Observable} from 'rxjs/internal/Observable';
import {OrigoSupplierUser} from 'src/app/core/model/OrigoSupplierUser';
import {AuthService} from 'src/app/core/services/auth.service';
import {StorageService} from 'src/app/core/services/storage.service';
import {firstErrorMessage} from "@shared/utils/reactive-forms-utils";
import {EditBoxComponentConfig} from "@shared/form/edit-box/edit-box.component";
import {CountdownService} from "@core/services/countdown.service";


@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})
export class EditComponent implements OnInit {
  readonly PHONE_UPDATE_ERROR = `Phone number update failed with error: `;

  formGroup!: FormGroup;
  user: OrigoSupplierUser | null = null;
  verificationPhoneId: string = '';
  updateSuccess = false;
  uploadProgress: Observable<number> = new Observable();
  countDown: Observable<number> | null = null;
  enrolled: boolean = false;

  //Form fields configurations
  displayNameConfig?: EditBoxComponentConfig;
  profilePhotoConfig?: EditBoxComponentConfig;
  phoneNumberConfig?: EditBoxComponentConfig;
  otpConfig?: EditBoxComponentConfig;
  invitationCodeConfig?: EditBoxComponentConfig;

  constructor(
    private formBuilder: RxFormBuilder,
    private authService: AuthService,
    private cd: ChangeDetectorRef,
    private storageService: StorageService,
    private profileNotificationService: UserActionNotificationService,
    readonly countdownSvc: CountdownService) {
    this.createForm();
  }


  ngOnInit(): void {
    this.initForm();
  }

  createForm() {
    this.formGroup = this.formBuilder.formGroup(new ProfileEditFormModel);
    ReactiveFormConfig.set({
      "validationMessage": {
        "displayName-invalid": "displayName must be alphanumeric",
        "phone-invalid": "phone number not valid",
        "otp-invalid": "otp code invalid",
        "displayName-required": "display name cannot be empty",
        "photo-invalid": "photo should be smaller tha 100x100 px",
        "notYetEnrolled": "please enter the invitation code to start using the app"
      }
    })
  }

  initForm() {
    this.updateStausOnInvitationCode();
    this.authService.userDomainSubscribe(user => {
      if (!!user) {
        this.user = user;
        this.displayNameControl.setValue(user.displayName);
        this.phoneControl.setValue(user.phoneNumber);
        this.invitationCodeControl.setErrors({notYetEnrolled: true});
        this.invitationCodeControl.markAsTouched();

        // Initialize the edit-box component for each field
        this.invitationCodeConfig = {
          formGroup: this.formGroup,
          formControl: this.invitationCodeControl,
          formControlName: "invitationCode",
          typeIcon: "cilLockLocked",
          onSubmitCallback: this.submitInvitationCode,
          placeHolder: "invitation code",
          actionTooltip: "inserisci l'invitation code recevuto via email",
        }

         this.displayNameConfig = {
          formGroup: this.formGroup,
          formControl: this.displayNameControl,
          formControlName: "displayName",
          typeIcon: "cilUser",
          onSubmitCallback: this.submitDisplayNameUpdate,
          placeHolder: "nick name",
          actionTooltip: "aggiorna il tuo nickname",
        }
        this.profilePhotoConfig = {
          formGroup: this.formGroup,
          formControl: this.profilePhotoControl,
          formControlName: "profilePhoto",
          typeIcon: "cilImage",
          onSubmitCallback: this.onProfilePhotoSelected,
          placeHolder: "foto del profilo",
          actionTooltip: "carica la tua foto",
          progressBarPercentage: this.uploadProgress,
          showProgressBar: false // note: initialized to false, but need to be set to true in this component while you want to show the bar
        }

        this.phoneNumberConfig = {
          formGroup: this.formGroup,
          formControl: this.phoneControl,
          formControlName: "phone",
          typeIcon: "cilPhone",
          onSubmitCallback: this.startPhonNumberVerification,
          placeHolder: "numero di telefono",
          actionTooltip: "inserisci e verifica il tuo telefono",
        }

        this.otpConfig = {
          formGroup: this.formGroup,
          formControl: this.otpControl,
          formControlName: "otp",
          typeIcon: "cilPhone",
          onSubmitCallback: this.updatePhoneNumber,
          placeHolder: "codice ricevuto via sms",
          actionTooltip: "conferma",
        }

        this.formGroup.disable();

      }


    })
  }

  private updateStausOnInvitationCode() {
    this.authService.isUserEnrolled().then(enrolled => {
      if(enrolled){
        this.enrolled = true;
        this.invitationCodeControl.setErrors(null);
      }
    });
  }

  submitDisplayNameUpdate = async () => {
    await this.submitFieldUpdate(this.displayNameControl,
        (uUpdate) => {
                    uUpdate.displayName = this.displayNameControl.value;
                    return uUpdate;
    })
  }

  /**
   *  Generic uppdate field utility
   * @param formControl form control
   * @param updateField function to update the partial model to p ush oon firestore
   * @private
   */
  private async submitFieldUpdate(formControl: FormControl, updateField: (update : Partial<OrigoSupplierUser>) => Partial<OrigoSupplierUser>) {
    formControl.disable();
    let userUpdate: Partial<OrigoSupplierUser> = {}
    userUpdate = updateField.call(this, userUpdate);
    let result = await this.authService.updateDomainUser2(userUpdate);
    this.updateSuccess = result[0];
    this.updateSuccess ? this.profileNotificationService.pushNotification({ message: `Profilo aggiornato con successo!`, result: Result.SUCCESS }) : this.profileNotificationService.pushNotification({ message: `Profile update failed!`, result: Result.ERROR });
  }

  submitInvitationCode = async () => {
    let result = await this.authService.submitInvitationCode(this.invitationCodeControl.value);
    let notificationContent: {message: string, result: Result};
    if(result){
      notificationContent = { message: `Congratulazioni: Profilo attivato con successo!`, result : Result.SUCCESS };
      this.enrolled = true;
    }else{
      notificationContent = { message: `Attivazione del profilo fallita!`, result : Result.ERROR };
    }
    this.profileNotificationService.pushNotification(notificationContent);
  }

  startPhonNumberVerification = ()=> {
    let phoneChanged = !!this.user && this.phoneControl.value !== this.user.phoneNumber
    console.log('phonechanged = ' + phoneChanged)
    if (phoneChanged) {
      this.otpControl.enable({ onlySelf: true, emitEvent: false });

      let phone = `+${this.phoneControl.value}`;
      this.countDown = this.countdownSvc.countDown(() => {
        this.otpControl.disable({ onlySelf: true, emitEvent: false });
        this.countDown = null;
        this.verificationPhoneId = '';
        this.authService.clearRecaptcha();
      },200);

      this.authService.verifyPhoneWithRecaptcha('recaptcha', phone).then(
        (vId) => {
          console.log("verification id is " + vId);
          this.verificationPhoneId = vId;
          this.cd.detectChanges();
        },
        (e) => {
          this.profileNotificationService.pushNotification({ message: this.PHONE_UPDATE_ERROR + e, result: Result.ERROR });
          this.authService.clearRecaptcha();
          this.verificationPhoneId = '';
          //console.log("Phone number update failed with "+ e) 
        }).catch(e => this.profileNotificationService.pushNotification({ message: this.PHONE_UPDATE_ERROR + e, result: Result.ERROR }));
    }
  }
  updatePhoneNumber = async () => {
    let otpValue = this.otpControl.value;
    let phoneControl = this.phoneControl;
    if (otpValue.length === 6) {
      try {
        await this.authService.updatePhoneNUmber(phoneControl.value, otpValue, this.verificationPhoneId);
        this.profileNotificationService.pushNotification({ message: "telefono aggiornato", result: Result.SUCCESS });
      } catch (e) {
        console.log(`error while updating phone number - ${e}`);
        this.profileNotificationService.pushNotification({ message: this.PHONE_UPDATE_ERROR + e, result: Result.ERROR });
      }finally {
        this.verificationPhoneId = '';
        this.countDown = null;
        this.formGroup.enable();
        this.cd.detectChanges();
        }
    }
  }

  getControlErrors(name: string): ValidationErrors | null {
    return this.formGroup.controls[name].errors
  }


  onProfilePhotoSelected = (event: any) => {
    const file: File = event.target.files[0];

    if (file) {
      let progress = this.storageService.uploadImage(`users/${this.user?.uid}/images/profile`, file);
      this.uploadProgress = progress[0];

      progress[1].pipe(tap(async value => {
        if (value.state === 'success' && value.totalBytes === value.bytesTransferred) {
          //this.profileImageUrl = getDownloadURL(value.ref);

          if (this.profilePhotoControl.value) {
            const photoURL = await getDownloadURL(value.ref);
            await this.submitFieldUpdate(this.profilePhotoControl,
                (uUpdate) => {
                  uUpdate.photoURL = photoURL;
                  return uUpdate;
                })
          }
          this.profilePhotoConfig!.showProgressBar = false;
        } else {
          this.profilePhotoConfig!.showProgressBar = true;
        }
      })).subscribe();

      this.profilePhotoControl.setValue(file.name);
    }
  }

  get invitationCodeControl() : FormControl {
    return this.formGroup?.get('invitationCode') as FormControl;
  }

  get displayNameControl() : FormControl {
    return this.formGroup?.get('displayName') as FormControl;
  }

  get profilePhotoControl() : FormControl {
    return this.formGroup?.get('profilePhoto') as FormControl;
  }

  get phoneControl() : FormControl {
    return this.formGroup?.get('phone') as FormControl;
  }

  get otpControl() : FormControl {
    return this.formGroup?.get('otp') as FormControl;
  }


}

class ProfileEditFormModel {
  @required({ messageKey: 'displayName-required' })
  @alphaNumeric({ messageKey: 'displayName-invalid' })
  public displayName: string = '';
  @mask({ mask: "(+99)(999)(9999999)", minLength: 12, messageKey: 'phone-invalid' }) public phone: string = '';
  @mask({ mask: "9.9.9.9.9.9", messageKey: 'otp-invalid' }) public otp: string = '';
  //@url() 
  @image({ maxHeight: 48, maxWidth: 48, messageKey: 'photo-invalid' })
  public profilePhoto = ''
  @required({messageKey: 'notYetEnrolled'})
  invitationCode?: string;
}

export class SupplierView {
  constructor(public readonly name: string, public readonly id: string){}
}

