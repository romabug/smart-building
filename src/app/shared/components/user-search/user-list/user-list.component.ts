/*
* @Author: Alex Sorafumo
* @Date:   2017-05-17 12:49:52
 * @Last Modified by: Alex Sorafumo
 * @Last Modified time: 2018-03-21 14:20:46
*/

import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, OnChanges } from '@angular/core';

import { AppService } from '../../../../services/app.service';
import { IUser } from '../../../../services/data/users.service';

import * as moment from 'moment';

@Component({
    selector: 'user-search-list',
    templateUrl: './user-list.template.html',
    styleUrls: ['./user-list.styles.scss'],
})
export class UserSearchListComponent implements OnChanges {
    @Input() public users: any[] = [];
    @Input() public search: string;
    @Input() public modal: boolean;
    @Output() public usersChange = new EventEmitter();

    public model: any = {};

    private timers: any = {};
    @ViewChild('list') private list: ElementRef;

    constructor(private service: AppService) {
        this.model.groups = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        this.service.Users.listen('user_list', (list) => {
            this.model.users = list || [];
            this.model.users.sort((a, b) => a.name.localeCompare(b.name));
            this.filter();
            this.model.loading = false;
        });
        this.processUsers([]);
        this.init();
    }

    public init() {
        if (!this.service.Settings.setup) {
            return setTimeout(() => this.init(), 500);
        }
        this.model.route = this.service.Settings.get('app.style.popout');
        this.model.min_search = this.service.Settings.get('app.people_min_char') || 0;
        this.model.loading = false;
    }

    public ngOnChanges(changes: any) {
        if (changes.search) {
            this.filter();
        }
    }

    public add(user: any) {
        for (const i of this.users) {
            if (i.id === user.id) { return; }
        }
        if (!this.users) { this.users = []; }
        this.service.Users.availability(user.email).then((free) => {
            user.free = free;
        }, (err) => console.error(err));
        user.select = true;
        this.users.push(user);
        this.users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        this.usersChange.emit(this.users);
    }

    public remove(user: any) {
        if (this.users) {
            for (const i of this.users) {
                if (i.id === user.id || i.email === user.email) {
                    this.users.splice(this.users.indexOf(user), 1);
                    user.select = false;
                    this.usersChange.emit(this.users);
                    break;
                }
            }
        }
    }

    public processUsers(list: any[]) {
        this.model.loading = true;
        if (!list || list.length <= 0) {
            this.model.user_groups = [];
            for (const letter of this.model.groups) {
                this.model.user_groups.push({ letter, users: [] });
            }
            return [];
        }
        if (!this.users) { this.users = []; }
        const users: IUser[] = [];
        for (const item of list) {
            if (this.model.me && item.id === this.model.me.id) {
                continue;
            }
            const usr = JSON.parse(JSON.stringify(item));
            usr.select = !!this.users.find((itm) => (itm.id === item.id || itm.email === item.email) && itm.select);
            users.push(usr);
        }
        users.sort((a, b) => a.name.localeCompare(b.name));
        this.model.user_groups = [];
        for (const letter of this.model.groups) {
            const u_list = [];
            for (const user of users) {
                const n = user.name.toUpperCase();
                if ((letter === '#' && (!n || this.model.groups.indexOf(n[0]) < 0)) || n[0].toLowerCase() === letter.toLowerCase() ) {
                    u_list.push(user);
                }
            }
            this.model.user_groups.push({
                letter,
                users: u_list
            });
        }
        return users;
    }

    public filter() {
        if (this.timers.search) {
            clearTimeout(this.timers.search);
            this.timers.search = null;
        }
        this.timers.search = setTimeout(() => {
            const search = (this.search || '').toLowerCase();
            if ((search && search.length >= this.model.min_search) || !this.model.min_search) {
                    this.model.loading = true;
                    this.model.user_list = [];
                    if (!this.model.min_search && this.model.users && this.model.users.length > 0) {
                        this.model.user_list = this.processUsers(
                            this.model.users
                            .filter((item) =>
                                item.name.toLowerCase().indexOf(search) >= 0 || item.email.toLowerCase().indexOf(search) >= 0
                            )
                        );
                        this.updateScroll();
                        this.model.loading = false;
                    } else {
                        const request_id = Math.floor(Math.random() * 899999 + 100000);
                        this.model.request_id = request_id;
                        this.service.Users.query({ q: search, limit: 50 })
                            .then((list) => {
                                if (request_id === this.model.request_id) {
                                    this.model.user_list = this.processUsers(list);
                                    this.updateScroll();
                                    this.model.loading = false;
                                }
                            }, () => this.model.loading = false);
                    }
            } else {
                this.model.user_list = null;
                this.model.loading = false;
            }
        }, 300);
    }

    public scrollTo(key: string) {
        if (this.list) {
            const el = this.list.nativeElement.querySelector(`#user-letter-start-${key}`);
            if (el) {
                el.scrollIntoView();
                this.model.location = key;
                setTimeout(() => this.list.nativeElement.scrollTop += 5, 10);
            }
        }
    }

    private updateScroll() {
        if (this.list && this.list.nativeElement) {
            const groups_start = this.list.nativeElement.querySelectorAll('.start');
            const groups_end = this.list.nativeElement.querySelectorAll('.end');
            const pbb = this.list.nativeElement.getBoundingClientRect();
            for (let i = 0; i < groups_start.length; i++) {
                const start_el = groups_start[i];
                const end_el = groups_end[i];
                const sbb = start_el.getBoundingClientRect();
                const ebb = end_el.getBoundingClientRect();
                if (pbb.top >= sbb.top && pbb.top < ebb.top + ebb.height) {
                    this.model.location = start_el.id.replace('user-letter-start-', '');
                    break;
                }
            }
        } else {
            setTimeout(() => this.updateScroll(), 300);
        }
    }
}
