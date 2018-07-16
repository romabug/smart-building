
import { CommsService } from '@acaprojects/ngx-composer';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import * as moment from 'moment';

import { ILevel } from './buildings.service';
import { IBooking } from './bookings.service';
import { Utils } from '../../shared/utility.class';

export interface IRoom {
    id: string;
    name: string;
    email: string;
    level: ILevel;
    map_id: string;
    available?: boolean;
    bookable: boolean;
    in_use: string | boolean;
    raw_bookings: any[];
    bookings: IBooking[];
    today?: IBooking[];
    timeline?: any;
    support_url?: string;
    extras?: any[];
    capacity?: number;
    current?: IBooking;
    next?: IBooking;
}

@Injectable({
    providedIn: 'root'
})
export class RoomsService {
    public parent: any;
    public model: any = {};

    private promises: any = {};
    private subjects: any = {};
    private observers: any = {};
    private timers: any = {};

    constructor(private http: CommsService) {
        this.subjects.room_list = new BehaviorSubject([]);
        this.observers.room_list = this.subjects.room_list.asObservable();
        this.subjects.search = new BehaviorSubject([]);
        this.observers.search = this.subjects.search.asObservable();
        this.subjects.results = new BehaviorSubject<any>({});
        this.observers.results = this.subjects.results.asObservable();
        this.subjects.state = new BehaviorSubject('loading');
        this.observers.state = this.subjects.state.asObservable();
    }

    public init() {
        if (!this.parent || !this.parent.Buildings.current()) {
            return setTimeout(() => this.init(), 500);
        }
        this.query({}).then((rooms) => {
            this.subjects.room_list.next(rooms);
        });
    }

    public list() {
        return this.subjects.room_list.getValue() || [];
    }

    public listen(name: string, next: (value: any) => void) {
        return this.subjects[name] ? this.observers[name].subscribe(next) : null;
    }

    public get(name: string) {
        return this.subjects[name] ? this.subjects[name].getValue() : null;
    }

    public show(id: string, fields?: any) {
        const query = Utils.generateQueryString(fields);
        this.subjects.state.next('loading');
        const key = `show|${id}|${query}`;
        if (!this.promises[key]) {
            this.promises[key] = new Promise((resolve, reject) => {
                let result = null;
                this.http.get(`${this.parent.api_endpoint}/rooms/${id}?${query}`)
                .subscribe(
                    (room: any) => room ? result = this.processRooms([room])[0] : null,
                    (err) => {
                        this.subjects.state.next('idle');
                        setTimeout(() => this.promises[key] = null, 500);
                        reject(err);
                    }, () => {
                        this.subjects.state.next('idle');
                        setTimeout(() => this.promises[key] = null, 500);
                        resolve(result);
                    });
            });
        }
        return this.promises[key];
    }

    public available(date: number, duration: number = 60, id?: string, bookable: boolean = true) {
        if (!this.parent || !this.parent.Buildings.current()) {
            return new Promise((rs, rj) =>
                setTimeout(() => this.available(date, duration, id, bookable).then((v) => rs(v), (e) => rj(e)), 500)
            );
        }
        this.subjects.state.next('loading');
        const start = moment(date);
        const end = moment(start).add(duration, 'm');
        const key = `availiable|${start.unix()}|${duration}${id ? '|' + id : ''}`;
        if (!this.promises[key]) {
            this.promises[key] = new Promise((resolve, reject) => {
                let result = null;
                const query = `?${bookable ? 'bookable=true&' : ''}available_from=${start.unix()}&available_to=${end.unix()}`;
                this.http.get(`${this.parent.api_endpoint}/rooms${id ? '/' + id : ''}${query}`)
                .subscribe(
                    (list: any) => list ? result = this.processRooms(list instanceof Array ? list : [list]) : null,
                    (err) => {
                        this.subjects.state.next('idle');
                        setTimeout(() => this.promises[key] = null, 500);
                        reject(err);
                    }, () => {
                        this.subjects.state.next('idle');
                        setTimeout(() => this.promises[key] = null, 500);
                        resolve(result);
                    });
            });
        }
        return this.promises[key];
    }

    public isAvailable(id: string, date: number, duration: number = 60) {
        const start = moment(date);
        const key = `availiable|${id}|${start.unix()}|${duration}`;
        if (!this.promises[key]) {
            this.promises[key] = new Promise((resolve, reject) => {
                this.available(date, duration, id, false).then((result) => {
                    const item = (result instanceof Array ? result[0] : result) || {};
                    item.id === id && item.available ? resolve() : reject();
                    setTimeout(() => this.promises[key] = null, 60 * 1000);
                }, (err) => reject());
            });
        }
        return this.promises[key];
    }

