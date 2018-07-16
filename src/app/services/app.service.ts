/**
 * @Author: Alex Sorafumo <alex.sorafumo>
 * @Date:   12/01/2017 2:25 PM
 * @Email:  alex@yuion.net
 * @Filename: app.service.ts
 * @Last modified by:   Alex Sorafumo
 * @Last modified time: 03/02/2017 10:25 AM
 */

import { Location } from '@angular/common';
import { Inject, Injectable, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

import { SystemsService, CommsService, OAuthService } from '@acaprojects/ngx-composer';
import { OverlayService } from '@acaprojects/ngx-widgets';

import { SettingsService } from './settings.service';
import { Utils } from '../shared/utility.class';

import { UsersService } from './data/users.service';
import { BuildingsService } from './data/buildings.service';
import { CateringService } from './data/catering.service';
import { CommentsService } from './data/comments.service';
import { RoomsService } from './data/rooms.service';
import { BookingsService } from './data/bookings.service';

import { ConfirmModalComponent } from '../overlays/confirm-modal/confirm-modal.component';
import { TimePeriodModalComponent } from '../overlays/time-period-modal/time-period-modal.component';
import { CalendarModalComponent } from '../overlays/calendar-modal/calendar-modal.component';
import { BookingModalComponent } from '../overlays/booking-modal/booking-modal.component';
import { AttendeeModalComponent } from '../overlays/attendee-modal/attendee-modal.component';
import { RoomFilterModalComponent } from '../overlays/room-filter-modal/room-filter-modal.component';
import { AnalyticsService } from './data/analytics.service';

@Injectable({
    providedIn: 'root'
})
export class AppService {
    private api_base = 'api/staff';

    private _system = '';
    private subjects: any = {};
    private observers: any = {};

    private prev_route: string[] = [];
    private model: any = {};
    private timers: any = {};

    constructor(private _title: Title,
        private version: SwUpdate,
        private router: Router,
        private location: Location,
        private route: ActivatedRoute,
        private overlay: OverlayService,
        private analytics: AnalyticsService,
        private settings: SettingsService,
        private systems: SystemsService,
        private buildings: BuildingsService,
        private bookings: BookingsService,
        private catering: CateringService,
        private comments: CommentsService,
        private rooms: RoomsService,
        private users: UsersService
    ) {
            // Set parent service on child services
        this.buildings.parent = this.bookings.parent = this.rooms.parent = this;
        this.users.parent = this.analytics.parent = this.catering.parent = this;
            // Create subjects
        this.subjects.system = new BehaviorSubject('');
        this.observers.system = this.subjects.system.asObservable();
        this.subjects.systems = new BehaviorSubject<any[]>([]);
        this.observers.systems = this.subjects.systems.asObservable();
            // Register modals/overlay components
        this.overlay.registerService(this);
        this.overlay.setupModal('attendees', { cmp: AttendeeModalComponent });
        this.overlay.setupModal('booking-form', { cmp: BookingModalComponent });
        this.overlay.setupModal('calendar', { cmp: CalendarModalComponent });
        this.overlay.setupModal('confirm', { cmp: ConfirmModalComponent });
        this.overlay.setupModal('room-filter', { cmp: RoomFilterModalComponent });
        this.overlay.setupModal('time-period', { cmp: TimePeriodModalComponent });
        this.init();
    }

    get endpoint() {
        const host = this.Settings.get('composer.domain');
        const protocol = this.Settings.get('composer.protocol');
        const port = ((protocol === 'https:') ? '443' : '80');
        const url = `${protocol || location.protocol}//${host || location.host}`;
        const endpoint = `${url}`;
        return endpoint;
    }

    get api_endpoint() {
        return `${this.endpoint}/${this.api_base}`;
    }

    public init(tries: number = 0) {
        if (!this.settings.setup) {
            if (tries === 5)  { this.settings.init(); }
            return setTimeout(() => this.init(), 500);
        }
        this.version.available.subscribe(event => {
            this.settings.log('CACHE', `Update available: current version is ${event.current.hash} available version is ${event.available.hash}`);
            this.info('Newer version of the app is available', 'Refresh', () => {
                location.reload();
            });
        });
        if (this.settings.get('debug')) { (window as any).application = this; }
        this.model.title = this.settings.get('app.title') || 'Angular Application';
        this.initialiseComposer();
        this.loadSystems();
        this.analytics.init();
            // Initialise data services
        this.buildings.init();
        this.bookings.init();
        this.users.init();
        this.rooms.init();
        this.catering.init();
        setInterval(() => this.checkCache(), 5 * 60 * 1000);
    }

    public initialiseComposer(tries: number = 0) {
        this.settings.log('SYSTEM', 'Initialising Composer...');
            // Get domain information for configuring composer
        const host = this.settings.get('composer.domain') || location.hostname;
        const protocol = this.settings.get('composer.protocol') || location.protocol;
        const port = (protocol.indexOf('https') >= 0 ? '443' : '80');
        const url = this.settings.get('composer.use_domain') ? `${protocol}//${host}` : location.origin;
        const route = this.settings.get('composer.route') || '';
            // Generate configuration for composer
        const config: any = {
            id: 'AcaEngine',
            scope: 'public',
            protocol, host, port,
            oauth_server: `${url}/auth/oauth/authorize`,
            oauth_tokens: `${url}/auth/token`,
            redirect_uri: `${location.origin}${route}/oauth-resp.html`,
            api_endpoint: `${url}/control/`,
            proactive: true,
            login_local: this.settings.get('composer.local_login') || false,
            http: true,
        };
            // Enable mock/development environment if the settings is defined
        const mock = this.settings.get('mock');
        if (mock) {
            config.mock = true;
            config.http = false;
        }
            // Setup/Initialise composer
        this.systems.setup(config);
    }

    public listen(name: string, next: (data: any) => void) {
        if (this.subjects[name]) {
            return this.observers[name].subscribe(next);
        } else {
            this.subjects[name] = new BehaviorSubject<any>(null);
            this.observers[name] = this.subjects[name].asObservable();
            return this.observers[name].subscribe(next);
        }
    }

    public get(name: string) {
        return this.subjects[name] ? this.subjects[name].getValue() : null;
    }

    public set(name: string, value: any) {
        if (this.subjects[name]) {
            this.subjects[name].next(value);
        } else {
            this.subjects[name] = new BehaviorSubject<any>(value);
            this.observers[name] = this.subjects[name].asObservable();
        }
    }

    get Settings() { return this.settings; }
    get Overlay() { return this.overlay; }
    get system() { return this.subjects.system.getValue(); }
    set system(value: string) { this.subjects.system.next(value); }
        // Getters for data services
    get Analytics() { return this.analytics; }
    get Buildings() { return this.buildings; }
    get Bookings() { return this.bookings; }
    get Catering() { return this.catering; }
    get Rooms() { return this.rooms; }
    get Users() { return this.users; }

    set title(str: string) {
        if (!this.model.title) {
            this.model.title = this.settings.get('app.title') || '';
        }
        const title = `${str ? str : ''}${this.model.title ? ' | ' + this.model.title : ''}`;
        this._title.setTitle(title || this.settings.get('app.title'));
    }

    get title() {
        return this._title.getTitle();
    }

    public navigate(path: string | string[], query?: any) {
        let path_list = [];
        if (path instanceof Array) {
            path_list = path_list.concat(path);
        } else {
            path_list.push(path);
        }
        this.prev_route.push(this.router.url);
        // if (!this.systems.resources.authLoaded) {
        this.router.navigate(path_list, { queryParams: query });
        // } else {
        // this.router.navigate([path]);
        // }
    }

    public back() {
        if (this.prev_route.length > 0) {
            this.navigate(this.prev_route.pop());
            this.prev_route.pop();
        } else {
            this.navigate('');
        }
    }

    public log(type: string, msg: string, args?: any, stream: string = 'debug') {
        this.settings.log(type, msg, args, stream);
    }

    public confirm(options: any, next: (event: any) => void) {
        this.Overlay.openModal('confirm', {
            data: options,
        }).then((inst: any) => inst.subscribe(next));
    }

    public error(msg: string, action?: string, event?: () => void) {
        const message = msg ? msg : `Error`;
        this.overlay.notify('success', {
            html: `<div class="display-icon error" style="font-size:2.0em"></div><div class="msg">${message}</div>`,
            name: 'ntfy error',
            action
        });
    }

    public success(msg: string, action?: string, event?: () => void) {
        const message = msg ? msg : `Success`;
        this.overlay.notify('success', {
            html: `<div class="display-icon success" style="font-size:2.0em"></div><div class="msg">${message}</div>`,
            name: 'ntfy success',
            action
        }, event);
    }

    public info(msg: string, action?: string, event?: () => void) {
        const message = msg ? msg : `Information`;
        this.overlay.notify('info', {
            html: `<div class="display-icon info" style="font-size:2.0em"></div></div><div class="msg">${message}</div>`,
            name: 'ntfy info',
            action
        }, event);
    }

    get iOS() {
        return Utils.isMobileSafari();
    }

    public getSystem(id: string) {
        const system_list = this.subjects.systems.getValue();
        if (system_list) {
            for (const system of system_list) {
                if (system.id === id) {
                    return system;
                }
            }
        }
        return {};
    }

    private addSystems(list: any[]) {
        const system_list = this.subjects.systems.getValue().concat(list);
        system_list.sort((a, b) => a.name.localeCompare(b.name));
        this.subjects.systems.next(system_list);
    }

    private loadSystems(tries: number = 0) {
        if (this.timers.system) {
            clearTimeout(this.timers.system);
            this.timers.system = null;
        }
        if (tries > 20) { return; }
        const systems = this.systems.resources.get('System');
        if (systems) {
            tries = 0;
            systems.get({ offset: '0', limit: 500 }).then((sys_list: any) => {
                this.subjects.systems.next([]);
                if (sys_list) {
                    const count = sys_list.total;
                    if (count > 500) {
                        const iter = Math.ceil((count - 500) / 500);
                        for (let i = 0; i < iter; i++) {
                            systems.get({ offset: (i + 1) * 500, limit: 500 }).then((list: any) => {
                                if (list) {
                                    this.addSystems(list.results);
                                }
                            });
                        }
                    }
                    this.addSystems(sys_list.results);
                } else {
                    this.timers.system = setTimeout(() => this.loadSystems(tries), 200 * ++tries);
                }
            }, (err: any) => {
                this.timers.system = setTimeout(() => this.loadSystems(tries), 200 * ++tries);
            });
        } else {
            this.timers.system = setTimeout(() => this.loadSystems(tries), 200 * ++tries);
        }
    }

    private checkCache() {
        if (this.version.isEnabled) {
            this.settings.log('SYSTEM', 'Checking cache for updates');
            this.version.checkForUpdate()
                .then(() => this.settings.log('SYSTEM', 'Finished checking cache for updates'))
                .catch(err => this.settings.log('SYSTEM', err, null, 'error'));
        }
    }

}
