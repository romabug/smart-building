import { OverlayContentComponent } from '@acaprojects/ngx-widgets';
import { Component } from '@angular/core';

import * as moment from 'moment';

@Component({
    selector: 'time-period-modal',
    templateUrl: './time-period-modal.template.html',
    styleUrls: ['./time-period-modal.styles.scss'],
})
export class TimePeriodModalComponent extends OverlayContentComponent {
    public model: any = {};

    public init() {
        this.model.form = {};
        this.model.display = {};
        this.model.focus = {};
        if (!this.model.duration) {
            this.model.duration = 60;
        }
        const now = moment();
        now.minutes(Math.ceil(now.minutes() / 5) * 5);
            // Set start and end times
        this.model.form.start = this.model.start || now.format('HH:mm');
        this.model.form.end = this.model.end || now.add(this.model.duration, 'm').format('HH:mm');
            // Setup duration
        if (this.model.form.start && this.model.form.end) {
            const start = moment().hours(this.model.start.split(':')[0]).minutes(this.model.start.split(':')[1]);
            const end = moment().hours(this.model.end.split(':')[0]).minutes(this.model.end.split(':')[1]);
            this.model.duration = Math.floor(Math.abs(moment.duration(start.diff(end)).asMinutes()));
        }
        this.updateDisplay();
    }

    public close() {
        setTimeout(() => this.fn.close(), 300);
    }

    public event(name: string) {
        const start = moment().hours(this.model.form.start.split(':')[0]).minutes(this.model.form.start.split(':')[1]);
        start.minutes(Math.ceil(start.minutes() / 5) * 5);
        this.model.form.start = start.format('HH:mm');
        const end = moment(start).add(this.model.duration, 'm');
        this.model.form.end = end.format('HH:mm');
        setTimeout(() => this.fn.event(name), 300);
    }

    public adjustDuration() {
        if (this.model.form.end) {
            const start = moment().hours(this.model.form.start.split(':')[0]).minutes(this.model.form.start.split(':')[1]);
            start.minutes(Math.ceil(start.minutes() / 5) * 5);
            const end = moment().hours(this.model.form.end.split(':')[0]).minutes(this.model.form.end.split(':')[1]);
            end.minutes(Math.ceil(end.minutes() / 5) * 5);
            if (start.isAfter(end, 'm')) {
                end.add(1, 'd');
            }
            this.model.duration = Math.floor(Math.abs(moment.duration(start.diff(end)).asMinutes()));
        }
        this.updateDisplay();
    }

    public adjustEnd() {
        if (this.model.form.start) {
            const start = moment().hours(this.model.form.start.split(':')[0]).minutes(this.model.form.start.split(':')[1]);
            start.minutes(Math.ceil(start.minutes() / 5) * 5);
            const end = moment(start).add(this.model.duration, 'm');
            end.minutes(Math.ceil(end.minutes() / 5) * 5);
            this.model.form.end = end.format('HH:mm');
        }
        this.updateDisplay();
    }

    public updateDisplay() {
        const d = moment.duration(this.model.duration, 'm').humanize().replace('an', '1');
        this.model.display.duration = d;
        if (this.model.duration % 60 !== 0 && this.model.duration > 60) {
            this.model.display.duration += `, ${moment.duration(this.model.duration % 60, 'm').humanize()}`;
        }
    }
}
