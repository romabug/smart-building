
import { MapPinComponent, MapRangeComponent } from '@acaprojects/ngx-widgets';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';

import { AppService } from '../../services/app.service';
import { ILevel, IBuilding } from '../../services/data/buildings.service';

import * as moment from 'moment';
import { RoomInfoComponent } from '../../shared/components/room-info/room-info.component';

@Component({
    selector: 'app-explore',
    templateUrl: './explore.template.html',
    styleUrls: ['./explore.styles.scss']
})
export class ExploreComponent implements OnInit {
    public model: any = [];
    public timers: any = {};

    constructor(private route: ActivatedRoute, private router: Router, private service: AppService) {
        this.router.events.subscribe((e) => {
            if (e instanceof NavigationEnd) {
                if (this.model.zones) {
                    this.model.zones.show = false;
                }
                this.model.found_user = null;
                this.model.room_pin = null;
                this.updatePointsOfInterest();
            }
        });
        this.route.paramMap.subscribe((params) => {
            if (params.has('search')) {
                this.model.search = params.get('search');
            }
        });
        this.route.queryParamMap.subscribe((params) => {
            if (params.has('room_id')) { this.focusOnRoom(params.get('room_id')); }
            if (params.has('level')) { this.setLevelByID(params.get('level')); }
            if (params.has('level_id')) { this.setLevelByID(params.get('level_id')); }
            if (params.has('back')) { this.model.back = params.get('back'); }
        });
        this.service.Rooms.listen('room_list', (list) => {
            this.model.rooms = list;
            this.update();
        });
        this.service.Users.listen('user', (item) => this.model.user = item);
    }

    public ngOnInit() {
        this.model.map = {};
        this.model.show = { rooms: true, desks: true };
        this.model.map.poi = [];
        this.model.desks = {};
        this.model.zones = {};
        this.model.settings = {};
        this.model.colours = { rooms: {}, desks: {}, zones: {} };
        if (this.model.keys) {
            this.model.keys.show = false;
        }
        this.clear();
        this.service.Buildings.listen((bld) => {
            if (bld) {
                const active = this.model.level ? this.model.level.active : null;
                this.model.level = {};
                this.model.system = bld.systems.desks;
                this.model.level.list = bld.levels;
                if (this.model.level.list) {
                    this.model.level.names = [];
                    for (const level of this.model.level.list) {
                        this.model.level.names.push(level.name);
                    }
                    let lvl = null;
                    if (active) { lvl = this.setLevelByID(active.id); }
                    if (!lvl && this.model.level.list.length > 0) {
                        this.setLevel(this.model.level.list[0]);
                    }
                }
            }
        });
        this.init();
    }

    public init() {
        if (!this.service.Settings.setup) {
            return setTimeout(() => this.init(), 500);
        }
        this.model.colours = {};
        this.model.colours.rooms = this.service.Settings.get('app.colors.rooms') || {};
        this.model.colours.desks = this.service.Settings.get('app.colors.desks') || {};
        this.model.colours.zones = this.service.Settings.get('app.colors.zones') || {};
        this.model.keys = this.service.Settings.get('app.map_keys') || {};
        this.model.keys.types = Object.keys(this.model.keys);
        this.model.zones.enabled = this.service.Settings.get('app.zones.enabled');
        this.model.zones.toggle = this.service.Settings.get('app.zones.toggle');
        this.model.settings = this.service.Settings.get('app.explore') || {};
        if (this.model.zones.enabled && this.model.zones.toggle) {
            this.model.keys.types = [this.model.zones.toggle];
        }
        if (this.model.keys) {
            this.model.keys.list = (this.model.keys.room || []).concat(this.model.keys.general || []);
        }
        this.model.map_bookable = this.service.Settings.get('app.map_bookings');
        if (this.timers.update_bookings) {
            clearInterval(this.timers.update_bookings);
            this.timers.update_bookings = null;
        }
        this.timers.update_bookings = setInterval(() => this.updateRoomState(), 25 * 1000);
    }

    public focusOnRoom(id: string, tries: number = 0) {
        if (tries > 10) { return; }
        if (this.model.rooms && this.model.rooms.length > 0) {
            for (const rm of this.model.rooms) {
                if (rm.id === id) {
                    this.focusSpace(rm);
                    break;
                }
            }
        } else {
            setTimeout(() => this.focusOnRoom(id, tries++), 300 * tries++);
        }
    }

    public toggle(name: string) {
        setTimeout(() => this.model[name].show = !this.model[name].show, 100);
    }

    public setLevelByID(id: string) {
        if (id && this.model.level && this.model.level.list) {
            for (const lvl of this.model.level.list) {
                if (lvl.id === id) {
                    this.setLevel(lvl);
                    return lvl;
                }
            }
        }
        return null;
    }

    public setLevel(lvl: ILevel) {
        if (lvl && this.model.level && this.model.level.list && this.model.level.list.indexOf(lvl) >= 0) {
            this.model.level.active = lvl;
            this.model.level.index = this.model.level.list.indexOf(lvl);
            this.model.map.src = lvl.map_url;
            this.model.map.focus = null;
            this.model.room_pin = null;
            this.model.map.reset = !this.model.map.reset;
            this.update();
        }
    }

