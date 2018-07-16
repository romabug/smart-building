import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    public model: any = {};
    public parent = null;

    private timers: any = {};

    constructor(private router: Router) {
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.updatePage();
            }
        });
    }

    public init() {
        if (!this.parent || !this.parent.Settings.setup) {
            return setTimeout(() => this.init(), 500);
        }
        this.model.settings = this.parent.Settings.get('app.analytics') || {};
        if (this.model.settings && this.model.settings.enabled) {
            this.parent.Settings.log('Analytics', `Initialising...`);
            // (window as any).ga('create', 'UA-119470294-1', 'auto');
            (window as any).ga('create', this.model.settings.tracking_id, 'auto');
            (window as any).ga('send', 'pageview');
            this.updatePage();
        }
    }

    public setUser(id: string) {
        if (this.model.settings && this.model.settings.enabled && (window as any).ga) {
            this.timeout(`user|${id}`, () => {
                this.parent.Settings.log('Analytics', `Set user ID: ${id}`);
                (window as any).ga('set', 'userId', id);
                this.event('authentication', 'user-id available');
            }, 100);
        }
    }

    public event(category: string, action: string, label?: string, value?: string) {
        if (this.model.settings && this.model.settings.enabled && (window as any).ga) {
            this.timeout(`event|${category}|${action}|${label}|${value}`, () => {
                const l = label ? ', ' + label : '';
                this.parent.Settings.log('Analytics', `Event: ${category}, ${action}${l}${value ? ', ' + value : ''}`);
                (window as any).ga('send', 'event', category, action, label, value);
            }, 100);
        }
    }

    public screen(name: string, app_name?: string) {
        if (this.model.settings && this.model.settings.enabled && (window as any).ga) {
            this.timeout(`event|${name}|${app_name || this.parent.Settings.appName}`, () => {
                this.parent.Settings.log('Analytics', `Screen: ${name}${app_name ? ', ' + app_name : ''}`);
                (window as any).ga('send', 'screenview', {
                    appName: app_name || this.parent.Settings.appName,
                    screenName: name
                });
            }, 100);
        }
    }

    public page(route: string) {
        if (this.model.settings && this.model.settings.enabled && (window as any).ga) {
            this.timeout(`page|${route}`, () => {
                this.parent.Settings.log('Analytics', `Page: ${route}`);
                (window as any).ga('send', 'pageview', route);
            }, 100);
        }
    }

    public timing(category: string, variable: string, value: string, label?: string) {
        if (this.model.settings && this.model.settings.enabled && (window as any).ga) {
            this.timeout(`page|${category}|${variable}|${value}|${label}`, () => {
                this.parent.Settings.log('Analytics', `Timing: ${category}, ${variable}, ${value}${label ? ', ' + label : ''}`);
                (window as any).ga('send', 'timing', category, variable, value, label);
            }, 100);
        }
    }

    private timeout(name: string, fn: () => void, value: number = 300) {
        if (this.timers[name]) {
            clearTimeout(this.timers[name]);
            this.timers[name] = null;
        }
        this.timers[name] = setTimeout(() => {
            if (fn instanceof Function) { fn(); }
            this.timers[name] = null;
        }, value);
    }

    private updatePage() {
        setTimeout(() => {
            const page = this.router.url.split('?')[0];
            if (this.model.page !== page) {
                const title = (this.parent.title || '').split('|')[0];
                this.screen(title);
                this.page(page);
                this.model.page = page;
            }
        }, 100);
    }
}
