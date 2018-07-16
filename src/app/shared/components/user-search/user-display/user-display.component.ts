/*
* @Author: Alex Sorafumo
* @Date:   2017-05-17 12:49:52
 * @Last Modified by: Alex Sorafumo
 * @Last Modified time: 2018-03-21 14:20:46
*/

import { Component, ElementRef, EventEmitter, Input, Output, Renderer2, ViewChild } from '@angular/core';

import { AppService } from '../../../../services/app.service';

import * as faker from 'faker';
import * as moment from 'moment';

@Component({
    selector: 'user-search-display',
    templateUrl: './user-display.template.html',
    styleUrls: ['./user-display.styles.scss'],
})
export class UserSearchDisplayComponent {
    @Input() public users: any[] = [];
    @Output() public usersChange = new EventEmitter();

    public setState(user: any, state: boolean) {
        user.select = state;
        this.usersChange.emit(this.users);
    }
}
