/*
 * @Author: Alex Sorafumo
 * @Date:   2017-05-16 14:12:48
 * @Last Modified by: Alex Sorafumo
 * @Last Modified time: 2018-05-21 12:32:24
 */

import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';

import * as faker from 'faker';
import * as moment from 'moment';

import { AppService } from '../../services/app.service';
import { IBooking } from '../../services/data/bookings.service';

@Component({
    selector: 'app-schedule',
    templateUrl: './schedule.template.html',
    styleUrls: ['./schedule.styles.scss'],
})
export class ScheduleComponent implements OnInit {
    public model: any = {};

    constructor(private service: AppService) {  }

    public ngOnInit() {
        this.model.dates = [];
        this.init();
    }

    public init() {
        if (!this.service.Settings.setup) {
            return setTimeout(() => this.init(), 500);
        }
        this.model.day_count = this.service.Settings.get('app.schedule_length') || 14;
        this.loadBookings();
    }

    public loadBookings() {
        this.model.dates = [];
        const now = moment();
        const date = moment();
        for (let i = 0; i < this.model.day_count; i++) {
            const date_obj = {
                count: 0,
                display: now.isSame(date, 'd') ? 'Today' : date.format('ddd, MMM Do'),
                date: date.format('DD/MM/YYYY'),
                value: date.valueOf()
            };
            this.model.dates.push(date_obj);
            date.add(1, 'd');
        }
        this.service.Bookings.listen(`bookings`, (list) => {
            for (const day of this.model.dates) {
                day.count = (list[day.date] || []).length;
            }
        });
    }

    public view(item: IBooking) {
        if (item && item.id) {
            this.service.navigate(['schedule', 'view', item.id]);
        }
    }

}
