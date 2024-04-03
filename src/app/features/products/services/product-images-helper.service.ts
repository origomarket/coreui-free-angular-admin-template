import { Injectable } from '@angular/core';
import {ResizeImagesService} from "@core/services/resize-images.service";
import {Product} from "@core/model/product";
import {catchError, mergeMap, Observable, of} from "rxjs";
import {fromPromise} from "rxjs/internal/observable/innerFrom";
import {SafeUrl} from "@angular/platform-browser";

@Injectable({
  providedIn: 'root'
})
export class ProductImagesHelperService {


  constructor(private readonly resizeImageService: ResizeImagesService) {
  }

  resizeProductImages(p: Product): Product {
    let defaultImage = of('assets/img/brand/origo.svg');
    let productResizedImages = p.imagesUrl?.map((image,i) => {
      return fromPromise(this.createFileFromURL(image, `img-${p.name}-${i}`)).pipe(
          mergeMap(file => !!file ? this.resizeImageService.resizeImage2(file, 399, 122, 200, 80).pipe(
              catchError(error => {
                console.error('Error resizing image:', error);
                return defaultImage;
              })
          ) : defaultImage)
      );
    });
    if(productResizedImages && productResizedImages?.length <= 0) {
      // if no images available display at least the default image
      productResizedImages?.push(defaultImage)
    }
    return Object.assign(p, { imagesUrl: productResizedImages})
  }

  async createFileFromURL(url: string, filename: string): Promise<File | undefined> {
    try {
      let response = await fetch(url);
      let blob = await response.blob();
      const file = new File([blob], filename);
      return file;
    }catch(e){
      console.error('Error creating image file from URL:', e);
    }
    return undefined;
  }
}