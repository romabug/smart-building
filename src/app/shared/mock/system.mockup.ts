/**
* @Author: Alex Sorafumo <alex.sorafumo>
* @Date:   11/01/2017 4:16 PM
* @Email:  alex@yuion.net
* @Filename: mock-system.ts
* @Last modified by:   Alex Sorafumo
* @Last modified time: 03/02/2017 2:26 PM
*/

import { MOCK_REQ_HANDLER } from '@acaprojects/ngx-composer';

import * as moment from 'moment';

const win = self as any;

win.systemData = win.systemData || {};
win.control = win.control || {};
win.control.systems = win.control.systems || {};
win.control.systems['sys-B0'] = {
    System: [{
        name: 'Demo System',
    }],
    Demo: [{
        volume: 0,
        mute: false,
        views: 0,
        state: 'Idle',

        $play: () => {
            win.control.systems['sys-B0'].Demo[0].state = 'Playing';
        },

        $stop: () => {
            win.control.systems['sys-B0'].Demo[0].state = 'Stopped';
        },

        $volume: (value: number) => {
            this.volume = value;
            if (this.volume > 100) {
                this.volume = 100;
            } else if (this.volume < 0) {
                this.volume = 0;
            }
        },

        $mute: (state: boolean) => {
            this.mute = state;
        },

        $state: (status: string) => {
            this.state = status;
        },
    }],
    FloorManagement: [{
        'zone-lvl_02': {
            'zone-2.N-status': { capacity: 100, people_count: Math.floor(Math.random() * 80 + 10) },
            'zone-2.E-status': { capacity: 100, people_count: Math.floor(Math.random() * 80 + 10) },
            'zone-2.S-status': { capacity: 100, people_count: Math.floor(Math.random() * 80 + 10) },
            'zone-2.W-status': { capacity: 100, people_count: Math.floor(Math.random() * 80 + 10) }
        }
    }],
    DeskManagement: [{
        $desk_details: (desk_id: string) => this[desk_id],
        $desk_usage: (level: string) => this[`${level}`] + this[`${level}:reserved`],
        $manual_checkin: function (desk_id: string, level_id: string = 'zone_Fd-20') {
            if (!this[`${level_id}`]) { this[`${level_id}`] = []; }
            this[`${level_id}`] = this[`${level_id}`].concat([desk_id]);
            if (!this[`${level_id}:clashes`]) { this[`${level_id}:clashes`] = []; }
            this[`${level_id}:clashes`] = this[`${level_id}:clashes`].concat([desk_id]);
            if (!this[`${level_id}:occupied_count`]) { this[`${level_id}:occupied_count`] = 0; }
            this[`${level_id}:occupied_count`] += 1;
            if (!this[`${level_id}:free_count`]) { this[`${level_id}:free_count`] = 1; }
            this[`${level_id}free_count`] -= 1;
            if (win.backend) {
                const user = win.backend.model.user;
                this[user.win_id] = {
                    connected: true,
                    manual_desk: true,
                    desk_id,
                    unplug_time: moment().unix()
                };
            }
        },
        // Will reserve the desk that is indicated above
        $reserve_desk: () => {
            if (win.backend) {
                const user = win.backend.model.user;
                if (this[user.win_id]) {
                    this[user.win_id].reserved = true;
                    this[user.win_id].unplug_time = moment().unix();
                }
            } else {
                if (this.user) {
                    this.user.reserved = true;
                    this.user.unplug_time = moment().unix();
                }
            }
        },
        $cancel_reservation: () => {
            if (win.backend) {
                const user = win.backend.model.user;
                if (this[user.win_id]) {
                    this[user.win_id] = {
                        connected: false,
                        reserved: false,
                        unplug_time: moment().unix()
                    };
                }
            } else {
                if (this.user) {
                    this.user = {
                        connected: false,
                        reserved: false,
                        unplug_time: moment().unix()
                    };
                }
            }
        },
    }]
};

win.systemData['sys-B0'] = win.control.systems['sys-B0'];
