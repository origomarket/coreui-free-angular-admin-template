import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {ReactiveFormConfig, RxwebValidators} from '@rxweb/reactive-form-validators';
import {AuthService} from '@core/services/auth.service';
import {firstErrorMessage} from "@shared/utils/reactive-forms-utils";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {

  public readonly firstErroMessage = firstErrorMessage;

  loginForm: FormGroup;

  constructor(private formBuilder: FormBuilder, private authService: AuthService, private router: Router) { 
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, RxwebValidators.email()]],
      password: ['', Validators.required]
    });
    ReactiveFormConfig.set({
      "validationMessage": {
          "email": "Invalid email format",
      }
    });
  }

  ngOnInit(): void {
    this.loginForm.reset();
  }

  get email() : FormControl {
    return this.loginForm?.get('email') as FormControl;
  }

  get password() : FormControl {
    return this.loginForm?.get('password') as FormControl;
  }
  async onSubmitCredentials() {
    let error = await this.authService.signIn(this.email.value, this.password.value)
    this.loginForm.reset();
    !!error ? window.alert(`Login failed with ${error} check your credentials and retry`) : this.router.navigateByUrl('')

  }

  register() {
    this.router.navigateByUrl("register");
  }

}
