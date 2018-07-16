
import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';
import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

import { AppService } from '../../../../services/app.service';
import { ICaterer, ICart, ICateringItem } from '../../../../services/data/catering.service';

@Component({
    selector: 'caterer-order',
    templateUrl: './caterer-order.template.html',
    styleUrls: ['./caterer-order.styles.scss'],
    animations: [
        trigger('show', [
            transition(':enter', [style({ opacity: 0 }), animate(300, style({ opacity: 1 }))]),
            transition(':leave', [style({ opacity: 1 }), animate(300, style({ opacity: 0 }))]),
        ])
    ]
})
export class CatererOrderComponent implements OnChanges {
    @Input() public caterer: ICaterer = null;
    @Input() public cart: ICart = null;
    @Output() public cartChange = new EventEmitter();
    @Output() public checkout = new EventEmitter();

    public model: any = {};

    private timers: any = {};

    constructor(private service: AppService) {
        this.model.list = {};
        this.model.show = {};
    }

    public ngOnChanges(changes: SimpleChanges) {
        if (changes.caterer && this.caterer) {
            for (const cat of this.caterer.options) {
                cat.extra = cat.extra ? `<span class="info">${cat.extra}</span>` : '';
            }
            setTimeout(() => this.newCart(), 50);
        }
    }

    public newCart() {
        this.cart = {
            id: `CART_${Math.floor(Math.random() * 899999 + 100000)}`,
            total: 0,
            total_price: 0,
            items: []
        };
        this.cartChange.emit(this.cart);
    }

    public add(id: string, amount: number) {
        if (!this.model.list[id]) {
            this.model.list[id] = 0;
        }
        this.model.list[id] += amount;
        if (this.model.list[id] < 0) {
            this.model.list[id] = 0;
        } else if (this.model.list[id] > 20) {
            this.model.list[id] = 20;
        }
    }

    public addToProperty(id: string, vid: string | number, amount: number, min: number = 0, max: number = 20) {
        if (!this.model.property[id]) { this.model.property[id] = {}; }
        if (!this.model.property[id][vid]) { this.model.property[id][vid] = 0; }
        this.model.property[id][vid] += (amount || 1);
        if (this.model.property[id][vid] < (min || 0)) {
            this.model.property[id][vid] = (min || 0);
        } else if (this.model.property[id][vid] > (max || 20)) {
            this.model.property[id][vid] = (max || 20);
        }
    }

    public addItem(item: any, quantity: number) {
        this.model.list[item.id] = 0;
        this.cart.total += quantity;
        this.cart.total_price += quantity * item.price;
        let found = false;
        for (const i of this.cart.items) {
            if (i.id === item.id) {
                found = true;
                i.quantity += quantity;
                break;
            }
        }
        if (!found) {
            this.cart.items.push({
                id: item.id,
                item,
                quantity,
                unit_price: item.price,
                extras: []
            });
        }
        this.cartChange.emit(this.cart);
    }

    public customItem(item: ICateringItem) {
        if (item.properties && item.properties.length > 0) {
            this.model.custom = item;
            this.model.property = {};
            for (const i of item.properties) {
                if (i.type === 1) {
                    this.model.property[i.id] = 0;
                    for (const v of i.values) {
                        if (v.default) {
                            this.model.property[i.id] = v.id;
                        }
                    }
                } else if (i.type === 2) {
                    this.model.property[i.id] = {};
                }
            }
        }
    }

    public addCustomItem(item: any, quantity: number) {
        this.model.list[item.id] = 0;
        this.cart.total += quantity;
        let price = item.price;
        for (const p of item.properties) {
            if (p.type === 1 && this.model.property[p.id] !== undefined && this.model.property[p.id] !== null) {
                for (const v of p.values) {
                    if (v.id === this.model.property[p.id]) {
                        if (v.extra_price) {
                            price += v.extra_price;
                            break;
                        }
                    }
                }
            } else if (p.type === 2) {
                for (const v of p.values) {
                    if (this.model.property[p.id][v.id] && this.model.property[p.id][v.id] > 0) {
                        if (v.extra_price) {
                            price += v.extra_price * this.model.property[p.id][v.id];
                            break;
                        }
                    }
                }
            }
        }
        this.cart.total_price += quantity * price;
        this.cart.items.push({
            id: item.id,
            item,
            quantity,
            unit_price: price,
            extras: this.model.property
        });
        this.model.custom = null;
        this.model.property = {};
        this.cartChange.emit(this.cart);
    }

    public setValue(id: number | string, vid: number | string) {
        this.model.property[id] = vid;
    }

}
