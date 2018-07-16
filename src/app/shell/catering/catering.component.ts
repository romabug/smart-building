
import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';
import { Component, ViewChild } from '@angular/core';

import { AppService } from '../../services/app.service';
import { ICart, ICartItem, ICaterer } from '../../services/data/catering.service';

import * as moment from 'moment';

const CUTOFF = 15 * 60;

@Component({
    selector: 'app-catering',
    templateUrl: './catering.template.html',
    styleUrls: ['./catering.styles.scss'],
    animations: [
        trigger('show', [
            transition(':enter', [style({ opacity: 0 }), animate(300, style({ opacity: 1 }))]),
        ]),
    ],
})
export class CateringComponent {
    public model: any = {};

    constructor(private service: AppService) {
        this.service.Catering.listen('locations', (list) => {
            this.model.locations = list;
            this.model.loc_index = 0;
        });

        this.model.display = {};
    }

    public init() {
        if (this.model.caterer) {
            const now = moment().seconds(0).milliseconds(0);
            const cutoff = moment(now).hours(this.model.caterer.hours.close || 14).minutes(0);
            const date = moment(now).hours(this.model.caterer.hours.open || 9).minutes(0).add(1, 'days');
            if (now.isAfter(cutoff)) {
                date.add(1, 'days');
            }
            this.model.date = date;
            this.model.display.date = date.format('DD/MM/YYYY');
            this.model.display.time = date.format('h:mma');
        }
    }

    public calendar() {
        this.service.Overlay.openModal('Calendar', {
            data: { form: { date: moment(this.model.date).toDate() } },
            width: 21,
        }).then((inst: any) => {
            inst.subscribe((data: any) => {
                if (data.type === 'Date') {
                    const form = data.data.form;
                    const current = moment(this.model.date);
                    const now = moment();
                    const date = moment(form.date).hours(current.hours()).minutes(current.minutes()).seconds(0).milliseconds(0);
                    if (date.isSame(now, 'days') && date.isBefore(now)) {
                        date.hours(now.hours()).minutes(Math.ceil(now.minutes() / 5) * 5);
                    }
                    const check = this.validateTime(date);
                    if (check.valid) {
                        this.model.date = date;
                        this.model.display.date = date.format('DD/MM/YYYY');
                        this.model.display.time = date.format('h:mma');
                    } else {
                        this.service.confirm({
                            title: `Error`,
                            message: check.messages.join('<br>'),
                            icon: 'error',
                            accept: 'Ok',
                            cancel: false,
                        }, (event) => {
                            event.close();
                        });
                    }
                }
                data.close();
            }, (err: any) => { return; }, () => { return; });
        });
    }

    public time() {
        this.service.Overlay.openModal('SimpleTime', {
            data: {
                ios: this.service.iOS,
                start: this.model.date.valueOf(),
            },
            width: 25.2,
        }).then((inst: any) => {
            inst.subscribe((data: any) => {
                if (data.type === 'Time') {
                    const form = data.data.form;
                    const start_time = form.start.getHours() + (Math.floor(form.start.getMinutes() / 5) * 5) / 60;
                    const date = moment(this.model.date).hours(form.start.getHours());
                    date.minutes((Math.floor(form.start.getMinutes() / 5) * 5));
                    const check = this.validateTime(date);
                    if (check.valid) {
                        this.model.date = date;
                        this.model.display.date = date.format('DD/MM/YYYY');
                        this.model.display.time = date.format('h:mma');
                    } else {
                        this.service.confirm({
                            title: `Error`,
                            message: check.messages.join('<br>'),
                            icon: 'error',
                            accept: 'Ok',
                            cancel: false,
                        }, (event) => {
                            event.close();
                        });
                    }
                }
                data.close();
            }, (err: any) => { return; }, () => { return; });
        });
    }

    public order(cart: ICart) {
        const validate_result = this.validateCart(cart);
        if (!validate_result.valid) {
            this.service.confirm({
                title: `Error`,
                message: validate_result.messages.join('<br>'),
                icon: 'error',
                accept: 'Ok',
                cancel: false,
            }, (event) => {
                event.close();
            });
            return;
        }
        const ordered_items: any[] = this.processOrder(cart.items);
        if (ordered_items && ordered_items.length > 0) {
            this.service.Catering.order(this.model.caterer.id, ordered_items, cart.notes, this.model.locations[this.model.loc_index], this.model.date.valueOf())
                .then(() => {
                    this.model.checkout = false;
                    this.model.caterer = null;
                }, (err) => {
                    this.service.confirm({
                        title: `Error`,
                        message: err.message,
                        icon: 'error',
                        accept: 'Ok',
                        cancel: false,
                    }, (event) => {
                        event.close();
                    });
                });
        } else {
            this.service.confirm({
                title: `Error`,
                message: 'No items in the catering order',
                icon: 'error',
                accept: 'Ok',
                cancel: false,
            }, (event) => {
                event.close();
            });
        }
    }

