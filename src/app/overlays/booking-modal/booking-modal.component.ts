import { OverlayContentComponent } from '@acaprojects/ngx-widgets';
import { Component, OnInit } from '@angular/core';

import * as moment from 'moment';

@Component({
    selector: 'booking-modal',
    templateUrl: './booking-modal.template.html',
    styleUrls: ['./booking-modal.styles.scss'],
})
export class BookingModalComponent extends OverlayContentComponent implements OnInit {
    public model: any = {};

    public close() {
        setTimeout(() => this.fn.close(), 300);
    }

    public ngOnInit() {
        this.model.fields = [
            { id: 'room', name: 'Space', icon: 'room', description: '', type: 'select', required: true, check: 'checkRoom' },
            { id: 'attendees', name: 'Attendees', icon: 'people', description: '', type: 'select', fn: 'manageAttendees', required: true, check: 'checkAttendees' },
            { id: 'date', name: 'Date', icon: 'event', description: '', type: 'select', fn: 'selectDate', required: true, check: 'checkDate' },
            { id: 'duration', name: 'Time', icon: 'access_time', description: '', type: 'select', fn: 'selectTime', required: true, check: 'checkDuration' },
            { id: 'title', name: 'Title', icon: 'label', description: '', type: 'text', required: true },
            { id: 'description', name: 'Description', icon: 'description', description: '', type: 'text' },
        ];
        this.model.show = {};
        this.model.focus = {};
        this.model.enable = {};
        this.model.error = {};
        this.model.display = {};
        if (!this.model.form) {
            this.model.form = {};
        }
        if (!this.model.form.date) {
            const now = moment();
            now.minutes(Math.ceil(now.minutes() / 5) * 5).seconds(0).milliseconds(0);
            this.model.form.date = now.valueOf();
        } else {
            const date = moment(this.model.form.date);
            if (date.isBefore(moment(), 'm')) {
                const now = moment();
                now.minutes(Math.ceil(now.minutes() / 5) * 5).seconds(0).milliseconds(0);
                this.model.form.date = now.valueOf();
            }
        }
        if (!this.model.form.duration) {
            this.model.form.duration = 60;
        }
        this.generateWeek();
        this.updateDisplay();
        this.initBld();
    }

    public init() {
        const user = this.service.Users.current();
        if (!this.service.Settings.setup || !user) {
            setTimeout(() => this.init(), 500);
        }
        this.model.user = user;
    }

    public initBld() {
        this.model.bld = this.service.Buildings.current();
        if (!this.model.bld) {
            return setTimeout(() => this.initBld(), 500);
        }
    }

    public generateWeek() {
        this.model.week = [];
        if (!this.model.form.date) {
            const today = moment().hours(0).minutes(0).seconds(0).milliseconds(1);
            today.minutes(Math.ceil(today.minutes() / 5) * 5).seconds(0).milliseconds(0);
            this.model.form.date = today.valueOf();
        }
        const selected = moment(this.model.form.date);
        const date = moment(this.model.form.date);
        const now = moment();
        for (let i = 0; i < 7; i++) {
            date.day(i);
            this.model.week.push({
                day: date.format('ddd'),
                date: date.date(),
                value: date.valueOf(),
                past: date.isBefore(now, 'd'),
                active: date.isSame(selected, 'd'),
                weekend: i === 0 || i === 6
            });
        }
    }

    public manageAttendees() {
        this.service.Overlay.openModal('attendees', { data: { attendees: this.model.form.attendees } })
            .then((inst: any) => inst.subscribe((event: any) => {
                if (event.type === 'Change') {
                    this.model.form.attendees = event.data.form.attendees || [];
                    this.model.error.attendees = null;
                    this.updateDisplay();
                }
                event.close();
            }));
    }

    public selectDay(day: any) {
        const now = moment();
        now.minutes(Math.ceil(now.minutes() / 5) * 5).seconds(0).milliseconds(0);
        const current = moment(this.model.form.date);
        const new_date = moment(day.value);
        new_date.hours(current.hours()).minutes(current.minutes());
        if (new_date.isBefore(now)) {
            new_date.hours(now.hours()).minutes(now.minutes());
        }
        this.model.form.date = new_date.valueOf();
        this.model.error.date = null;
        this.generateWeek();
        this.updateDisplay();
    }

    public selectDate() {
        const now = moment();
        now.minutes(Math.ceil(now.minutes() / 5) * 5).seconds(0).milliseconds(0);
        if (!this.model.form.date) {
            this.model.form.date = now.valueOf();
        }
        const date = moment(this.model.form.date);
        this.service.Overlay.openModal('calendar', { data: { date: this.model.form.date } })
            .then((inst: any) => inst.subscribe((event) => {
                if (event.type === 'Accept') {
                    if (event.data.form && event.data.form.date) {
                        const new_date = moment(event.data.form.date).hours(date.hours()).minutes(date.minutes())
                            .seconds(0).milliseconds(0);
                        this.model.form.date = new_date.valueOf();
                        this.model.error.date = null;
                    }
                    this.generateWeek();
                    this.updateDisplay();
                }
                event.close();
            }));
    }

