/*
* @Author: Alex Sorafumo
* @Date:   2017-05-17 12:49:52
 * @Last Modified by: Alex Sorafumo
 * @Last Modified time: 2018-03-21 14:20:46
*/

import { Component, EventEmitter, Input, Output, OnInit, OnChanges } from '@angular/core';

import { AppService } from '../../../services/app.service';

import * as moment from 'moment';

@Component({
    selector: 'user-search',
    templateUrl: './user-search.template.html',
    styleUrls: ['./user-search.styles.scss'],
})
export class UserSearchComponent implements OnInit, OnChanges {
    @Input() public users: any[] = [];
    @Input() public modal = false;
    @Output() public usersChange: any = new EventEmitter();
    @Output() public close: any = new EventEmitter();

    public model: any = {};

    constructor(private service: AppService) { }

    public ngOnInit() {
        this.model.users = this.users || [];
        this.model.state = !this.users || this.users.length <= 0 ? 'select' : 'display';
        setTimeout(() => this.init(), 100);
    }

    public ngOnChanges(changes: any) {
        if (changes.users) {
            setTimeout(() => {
                this.model.users = this.users || [];
                for (let i = 0; i < this.model.users.length; i++) {
                    if (!this.model.users[i]) { this.model.users.splice(i--, 1); }
                }
                this.model.state = !this.users || this.users.length <= 0 ? 'select' : 'display';
            }, 100);
        }
    }

    public init() {
        if (!this.service.Settings.setup) {
            return setTimeout(() => this.init(), 500);
        }
        this.model.route = this.service.Settings.get('app.style.popout');
    }

    public closeSearch() {
        setTimeout(() => this.close.emit(), 300);
    }

    public confirm() {
        const list: any[] = [];
        if (this.model.users) {
            for (const item of this.model.users) {
                if (item.select) { list.push(item); }
            }
        }
        this.users = list;
        this.usersChange.emit(list);
        this.closeSearch();
    }

}