    public updateRoomState() {
        if (this.model.rooms) {
            for (const rm of this.model.rooms) {
                this.processBookings(rm, false);
            }
            this.update();
        }
    }

    public processBookings(room: any, update: boolean = true) {
        if (room.raw_bookings && room.raw_bookings.length > 0) {
            this.service.Rooms.processRoom(room);
            if (update) { this.update(); }
        }
    }

    public zoom(value: number) {
        this.model.map.zoom = ((100 + (this.model.map.zoom || 0)) * value) - 100;
    }

    public update() {
        if (this.model.zones && this.model.zones.enabled && this.model.zones.toggle) {
            this.model.keys.types = [this.model.zones.show ? 'zone' : this.model.zones.toggle];
        }
        this.model.map.listeners = [];
        if (this.model.rooms && this.model.level && this.model.level.active) {
            for (const room of this.model.rooms) {
                if (room.map_id && room.level && room.level.id === this.model.level.active.id) {
                    this.model.map.listeners.push({ id: `area-${room.map_id}-status`, event: 'mouseenter' });
                    this.model.map.listeners.push({ id: `area-${room.map_id}-status`, event: 'mouseleave' });
                }
            }
        }
        this.updateStyles();
        this.updatePointsOfInterest();
    }

    public updateStyles() {
        if (this.timers.styles) {
            clearTimeout(this.timers.styles);
            this.timers.styles = null;
        }
        this.timers.styles = setTimeout(() => {
            this.model.style = {};
            this.model.map.styles = {};
            this.model.style.general = {};
            this.updateRoomStyles();
            this.updateDeskStyles();
            this.updateZoneStyles();
            for (const k in this.model.style) {
                if (this.model.style.hasOwnProperty(k) && this.model.style[k]) {
                    for (const i in this.model.style[k]) {
                        if (this.model.style[k].hasOwnProperty(i)) {
                            this.model.map.styles[i] = this.model.style[k][i];
                        }
                    }
                }
            }
            this.timers.styles = null;
        }, 300);
    }

    public updateRoomStyles() {
        this.model.style.rooms = {};
        if (!this.model.show.rooms) {
            this.model.style.rooms[`[id$="-status"]`] = { display: 'none' };
            return;
        }
        if (this.model.rooms && this.model.rooms.length > 0) {
            for (const room of this.model.rooms) {
                if (this.model.level && this.model.level.active && this.model.level.active.id === room.level.id) {
                    let color = this.model.colours.rooms['not-bookable'] || '#ccc';
                    if (room.bookable && room.in_use) {
                        color = this.model.colours.rooms['unavailable'] || '#E53935';
                    } else if (room.bookable) {
                        color = this.model.colours.rooms['available'] || '#4CAF50';
                    }
                    this.model.style.rooms[`area-${room.map_id}-status`] = {
                        fill: color,
                        opacity: '0.8',
                    };
                }
            }

        } else {
            if (this.timers.room_styles) {
                clearTimeout(this.timers.room_styles);
                this.timers.room_styles = null;
            }
            setTimeout(() => this.updateRoomStyles(), 300);
        }
    }

    public updateDeskStyles() {
        this.model.style.desks = {};
        if (!this.model.show.desks) {
            this.model.style.desks[`[id^="table-"]`] = { fill: '#fff', stroke: '#ccc' };
            return;
        }
        if (this.model.desks && this.model.search !== 'people') {
            const u_desk = this.model.desks.user;
            const list = this.model.desks.in_use || [];
            const manual = this.model.desks.manual;
            if (this.model.desks.list) {
                for (const label of this.model.desks.list) {
                    if (label) {
                        const desk = `${label}`;
                        const desk_obj = {
                            level: this.model.active,
                            id: desk,
                            name: `Desk ${label.split('-')[1]}`,
                        };
                        const is_manual = manual && manual.indexOf(label) >= 0;
                        const in_use = list && list.indexOf(label) >= 0;
                        const users_desk = u_desk && u_desk.connected && u_desk.desk_id === label;
                        this.model.style.desks[desk] = {
                            fill: this.model.colours.desks['available-fill'] || '#4CAF50',
                            stroke: this.model.colours.desks['available-stroke'] || '#4CAF50'
                        };
                        if (in_use) {
                            const type = is_manual || users_desk ? 'user' :  'unavailable';
                            this.model.style.desks[desk].fill = this.model.colours.desks[`${type}-fill`] || '#fff';
                            this.model.style.desks[desk].stroke = this.model.colours.desks[`${type}-stroke`] || '#ccc';
                        }
                    }
                }
            }
        }
    }

