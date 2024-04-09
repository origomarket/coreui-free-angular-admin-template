import {Pipe, PipeTransform} from '@angular/core';
import {Currency, Product} from "@core/model/product";

@Pipe({
  name: 'currencyIcon'
})
export class CurrencyIconPipe implements PipeTransform {

  private iconsMap: Map<Currency, string> = new Map([
    [Currency.euro, 'cilEuro'],
    [Currency.dollar, 'cilDollar'],
    [Currency.pound, 'cilPound'],
    [Currency.yen, 'cilYen'],
  ]);

  transform(value: Currency, ...args: unknown[]): unknown {
    return this.iconsMap.get(value);
  }

}
