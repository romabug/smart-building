/*
 * @Author: Alex Sorafumo
 * @Date: 2017-06-05 12:39:28
 * @Last Modified by: Alex Sorafumo
 * @Last Modified time: 2018-05-14 10:53:05
 */

import { CommsService } from '@acaprojects/ngx-composer';
import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { ILevel } from './buildings.service';
import { IRoom } from './rooms.service';
import { IUser } from './users.service';
import { Utils } from '../../shared/utility.class';

import * as moment from 'moment';

export interface IBooking {
    id: string;
    title: string;
    date: number;
    duration: number;
    description?: string;
    organiser?: IUser[];
    is_organiser?: boolean;
    attendees?: IUser[];
    room?: IRoom;
    display?: any;
}

@Injectable({
    providedIn: 'root'
})
export class BookingsService {
    public parent: any = null;

    private promises: any = { search: {} };
    private model: any = {};
    private subjects: any = {};
    private observers: any = {};

    constructor(private http: CommsService) {
        this.subjects.bookings = new BehaviorSubject<any>({});
        this.observers.bookings = this.subjects.bookings.asObservable();
        this.subjects.new_booking = new BehaviorSubject<any>({ state: 'idle' });
        this.observers.new_booking = this.subjects.new_booking.asObservable();
    }

    public init() {
        if (!this.parent || !this.parent.Rooms.list() || this.parent.Rooms.list().length <= 0 || !this.parent.Settings.setup) {
            return setTimeout(() => this.init(), 500);
        }
        if (this.parent && this.parent.Settings.get('app.schedule.enabled')) {
            this.list();
        }
    }

    public get(name: string) {
        return this.subjects[name] ? this.subjects[name].getValue() : null;
    }

    public listen(name: string, next: (value: any) => void) {
        return this.subjects[name] ? this.observers[name].subscribe(next) : null;
    }

    public list(fields?: any) {
        if (!this.parent || !this.parent.Buildings.current()) {
            return setTimeout(() => this.list(fields), 500);
        }
        const query = Utils.generateQueryString(fields);
        if (!this.promises.bookings) {
            this.promises.bookings = new Promise((resolve, reject) => {
                let list_items: any[] = [];
                this.http.get(`${this.parent.api_endpoint}/bookings${query ? '?' + query : ''}`)
                    .subscribe((list: any[]) => {
                        if (list) {
                            list_items = this.processBookings(list);
                        }
                    }, (err: any) => {
                        reject(err);
                        setTimeout(() => this.promises.list = null, 100);
                    }, () => {
                        this.updateBookings(list_items);
                        resolve(list_items);
                        setTimeout(() => this.promises.list = null, 100);
                    });
            });
        }
        return this.promises.bookings;
    }

    public bookRoom(room: IRoom) {
        this.parent.Overlay.openModal('booking-form', { data: { form: { room } } })
            .then((inst: any) => inst.subscribe((e) => e.close()));
    }

    public book(item: any) {
        return new Promise((resolve, reject) => {
            if (this.get('new_booking').state !== 'idle') { return reject(); }
            const date = moment(item.date);
            this.parent.confirm({
                title: `Book Space?`,
                message: `Book space "${item.room.name}"<br>on the ${date.format('Do of MMMM, YYYY')} at ${date.format('h:mma')}<br>for ${moment.duration(item.duration, 'm').humanize()}`,
                icon: 'event',
                accept: 'Ok',
                cancel: true,
            }, (event) => {
                if (event.type === 'Accept') {
                    resolve();
                    this.subjects.new_booking.next({ state: 'processing' });
                    const form = item;
                    const request: any = {
                        start: moment(form.date).valueOf(),
                        end: moment(form.date).add(form.duration, 'm').valueOf(),
                        room_id: form.room.email || form.room.id,
                        title: form.title,
                        description: form.description,
                        attendees: form.attendees,
                        other: form.other
                    };
                    let response = null;
                    this.http.post(`${this.parent.api_endpoint}/bookings`, request)
                        .subscribe(
                            (resp) => response = resp,
                            (err) => {
                                this.subjects.new_booking.next({ state: 'error', value: err });
                                setTimeout(() => this.subjects.new_booking.next({ state: 'idle' }), 500);
                            }, () => {
                                this.subjects.new_booking.next({ state: 'success', value: response });
                                setTimeout(() => this.subjects.new_booking.next({ state: 'idle' }), 500);
                            }
                        );
                } else {
                    reject();
                }
                event.close();
            });
        });
    }

