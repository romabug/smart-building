import { OverlayContentComponent } from '@acaprojects/ngx-widgets';
import { Component } from '@angular/core';

import * as moment from 'moment';

@Component({
    selector: 'attendee-modal',
    templateUrl: './attendee-modal.template.html',
    styleUrls: ['./attendee-modal.styles.scss'],
})
export class AttendeeModalComponent extends OverlayContentComponent {
    public model: any = { form: {} };

    public init() {
        this.model.form = {};
        this.model.form.attendees = JSON.parse(JSON.stringify(this.model.attendees || []));
    }

    public close() {
        setTimeout(() => this.fn.close(), 300);
    }
}
