import { CommsService } from '@acaprojects/ngx-composer';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { IBuilding, ILevel } from './buildings.service';

import * as faker from 'faker';
import * as moment from 'moment';
import { Utils } from '../../shared/utility.class';

export interface IUser {
    id: string;
    name: string;
    email: string;
    win_id?: string;
    type?: 'partner' | 'internal' | 'external';
    role?: string;
    state?: string;
    location?: ILocation | string | {};
    image: string;
    phone?: string;
    staff_code?: string;
    b_unit?: string;
}

export interface ILocation {
    x?: number;
    y?: number;
    map_id?: string;
    building: string | IBuilding;
    level: string | ILevel;
    fixed: boolean;
    loc_id?: string;
    display?: any;
}

@Injectable({
    providedIn: 'root'
})
export class UsersService {
    public parent: any = null;

    private model: any = {};
    private timers: any = {};
    private promises: any = {};
    private subjects: any = {};
    private observers: any = {};

    constructor(private http: CommsService, private http_unauth: HttpClient, private router: Router) {
        this.subjects.user_list = new BehaviorSubject<IUser[]>([]);
        this.observers.user_list = this.subjects.user_list.asObservable();
        this.subjects.user = new BehaviorSubject<IUser>(null);
        this.observers.user = this.subjects.user.asObservable();
        this.subjects.state = new BehaviorSubject('loading');
        this.observers.state = this.subjects.state.asObservable();
    }

    public init() {
        if (!this.parent || !this.parent.Settings.setup) {
            return setTimeout(() => this.init(), 500);
        }
        this.loadActiveUser();
        if (!this.parent.Settings.get('app.people_min_char')) {
            this.loadUsers();
        }
    }

    public current() {
        return this.subjects.user ? this.subjects.user.getValue() : null;
    }

    public list() {
        return this.subjects.user_list ? this.subjects.user_list.getValue() : [];
    }

    public listen(name: string, next: (data: any) => void) {
        return this.subjects[name] ? this.observers[name].subscribe(next) : null;
    }

    public get state() {
        return this.subjects.state.getValue();
    }

    public set state(value: string) {
        this.subjects.state.next(value);
    }

    public login(data: any = {}) {
        this.state = 'loading';
        let query = '';
        for (const i in data) {
            if (data[i]) {
                if (query !== '') { query += '&'; }
                query += `${i}=${encodeURIComponent(data[i])}`;
            }
        }
        let headers = new HttpHeaders();
        headers = headers.append('Content-Type', 'application/x-www-form-urlencoded');
        this.http_unauth.post('/auth/jwt/callback', query, { headers }).subscribe((res: any) => {
            if (res.status >= 200 && res.status < 400) {
                if (sessionStorage) {
                    const clientId = this.http.hash(`${location.origin}/oauth-resp.html`);
                    sessionStorage.setItem(`${clientId}_login`, 'true');
                }
                this.http.tryLogin();
            } else {
                this.state = 'invalid';
            }
            return;
        }, (err) => {
            if (err.status >= 400) {
                this.state = 'error';
            } else {
                if (sessionStorage) {
                    const clientId = this.http.hash(`${location.origin}/oauth-resp.html`);
                    sessionStorage.setItem(`${clientId}_login`, 'true');
                }
                this.http.tryLogin();
            }
        }, () => this.loadActiveUser());
    }


    // returns Users in an alphabetical order - first name
    public getUsers() {
        const list = this.subjects.user_list.getValue();
        const users = this.model.users.sort((a, b) => a.name.localeCompare(b.name));
        return users ? JSON.parse(JSON.stringify(users)) : [];
    }

    public get(id: string, mutable: boolean = false) {
        const list = this.subjects.user_list.getValue();
        for (const usr of list) {
            if (usr.email === id || usr.id === id || usr.staff_code === id || usr.win_id === id) {
                return mutable ? usr : JSON.parse(JSON.stringify(usr));
            }
        }
        return null;
    }

    public add(user: any) {
        return new Promise<any>((resolve, reject) => {
            const data: any = {
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                email: user.email,
                organisation: user.organisation,
                organisation_id: null,
            };
            if (user.organisation_id) {
                data.organisation_id = user.organisation_id;
            }
            const url = `${this.parent.api_endpoint}/users`;
            this.http.post(url, data).subscribe(() => null, (err) => reject(err), () => resolve());
        });
    }