    private processOrder(list: ICartItem[]) {
        const items: any[] = [];
        for (const item of list) {
            items.push({
                id: item.id,
                item_id: item.item.id,
                name: item.item.name,
                quantity: item.quantity,
                price: item.unit_price,
                description: item.details,
                properties: item.extras
            });
        }
        return items;
    }

    private validateCart(cart: ICart) {
        const result = { valid: true, messages: [] };
        const caterer = this.model.caterer as ICaterer;
        const now = moment().seconds(0).milliseconds(0);
        const order_date = moment(this.model.date);
            // Check cart total is valid
        if (caterer.min_cost && cart.total_price < caterer.min_cost) {
            result.valid = false;
            const message = `Orders for ${caterer.name} must be a minimum of $${(caterer.min_cost / 100).toFixed(2)}`;
            result.messages.push(message);
        }
            // Check time is valid
        const validate_date = this.validateTime();
        result.valid = result.valid && validate_date.valid;
        result.messages = result.messages.concat(validate_date.messages);

        let cutoff = moment(order_date);
        let cutoff_item = 'Order';
        const category_cnt: any = {};
            // Check items are valid
        for (const i of cart.items) {
                // Check order time is with item cutoff
            const fixed = i.item.cutoff.fixed || caterer.cutoff.fixed;
            const relative = i.item.cutoff.relative || caterer.cutoff.relative;
            const i_cutoff = moment(order_date);
            if (fixed) {
                i_cutoff.hours(0).minutes(0);
                i_cutoff.add(-fixed, 'seconds');
                if (i_cutoff.isBefore(cutoff)) {
                    cutoff = i_cutoff;
                    cutoff_item = i.item.name;
                }
            } else if (relative) {
                i_cutoff.add(-relative, 'seconds');
                if (i_cutoff.isBefore(cutoff)) {
                    cutoff = i_cutoff;
                    cutoff_item = i.item.name;
                }
            }
                // Check if item meets minimum requirement
            // if (i.item.minimum && i.quantity < i.item.minimum) {
            //     result.valid = false;
            //     const message = `Orders with ${i.item.name}s need a minimum of ${i.item.minimum} ${i.item.name}s`;
            //     result.messages.push(message);
            // }
                // Collect item count for each category
            for (const cat of caterer.options) {
                if (cat.items.indexOf(i.item) >= 0) {
                    if (!category_cnt[cat.id]) {
                        category_cnt[cat.id] = 0;
                    }
                    category_cnt[cat.id] += i.quantity;
                }
            }
        }
            // Check that we are before the cutoff time
        if (now.isAfter(cutoff)) {
            result.valid = false;
            const message = `Order is after the cutoff time for the selected items<br><br>Cutoff time for ${cutoff_item} is ${cutoff.format('DD/MM/YY h:mma')}`;
            result.messages.push(message);
        }
            // Check item category counts
        // for (const id in category_cnt) {
        //     if (category_cnt.hasOwnProperty(id)) {
        //         for (const cat of caterer.options) {
        //             if (`${cat.id}` === `${id}`) {
        //                 if (cat.minimum && category_cnt[id] < cat.minimum) {
        //                     result.valid = false;
        //                     const message = `Orders with only ${cat.name} need a minimum of ${cat.minimum} items from that category`;
        //                     result.messages.push(message);
        //                 }
        //             }
        //         }
        //     }
        // }
        return result;
    }

    private validateTime(date?: any) {
        const result = { valid: true, messages: [] };
        const now = moment().seconds(0).milliseconds(0);
        const cutoff = moment(now).hours(this.model.caterer.hours.close || 14).minutes(0);
        const tomorrow = moment(now).add(1, 'days');
        const order_date = moment(date || this.model.date);
        if (order_date.isBefore(now)) {
            result.valid = false;
            const message = `Orders must be in the future`;
            result.messages.push(message);
        } else if (order_date.isSame(tomorrow, 'days') && now.isAfter(cutoff)) {
            result.valid = false;
            const message = `Orders for tomorrow need to be made before ${cutoff.format('h:mma')}`;
            result.messages.push(message);
        }
        return result;
    }
}
