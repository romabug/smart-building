
import { Component, Output, EventEmitter, OnInit } from '@angular/core';

import { AppService } from '../../../services/app.service';
import { IBuilding } from '../../../services/data/buildings.service';

@Component({
    selector: 'building-select',
    templateUrl: './building-select.template.html',
    styleUrls: ['./building-select.styles.scss']
})
export class BuildingSelectComponent implements OnInit {
    @Output() public event = new EventEmitter();

    public model: any = {};

    constructor(private service: AppService) {  }

    public ngOnInit() {
        this.init();
    }

    public init() {
        if (!this.service.Settings.setup) {
            return setTimeout(() => this.init(), 500);
        }
        this.model.current = this.service.Buildings.current();
        this.model.active = this.model.current;
        this.model.buildings = this.service.Buildings.list();
        if (!this.model.buildings || this.model.buildings.length <= 0) {
            return setTimeout(() => this.init(), 500);
        } else if (this.model.buildings.length === 1) {
            this.set(this.model.buildings[0]);
            this.select();
        }
        this.model.buildings.sort((a, b) => a.name.localeCompare(b.name));
    }

    public set(item: IBuilding) {
        this.model.active = item;
    }

    public select() {
        if (this.model.active) {
            this.service.Buildings.set(this.model.active.id);
            this.event.emit();
        }
    }
}