    public selectTime() {
        if (!this.model.form.date) {
            const now = moment();
            now.minutes(Math.ceil(now.minutes() / 5) * 5).seconds(0).milliseconds(0);
            this.model.form.date = now.valueOf();
        }
        if (!this.model.form.duration) {
            this.model.form.duration = 60;
        }
        const bkn_date = moment(this.model.form.date);
        const bkn_end = moment(bkn_date).add(this.model.form.duration, 'm');
        const start_time = bkn_date.format('HH:mm');
        const end_time = bkn_end.format('HH:mm');
        this.service.Overlay.openModal('time-period', { data: { start: start_time, end: end_time } })
            .then((inst: any) => inst.subscribe((event) => {
                if (event.type === 'Accept') {
                    const form = event.data.form;
                    const new_start = form.start.split(':');
                    const new_end = form.end.split(':');
                    const start = moment(bkn_date);
                    start.hours(new_start[0]).minutes(new_start[1]);
                    const end = moment(bkn_date);
                    end.hours(new_end[0]).minutes(new_end[1]);
                    this.model.form.date = start.valueOf();
                    this.model.form.duration = Math.floor(Math.abs(moment.duration(start.diff(end)).asMinutes()));
                    this.model.error.duration = null;
                    this.updateDisplay();
                }
                event.close();
            }));
    }

    public book() {
        this.model.booking = true;
        this.checkAttendees();
        if (this.checkFields()) {
            this.service.Rooms.isAvailable(this.model.form.room.id, this.model.form.date, this.model.form.duration)
                .then(() => {
                    this.model.booking = false;
                    this.service.Bookings.book(this.model.form).then(() => {
                        this.model.processing = true;
                        const booking = this.service.Bookings.listen('new_booking', (value: any) => {
                            if (value.state === 'success') {
                                this.service.navigate(`book/results`, { back: 'explore/spaces' });
                                this.fn.close();
                                this.model.processing = false;
                            } else if (value.state === 'error') {
                                this.service.error('An error occurred while making your booking');
                                this.model.processing = false;
                            } else if (value.state !== 'processing') {
                                if (booking) {
                                    booking.unsubscribe();
                                }
                                this.model.processing = false;
                            }
                        });
                    }, () => null);
                }, () => {
                    this.model.booking = false;
                    const start = moment(this.model.form.date);
                    const date = start.format('MMM Do, YYYY');
                    const end = moment(start).add(this.model.form.duration, 'm');
                    this.model.error.room = {
                        message: `The selected space is not free from ${start.format('h:mma')} to ${end.format('h:mma')} on ${date}`
                    };
                });
        } else {
            this.model.booking = false;
        }
    }

    public checkFields() {
        let valid = true;
        this.model.error = {};
        for (const f of this.model.fields) {
            if (f.required && !this.model.form[f.id]) {
                this.model.error[f.id] = { message: `${f.name} ${f.name[f.name.length - 1] === 's' ? 'are' : 'is'} required` };
            } else if (f.check && this[f.check] instanceof Function) {
                this.model.error[f.id] = this[f.check](this.model.form[f.id]);
            }
            valid = valid && !this.model.error[f.id];
        }
        return valid;
    }

    private checkAttendees() {
        if (this.model.form && this.model.form.attendees) {
            if (this.model.form.room) {
                const rm = this.model.form.room;
                const peeps = this.model.form.attendees;
                if (!this.model.error) { this.model.error = {}; }
                const warn = rm.capacity && rm.capacity <= peeps.length;
                if (warn) {
                    const error = {
                        warn,
                        message: `There are more attendess than the capacity of the space(${rm.capacity})`,
                    };
                    this.model.error.attendees = error;
                    return error;
                }
            }
            if (this.model.form.attendees.length < this.model.min_attendees) {
                return { message: `Minimum of ${this.model.min_attendees} attendee${this.model.min_attendees > 1 ? 's' : ''} is required` };
            }
        } else if (this.model.min_attendees) {
            return { message: `Minimum of ${this.model.min_attendees} attendee${this.model.min_attendees > 1 ? 's' : ''} is required` };
        }
    }

    public checkDate(d: number) {
        const now = moment();
        const date = moment(d);
        if (date.isBefore(now, 'm')) {
            return { message: 'Booking needs to be made in the future' };
        }
        return null;
    }

    public toggleBlock(name: string) {
        if (!this.model.show) {
            this.model.show = {};
        }
        this.model.show[name] = !this.model.show[name];
    }

    public clearStore() {
        if (localStorage) {
            localStorage.removeItem('STAFF.booking_form');
        }
    }

    public storeForm() {
        if (localStorage) {
            localStorage.setItem('STAFF.booking_form', JSON.stringify(this.model.form));
        }
    }

    public loadForm() {
        if (localStorage) {
           this.model.form = JSON.parse(localStorage.getItem('STAFF.booking_form') || '{}');
        }
    }

    public cancel() {
        this.clearStore();
        this.fn.event('Cancel');
    }

    private updateDisplay() {
        if (this.model.form) {
            this.storeForm();
            const form = this.model.form;
            this.model.display = {};
            if (form.date) {
                const date = moment(form.date);
                this.model.display.date = date.format('dddd, Do MMMM, YYYY');
                if (form.duration) {
                    const end = moment(date).add(form.duration, 'm');
                    const duration = moment.duration(form.duration, 'm');
                    let d = duration.humanize().replace('an', '1');
                    if (form.duration % 60 !== 0 && form.duration > 60) {
                        d += `, ${moment.duration(form.duration % 60, 'm').humanize()}`;
                    }
                    this.model.display.duration = `${date.format('h:mma')} – ${end.format('h:mma')}(${d})`;
                }
            }
            if (form.room) {
                this.model.display.room = form.room.name;
            }
            if (form.attendees) {
                if (form.attendees.length > 0) {
                    this.model.form.attendees.unshift(this.model.user);
                    this.model.display.attendees = `${form.attendees.length} Attendee${(form.attendees.length + 1) === 1 ? '' : 's'}; `;
                    let start = false;
                    for (const user of form.attendees) {
                        if (start) {
                            this.model.display.attendees += ', ';
                        } else {
                            start = true;
                        }
                        this.model.display.attendees += user ? user.name : 'You';
                    }
                    this.model.form.attendees.shift();
                } else {
                    this.model.display.attendees = 'No Attendees selected';
                }
            }
        }
    }
}
