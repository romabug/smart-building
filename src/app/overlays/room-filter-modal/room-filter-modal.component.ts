import { OverlayContentComponent } from '@acaprojects/ngx-widgets';
import { Component, OnInit } from '@angular/core';

import * as moment from 'moment';
import { IBuilding } from '../../services/data/buildings.service';

@Component({
    selector: 'room-filter-modal',
    templateUrl: './room-filter-modal.template.html',
    styleUrls: ['./room-filter-modal.styles.scss'],
})
export class RoomFilterModalComponent extends OverlayContentComponent {
    public model: any = {};

    public init() {

    }

    public event(name: string) {
        setTimeout(() => this.fn.event(name), 300);
    }

    public close() {
        setTimeout(() => this.fn.close(), 300);
    }
}
