/**
 * @Author: Alex Sorafumo
 * @Date:   17/10/2016 4:10 PM
 * @Email:  alex@yuion.net
 * @Filename: simple.component.ts
 * @Last modified by:   Alex Sorafumo
 * @Last modified time: 01/02/2017 1:37 PM
 */

import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import { AppService } from '../services/app.service';

import * as moment from 'moment';

@Component({
    selector: 'app-shell',
    styleUrls: ['./shell.styles.scss'],
    templateUrl: './shell.template.html'
})
export class AppShellComponent implements OnInit {

    public model: any = {};
    public timers: any = {};

    constructor(private service: AppService, private router: Router) {
        this.model.hide_routes = ['/', '/home'];
        this.model.routing = {};
        this.router.events.subscribe((e) => {
            if (e instanceof NavigationEnd) {
                this.checkRoute();
            }
        });
    }

    public ngOnInit() {
        this.model.year = moment().format('YYYY');
        this.service.Users.listen('user', (user) => {
            this.model.user = user;
        });
        this.init();
    }

    public init() {
        if (!this.service.Settings.setup) {
            return setTimeout(() => this.init(), 200);
        }
        this.model.logo = this.service.Settings.get('app.logo');
        this.model.tiles = this.service.Settings.get('app.tiles');
        this.model.menu = this.service.Settings.get('app.menu') || {};
        this.model.titles = this.service.Settings.get('app.page_titles');
        this.model.copyright = this.service.Settings.get('app.copyright');
        this.model.route = this.service.Settings.get('app.routing');
        this.model.hide_heading = this.service.Settings.get('app.hide.heading');
        this.model.banner = this.service.Settings.get('app.banner');
        this.checkRoute();
        this.initBuilding();
    }

    public initBuilding() {
        const list = this.service.Buildings.list();
        if (!list || list.length <= 0) {
            return setTimeout(() => this.initBuilding(), 500);
        }
        this.model.bld_count = list.length;
        let bld = '';
        if (localStorage) {
            bld = localStorage.getItem('STAFF.building');
        }
        this.model.show_building = !bld && this.model.bld_count > 1;
    }

    public home() {
        this.service.navigate('');
    }

    public goto(item: any) {
        if (item.id) {
            this.service.navigate(item.id, item.query || {});
        } else if (item.link || item.url) {
            window.open(item.link || item.url, 'blank_');
        }
        if (this.model.menu) {
            this.model.menu.show = false;
        }
    }

    public route() {
        if (this.model.routing.sub) {
            this.service.navigate(this.model.routing.back);
        }
    }

    public checkRoute() {
        const route = this.router.url.split('?')[0];
        if (this.model.menu) {
            this.model.menu.show_footer = this.model.hide_routes.indexOf(route) < 0;
        }
        if (this.model.banner) {
            this.model.banner.show = this.model.hide_routes.indexOf(route) < 0;
        }
        if (this.model.tiles) {
            for (const tile of this.model.tiles) {
                tile.active = route.indexOf(`/${tile.id}`) === 0;
                if (tile.active && this.model.banner) {
                    this.model.banner.color = tile.color;
                }
            }
        }
        if (this.model.titles) {
            let title_route = '';
            this.model.heading = '';
            this.model.routing = {};
            this.service.title = 'Home';
            const keys = Object.keys(this.model.titles);
            keys.sort((a, b) => a.length - b.length);
            for (const t of keys) {
                if ((route.indexOf(`/${t}`) === 0 || route.indexOf(`${t}`) === 0) && t.length > title_route.length) {
                    this.model.heading = this.model.titles[t];
                    this.service.title = this.model.heading;
                    if (!this.model.routing.main) {
                        this.model.routing.main = this.model.titles[t];
                    } else {
                        this.model.routing.sub = this.model.titles[t];
                        this.model.routing.back = t;
                    }
                    title_route = t;
                }
            }
        }
    }
}
