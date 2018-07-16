
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';

import * as moment from 'moment';

import { IBooking } from '../../../services/data/bookings.service';
import { AppService } from '../../../services/app.service';
import { FormChecks } from './form-checks.class';

@Component({
    selector: 'booking-form',
    templateUrl: './booking-form.template.html',
    styleUrls: ['./booking-form.styles.scss']
})
export class BookingFormComponent implements OnInit, OnChanges {
    @Input() public booking: IBooking;
    @Input() public validate: boolean;
    @Input() public edit = true;
    @Input() public fresh = true;
    @Input() public model: any = { form: {}, error: {}, display: {} };
    @Output() public modelChange = new EventEmitter();
    @Output() public valid = new EventEmitter();
    @Output() public event = new EventEmitter();

    constructor(private service: AppService) { }

    public ngOnInit() {
        this.model.fields = [
            { id: 'room', name: 'Space', icon: 'room', description: '', type: 'select', event: true, required: true, check: 'checkRoom' },
            { id: 'attendees', name: 'Attendees', icon: 'people', description: '', type: 'select', event: true, required: true, check: 'checkAttendees' },
            { id: 'date', name: 'Date', icon: 'event', description: '', type: 'select', fn: 'selectDate', required: true, check: 'checkDate' },
            { id: 'duration', name: 'Time', icon: 'access_time', description: '', type: 'select', fn: 'selectTime', required: true, check: 'checkDuration' },
            { id: 'title', name: 'Meeting Subject', icon: 'label', description: '', type: 'text', required: true },
            { id: 'description', name: 'Meeting Description', icon: 'description', description: '', type: 'text' },
        ];
        this.model.show = {};
        this.model.focus = {};
        this.model.enable = {};
        if (!this.model.form) { this.model.form = {}; }
        if (!this.model.error) { this.model.error = {}; }
        if (!this.model.display) { this.model.display = {}; }
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
        if (!this.model.form.duration) { this.model.form.duration = 60; }
        if (!this.model.form.reccur) { this.model.form.reccur = 0; }
        this.model.show.recurrence = true;
        this.init();
        this.initBld();
    }

    public ngOnChanges(changes: any) {
        if (changes.validate) {
            this.checkFields();
        }
        if (changes.booking) {
            this.model.form = JSON.parse(JSON.stringify(this.booking));
            this.updateDisplay();
            this.checkFields();
        }
    }

    public init() {
        if (!this.service.Settings.setup) {
            setTimeout(() => this.init(), 500);
        }
        this.model.enable.recurrence = this.service.Settings.get('app.recurrence');
        this.model.min_attendees = this.service.Settings.get('app.booking.min_attendees');
        this.generateWeek();
        this.updateDisplay();
        this.checkFields();
    }

    public initBld() {
        this.model.bld = this.service.Buildings.current();
        if (!this.model.bld) {
            return setTimeout(() => this.initBld(), 500);
        }
    }

    public postEvent(id: string) {
        this.event.emit(id);
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
                    this.checkFields();
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
                    this.checkFields();
                }
                event.close();
            }));
    }

    public clearStore() {
        if (localStorage) {
            localStorage.removeItem(`STAFF.${this.booking ? 'edit_' : ''}booking_form`);
        }
    }

    public storeForm() {
        if (localStorage) {
            localStorage.setItem(`STAFF.${this.booking ? 'edit_' : ''}booking_form`, JSON.stringify(this.model.form));
        }
    }

    public loadForm() {
        if (localStorage) {
           this.model.form = JSON.parse(localStorage.getItem(`STAFF.${this.booking ? 'edit_' : ''}booking_form`) || '{}');
        }
        FormChecks.checkAttendees(this.model);
        this.updateDisplay();
        this.checkFields();
    }

    public toggleBlock(name: string) {
        if (!this.model.show) {
            this.model.show = {};
        }
        this.model.show[name] = !this.model.show[name];
    }

    public checkFields() {
        if (!this.model.fields) { return true; }
        let valid = true;
        this.model.error = {};
        for (const f of this.model.fields) {
            if (f.required && !this.model.form[f.id]) {
                this.model.error[f.id] = { message: `${f.name} is required` };
            } else if (f.check instanceof Function) {
                this.model.error[f.id] = f.check(this.model);
            } else if (f.check && FormChecks[f.check] instanceof Function) {
                this.model.error[f.id] = FormChecks[f.check](this.model);
            }
            valid = valid && !this.model.error[f.id];
        }
        this.modelChange.emit(this.model);
        this.valid.emit(valid);
        if (this.fresh) {
            this.model.error = {};
        }
        return valid;
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
                if (form.room.capacity) {
                    this.model.display.room += `(${form.room.capacity} ${form.room.capacity === 1 ? 'Person' : 'People'})`;
                }
            }
            if (form.attendees) {
                if (form.attendees.length > 0) {
                    this.model.display.attendees = `${form.attendees.length} Attendee${form.attendees.length === 1 ? '' : 's'}; `;
                    let start = false;
                    for (const user of form.attendees) {
                        if (start) {
                            this.model.display.attendees += ', ';
                        } else {
                            start = true;
                        }
                        this.model.display.attendees += user.name;
                    }
                } else {
                    this.model.display.attendees = 'No Attendees selected';
                }
            }
        }
    }
}