    public location(id: string, email: string = id) {
        const key = `location|${id}`;
        if (!this.promises[key]) {
            this.promises[key] = new Promise((resolve, reject) => {
                const url = `${this.parent.api_endpoint}/people/${id}?desk=${email}`;
                let place: any = null;
                this.http.get(url).subscribe((data) => place = data ? data[0] : {},
                    (err) => {
                        reject(err);
                        this.promises[key] = null;
                    },
                    () => {
                        if (!place || Object.keys(place).length <= 0) {
                            this.updateUserLocation(id, {});
                            reject('User not found');
                        } else {
                            const location: ILocation = {
                                level: place.level,
                                building: place.building,
                                display: {},
                                fixed: true,
                            };
                            const bld = this.parent.Buildings.get(location.building);
                            if (bld) {
                                location.display.building = bld.name;
                                for (const level of bld.levels) {
                                    if (level.id === location.level) {
                                        location.display.level = level.name;
                                        break;
                                    }
                                }
                            }
                            if (place.x && place.y) {
                                location.fixed = false;
                                location.x = (10000 / place.x_max) * place.x;
                                location.y = (10000 / place.x_max) * place.y;
                            } else if (place.at_desk) {
                                location.map_id = `${place.desk_id}`;
                                const is_room = place.desk_id && place.desk_id.indexOf('area-') >= 0;
                                location.display.name = `${place.desk_id && !is_room ? 'Desk ' + place.desk_id.split('-')[1] : 'In their office'}`;
                                location.map_id = place.desk_id;
                            }
                            this.updateUserLocation(id, location);
                            resolve(location);
                        }
                        this.promises[key] = null;
                    });
            });
        }
        return this.promises[key];
    }

    public updateUserLocation(id, data) {
        const list = this.subjects.user_list.getValue();
        for (const user of list) {
            if (user.id === id) {
                user.location = data;
            }
        }
    }

    public getFilteredUsers(filter: string, items?: any[]) {
        let users: any[];
        const filters = filter.toLowerCase().split(' ');
        const list = {};
        for (const f of filters) {
            if (f) {
                if (!list[f]) { list[f] = 0; }
                list[f]++;
            }
        }
        const parts = [];
        for (const f in list) {
            if (list.hasOwnProperty(f)) {
                parts.push({ word: f, count: list[f], regex: new RegExp(f, 'gi') });
            }
        }
        const user_list = JSON.parse(JSON.stringify(items || this.subjects.user_list.getValue()));
        users = user_list.filter(
            (user) => {
                let name_index = 65535;
                let email_index = 65535;
                let match_count = 0;
                const name = user.name.toLowerCase();
                const email = user.email.toLowerCase();
                for (const i of parts) {
                    if (i.word) {
                        const n_index = name.indexOf(i.word);
                        const n_matches = (name.match(i.regex) || []).length;
                        if (n_index < name_index) {
                            name_index = n_index;
                        }
                        const e_index = email.indexOf(i.word);
                        const e_matches = (email.match(i.regex) || []).length;
                        if (e_index < email_index) {
                            email_index = e_index;
                        }
                        if (n_matches >= i.count || e_matches >= i.count) {
                            match_count++;
                        }
                    }
                }
                user.match_index = name_index >= 0 ? name_index : (email_index >= 0 ? email_index : -1);
                user.match = name_index >= 0 ? 'name' : (email_index >= 0 ? 'email' : '');
                return user.match_index >= 0 && (match_count >= parts.length);
            });
        users.sort((a, b) => {
            const diff = a.match_index - b.match_index;
            return diff === 0 ? a.name.localeCompare(b.name) : diff;
        });
        for (const user of users) {
            const match = user.match === 'name' ? user.name.split(' ') : user.email.split(' ');
            for (const i of parts) {
                let changed = 0;
                for (const k of match) {
                    if (changed >= i.count) { break; }
                    if (k.toLowerCase().indexOf(i.word) >= 0 && k.indexOf('`') < 0) {
                        match[match.indexOf(k)] = k.replace(i.regex, '`$&`');
                        changed++;
                    }
                }
            }
            user.match === 'name' ? user.match_name = match.join(' ') : user.match_email = match.join(' ');
        }
        return users;
    }

    public updateActiveUserLocation() {
        const person = this.current();
        if (person) {
            this.location(person.id, person.win_id).then(
                (loc) => this.subjects.user.next(this.get(person.id)),
                (err) => console.error(err)
            );
        }
    }

    public query(fields?: any, tries: number = 0) {
        if (tries > 4) { return new Promise((rs, rj) => rj('Too many tries')); }
        if (!this.parent || !this.parent.Buildings.current()) {
            return new Promise((rs, rj) =>
                setTimeout(() => this.query(fields, tries).then((v) => rs(v), (e) => rj(e)), 300 * ++tries)
            );
        }
        const query = Utils.generateQueryString(fields);
        const key = `query|${query}`;
        if (!this.promises[key]) {
            this.promises[key] = new Promise((resolve, reject) => {
                const url = `${this.parent.api_endpoint}/users${query ? '?' + query : ''}`;
                this.http.get(url).subscribe(
                    (resp: any) => {
                        const user_list = [];
                        for (const usr of resp) {
                            user_list.push(this.processStaffMember(usr));
                        }
                        if (!fields || (!fields.q && !fields.limit)) {
                            this.updateUserList(user_list);
                        }
                        resolve(user_list);
                        setTimeout(() => this.promises[key] = null, 5 * 1000);
                    }, (err) => {
                        this.promises[key] = null;
                        reject(err);
                    });
            });
        }
        return this.promises[key];
    }

