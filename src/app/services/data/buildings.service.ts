/*
* @Author: Alex Sorafumo
* @Date:   2017-05-25 16:00:37
 * @Last Modified by: Alex Sorafumo
 * @Last Modified time: 2018-05-14 09:37:51
*/

import { CommsService } from '@acaprojects/ngx-composer';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

export interface IBuilding {
    id: string;
    name: string;
    extras: IExtra[];
    levels: ILevel[];
}

export interface IExtra {
    id: string;
    name: string;
}

export interface ILevel {
    id: string;
    name: string;
    number: string | number;
    map_url?: string;
    type?: string;
    defaults?: any;
}

export interface IOrganisation {
    id: string;
    name: string;
    blds: IBuilding[];
}

@Injectable({
    providedIn: 'root'
})
export class BuildingsService {
    public parent: any = null;
    public default = '';
    public data: any = {};

    private model: any = {};
    private active = '';
    private org: IOrganisation;
    private subjects: any = {};
    private observers: any = {};

    constructor(private http: CommsService) {
        this.subjects.active = new BehaviorSubject<IBuilding>(null);
        this.observers.active = this.subjects.active.asObservable();
    }

    public init() {
         if (!this.parent || !this.parent.Settings.setup) {
            setTimeout(() => this.init(), 500);
         }
         this.default = this.parent.Settings.get('building.default');
         if (localStorage) {
            this.model.user_set_building = localStorage.getItem('STAFF.building');
         }
         this.load();
    }

    public load(tries: number = 0) {
        if (!this.parent) {
            setTimeout(() => this.load(), 500);
        }
        const url = `${this.parent.endpoint}/control/api/zones?tags=org`;
        this.http.get(url).subscribe((response: any) => {
            const o = response instanceof Array ? response : response.results;
            if (o && o.length > 0) {
                const org = o[0];
                this.org = {
                    id: org.id,
                    name: org.name,
                    blds: org.settings.discovery_info.buildings,
                };
            }
        }, (err) => {
            this.parent.log('BLD(S)', 'Error loading org:', err, 'error');
            setTimeout(() => this.load(tries), 500 * ++tries);
        }, () => {
            if (!this.org) {
                setTimeout(() => this.load(tries), 500 * ++tries);
            } else {
                this.loadBuildings();
            }
        });
    }

    public list() {
        const blds: IBuilding[] = [];
        for (const b in this.data) {
            if (this.data.hasOwnProperty(b) && this.data[b]) {
                blds.push(this.data[b]);
            }
        }
        return blds;
    }
    /**
     * Gets the currently active building
     */
    public current() {
        return this.subjects.active.getValue();
    }
    /**
     * Observable for current building
     */
    public listen(next: (data: any) => void) {
        return this.observers.active.subscribe(next);
    }
    /**
     * Get Buidling with the given ID
     * @param {string} id Building ID
     */
    public get(id: string) {
        if (this.data[id]) {
            return this.data[id];
        }
        return null;
    }

    public set(id: string, save: boolean = true) {
        if (this.data[id]) {
            this.active = id;
            this.subjects.active.next(this.data[id]);
            if (localStorage && save) {
                localStorage.setItem('STAFF.building', id);
            }
        }
    }
    /**
     * Gets the organisation
     */
    public organisation() {
        return this.org;
    }
    /**
     * Gets the levels of the current building or building with the given ID
     * @param {string} id Building ID
     */
    public levels(id?: string) {
        const bld = this.current();
        if (bld) {
            if (id) {
                for (const lvl of bld.levels) {
                    if (lvl.id === id) { return [lvl]; }
                }
            } else {
                return bld.levels || [];
            }
        }
        return [];
    }

    private loadBuildings(tries: number = 0) {
        const url = `${this.parent.endpoint}/control/api/zones?tags=building`;
        this.http.get(url).subscribe((response: any) => {
            const blds = response instanceof Array ? response : response.results;
            for (const bld of blds) {
                for (const b of this.org.blds) {
                    if (bld.zone_id === b.id) {
                        const info = bld.settings.discovery_info;
                        this.data[bld.id] = {
                            id: bld.id,
                            name: bld.name,
                            catering: info.catering,
                            concierge_phone: info.concierge_phone,
                            systems: {
                                desks: info.desk_tracking,
                            },
                            roles: info.roles || {},
                            extras: this.processExtras(info.extras),
                            levels: this.processLevels(info.levels),
                        };
                    }
                }
            }
        }, (err) => {
            this.parent.log('BLD(S)', 'Error loading buildings:', err, 'error');
            setTimeout(() => this.loadBuildings(tries), 500 * ++tries);
        }, () => {
            const keys = Object.keys(this.data);
            if ((!this.default || this.default === '' || !this.data[this.default]) && keys.length > 0) {
                this.default = keys[0];
            }
            if (keys.indexOf(this.model.user_set_building) < 0) {
                this.model.user_set_building = null;
                if (localStorage) {
                    localStorage.removeItem('STAFF.building');
                }
            }
            this.set(this.model.user_set_building || this.default, false);
            this.parent.log('BLD(S)', 'Loaded building data');
            this.loadLevels();
        });
    }

    private loadLevels(tries: number = 0) {
        if (tries > 10) { return; }
        const url = `${this.parent.endpoint}/control/api/zones?tags=level`;
        this.http.get(url).subscribe(
            (levels: any) => null,
            (err) => {
                this.parent.log('BLD(S)', 'Error loading levels:', err, 'error');
                setTimeout(() => this.loadLevels(tries), 500 * ++tries);
            },
            () => this.parent.log('BLD(S)', 'Loaded level data')
        );
    }

    private processLevels(list: any[]): ILevel[] {
        const levels: ILevel[] = [];
        if (list) {
            for (const item of list) {
                levels.push({
                    id: item.level_id,
                    name: item.level_name,
                    map_url: item.map_url,
                    number: item.level_name.replace('Level ', ''),
                    type: item.floor_type || 'staff',
                    defaults: item.defaults || {}
                });
            }
        }
        return levels;
    }

    private processExtras(list: any[]): IExtra[] {
        const extras: IExtra[] = [];
        if (list) {
            for (const item of list) {
                extras.push({
                    id: item.extra_id,
                    name: item.extra_name,
                });
            }
        }
        return extras;
    }
}
