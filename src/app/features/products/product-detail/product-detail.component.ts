import {ChangeDetectorRef, Component, OnInit, ViewEncapsulation} from '@angular/core';
import {Router} from "@angular/router";
import {Product, ProductConfiguration} from "@core/model/product";
import {minLength, prop, ReactiveFormConfig, required, RxFormBuilder} from "@rxweb/reactive-form-validators";
import {FormControl, FormGroup} from "@angular/forms";
import {firstErrorMessage} from "@shared/utils/reactive-forms-utils";
import {AuthService} from "@core/services/auth.service";
import {SupplierConfigsService} from "@core/services/supplier-configs.service";
import {OrigoSupplierUser} from "@core/model/OrigoSupplierUser";
import {Colors} from "../../../views/notifications/toasters/toasters.component";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {ProductImagesHelperService} from "@features/products/services/product-images-helper.service";
import {Result, UserActionNotificationService} from "@core/services/user-action-notification.service";
import {EditBoxComponentConfig} from "@shared/form/edit-box/edit-box.component";
import {Observable} from "rxjs";
import {ProductType} from "@core/model/product-type";


@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  encapsulation: ViewEncapsulation.Emulated
})
export class ProductDetailComponent implements OnInit {

  product?: Product;
  productForm?: FormGroup;
  editProductModel?: EditProductModel;
  user: OrigoSupplierUser | undefined = undefined;
  productConfig?: ProductConfiguration;
  firstErroMessage = firstErrorMessage
  stockInfoIndicator: Colors | undefined = undefined;
  codeConfig?: EditBoxComponentConfig;
  descriptionConfig?: EditBoxComponentConfig;
  categories: Observable<any>;
  constructor(private router: Router,
              private readonly fb: RxFormBuilder,
              private readonly authService: AuthService,
              private readonly afs: AngularFirestore,
              private readonly supplierConfigService: SupplierConfigsService,
              private readonly resizeImagesService: ProductImagesHelperService,
              private actionNotificationService: UserActionNotificationService,
              private cd: ChangeDetectorRef) {
    let state = router.getCurrentNavigation()?.extras.state;
    this.product = state?.['product'];
    this.categories = this.afs.collection<{name: string}>('categories').valueChanges();
    ReactiveFormConfig.set({
      "validationMessage": {
        "required": "campo obbligatorio",
        "descriptionMinLength": "La descrizione del prodotto deve contenere almeno 10 caratteri"
      }
    })

  }

  ngOnInit(): void {

    this.editProductModel = Object.assign(new EditProductModel(), {...this.product})
    this.productForm = this.fb.formGroup(this.editProductModel!);
    this.codeConfig = {
      formGroup: this.productForm!,
      formControl: this.codeControl,
      formControlName: "code",
      onSubmitCallback: this.updateCode,
    }
    // let the edit component to enable when needed
    this.codeControl.disable();

    this.descriptionConfig = {
      formGroup: this.productForm!,
      formControl: this.descriptionControl,
      formControlName: "description",
      onSubmitCallback: this.updateDesc,
    }
    // let the edit component to enable when needed
    this.descriptionControl.disable();

    // TODO: code repeated also in create-product.component. Please refactor caching the call in a storage service
    this.authService.userDomainSubscribe(user =>  {
      this.user = user;
      this.supplierConfigService.productConfig(user.supplier).subscribe(config => {
        this.productConfig = config;
        // updated the under stock label stock
        this.updateStock();
      })
    })



  }

  get categoryControl() : FormControl {
    return this.productForm?.get('category') as FormControl;
  }

  get priceControl() : FormControl {
    return this.productForm?.get('unitPrice') as FormControl;
  }


  get stockControl() : FormControl {
    return this.productForm?.get('stock') as FormControl;
  }

  get descriptionControl() : FormControl {
    return this.productForm?.get('description') as FormControl;
  }

  get codeControl() : FormControl {
    return this.productForm?.get('code') as FormControl;
  }

  async updateStock(forceUpdate: boolean = false) {
    if(this.productConfig?.dangerLowStockTreshold && this.stockControl.value < this.productConfig?.dangerLowStockTreshold) {
      this.stockInfoIndicator = Colors.danger;
    }else if(this.productConfig?.dangerLowStockTreshold && this.productConfig?.warningLowStockTreshold &&
        this.stockControl.value >= this.productConfig?.dangerLowStockTreshold && this.stockControl.value <= this.productConfig?.warningLowStockTreshold
    ){
      this.stockInfoIndicator = Colors.warning;
    }else{
      this.stockInfoIndicator = undefined;
    }
    this.cd.detectChanges();
    // Update only if update is requested and price is not in red
    if(forceUpdate && this.stockInfoIndicator !== Colors.danger) {
      await this.updateDocumentField({stock: this.editProductModel?.stock, stockLastUpdateDate: new Date(), stockLastIncrement: this.editProductModel?.stock! - this.product?.stock!});
    }
  }


  private async updateDocumentField(update: Partial<Product>) {
    try {
      const path = `suppliers/${this.user?.supplierId}/products/${this.product?.fsId}`;
      await this.afs.doc<Product>(path).update(update)
      // Note: is needed to don't modify this.product address (i.e. Objet.assign to don't break the carousel)
      Object.getOwnPropertyNames(update).forEach(p => {
        (this.product as any)[p] = (update as any)[p]
      })
      this.actionNotificationService.pushNotification({ message: `Prodotto aggiornato!`, result: Result.SUCCESS, title: 'Gestione Prodotto' })
      this.cd.detectChanges();
    } catch (e) {
       console.log("Failed to updated document " + this.product?.fsId);
      this.actionNotificationService.pushNotification({ message: `Aggiornamento prodotto fallito!`, result: Result.ERROR, title: 'Gestione Prodotto' })
    }
  }

  protected readonly firstErrorMessage = firstErrorMessage;

  adjustUnitPrice = async () => {
    await this.updateDocumentField({unitPrice: this.editProductModel?.unitPrice})
  }

  updateDesc = async () => {
    await this.updateDocumentField({description: this.editProductModel?.description})
  }

  updateCode = async () => {
    await this.updateDocumentField({code: this.editProductModel?.code})
  }

  async updateCategory() {
    if(this.categoryControl) {
      await this.updateDocumentField({type: this.categoryControl.value})
    }
  }
}

export class EditProductModel {
  @prop()
  @required()
  unitPrice?: number;

  @prop()
  @required()
  stock?: number;

  @required({messageKey: 'required'})
  @minLength({value:10, messageKey: 'descriptionMinLength'})
  description?: string

  @required({messageKey: 'required'})
  code?: string

  @required({messageKey: 'required'})
  category?: ProductType;

}