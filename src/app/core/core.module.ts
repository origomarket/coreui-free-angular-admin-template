import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseDatePipe } from './pipes/firebase-date.pipe';
import { ProductIconPipe } from './pipes/product-icon.pipe';
import { CurrencyIconPipe } from './pipes/currency-icon.pipe';



/**
 * Origo core module: contains all the model and services that can be potentially used by any feature
 * for example firebase services, or global notification services (see user-action-notification.service.ts)
 */
@NgModule({
  declarations: [
    FirebaseDatePipe,
    ProductIconPipe,
    CurrencyIconPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
      FirebaseDatePipe,
      ProductIconPipe,
      CurrencyIconPipe
  ]
})
export class CoreModule { }
