
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AppService } from '../../../services/app.service';

@Component({
    selector: 'space-search',
    templateUrl: './space-search.template.html',
    styleUrls: ['./space-search.styles.scss'],
})
export class SpaceSearchComponent implements OnInit {
    @Input() public model: any = null;
    @Output() public modelChange: any = new EventEmitter();
    public search = '';
    public state: any = {};
    public filtered_items: any[] = [];

    public items: any[] = [];

    constructor(private service: AppService, private route: ActivatedRoute) { }

    public ngOnInit() {
        this.service.Rooms.listen('room_list', (rooms) => {
            this.state.items = rooms || [];
            this.filter();
        });
        this.init();
    }

    public init() {
        if (!this.service.Settings.setup) {
            return setTimeout(() => this.init(), 500);
        }
        this.state.route = this.service.Settings.get('app.style.popout');
    }

    public filter() {
        this.filtered_items = [];
        if (this.search) {
            const search = (this.search || '').toLowerCase();
            for (const item of this.state.items) {
                const name = item.name ? item.name.toLowerCase() : '';
                const level = item.level && item.level.name ? item.level.name.toLowerCase() : '';
                if (name.indexOf(search) >= 0 || level.indexOf(search) >= 0) {
                    this.filtered_items.push(item);
                }
            }
        } else {
            this.filtered_items = this.filtered_items.concat(this.state.items || []);
        }
    }

    public find(item: any) {
        this.model = item;
        this.search = item.name;
        this.modelChange.emit(item);
    }

    public close() {
        this.search = '';
        this.model = null;
        this.modelChange.emit(this.model);
    }
}
