
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AppService } from '../../../services/app.service';

@Component({
    selector: 'view-meeting',
    templateUrl: './view-meeting.template.html',
    styleUrls: ['./view-meeting.styles.scss']
})
export class ViewMeetingComponent implements OnInit {
    public model: any = { form: {}, error: {}, display: {} };

    constructor(private route: ActivatedRoute, private service: AppService) {
        this.model.fields = [
            { id: 'room', name: 'Space', icon: 'room', description: '', type: 'select', fn: 'findRoom', required: true, check: 'checkRoom' },
            { id: 'attendees', name: 'Attendees', icon: 'people', description: '', type: 'select', fn: 'manageAttendees', required: true, check: 'checkAttendees' },
            { id: 'date', name: 'Date', icon: 'event', description: '', type: 'select', fn: 'selectDate', required: true, check: 'checkDate' },
            { id: 'duration', name: 'Time', icon: 'access_time', description: '', type: 'select', fn: 'selectTime', required: true, check: 'checkDuration' },
            { id: 'title', name: 'Meeting Subject', icon: 'label', description: '', type: 'text', required: true },
            { id: 'description', name: 'Meeting Description', icon: 'description', description: '', type: 'text' },
        ];
        this.route.paramMap.subscribe((params) => {
            if (params.has('id')) {
                this.model.id = params.get('id');
                this.loadBooking();
            }
            if (params.has('page')) {
                this.model.page = params.get('page');
            }
        });
    }

    public ngOnInit() {
        this.model.loading = true;
    }

    public loadBooking(tries: number = 0) {
        if (tries > 10) {
            return this.service.navigate('schedule');
        }
        this.model.booking = this.service.Bookings.getWithID(this.model.id);
        if (!this.model.booking) {
            return setTimeout(() => this.loadBooking(tries), 300 * ++tries);
        }
        this.model.loading = false;
        this.model.form = JSON.parse(JSON.stringify(this.model.booking));
    }

    public edit() {
        this.model.edit = true;
    }

    public save() {
        this.model.edit = false;
    }
}
