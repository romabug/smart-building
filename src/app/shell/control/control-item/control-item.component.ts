
import { Component, Input } from '@angular/core';

import { IRoom } from '../../../services/data/rooms.service';

@Component({
    selector: 'control-item',
    templateUrl: './control-item.template.html',
    styleUrls: ['./control-item.styles.scss']
})
export class ControlItemComponent {
    @Input() public item: IRoom;

    public control() {
        if (this.item.support_url) {
            window.open(this.item.support_url, 'blank_');
        }
    }
}
