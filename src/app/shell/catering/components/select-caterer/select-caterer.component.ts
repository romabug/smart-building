
import { Component, Input, Output, EventEmitter } from '@angular/core';

import { AppService } from '../../../../services/app.service';
import { ICaterer } from '../../../../services/data/catering.service';

@Component({
    selector: 'select-caterer',
    templateUrl: './select-caterer.template.html',
    styleUrls: ['./select-caterer.styles.scss']
})
export class SelectCatererComponent {
    @Input() public caterer: ICaterer = null;
    @Output() public catererChange = new EventEmitter();

    public model: any = {};

    private timers: any = {};

    constructor(private service: AppService) {
        this.service.Catering.listen('caterers', (list) => {
            this.model.caterers = list;
        });
    }

    public select(item) {
        this.caterer = item;
        this.catererChange.emit(this.caterer);
    }
}