    public updateZoneStyles() {
        this.model.style.zones = {};
        if (!this.model.zones || !this.model.zones.enabled || !this.model.zones.show) {
            this.model.style.zones['Zones'] = { display: 'none' };
        }
        if (this.model.colours && this.model.level && this.model.level.active) {
            this.model.style.zones['[id^="zone"]'] = {
                fill: this.model.colours.zones[this.model.level.active.defaults.zone] || this.model.colours.zones.default || '#317c36'
            };
        }
        if (this.model.zone_usage) {
            for (const zone in this.model.zone_usage) {
                if (this.model.zone_usage.hasOwnProperty(zone)) {
                    const percent = (this.model.zone_usage[zone].people_count / this.model.zone_usage[zone].capacity) * 100;
                    this.model.map.styles[`${zone}`] = { fill: percent < 25 ? '#cd212e' : (percent < 50 ? '#f4a81d' : '#317c36') };
                }
            }
        }
    }

    public check(e: any) {
        if (e.type === 'User' && e.event.type === 'Tap') {
            if (this.model.rooms && this.model.rooms.length > 0) {
                const elems = e.event.elements;
                this.model.selected = null;
                this.model.display = null;
                for (const el of elems) {
                    for (const rm of this.model.rooms) {
                        if (el.indexOf(`area-${rm.map_id}`) >= 0 || el.indexOf(`area-${rm.map_id}-status`) >= 0) {
                            if (this.model.map_bookable) {
                                return this.service.Bookings.bookRoom(rm);
                            } else {
                                return;
                            }
                        }
                    }
                }
                this.updatePointsOfInterest();
            }
        } else if (e.type === 'Overlay' && e.event.location === 'Listener') {
            let room = null;
            for (const rm of this.model.rooms) {
                if (`area-${rm.map_id}-status` === e.event.id) {
                    room = rm;
                    break;
                }
            }
            if (e.event.type === 'mouseenter') {
                this.model.info = room;
                this.updatePointsOfInterest();
            } else if (e.event.type === 'mouseleave') {
                this.model.info = null;
                this.updatePointsOfInterest();
            }
        }
    }

    public focusUser(user: any) {
        if (user) {
            user.location = null;
            this.model.found_user = user;
            this.service.Users.location(user.id, user.win_id).then((location) => {
                this.model.found_user.location = location;
                for (const lvl of this.model.level.list) {
                    if (location.level === lvl.id) {
                        this.setLevel(lvl);
                        break;
                    }
                }
                this.model.map.focus = {
                    coordinates: !location.fixed ? { x: location.x, y: location.y } : null,
                    id: location.map_id,
                    zoom: 0,
                };
                this.updatePointsOfInterest();
                setTimeout(() => this.model.map.zoom = 0, 300);
            }, (err) => {
                this.model.found_user.location = null;
                this.updatePointsOfInterest();
            });
        }
    }

    public focusSpace(item: any) {
        const focus = `area-${item.map_id}-status`;
        const lvl = item.level;
        for (const level of this.model.level.list) {
            if (lvl.id === level.id) {
                this.setLevel(level);
                setTimeout(() => {
                    this.model.room_pin = {
                        id: focus,
                        prefix: 'pin',
                        cmp: MapPinComponent,
                        data: { back: this.model.colours.rooms.pin || '#03A9F4' },
                        text: item.name,
                    };
                    this.model.map.focus = { id: focus, zoom: 300 };
                    this.updatePointsOfInterest();
                }, 20);
                break;
            }
        }
    }

    public clear() {
        this.model.room_pin = null;
        this.model.found_user = null;
    }

    public updatePointsOfInterest() {
        if (this.timers.poi) {
            clearTimeout(this.timers.poi);
            this.timers.poi = null;
        }
        this.timers.poi = setTimeout(() => {
            this.model.map.poi = [];
            this.model.toggle = !this.model.toggle;
            if (this.model.found_user && this.model.found_user.location && this.model.found_user.location.level) {
                if (this.model.found_user.location.level === this.model.level.active.id) {
                    const loc = this.model.found_user.location;
                    this.model.map.poi.push({
                        id: loc.map_id || `person-${this.model.toggle ? 'odd' : 'event'}`,
                        cmp: loc.fixed ? MapPinComponent : MapRangeComponent,
                        coordinates: !loc.fixed ? { x: loc.x, y: loc.y } : null,
                        data: { text: `${this.model.found_user.name} is here`, back: '#F44336' }
                    });
                }
            }
            if (this.model.info) {
                const room = this.model.info;
                if (room.current) {
                    this.model.selected_time = `Booked until ${room.current.display.end}`;
                } else if (room.next) {
                    this.model.selected_time = `Free until ${room.next.display.start}`;
                } else {
                    this.model.selected_time = `Free today`;
                }
                this.model.display = null;
                this.model.map.poi.push({
                    id: `area-${room.map_id}-status`,
                    cmp: RoomInfoComponent,
                    data: {
                        room,
                        display: { time: this.model.selected_time },
                        available: !room.current
                    }
                });
            }
            if (this.model.room_pin) {
                this.model.map.poi.push(this.model.room_pin);
            }
            this.timers.poi = null;
        }, 300);
    }

    public back() {
        if (this.model.back) {
            this.service.navigate(this.model.back);
        } else {
            this.service.back();
        }
    }

}
