import {AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {Product} from '@core/model/product';
import {AuthService} from '@core/services/auth.service';
import {ProductsService} from '@core/services/products.service';
import {catchError, combineLatest, debounceTime, map, mergeWith, Observable, of, Subscription, switchMap} from 'rxjs';
import {Router} from "@angular/router";
import {ProductImagesHelperService} from "@features/products/services/product-images-helper.service";
import {AbstractControl, FormGroup} from "@angular/forms";
import {prop, RxFormBuilder} from "@rxweb/reactive-form-validators";
import {QueryFn} from "@angular/fire/compat/firestore";


@Component({
    templateUrl: './products-overview.component.html',
    styleUrls: ['./products-overview.component.scss']
})
export class ProductsOverviewComponent implements OnInit, AfterViewInit, OnDestroy {

    products?: Observable<Product[]>
    subscriptions: Subscription[] = [];
    sortAndFilterForm?: FormGroup;
    private SORT_ASCENDING = {iconName:'cilSortAscending',algoName: "asc"};
    private SORT_DESCENDING = {iconName:'cilSortDescending',algoName: "desc"};
    productsSortOrder: { iconName: string, algoName: string } = this.SORT_ASCENDING;

    constructor(readonly productsService: ProductsService,
                readonly authSvc: AuthService,
                private readonly resizeImageService: ProductImagesHelperService,
                private readonly router: Router,
                private readonly fb: RxFormBuilder,
                private readonly cd: ChangeDetectorRef,) {
    }

    ngAfterViewInit(): void {
        this.cd.detectChanges()
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(s => s.unsubscribe());
    }


    ngOnInit(): void {
        this.sortAndFilterForm = this.fb.formGroup(new SortAndFilterModel());
        this.sortAndFilterForm.enable();
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

    get sortOrderControl(): AbstractControl | null | undefined {
        return this.sortAndFilterForm?.get('sortOrder');
    }
    get sortOrderValue(): string {
        return this.sortOrderControl?.value;
    }

    get sortFieldValue(): SortFields {
        return this.sortAndFilterForm?.get('sortField')?.value;
    }

    private sortAndFilterFunction(criteria?:SortAndFilterModel): QueryFn | undefined {
        if(!criteria) {
            return undefined;
        }

        return ref => {
            let query: firebase.default.firestore.Query = ref;
            if (criteria.filterField !== 'none') {
                query = query.orderBy(criteria.filterField!).startAt(criteria.filterValue).endAt(criteria.filterValue + "\uf8ff");
            } else if (criteria.sortField !== 'none') {
                // Sorting delegated to firebase in case of sorting only otherwise filter + sort is not working
                query = query.orderBy(criteria.sortField!, (criteria.sortOrder as any) ?? 'asc');
            }
            return query;
        };
    }

    private initializeSortAndFilter( ) {

        this.products = this.sortAndFilterForm?.valueChanges.pipe(
            debounceTime(2000),
            mergeWith(of(undefined)),
            switchMap((filterValue:SortAndFilterModel) => {
                const products$ = this.productsService.fetchProducts(
                    this.authSvc.authenticatedUser?.supplierId!,
                    filterValue &&
                    ( filterValue.filterField !== 'none' && filterValue.filterValue && filterValue.filterValue.length >= 3
                        ||
                        filterValue.sortField !== 'none')
                        ? this.sortAndFilterFunction(filterValue)
                        : undefined
                );

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
                this.router.navigateByUrl(`/products/${product.code}`, {
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

    sortProducts() {
        this.productsSortOrder = this.productsSortOrder.iconName === 'cilSortAscending' ? this.SORT_DESCENDING : this.SORT_ASCENDING;
        this.sortOrderControl?.patchValue(this.productsSortOrder.algoName);
    }
}

export class SortAndFilterModel {
    @prop()
    filterField?: FilterFields = "none";
    @prop()
    filterValue?: string;
    @prop()
    sortField?: SortFields = "none";
    @prop()
    sortOrder?: string


}

export type SortFields = "name" | "type" | "unitPrice" | "stock" | "none";

export type FilterFields = "name" | "type" | "code" | "none";