    public delete(item: IBooking): Promise<any>{
        return new Promise((resolve, reject) => {
            if (item && item.id) {
                this.parent.confirm({
                    title: `Cancel Booking?`,
                    message: `Cancel booking in ${item.room.name} on ${item.display.date} at ${item.display.start} for ${item.display.duration}`,
                    icon: 'delete',
                    accept: 'Ok',
                    cancel: true,
                }, (event) => {
                    if (event.type === 'Confirm') {
                        this.http.delete(`${this.parent.api_endpoint}/bookings/${item.id}`)
                            .subscribe(() => null, () => null, () => resolve('Succesfully deleted booking'));
                    } else {
                        reject('User cancelled');
                    }
                    event.close();
                });
            } else {
                reject('No ID');
            }
        });
    }

    public unattend(item: IBooking): Promise<any>{
        return new Promise((resolve, reject) => {
            if (item && item.id) {
                this.parent.confirm({
                    title: `Decline Attendance?`,
                    message: `Are you sure you won't be attending the meetingin at ${item.room.name} on ${item.display.date} at ${item.display.start}?`,
                    icon: 'delete',
                    accept: 'Ok',
                    cancel: true,
                }, (event) => {
                    if (event.type === 'Confirm') {
                        this.http.post(`${this.parent.api_endpoint}/bookings/unattend/${item.id}`)
                            .subscribe(() => null, () => null, () => resolve('Succesfully remove from booking attendees'));
                    } else {
                        reject('User cancelled');
                    }
                    event.close();
                });
            } else {
                reject('No ID');
            }
        });
    }

    public getWithID(id: string) {
        const list = this.get(`bookings`);
        for (const date in list) {
            if (list.hasOwnProperty(date)) {
                const bookings = list[date];
                for (const bkn of bookings) {
                    if (bkn.id === id) {
                        return bkn;
                    }
                }
            }
        }
        return null;
    }

    public processBookings(bookings: any[]): any[] {
        if (!bookings) { return []; }
        const list: any[] = [];
        const bld = this.parent.Buildings.current();
        const rooms = this.parent.Rooms.list();
        for (const bkn of bookings) {
            const start = moment(bkn.start_epoch * 1000 || bkn.start || bkn.Start);
            const end = moment(bkn.end_epoch * 1000 || bkn.end || bkn.End);
            const duration = moment.duration(start.diff(end));
            const item: IBooking = {
                id: bkn.id,
                title: bkn.title,
                date: start.valueOf(),
                duration: Math.abs(duration.asMinutes()),
                description: bkn.description,
                attendees: bkn.attendees,
                organiser: bkn.is_organiser,
                room: null,
                display: {
                    date: start.format('DD/MM/YYYY'),
                    time: `${start.format('h:mma')} - ${end.format('h:mma')}`,
                    start: start.format('h:mma'),
                    end: end.format('h:mma'),
                    duration: duration.humanize()
                }
            };
                // Get room associated with the booking
            if (rooms) {
                for (const rm of rooms) {
                    if (rm.email === bkn.room_id || rm.id === bkn.room_id) {
                        item.room = rm;
                        item.display.room = rm.name;
                        item.display.level = rm.level ? rm.level.name : '';
                        break;
                    }
                }
            }
            list.push(item);
        }
        list.sort((a, b) => a.date - b.date);
        return list;
    }

    private updateBookings(list: IBooking[]) {
        const bookings: any = {};
        for (const item of list) {
            const date = moment(item.date).format('DD/MM/YYYY');
            if (!bookings[date]) {
                bookings[date] = [];
            }
            bookings[date].push(item);
        }
        this.subjects.bookings.next(bookings);
    }
}