    public query(fields?: any) {
        if (!this.parent || !this.parent.Buildings.current()) {
            return new Promise((rs, rj) =>
                setTimeout(() => this.query(fields).then((v) => rs(v), (e) => rj(e)), 500)
            );
        }
        const query = Utils.generateQueryString(fields);
        if (query !== '') {
            this.model.last_query = JSON.parse(JSON.stringify(fields));
            this.model.last_query.id = query;
            if (localStorage) {
                localStorage.setItem('STAFF.last_search', JSON.stringify(this.model.last_query));
            }
        }
        this.subjects.state.next('loading');
        const key = `query|${query}`;
        if (!this.promises[key]) {
            this.promises[key] = new Promise((resolve, reject) => {
                let results = this.get('results');
                if (!results) { results = {}; }
                this.http.get(`${this.parent.api_endpoint}/rooms?${query}`).subscribe((rooms: any) => {
                    const rm_list = this.processRooms(rooms);
                    results[query] = this.merge(rm_list);
                    this.subjects.results.next(results);
                }, (err) => {
                    reject(err);
                    this.subjects.state.next('free');
                    setTimeout(() => this.promises[key] = null, 500);
                }, () => {
                    resolve(results[query]);
                    if (this.subjects.search && query !== '') {
                        this.subjects.search.next(results[query]);
                    }
                    this.model.last_search_time = moment().valueOf();
                    this.subjects.state.next('free');
                    setTimeout(() => this.promises[key] = null, 500);
                });
            });
        }
        return this.promises[key];
    }

    private merge(list: any[]) {
        const rm_list: any[] = [];
        const room_list = this.list();
        for (const rm of list) {
            if (room_list) {
                for (const room of room_list) {
                    if (room.id === rm.id) {
                        rm.today = room.today;
                        rm.timeline = room.timeline;
                        break;
                    }
                }
            }
            rm_list.push(rm);
        }
        return rm_list;
    }

    public processRoom(room: IRoom) {
        if (room) {
            if (room.raw_bookings) {
                room.bookings = this.processRoomBookings(room.raw_bookings);
                room.next = this.nextBooking(room.bookings);
                room.current = this.currentBooking(room.bookings);
                room.in_use = this.checkState(room.bookings);
                room.today = this.bookingsForDate(room.bookings);
                room.timeline = this.timelineBookings(room.bookings);
            }
        }
    }

    private processRooms(list: any[]): IRoom[] {
        const room_list: any[] = [];
        const bld = this.parent.Buildings.current();
        for (const room of list) {
            const out: IRoom = {
                id: room.id,
                name: room.name,
                email: room.email,
                level: { id: null, name: '', number: 0 },
                map_id: room.settings.map_id,
                available: room.available || room.settings.available,
                bookable: true,
                raw_bookings: room.settings.bookings,
                bookings: [],
                extras: room.settings.extra_features,
                support_url: room.settings.support_url || room.support_url,
                capacity: room.capacity,
                today: [],
                in_use: false,
                next: null,
            };
            this.processRoom(out);
                // Set level
            if (bld) {
                for (const lvl of bld.levels) {
                    if (room.zones.indexOf(lvl.id) >= 0) {
                        out.level = {
                            id: lvl.id,
                            name: lvl.name,
                            number: lvl.name.replace('Level ', ''),
                        };
                        break;
                    }
                }
            }
            room_list.push(out);
        }
        return room_list;
    }

    private processRoomBookings(bkns: any[]): IBooking[] {
        if (!bkns) {
            return [];
        }
        const list: any[] = [];
        for (const b of bkns) {
            const start = moment(b.start_date || b.Start);
            const end = moment(b.end_date || b.End);
            const duration = moment.duration(end.diff(start));
            const item: any = {
                id: b.id,
                title: b.title,
                start: start.valueOf(),
                duration: duration.asMinutes(),
                start_hours: start.hours() + start.minutes() / 60,
                display: {
                    date: start.format('DD/MM/YYYY'),
                    start: start.format('h:mma'),
                    end: end.format('h:mma'),
                    duration: duration.humanize()
                }
            };
            list.push(item);
        }
        return list;
    }

    public nextBooking(bkns: any[]) {
        if (!bkns || bkns.length <= 0) {
            return null;
        }
        const now = moment();
        let bkn: any = null;
        let bkn_start: any = null;
        for (const b of bkns) {
            const start = moment(b.start);
            if (now.isSame(start, 'd') && start.isAfter(now) && (!bkn_start || bkn_start.isAfter(start))) {
                bkn = b;
                bkn_start = start;
            }
        }
        return bkn;
    }

    public currentBooking(bkns: any[]) {
        if (!bkns || bkns.length <= 0) {
            return null;
        }
        const now = moment();
        for (const b of bkns) {
            const start = moment(b.start);
            const end = moment(start).add(b.duration, 'm');
            if (now.isBetween(start, end, 'm', '[)')) {
                return b;
            }
        }
        return null;
    }

    public checkState(bkns: any[]) {
        if (!bkns || bkns.length <= 0) {
            return false;
        }
        const now = moment();
        for (const b of bkns) {
            const start = moment(b.start);
            const end = moment(start).add(b.duration, 'm');
            if (start.isSameOrBefore(now) && end.isAfter(now)) {
                return end.format('h:mma');
            }
        }
        return false;
    }

    public bookingsForDate(bookings: any[], date: any = moment()) {
        const list: any[] = [];
        for (const b of bookings) {
            const start = moment(b.start);
            if (start.isSame(date, 'd')) {
                list.push(b);
            }
        }
        return list;
    }

    public timelineBookings(bookings: any[]) {
        const timeline = {};
        const now = moment();
        timeline[now.format('DD MMM YYYY')] = this.bookingsForDate(bookings, now);
        for (let i = 0; i < 120; i++) {
            now.add(1, 'days');
            timeline[now.format('DD MMM YYYY')] = this.bookingsForDate(bookings, now);
        }
        return timeline;
    }
}
