import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepperComponent } from './stepper/stepper.component';
import { CdkStepperModule } from '@angular/cdk/stepper'
import { CoreUiDepsModule } from '@coreui-deps/coreui-deps.module';
import { EditBoxComponent } from './form/edit-box/edit-box.component';
import {ReactiveFormsModule} from "@angular/forms";
import {TooltipModule} from "@coreui/angular";
import {RxReactiveFormsModule} from "@rxweb/reactive-form-validators";


/**
 * Origo shared module: Contains all the shared components which unfortunately are not provided with coreui
 * For example the StepperComponent
 */
@NgModule({
  declarations: [
    StepperComponent,
    EditBoxComponent
  ],
  imports: [
    CommonModule,
    CdkStepperModule,
    CoreUiDepsModule,
    ReactiveFormsModule,
    RxReactiveFormsModule,
  ],
  exports: [
    StepperComponent,
    EditBoxComponent,
    CdkStepperModule
  ]
})
export class SharedModule { }
