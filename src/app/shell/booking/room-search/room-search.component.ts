
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AppService } from '../../../services/app.service';
import { ILevel, IBuilding } from '../../../services/data/buildings.service';
import { IRoom } from '../../../services/data/rooms.service';

import * as moment from 'moment';

export interface IRoomFilters {
    level?: ILevel;
    date?: number;
    duration?: number;
    capacity?: number;
    extras?: string[];
}

@Component({
    selector: 'room-search',
    templateUrl: './room-search.template.html',
    styleUrls: ['./room-search.styles.scss'],
})
export class RoomSearchComponent implements OnInit {
    @Input() public model: any = null;
    @Input() public filters: IRoomFilters;
    @Output() public modelChange: any = new EventEmitter();
    @Output() public filtersChange: any = new EventEmitter();
    public state: any = {};
    public filtered_items: any[] = [];

    public items: any[] = [];

    constructor(private service: AppService, private route: ActivatedRoute) { }

    public ngOnInit() {
        this.state.show = {};
        this.state.level = {};
        this.state.error = {};
        this.state.capacity = {
            names: [],
            list: [{ id: 0, name: 'Any Capacity' }],
            index: 0
        };
        this.state.form = JSON.parse(JSON.stringify(this.filters || {}));
        if (!this.state.form.date) {
            const now = moment();
            now.minutes(Math.ceil(now.minutes() / 5) * 5).seconds(0).milliseconds(0);
            this.state.form.date = now.valueOf();
        }
        if (!this.state.form.duration) {
            this.state.form.duration = 60;
        }
        this.updateBooking();
        this.updateDisplay();
        this.init();
    }

    public init() {
        if (!this.service.Settings.setup) {
            return setTimeout(() => this.init(), 500);
        }
        this.service.Buildings.listen((bld: IBuilding) => {
            if (bld) {
                const active = this.state.level ? this.state.level.active : null;
                this.state.level = {};
                this.state.extras = bld.extras;
                this.state.level.index = 0;
                this.state.level.list = [{id: -1, name: 'Any Level'}, ...bld.levels];
                if (this.state.level.list) {
                    this.state.level.names = [];
                    for (const lvl of this.state.level.list) {
                        this.state.level.names.push(lvl.name);
                    }
                }
            }
        });
        for (let i = 1; i < 100; i += i) {
            this.state.capacity.list.push({ id: i, name: `${i} ${i === 1 ? 'Person' : 'People'}` });
        }
        for (const cap of this.state.capacity.list) {
            this.state.capacity.names.push(cap.name);
        }
        this.service.Rooms.listen('room_list', (list) => {
            this.state.rooms = list;
            this.search();
        });
        this.state.route = this.service.Settings.get('app.style.popout');
    }

    public selectDate() {
        const now = moment();
        now.minutes(Math.ceil(now.minutes() / 5) * 5).seconds(0).milliseconds(0);
        if (!this.state.form.date) {
            this.state.form.date = now.valueOf();
        }
        const date = moment(this.state.form.date);
        this.service.Overlay.openModal('calendar', { data: { date: this.state.form.date } })
            .then((inst: any) => inst.subscribe((event) => {
                if (event.type === 'Accept') {
                    if (event.data.form && event.data.form.date) {
                        const new_date = moment(event.data.form.date).hours(date.hours()).minutes(date.minutes())
                            .seconds(0).milliseconds(0);
                        this.state.form.date = new_date.valueOf();
                        this.state.error.date = null;
                    }
                    this.updateBooking();
                    this.search();
                    this.updateDisplay();
                }
                event.close();
            }));
    }

