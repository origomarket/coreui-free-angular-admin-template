import { Injectable } from '@angular/core';
import {ResizeImagesService} from "@core/services/resize-images.service";
import {Product} from "@core/model/product";
import {mergeMap, of} from "rxjs";
import {fromPromise} from "rxjs/internal/observable/innerFrom";

@Injectable({
  providedIn: 'root'
})
export class ProductImagesHelperService {

  constructor(private readonly resizeImageService: ResizeImagesService) { }

  resizeProductImages(p: Product): Product {
    let defaultImage = of('assets/img/avatars/1.jpg');
    let productResizedImages = p.imagesUrl?.map((image,i) => {
      return fromPromise( this.createFileFromURL(image, `img-${p.name}-${i}`))
          .pipe(
              mergeMap(file => !!file ? this.resizeImageService.resizeImage2(file, 100, 200, 100, 200) : defaultImage)
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
      console.error('Error creating iamge file from URL:', e);
    }
    return undefined;
  }


}
