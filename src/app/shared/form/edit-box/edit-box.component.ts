import {AfterViewInit, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {firstErrorMessage} from "@shared/utils/reactive-forms-utils";
import {FormControl, FormGroup} from "@angular/forms";
import {Observable} from "rxjs";

@Component({
  selector: 'app-edit-box',
  templateUrl: './edit-box.component.html',
})
export class EditBoxComponent implements OnInit {
  readonly firstErroMessage = firstErrorMessage;

  @Input()
  config?: EditBoxComponentConfig;
  isFileUpload = false;

  constructor() { }

  ngOnInit(): void {
    if(this.config){
      this.isFileUpload = this.config.onSubmitCallback.length > 0;
    }
  }

  onSubmitFormField() {
    if(this.config?.formControl.disabled) {
      this.config?.formControl.enable();
      return;
    }else {
      this.config?.formControl.disable();
      this.config?.onSubmitCallback.apply(this);
    }
  }

  onSubmitFileUpload(event?: any) {
    this.config?.onSubmitCallback.call(this, event);
  }

  get iconAction() {
    if(this.config?.formControl.disabled) {
      return 'cilPencil';
    }else{
      return 'cilSave';
    }
  }

  get tooltip() {
    return this.config?.actionTooltip ?? 'aggiorna campo'
  }


}

export class EditBoxComponentConfig {
  public constructor(
      readonly formGroup: FormGroup,
      readonly formControl: FormControl,
      readonly formControlName: string,
      readonly onSubmitCallback: (event?:any) => void,
      readonly typeIcon?: string,
      readonly placeHolder?: string,
      readonly actionTooltip?: string,
      readonly progressBarPercentage?: Observable<number>,
      public showProgressBar?:boolean) {
  }
}
