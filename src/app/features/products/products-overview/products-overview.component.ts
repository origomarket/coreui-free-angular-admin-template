import {Component, OnDestroy, OnInit} from '@angular/core';
import {Product} from '@core/model/product';
import {AuthService} from '@core/services/auth.service';
import {ProductsService} from '@core/services/products.service';
import {catchError, combineLatest, map, Observable, of, Subscription} from 'rxjs';
import {Router} from "@angular/router";
import {ProductImagesHelperService} from "@features/products/services/product-images-helper.service";


@Component({
  templateUrl: './products-overview.component.html',
  styleUrls: ['./products-overview.component.scss']
})
export class ProductsOverviewComponent implements OnInit, OnDestroy {

  products?: Observable<Product[]>
  subscriptions: Subscription[] = [];

  constructor(readonly productsService: ProductsService,
     readonly authSvc: AuthService,
      private readonly resizeImageService: ProductImagesHelperService,
      private readonly router: Router) { }

  ngOnDestroy(): void {
        this.subscriptions.forEach(s => s.unsubscribe());
  }

  ngOnInit(): void {
    this.products = this.productsService.fetchProducts(this.authSvc.authenticatedUser?.supplierId!)
    .pipe(map((products:Product[]) => {
      return products.map( p => this.resizeImageService.resizeProductImages(p))
    }));
  }





  clone(product: Product) {
    return JSON.parse(JSON.stringify(product));

  }

  seeDetails(product: Product) {
    let productClone = this.clone(product);
    let resolvedImageUrls;
    if( product.imagesUrl && product.imagesUrl?.length > 0) {
        resolvedImageUrls = combineLatest(product.imagesUrl as Observable<any>[]);
    }else{
        resolvedImageUrls = of([]);
    }
    const subscr = resolvedImageUrls.pipe(catchError((err) => of([]) ) ).subscribe(
        (results: any[]) => {
          // 'results' will contain the last emitted value from each Observable in the array
          console.log('All observables have completed:', results);
          // You can perform actions with the resolved values here
          productClone.imagesUrl = results;
          this.router.navigateByUrl(`/products/detail/${product.code}`, {
            state: {
                'product': productClone
            }
          }).then();
        },
        (error) => {
          // Handle errors if any of the Observables fail
          console.error('One or more observables encountered an error:', error);
        }
    );
    this.subscriptions.push(subscr);
  }
}
