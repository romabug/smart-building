import { CommsService } from '@acaprojects/ngx-composer';
import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';

export interface ICaterer {
    id: string;
    name: string;
    description: string;
    hours: { open: number; close: number; };
    cutoff: { fixed: number; relative: number; };
    img_url: string;
    min_cost: number;
    opening_hours: { day: string; time: string }[];
    phone: string;
    options: ICateringCategory[];
}

export interface ICateringCategory {
    id: number | string;
    name: string;
    items: ICateringItem[];
    minimum: number;
    extra?: string;
}

export interface ICateringItem {
    id: string;
    name: string;
    description: string;
    img_url: string;
    minimum: number;
    price: number;
    cutoff: { fixed: number; relative: number; };
    properties: ICateringItemProperty[];
}

export interface ICateringItemProperty {
    id: string;
    name: string;
    type: number;
    values: ICateringItemPropertyValue[];
}

export interface ICateringItemPropertyValue {
    id: number | string;
    name: string;
    default?: boolean;
    min?: number;
    max?: number;
    step?: number;
    extra_price: number;
}

export interface ICartItem {
    id: string;
    item: ICateringItem;
    quantity: number;
    unit_price: number;
    details?: string;
    extras: any[];
}

export interface ICart {
    id: string;
    total: number;
    total_price: number;
    notes?: string;
    items: ICartItem[];
}

@Injectable({
    providedIn: 'root'
})
export class CateringService {
    public parent: any = null;

    private subjects: any = {};
    private observers: any = {};

    constructor(private http: CommsService) {
        this.subjects.caterers = new BehaviorSubject<ICaterer[]>([]);
        this.observers.caterers = this.subjects.caterers.asObservable();
        this.subjects.locations = new BehaviorSubject<string[]>([]);
        this.observers.locations = this.subjects.locations.asObservable();
    }

    public init() {
        this.loadCaterers();
        this.loadLocations();
    }

    public listen(name: string, next: (value) => void) {
        return this.subjects[name] ? this.observers[name].subscribe(next) : null;
    }

    public caterers(): ICaterer[] {
        return this.subjects.cateres.getValue();
    }

    public locations(): string[] {
        return this.subjects.locations.getValue();
    }

    public order(id: string, items: any[], notes: string, location: string, date: any) {
        return new Promise((resolve, reject) => {
            if (items && items.length > 0) {
                let confirming = false;
                this.parent.Overlay.openModal('PaymentCard', {
                }).then((inst: any) => inst.subscribe((event: any) => {
                    if (event.type === 'Confirm') {
                        confirming = true;
                        const request = {
                            id, items, notes, location, date
                        };
                        this.http.post(`${this.parent.api_endpoint}/orders`, request)
                            .subscribe((resp: any) => {
                                event.data.loading = false;
                                event.data.success = true;
                                setTimeout(() => {
                                    event.close();
                                    resolve(resp);
                                }, 2000);
                            }, (err: any) => {
                                event.data.loading = false;
                                event.data.error = true;
                                event.data.errorData = 'Request Error!';
                                setTimeout(() => event.close(), 2000);
                                reject(err);
                            },
                        );
                    } else if (!confirming) {
                        reject();
                        event.close();
                    }
                }));
            } else {
                reject('Cart is empty');
            }
        });
    }

    private loadCaterers() {
        if (!this.parent) {
            return setTimeout(() => this.loadCaterers(), 500);
        }
        const url = `${this.parent.api_endpoint}/caterers`;
        this.http.get(url).subscribe(
            (caterers: any[]) => this.subjects.caterers.next(this.processCaterers(caterers)),
            (err) => {
                this.parent.log('CATERING(S)', 'Error loading caterings:', err, 'error');
                setTimeout(() => this.loadCaterers(), 500);
            }, () => this.parent.log('CATERING(S)', 'Loaded caterings data')
        );
    }

    private loadLocations() {
        if (!this.parent) {
            return setTimeout(() => this.loadLocations(), 500);
        }
        const url = `${this.parent.api_endpoint}/caterers/locations`;
        this.http.get(url).subscribe(
            (locations: any[]) => this.subjects.locations.next(locations),
            (err) => {
                this.parent.log('CATERING(S)', 'Error loading location data:', err, 'error');
                setTimeout(() => this.loadLocations(), 500);
            }, () => this.parent.log('CATERINGS(S)', 'Loaded locations data')
        );
    }

    private processCaterers(list: any[]) {
        const caterer_list: ICaterer[] = [];
        for (const item of list) {
            const hours: any[] = [];
            for (const i of item.opening_hours) {
                const time = i.split(':').slice(1).join(':');
                hours.push({ day: i.split(':')[0], time  });
            }
            caterer_list.push({
                id: item.id,
                name: item.title,
                description: item.description,
                hours: {
                    open: item.hour_open,
                    close: item.hour_close
                },
                cutoff: {
                    fixed: item.default_cutoff_fixed_seconds || item.default_cutoff_fixed,
                    relative: item.default_cutoff_relative_seconds || item.default_relative_fixed,
                },
                img_url: item.img_url,
                min_cost: item.minimum_cost,
                opening_hours: hours,
                phone: item.phone,
                options: this.processCategories(item.options)
            });
        }
        return caterer_list;
    }

    private processCategories(categories: any[]) {
        const category_list: ICateringCategory[] = [];
        for (const item of categories) {
            category_list.push({
                id: item.id,
                name: item.name,
                extra: item.extra_information,
                minimum: item.minimum_order || item.minimum || 0,
                items: this.processCateringItems(item.items)
            });
        }
        return category_list;
    }

    private processCateringItems(list: any[]) {
        const item_list: ICateringItem[] = [];
        for (const item of list) {
            item_list.push({
                id: item.id,
                name: item.name,
                description: item.description,
                img_url: item.img_url,
                minimum: item.minimum_order || item.minimum || 0,
                price: item.price,
                cutoff: {
                    fixed: item.cutoff_fixed_seconds || item.cutoff_fixed,
                    relative: item.cutoff_relative_seconds || item.cutoff_relative,
                },
                properties: this.processCateringProperties(item.properties)
            });
        }
        return item_list;
    }

    private processCateringProperties(list: any) {
        const properties: ICateringItemProperty[] = [];
        for (const item of list) {
            const out = {
                id: item.id,
                name: item.name,
                type: item.type,
                values: []
            };
            for (const value of item.values) {
                out.values.push({
                    id: value.id,
                    name: value.name,
                    default: value.selected,
                    extra_price: value.extra_price,
                    min: value.min,
                    max: value.max,
                    step: value.step
                });
            }
            properties.push(out);
        }
        return properties;
    }
}