    public selectTime() {
        if (!this.state.form.date) {
            const now = moment();
            now.minutes(Math.ceil(now.minutes() / 5) * 5).seconds(0).milliseconds(0);
            this.state.form.date = now.valueOf();
        }
        if (!this.state.form.duration) {
            this.state.form.duration = 60;
        }
        const bkn_date = moment(this.state.form.date);
        const bkn_end = moment(bkn_date).add(this.state.form.duration, 'm');
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
                    this.state.form.date = start.valueOf();
                    this.state.form.duration = Math.floor(Math.abs(moment.duration(start.diff(end)).asMinutes()));
                    this.state.error.duration = null;
                    this.updateBooking();
                    this.search();
                    this.updateDisplay();
                }
                event.close();
            }));
    }

    public search() {
        if (!this.service.Buildings.current()) {
            setTimeout(() => this.search(), 300);
        }
        this.state.loading = true;
        this.service.Rooms.available(this.state.form.date, this.state.form.duration)
            .then((list) => {
                this.state.items = this.state.in_use || this.state.form.in_use ? this.state.rooms : list;
                this.state.search_results = list;
                this.filter();
                this.state.loading = false;
            }, (err) => this.state.loading = false);
    }

    public changeFilters() {
        this.service.Overlay.openModal('room-filter', { data: JSON.parse(JSON.stringify(this.state)) })
            .then((inst: any) => inst.subscribe((event) => {
                if (event.type === 'Update') {
                    this.state.level.index = event.data.level.index;
                    this.state.capacity.index = event.data.capacity.index;
                    this.state.form.in_use = event.data.form.in_use;
                    this.state.extras = event.data.extras;
                    this.state.items = this.state.in_use || this.state.form.in_use ? this.state.rooms : this.state.search_results;
                    this.filter();
                } else {
                    event.close();
                }
            }));
    }

    public filter() {
        this.state.loading = true;
        this.filtered_items = [];
        if (this.state.level && this.state.level.list) {
                // Set level
            const level = this.state.level.index ? this.state.level.list[this.state.level.index] : this.state.level.list[0];
                // Set Capcaity
            const capacity = this.state.capacity.index ? this.state.capacity.list[this.state.capacity.index] : this.state.capacity.list[0];
            for (const item of this.state.items) {
                let match = true;
                    // Check levels
                match = match && (level.id === -1 || item.level.id === level.id);
                    // Check capacity
                match = match && (capacity.id === 0 || item.capacity >= capacity.id);
                for (const e of this.state.extras) {
                    match = match && (!e.active || (item.extras && item.extras.indexOf(e.id) >= 0));
                }
                if (match) { this.filtered_items.push(item); }
            }
        } else {
            this.filtered_items = this.filtered_items.concat(this.state.items || []);
        }
        this.state.loading = false;
    }

    public find(item: IRoom) {
        this.service.navigate('explore/spaces', {
            room_id: item.id,
            back: `book/room`
        });
    }

    public select(item: IRoom) {
        this.model = item;
        this.modelChange.emit(item);
        this.filtersChange.emit(this.state.form);
    }

    public back() {
        this.modelChange.emit(this.model);
    }

    public close() {
        this.model = null;
        this.modelChange.emit(this.model);
    }

    public bookingChange(e: any) {
        this.state.form.date = moment(e.start).hours(Math.floor(e.start_hours)).minutes((e.start_hours * 60) % 60).valueOf();
        this.updateDisplay();
        this.search();
    }

    public updateBooking() {
        const start = moment(this.state.form.date);
        const end = moment(start).add(this.state.form.duration, 'm');
        this.state.booking = {
            start: start.valueOf(),
            end: end.valueOf(),
            start_hours: start.hours() + start.minutes() / 60,
            end_hours: end.hours() + end.minutes() / 60,
            duration: this.state.form.duration / 60
        };
    }

    public updateDisplay() {
        this.state.display = {};
        const form = this.state.form;
        if (form.date) {
            const date = moment(form.date);
            this.state.display.date = date.format('MMM Do, YYYY');
            this.state.date = moment().isSame(date, 'd') ? 'Today' : date.format('DD MMM YYYY');
            if (form.duration) {
                const end = moment(date).add(form.duration, 'm');
                let duration = moment.duration(form.duration, 'm').humanize().replace('an', '1');
                if (form.duration % 60) {
                    duration = form.duration > 60 ? `${Math.floor(form.duration / 60)}h` : '';
                    duration += ` ${Math.floor(form.duration % 60)}m`;
                }
                this.state.display.duration = `${date.format('h:mma')}, ${duration}`;
            }
        }
    }
}
