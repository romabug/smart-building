
import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

import { AppService } from '../../../../services/app.service';
import { ICaterer, ICart, ICartItem } from '../../../../services/data/catering.service';

@Component({
    selector: 'checkout',
    templateUrl: './checkout.template.html',
    styleUrls: ['./checkout.styles.scss']
})
export class CheckoutComponent {
    @Input() public cart: ICart = null;
    @Output() public order = new EventEmitter();

    public model: any = {};

    private timers: any = {};

    constructor(private service: AppService) {}

    public removeItem(item: ICartItem) {
        if (item.quantity > 1 && this.cart.items.indexOf(item) >= 0) {
            item.quantity--;
            this.cart.total -= 1;
            this.cart.total_price -= item.unit_price;
        } else if (item.quantity === 1) {
            const found = this.cart.items.splice(this.cart.items.indexOf(item), 1);
            if (found && found.length > 0) {
                this.cart.total -= 1;
                this.cart.total_price -= item.unit_price;
            }
        }
    }

    public placeOrder() {
        this.order.emit(this.cart);
    }

}
