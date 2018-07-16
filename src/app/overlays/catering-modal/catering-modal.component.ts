import { OverlayContentComponent } from '@acaprojects/ngx-widgets';
import { Component, ElementRef, QueryList, ViewChild, ViewChildren } from '@angular/core';

const max_order_number_per_item = 10;
@Component({
    selector: 'catering-modal',
    templateUrl: './catering-modal.template.html',
    styleUrls: ['./catering-modal.styles.scss'],
})
export class CateringModalComponent extends OverlayContentComponent {
    public filtered_items: any[] = [];
    public ordered_items: any[] = [];
    public model: any = {
        item_count: 0,
    };

    @ViewChild('tablist') private tabs: ElementRef;
    @ViewChildren('tab') private tab_list: QueryList<ElementRef>;

    public init() {
        this.model.item_count = 0;
        this.ordered_items = [];
        this.filtered_items = [];
        if (this.model.service) {
            this.model.items = JSON.parse(JSON.stringify(this.model.service.Catering.list()));
            this.model.category_list = [];
            for (const item of this.model.items) {
                if (item.category && this.model.category_list.indexOf(item.category) < 0) {
                    this.model.category_list.push(item.category);
                }
            }
            setTimeout(() => this.setCategory(''), 500);
        } else {
            this.fn.close();
        }
    }

    public setCategory(value: string) {
        this.model.category = value;
        const tabs = this.tab_list.toArray();
        const tab = tabs[this.model.category_list.indexOf(value) + 1];
        if (tab) {
            const root_rect = this.tabs.nativeElement.getBoundingClientRect();
            const rect = tab.nativeElement.getBoundingClientRect();
            this.model.tab = {
                left: rect.left - root_rect.left,
                width: rect.width,
            };
        }
        this.filter();
    }

    public filter() {
        this.filtered_items = [];
        if (!this.model.category) {
            this.filtered_items = this.model.items;
        } else {
            for (const item of this.model.items) {
                if (
                    item.category === this.model.category ||
                    (this.model.category === 'others' &&
                        (!item.category || item.category === ''))
                ) {
                    this.filtered_items.push(item);
                }
            }
        }
    }

    public updateAmount(item: any, value: any) {
        if (!item.amount) {
            item.amount = 0;
        }
        if (value > 0 && item.amount < max_order_number_per_item) {
            item.amount += 1;
            this.updateTotal();
        } else if (value < 0 && item.amount > 0) {
            item.amount += -1;
            this.updateTotal();
        }
    }

    public updateTotal() {
        let total = 0;

        for (const item of this.model.items) {
            if (item.amount) {
                total += item.amount;
            }
        }
        this.model.item_count = 0;

        setTimeout(() => {
            this.model.item_count = total;
        }, 200);
    }

    public removeItem(item: any) {
        this.model.item_count -= item.amount;
        item.amount = 0;
        this.updateOrder();
    }

    public showOrder() {
        this.model.list = true;
        this.updateOrder();
    }

    public order() {
        if (this.model.item_count <= 0) {
            return;
        }
        this.updateOrder();
        this.model.order = this.ordered_items;
        this.model.total = this.model.item_count;
        this.fn.event('Accept');
    }

    private updateOrder() {
        this.ordered_items = [];
        for (const item of this.model.items) {
            if (item.amount > 0) {
                this.ordered_items.push(item);
            }
        }
        this.updateTotal();
    }
}
