import { OverlayContentComponent } from '@acaprojects/ngx-widgets';
import { Component } from '@angular/core';

import * as moment from 'moment';

@Component({
    selector: 'calendar-modal',
    templateUrl: './calendar-modal.template.html',
    styleUrls: ['./calendar-modal.styles.scss'],
})
export class CalendarModalComponent extends OverlayContentComponent {
    public model: any = { form: {} };

    public init() {
        this.model.form = {};
        this.model.form.date = this.model.date || moment().valueOf();
    }

    public close() {
        setTimeout(() => this.fn.close(), 300);
    }

    public event(name: string) {
        setTimeout(() => this.fn.event(name), 300);
    }
}
