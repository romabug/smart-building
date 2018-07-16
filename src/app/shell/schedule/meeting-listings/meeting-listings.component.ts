
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { AppService } from '../../../services/app.service';

import * as moment from 'moment';

@Component({
    selector: 'meeting-listings',
    templateUrl: './meeting-listings.template.html',
    styleUrls: ['./meeting-listings.styles.scss']
})
export class MeetingListingsComponent implements OnInit {
    @Input() public date = moment().valueOf();
    @Output() public view = new EventEmitter();

    public model: any = {};

    constructor(private service: AppService) { }

    public ngOnInit() {
        this.model.offset = 0;
        this.service.Bookings.listen('bookings', (list) => {
            const date = moment(this.date).format('DD/MM/YYYY');
            this.model.bookings = list[date] || [];
            this.processBookings();
        });
    }

    public viewEvent(item: any) {
        this.view.emit(item);
    }

    private processBookings() {
        this.model.list = [];
        for (const bkn of this.model.bookings) {
            const start = moment(bkn.date);
            const end = moment(start).add(bkn.duration, 'm');
            const attend_cnt = bkn.attendees ? bkn.attendees.length : 0;
            bkn.display = {
                date: start.format('MMM D'),
                cal: start.format('MMMM YYYY'),
                title: bkn.title,
                time: `${start.format('h:mma')} - ${end.format('h:mma')}`,
                desc: bkn.description,
                attend: attend_cnt ? `${attend_cnt} Attendee${attend_cnt === 1 ? '' : 's'}` : 'No attendees'
            };
            if (bkn.room) {
                bkn.display.location = `${bkn.room.name} - ${bkn.room.level.name}`;
            } else if (bkn.room_name) {
                bkn.display.location = `${bkn.room_name}${bkn.room_level ? ' - ' + bkn.room_level : ''}`;
            }
            if (bkn.attendees && bkn.attendees.length > 0) {
                const len = bkn.attendees.length;
                bkn.display.attend = `${len} Attendee${len > 1 ? 's' : ''}`;
            }
        }

    }
}
