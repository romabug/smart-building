
import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AppService } from '../../../services/app.service';
import { Utils } from '../../../shared/utility.class';

@Component({
    selector: 'people-search',
    templateUrl: './people-search.template.html',
    styleUrls: ['./people-search.styles.scss'],
})
export class PeopleSearchComponent implements OnInit {
    @Input() public model: any = null;
    @Output() public modelChange: any = new EventEmitter();
    public state: any = {};
    public filtered_users: any[] = [];

    @ViewChild('input') private input: ElementRef;

    private timers: any = {};

    constructor(private service: AppService, private route: ActivatedRoute) { }

    public ngOnInit() {
        const win = self as any;
        this.state.loaded = false;
        this.state.speech = !!(win.SpeechRecognition || win.webkitSpeechRecognition);
        this.state.settings = {};
        this.service.Users.listen('user_list', (list) => {
            this.state.user_list = list || [];
            this.state.user_list.sort((a, b) => a.name.localeCompare(b.name));
            if (!this.state.min_search) {
                this.filter();
            }
        });

        this.route.queryParamMap.subscribe((params) => {
            if (params.has('role')) {
                this.state.role_param = params.get('role');
                this.initRole();
            }
        });
        this.init();
    }

    public init() {
        const bld = this.service.Buildings.current();
        if (!this.service.Settings.setup || !bld) {
            return setTimeout(() => this.init(), 500);
        }
        this.state.route = this.service.Settings.get('app.style.popout');
        this.state.min_search = this.service.Settings.get('app.people_min_char') || 0;
        this.state.settings = this.service.Settings.get('app.explore') || {};
        this.state.role = {
            details: this.service.Settings.get('app.roles'),
            list: [],
            active: -1
        };
        if (bld.roles) {
            for (const role in bld.roles) {
                if (bld.roles.hasOwnProperty(role)) {
                    this.state.role.list.push({
                        id: role,
                        name: role.split('-').join(' '),
                        icon: this.state.role.details ? this.state.role.details[role] : null,
                        users: bld.roles[role]
                    });
                }
            }
        }
        this.filter();
    }

    public initRole() {
        if (this.state.role_param && this.state.role && this.state.role.list) {
            for (const i of this.state.role.list) {
                if (i.id === this.state.role_param) {
                    this.state.role.active = this.state.role.list.indexOf(i);
                    this.filter();
                    break;
                }
            }
        } else if (!this.state.role || !this.state.role.list) {
            setTimeout(() => this.initRole(), 500);
        }
    }

    public filter() {
        if (!this.state.settings) { return; }
        this.state.loading = false;
        if (this.timers.search) {
            clearTimeout(this.timers.search);
            this.timers.search = null;
        }
        this.timers.search = setTimeout(() => {
            const search = (this.state.search || '').toLowerCase();
            const role = this.state.role;
            if ((search && search.length >= this.state.min_search) || (role && role.active >= 0) || !this.state.min_search) {
                this.state.loading = true;
                this.filtered_users = [];
                if (role && role.active >= 0) {
                    this.filtered_users = role.list[role.active].users
                        .filter((item) =>
                            item.name.toLowerCase().indexOf(search) >= 0 || item.email.toLowerCase().indexOf(search) >= 0
                        );
                    this.state.loading = false;
                } else if (!this.state.min_search && this.state.user_list && this.state.user_list.length > 0) {
                    this.filtered_users = this.state.user_list
                        .filter((item) =>
                            item.name.toLowerCase().indexOf(search) >= 0 || item.email.toLowerCase().indexOf(search) >= 0
                        );
                    this.state.loading = false;
                } else {
                    const request_id = Math.floor(Math.random() * 899999 + 100000);
                    this.state.request_id = request_id;
                    this.service.Users.query({ q: search, limit: 50 })
                        .then((list) => {
                            if (request_id === this.state.request_id) {
                                this.filtered_users = list;
                                this.state.loading = false;
                            }
                        }, () => this.state.loading = false);
                }
            } else {
                this.filtered_users = null;
                this.state.loading = false;
            }
        }, 300);
    }

    public find(user: any) {
        this.model = user;
        this.state.search = user.name;
        this.modelChange.emit(user);
    }

    public call(user: any) {
        user.loading = true;
        let phone = '';
        if (!user.phone) {
            this.service.Users.show(user.email).then((person) => {
                if (person && person.phone) {
                    phone = Utils.removeChars(person.phone, ' ()_-');
                    location.href = `tel:${phone}`;
                }
                user.loading = false;
            });
        } else {
            phone = Utils.removeChars(user.phone, ' ()_-');
            location.href = `tel:${phone}`;
            user.loading = false;
        }
    }

    public close() {
        this.state.search = '';
        this.model = null;
        this.state.role.active = -1;
        this.filter();
        this.modelChange.emit(this.model);
    }

    public startDictation() {
        if (!this.input) { return; }
        if (this.state.recognition) {
            this.state.recognition.stop();
            this.state.dictate = false;
            this.state.recognition = null;
            return;
        }
        const win = self as any;
        const Speech: any = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (Speech) {
            this.state.recognition = new Speech();

            this.state.recognition.continuous = false;
            this.state.recognition.interimResults = false;

            this.state.recognition.lang = 'en-US';
            this.state.recognition.start();
            this.state.dictate = true;

            this.state.recognition.onresult = (e: any) => {
                this.input.nativeElement.value = e.results[0][0].transcript;
                this.state.search = e.results[0][0].transcript;
                this.state.recognition.stop();
                this.filter();
                this.state.dictate = false;
            };

            this.state.recognition.onerror = (e: any) => {
                this.state.recognition.stop();
                this.state.dictate = false;
            };
        }
    }
}
