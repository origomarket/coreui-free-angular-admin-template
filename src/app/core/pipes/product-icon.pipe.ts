import {Pipe, PipeTransform} from '@angular/core';
import {ProductType} from "@core/model/product-type";

@Pipe({
  name: 'productIcon'
})
export class ProductIconPipe implements PipeTransform {

  private iconsMap: Map<ProductType, string> = new Map([
      [ProductType.vino, 'cilDrinkAlcohol'],
      [ProductType.verdure, 'cilFlower'],
      [ProductType.cibo, 'cilDinner'],
  ]);

transform(value: ProductType, ...args: unknown[]): string | undefined {
    return this.iconsMap.get(value);
  }

}

