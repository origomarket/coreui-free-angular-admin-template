import {Component, OnDestroy, OnInit} from '@angular/core';
import {Product} from '@core/model/product';
import {AuthService} from '@core/services/auth.service';
import {ProductsService} from '@core/services/products.service';
import {catchError, combineLatest, debounceTime, map, mergeWith, Observable, of, Subscription, switchMap, timeout} from 'rxjs';
import {Router} from "@angular/router";
import {ProductImagesHelperService} from "@features/products/services/product-images-helper.service";
import {FormGroup} from "@angular/forms";
import {prop, RxFormBuilder} from "@rxweb/reactive-form-validators";
import {AngularFirestore, QueryFn} from "@angular/fire/compat/firestore";


@Component({
    templateUrl: './products-overview.component.html',
    styleUrls: ['./products-overview.component.scss']
})
export class ProductsOverviewComponent implements OnInit, OnDestroy {

    products?: Observable<Product[]>
    subscriptions: Subscription[] = [];
    sortAndFilterForm?: FormGroup;

    constructor(readonly productsService: ProductsService,
                readonly authSvc: AuthService,
                private readonly resizeImageService: ProductImagesHelperService,
                private readonly router: Router,
                private readonly fb: RxFormBuilder,
                private readonly afs: AngularFirestore,) {
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(s => s.unsubscribe());
    }


    ngOnInit(): void {
        this.sortAndFilterForm = this.fb.formGroup(new SortAndFilterModel());
        this.sortAndFilterForm.enable();
        /*this.products = this.productsService.fetchProducts(this.authSvc.authenticatedUser?.supplierId!)
            .pipe(map((products: Product[]) => {
                return products.map(p => this.resizeImageService.resizeProductImages(p));
            }));*/

        this.initializeSortAndFilter();
    }

    get filterControl() {
        return this.sortAndFilterForm?.get('filterValue');
    }

    get sortControl() {
        return this.sortAndFilterForm?.get('sortField');
    }

    get fieldControl() {
        return this.sortAndFilterForm?.get('filterField');
    }

    private sortAndFilterFunction(criteria?:SortAndFilterModel): QueryFn | undefined {
        if(!criteria) {
            return undefined;
        }
        if ( (criteria.filterValue == null || !criteria.filterValue || criteria.filterValue == '') && criteria.filterField) {
            return undefined;
        }

        return ref => {
            let query: firebase.default.firestore.Query = ref;
            if (criteria.filterField) {
                /*
                  The query you're referring to is using Firebase's orderBy, startAt, and endAt methods to perform a range query.
                  This is useful when you want to filter results based on a range of values, not just an exact match.
                  In this case, the query is ordering the results by the filterField, then starting at the filterValue and ending at filterValue + "\uf8ff".
                  The "\uf8ff" is a very high Unicode value which will include all strings that start with filterValue.
                 */
                query = query.orderBy(criteria.filterField).startAt(criteria.filterValue).endAt(criteria.filterValue + "\uf8ff");
            } else if (criteria.sortField) {
                // TODO: sorting non funziona se è gia abnilitato il filtering
                query = query.orderBy(criteria.sortField);
            }
            return query;
        };
}

    private initializeSortAndFilter( ) {



        this.products = this.sortAndFilterForm?.valueChanges.pipe(
            debounceTime(2000),
            mergeWith(of(undefined)),
            switchMap((filterValue:SortAndFilterModel) => {
                const products$ = this.productsService.fetchProducts(this.authSvc.authenticatedUser?.supplierId!, this.sortAndFilterFunction(filterValue))
                return products$.pipe(map((products: any[]) => {
                    return products.map(p => this.resizeImageService.resizeProductImages(p) as Product);
                }));
            })
        )
    }


    clone(product: Product) {
        return JSON.parse(JSON.stringify(product));

    }

    seeDetails(product: Product) {
        let productClone = this.clone(product);
        let resolvedImageUrls;
        if (product.imagesUrl && product.imagesUrl?.length > 0) {
            resolvedImageUrls = combineLatest(product.imagesUrl as Observable<any>[]);
        } else {
            resolvedImageUrls = of([]);
        }
        const subscr = resolvedImageUrls.pipe(catchError((err) => of([]))).subscribe(
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

export class SortAndFilterModel {
    @prop()
    filterField?: SortAndFilterFields;
    @prop()
    filterValue?: string;
    @prop()
    sortField?: SortAndFilterFields;


}

export type SortAndFilterFields = "name" | "type" | "price" | "stock"