    public show(email: string) {
        const key = `show|${email}`;
        if (!this.promises[key]) {
            this.promises[key] = new Promise((resolve, reject) => {
                const url = `${this.parent.api_endpoint}/users/${email}`;
                this.http.get(url).subscribe(
                    (resp: any) => {
                        const user = this.processStaffMember(resp);
                        setTimeout(() => this.promises[key] = null, 60 * 1000);
                        resolve(user);
                    }, (err) => {
                        this.promises[key] = null;
                        reject(err);
                    });
            });
        }
        return this.promises[key];
    }

    public availability(email: string, start?: number, end?: number) {
        const name = `availability|${email}|${start || 'now'}|${end || 'soon'}`;
        if (!this.promises[name]) {
            this.promises[name] = new Promise((resolve, reject) => {
                let url = `${this.parent.api_endpoint}/bookings/${email}`;
                if (start) {
                    url += `?start=${start}`;
                    if (end) { url += `&end=${end}`; }
                }
                let list = null;
                this.http.get(url).subscribe(
                    (results) => list = results,
                    (err) => {
                        reject(err);
                        setTimeout(() => this.promises[name] = null, 1000);
                    }, () => {
                        resolve(!list || list.length <= 0);
                        setTimeout(() => this.promises[name] = null, 1000);
                    }
                );
            });
        }
        return this.promises[name];
    }

    private updateUserList(list: any[]) {
        const user_list = this.subjects.user_list.getValue() || [];
        if (list) {
            for (const item of list) {
                let found = false;
                for (const user of user_list) {
                    if (item.id === user.id) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    user_list.push(item);
                }
            }
            user_list.sort((a, b) => a.name.localeCompare(b.name));
            this.subjects.user_list.next(user_list);
        }
    }

    private loadActiveUser(tries: number = 0) {
        if (tries > 10) { return; }
        let user = null;
        this.state = 'loading';
        this.http.get(`${this.parent.endpoint}/control/api/users/current`).subscribe(
            (data: any) => user = data,
            (err) => setTimeout(() => this.loadActiveUser(tries), 200 * ++tries),
            () => {
                this.subjects.user.next(user);
                const user_data = this.get(user.email);
                if (!user_data) {
                    this.query({ q: user.email, limit: 1 }).then((list: IUser[]) => {
                        if (list && list.length) {
                            const person = list[0];
                            this.location(person.id, person.win_id).then(
                                (loc) => this.model.active_user = this.get(person.id),
                                (err) => console.error(err)
                            );
                            this.subjects.state.next('available');
                            this.subjects.user.next(person);
                        }
                    }, (err) => {
                        console.error(err);
                        this.subjects.state.next('invalid');
                    });
                } else {
                    this.location(user_data.id, user_data.win_id).then(
                        (loc) => this.model.active_user = this.get(user_data.id),
                        (err) => console.error(err)
                    );
                    this.subjects.state.next('available');
                    this.subjects.user.next(user_data);
                }
            },
        );
    }

    private loadUsers(tries: number = 0) {
        if (tries > 10) { return; }
        const now = moment().seconds(0).milliseconds(0);
        if (localStorage) {
            const user_list = localStorage.getItem('STAFF.user_list');
            const expiry = localStorage.getItem('STAFF.user_list.expiry');
            if (user_list && +expiry > now.valueOf()) {
                this.updateUserList(JSON.parse(user_list));
                return;
            }
        }
        this.query().then((list) => {
            if (localStorage && this.parent.Settings.get('app.store_user_list')) {
                const time = this.parent.Settings.get('user_expiry');
                localStorage.setItem('STAFF.user_list', JSON.stringify(this.subjects.user_list.getValue()));
                localStorage.setItem('STAFF.user_list.expiry', now.add(30, 'seconds').valueOf().toString());
            }
        }, (err) => setTimeout(() => this.loadUsers(tries), 200 * ++tries));
    }

    private processStaffMember(user: any) {
        if (user) {
            const member: IUser = {
                id: user.id || user.email,
                win_id: user.email,
                name: user.name,
                type: user.title ? (user.title.toLowerCase() === 'partner' ? 'partner' : 'internal') : 'external',
                image: null,
                email: user.email,
                location: null,
                phone: user.phone,
                b_unit: user.department,
                staff_code: user.staff_code
            };
            if (member.id) {
                member.image = user.image || `${this.parent.endpoint}/assets/users/${member.id}.png`;
            }
            return member;
        } else {
            return null;
        }
    }

}
