
import { Component, OnInit } from '@angular/core';
import { AppService } from '../../services/app.service';

@Component({
    selector: 'app-control',
    templateUrl: './control.template.html',
    styleUrls: ['./control.styles.scss']
})
export class ControlComponent implements OnInit {
    public model: any = {};

    constructor(private service: AppService) { }

    public ngOnInit() {
        this.model.settings = {};
        this.init();
    }

    public init() {
        this.model.loading = true;
        if (!this.service.Settings.setup) {
            return setTimeout(() => this.init(), 500);
        }
        this.service.Rooms.listen('room_list', (rooms) => {
            this.model.loading = false;
            this.model.items = rooms || [];
            this.filter();
        });
        this.model.route = this.service.Settings.get('app.style.popout');
        this.model.settings = this.service.Settings.get('app.control') || {};
    }
    public filter() {
        this.model.filtered_items = [];
        if (this.model.search) {
            const search = (this.model.search || '').toLowerCase();
            for (const item of this.model.items) {
                const name = item.name ? item.name.toLowerCase() : '';
                const level = item.level && item.level.name ? item.level.name.toLowerCase() : '';
                if (name.indexOf(search) >= 0 || level.indexOf(search) >= 0) {
                    this.model.filtered_items.push(item);
                }
            }
        } else {
            this.model.filtered_items = this.model.filtered_items.concat(this.model.items || []);
        }
    }

    public close() {
        this.model.search = '';
        this.filter();
    }
}
